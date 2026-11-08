import httpx
import pytest
import respx

from app.services.cost_of_living import parse_jsonstat, purchasing_power_index, refresh_from_eurostat


def jsonstat(values: dict[tuple[str, str], float], geos: list[str], years: list[str]) -> dict:
    """Build a response shaped like Eurostat's: 3 single-value dimensions, then geo and time."""
    flat = {}
    for (geo, year), value in values.items():
        flat[str(geos.index(geo) * len(years) + years.index(year))] = value
    return {
        "id": ["freq", "na_item", "ppp_cat", "geo", "time"],
        "size": [1, 1, 1, len(geos), len(years)],
        "value": flat,
        "dimension": {
            "freq": {"category": {"index": {"A": 0}}},
            "na_item": {"category": {"index": {"X": 0}}},
            "ppp_cat": {"category": {"index": {"A01": 0}}},
            "geo": {"category": {"index": {g: i for i, g in enumerate(geos)}}},
            "time": {"category": {"index": {y: i for i, y in enumerate(years)}}},
        },
    }


@pytest.mark.parametrize(
    ("net", "price_level", "expected"),
    [
        (28776.80, 100.0, 100.0),  # EU average earner in an EU-average-priced country
        (35482.87, 109.1, 113.0),  # Germany 2024
        (17339.93, 70.2, 85.8),  # Poland 2024
    ],
)
def test_purchasing_power_index(net, price_level, expected):
    assert purchasing_power_index(net, price_level, eu_net_earnings=28776.80) == expected


def test_parse_jsonstat_maps_flat_positions_and_skips_gaps():
    payload = jsonstat(
        {("DE", "2023"): 109.0, ("DE", "2024"): 109.1, ("PL", "2024"): 70.2},
        geos=["DE", "PL"],
        years=["2023", "2024"],
    )
    assert parse_jsonstat(payload) == {("DE", 2023): 109.0, ("DE", 2024): 109.1, ("PL", 2024): 70.2}


@respx.mock
async def test_refresh_saves_years_with_complete_data(session, client):
    geos, years = ["DE", "EU27_2020"], ["2023", "2024"]
    respx.get(url__regex=r".*/prc_ppp_ind\?.*").mock(
        return_value=httpx.Response(
            200, json=jsonstat({("DE", "2023"): 109.0, ("DE", "2024"): 109.1, ("EU27_2020", "2023"): 100.0}, geos, years)
        )
    )
    respx.get(url__regex=r".*/earn_nt_net\?.*").mock(
        return_value=httpx.Response(
            200,
            json=jsonstat(
                {
                    ("DE", "2023"): 37908.41,
                    ("DE", "2024"): 35482.87,
                    ("EU27_2020", "2023"): 28323.92,
                    ("EU27_2020", "2024"): 28776.80,
                },
                geos,
                years,
            ),
        )
    )

    async with httpx.AsyncClient() as http:
        result = await refresh_from_eurostat(session, http, since_year=2023)

    assert result.saved == 2
    assert result.years == {2023, 2024}
    assert len(result.countries_without_data) == 26
    assert "DE" not in result.countries_without_data

    response = await client.get("/api/v1/cost-of-living/de")
    history = {row["year"]: row["purchasing_power_index"] for row in response.json()["history"]}
    assert history == {2024: 113.0, 2023: 122.8}


async def test_ranking_covers_all_countries_best_first(client):
    response = await client.get("/api/v1/cost-of-living")
    assert response.status_code == 200
    rows = response.json()
    assert len(rows) == 27
    assert [r["rank"] for r in rows] == list(range(1, 28))
    indices = [r["purchasing_power_index"] for r in rows]
    assert indices == sorted(indices, reverse=True)
    assert rows[0]["country"]["code"] == "LU"
    assert rows[0]["year"] == 2024


async def test_country_index(client):
    response = await client.get("/api/v1/cost-of-living/PL")
    assert response.status_code == 200
    body = response.json()
    assert body["country"]["code"] == "PL"
    assert body["latest"]["purchasing_power_index"] == 85.8
    assert body["latest"]["price_level_index"] == 70.2


async def test_unknown_country_index_is_404(client):
    response = await client.get("/api/v1/cost-of-living/UA")
    assert response.status_code == 404
