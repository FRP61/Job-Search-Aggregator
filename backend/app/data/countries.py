"""The 27 EU member states served by the API."""

from dataclasses import dataclass


@dataclass(frozen=True)
class CountryDef:
    code: str  # ISO 3166-1 alpha-2
    name_en: str
    name_uk: str
    currency: str  # ISO 4217
    eurostat_code: str  # Eurostat uses EL for Greece, otherwise the ISO code


COUNTRIES: tuple[CountryDef, ...] = (
    CountryDef("AT", "Austria", "Австрія", "EUR", "AT"),
    CountryDef("BE", "Belgium", "Бельгія", "EUR", "BE"),
    CountryDef("BG", "Bulgaria", "Болгарія", "EUR", "BG"),
    CountryDef("HR", "Croatia", "Хорватія", "EUR", "HR"),
    CountryDef("CY", "Cyprus", "Кіпр", "EUR", "CY"),
    CountryDef("CZ", "Czechia", "Чехія", "CZK", "CZ"),
    CountryDef("DK", "Denmark", "Данія", "DKK", "DK"),
    CountryDef("EE", "Estonia", "Естонія", "EUR", "EE"),
    CountryDef("FI", "Finland", "Фінляндія", "EUR", "FI"),
    CountryDef("FR", "France", "Франція", "EUR", "FR"),
    CountryDef("DE", "Germany", "Німеччина", "EUR", "DE"),
    CountryDef("GR", "Greece", "Греція", "EUR", "EL"),
    CountryDef("HU", "Hungary", "Угорщина", "HUF", "HU"),
    CountryDef("IE", "Ireland", "Ірландія", "EUR", "IE"),
    CountryDef("IT", "Italy", "Італія", "EUR", "IT"),
    CountryDef("LV", "Latvia", "Латвія", "EUR", "LV"),
    CountryDef("LT", "Lithuania", "Литва", "EUR", "LT"),
    CountryDef("LU", "Luxembourg", "Люксембург", "EUR", "LU"),
    CountryDef("MT", "Malta", "Мальта", "EUR", "MT"),
    CountryDef("NL", "Netherlands", "Нідерланди", "EUR", "NL"),
    CountryDef("PL", "Poland", "Польща", "PLN", "PL"),
    CountryDef("PT", "Portugal", "Португалія", "EUR", "PT"),
    CountryDef("RO", "Romania", "Румунія", "RON", "RO"),
    CountryDef("SK", "Slovakia", "Словаччина", "EUR", "SK"),
    CountryDef("SI", "Slovenia", "Словенія", "EUR", "SI"),
    CountryDef("ES", "Spain", "Іспанія", "EUR", "ES"),
    CountryDef("SE", "Sweden", "Швеція", "SEK", "SE"),
)

COUNTRY_BY_CODE = {country.code: country for country in COUNTRIES}
