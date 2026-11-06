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
