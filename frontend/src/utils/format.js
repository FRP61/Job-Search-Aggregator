// Форматирование чисел так, как принято в языке сайта.

// Сумма в валюте (по умолчанию в евро):
// «1 657,84 €» / «€1,657.84», «7 146,91 zł» / «zł 7,146.91»
export function formatMoney(amount, language, currency = 'EUR') {
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency,
    // «€», а не «EUR»: украинский формат по умолчанию пишет код валюты
    currencyDisplay: 'narrowSymbol',
  }).format(amount)
}

// Знак валюты так, как его пишет язык сайта: 'EUR' → «€», 'PLN' → «zł»
export function currencySymbol(currency, language) {
  const parts = new Intl.NumberFormat(language, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).formatToParts(0)
  return parts.find((part) => part.type === 'currency').value
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

// Сумма в целых единицах, без копеек: «30 000 €» / «€30,000» — для зарплат вакансий
export function formatMoneyWhole(amount, language, currency = 'EUR') {
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
  }).format(amount)
}
