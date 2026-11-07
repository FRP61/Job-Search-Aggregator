// Форматирование чисел так, как принято в языке сайта.

// Сумма в евро: «1 657,84 €» на украинском, «€1,657.84» на английском
export function formatMoney(amount, language) {
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency: 'EUR',
    // «€», а не «EUR»: украинский формат по умолчанию пишет код валюты
    currencyDisplay: 'narrowSymbol',
  }).format(amount)
}

// Процент с одним знаком после запятой: «17,1» / «17.1»
export function formatPercent(value, language) {
  return new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(value)
}

// Курс валюты: до 4 знаков после запятой — «4,3925» / «4.3925»
export function formatRate(value, language) {
  return new Intl.NumberFormat(language, { maximumFractionDigits: 4 }).format(value)
}

// Дата из строки '2026-11-06': «6 листопада 2026 р.» / «November 6, 2026»
export function formatDate(isoDate, language) {
  return new Intl.DateTimeFormat(language, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(isoDate))
}
