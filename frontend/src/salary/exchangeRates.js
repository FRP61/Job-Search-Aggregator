// Курсы евро: сколько единиц валюты стоит 1 €.
// Источник: Европейский центральный банк, ежедневные курсы
// https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
// Обновляем вручную. Когда бэкенд начнёт отдавать курсы, будем брать их оттуда.
export const EXCHANGE_RATES_DATE = '2026-11-06'

export const EUR_EXCHANGE_RATES = {
  EUR: 1,
  CZK: 24.35,
  DKK: 7.4752,
  HUF: 363.9,
  PLN: 4.3925,
  RON: 5.3403,
  SEK: 11.026,
}

// Курс для валюты; для неизвестной валюты — null
export function eurRate(currency) {
  return EUR_EXCHANGE_RATES[currency] ?? null
}
