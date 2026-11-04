"""Maintenance commands.

    python -m app.cli refresh-col [--since 2020]   pull the latest Eurostat data
    python -m app.cli refresh-vacancies [--country PL GR] [--max-pages 20]   pull jobs from EURES
    python -m app.cli refresh-bundesagentur [--max-pages 10]   pull German jobs from the Bundesagentur
"""

import argparse
import asyncio

import httpx

from app.db import SessionLocal
from app.services.cost_of_living import refresh_from_eurostat
from app.services.vacancies import SaveResult, refresh_bundesagentur, refresh_eures


async def refresh_col(since: int) -> None:
    async with SessionLocal() as session, httpx.AsyncClient(timeout=60) as client:
        result = await refresh_from_eurostat(session, client, since_year=since)
    years = ", ".join(map(str, sorted(result.years))) or "none"
    print(f"Saved {result.saved} rows for years: {years}")
    if result.countries_without_data:
        print("No complete Eurostat data for:", ", ".join(result.countries_without_data))


async def refresh_vacancies(country_codes: list[str] | None, max_pages: int) -> None:
    async with SessionLocal() as session, httpx.AsyncClient(timeout=30) as client:
        result = await refresh_eures(session, client, country_codes, max_pages)
    print_save_result(result)


async def refresh_ba(max_pages: int) -> None:
    async with SessionLocal() as session, httpx.AsyncClient(timeout=30) as client:
        result = await refresh_bundesagentur(session, client, max_pages)
    print_save_result(result)


def print_save_result(result: SaveResult) -> None:
    print(f"New: {result.inserted}, updated: {result.updated}, merged: {result.merged}, skipped: {result.skipped}")
    if result.failed_countries:
        print("Failed countries:", ", ".join(result.failed_countries))


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    col = commands.add_parser("refresh-col", help="refresh the cost-of-living index from Eurostat")
    col.add_argument("--since", type=int, default=2020, help="first year to download")
    vacancies = commands.add_parser("refresh-vacancies", help="download jobs from EURES into the database")
    vacancies.add_argument("--country", nargs="+", type=str.upper, help="country codes, all active ones by default")
    vacancies.add_argument("--max-pages", type=int, default=20, help="pages per country, 50 jobs each")
    ba = commands.add_parser("refresh-bundesagentur", help="download German jobs from the Bundesagentur")
    ba.add_argument("--max-pages", type=int, default=10, help="pages to read, 100 jobs each")

    args = parser.parse_args()
    if args.command == "refresh-col":
        asyncio.run(refresh_col(args.since))
    elif args.command == "refresh-vacancies":
        asyncio.run(refresh_vacancies(args.country, args.max_pages))
    elif args.command == "refresh-bundesagentur":
        asyncio.run(refresh_ba(args.max_pages))


if __name__ == "__main__":
    main()
