"""Maintenance commands.

    python -m app.cli refresh-col [--since 2020]   pull the latest Eurostat data
"""

import argparse
import asyncio

import httpx

from app.db import SessionLocal
from app.services.cost_of_living import refresh_from_eurostat


async def refresh_col(since: int) -> None:
    async with SessionLocal() as session, httpx.AsyncClient(timeout=60) as client:
        result = await refresh_from_eurostat(session, client, since_year=since)
    years = ", ".join(map(str, sorted(result.years))) or "none"
    print(f"Saved {result.saved} rows for years: {years}")
    if result.countries_without_data:
        print("No complete Eurostat data for:", ", ".join(result.countries_without_data))


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    col = commands.add_parser("refresh-col", help="refresh the cost-of-living index from Eurostat")
    col.add_argument("--since", type=int, default=2020, help="first year to download")

    args = parser.parse_args()
    if args.command == "refresh-col":
        asyncio.run(refresh_col(args.since))


if __name__ == "__main__":
    main()
