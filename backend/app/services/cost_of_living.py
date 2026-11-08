"""Cost-of-living index: formula, Eurostat download and storage.

purchasing power index = (net earnings / EU net earnings) / (price level / 100) * 100

100 means an average earner in the country can buy as much as the average EU earner;
113 means 13% more, 86 means 14% less.
"""

from dataclasses import dataclass, field
from math import prod
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.cost_of_living import BASELINE, BASELINE_YEAR, EU_NET_EARNINGS_EUR, EUROSTAT_SOURCE
from app.models import CostOfLivingIndex, Country

EUROSTAT_URL = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{dataset}"
EU_GEO = "EU27_2020"

# (dataset, filters) of the two Eurostat series the index is built from
PRICE_LEVEL_QUERY = ("prc_ppp_ind", {"na_item": "PLI_EU27_2020", "ppp_cat": "A01"})
NET_EARNINGS_QUERY = ("earn_nt_net", {"currency": "EUR", "estruct": "NET", "ecase": "P1_NCH_AW100"})


def purchasing_power_index(net_earnings: float, price_level: float, eu_net_earnings: float) -> float:
    return round(net_earnings / eu_net_earnings / (price_level / 100) * 100, 1)


def parse_jsonstat(payload: dict[str, Any]) -> dict[tuple[str, int], float]:
    """Decode a Eurostat JSON-stat response into {(geo, year): value}.

    JSON-stat keeps all values in one flat array; a value's position encodes its
    coordinate in every dimension (like digits of a number with mixed bases).
    """
    dims: list[str] = payload["id"]
    sizes: list[int] = payload["size"]
    strides = [prod(sizes[i + 1 :]) for i in range(len(sizes))]
    labels = {
        dim: {pos: code for code, pos in payload["dimension"][dim]["category"]["index"].items()}
        for dim in ("geo", "time")
    }
    geo_axis, time_axis = dims.index("geo"), dims.index("time")

    values = payload.get("value") or {}
    items = values.items() if isinstance(values, dict) else enumerate(values)
    result: dict[tuple[str, int], float] = {}
    for flat, value in items:
        if value is None:
            continue
        flat = int(flat)
        geo_pos = flat // strides[geo_axis] % sizes[geo_axis]
        time_pos = flat // strides[time_axis] % sizes[time_axis]
        result[(labels["geo"][geo_pos], int(labels["time"][time_pos]))] = float(value)
    return result


async def _fetch_dataset(
    client: httpx.AsyncClient, query: tuple[str, dict[str, str]], geos: list[str], since_year: int
) -> dict[tuple[str, int], float]:
    dataset, filters = query
    params = list(filters.items())
    params += [("format", "JSON"), ("lang", "EN"), ("sinceTimePeriod", str(since_year))]
    params += [("geo", geo) for geo in geos]
    response = await client.get(EUROSTAT_URL.format(dataset=dataset), params=params)
    response.raise_for_status()
    return parse_jsonstat(response.json())


@dataclass
class RefreshResult:
    saved: int = 0
    years: set[int] = field(default_factory=set)
    countries_without_data: list[str] = field(default_factory=list)


async def refresh_from_eurostat(
    session: AsyncSession, client: httpx.AsyncClient, since_year: int = 2020
) -> RefreshResult:
    """Download both Eurostat datasets and upsert one row per country and year
    for which price level, net earnings and the EU average are all published."""
    countries = (await session.scalars(select(Country))).all()
    code_by_geo = {c.eurostat_code: c.code for c in countries}
    geos = [*code_by_geo, EU_GEO]

    price_levels = await _fetch_dataset(client, PRICE_LEVEL_QUERY, geos, since_year)
    net_earnings = await _fetch_dataset(client, NET_EARNINGS_QUERY, geos, since_year)

    existing = {(r.country_code, r.year): r for r in await session.scalars(select(CostOfLivingIndex))}
    result = RefreshResult()
    refreshed: set[str] = set()
    for (geo, year), net in net_earnings.items():
        code = code_by_geo.get(geo)
        price_level = price_levels.get((geo, year))
        eu_net = net_earnings.get((EU_GEO, year))
        if code is None or price_level is None or eu_net is None:
            continue

        row = existing.get((code, year)) or CostOfLivingIndex(country_code=code, year=year)
        row.price_level_index = price_level
        row.avg_net_earnings_eur = net
        row.purchasing_power_index = purchasing_power_index(net, price_level, eu_net)
        row.source = EUROSTAT_SOURCE
        session.add(row)
        result.saved += 1
        result.years.add(year)

        refreshed.add(code)

    await session.commit()
    result.countries_without_data = sorted(c.code for c in countries if c.code not in refreshed)
    return result


async def load_baseline(session: AsyncSession) -> int:
    """Insert the bundled baseline for countries that have no row for that year yet.
    Never overwrites: rows refreshed from Eurostat may hold revised numbers."""
    existing = set(
        await session.scalars(
            select(CostOfLivingIndex.country_code).where(CostOfLivingIndex.year == BASELINE_YEAR)
        )
    )
    added = 0
    for code, (price_level, net) in BASELINE.items():
        if code in existing:
            continue
        session.add(
            CostOfLivingIndex(
                country_code=code,
                year=BASELINE_YEAR,
                price_level_index=price_level,
                avg_net_earnings_eur=net,
                purchasing_power_index=purchasing_power_index(net, price_level, EU_NET_EARNINGS_EUR),
                source=EUROSTAT_SOURCE,
            )
        )
        added += 1
    return added
