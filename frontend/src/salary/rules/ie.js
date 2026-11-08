// Ирландия, 2026 год.
// Источники: KPMG Ireland, ставки и кредиты (https://kpmg.com/ie/en/insights/tax/budget-2027/tax-rates-and-credits.html),
// PwC Tax Summaries (https://taxsummaries.pwc.com/ireland/individual/taxes-on-personal-income),
// Zellis, Tax Facts Ireland 2026 (https://www.zellis.com/wp-content/uploads/2026/01/Tax-Facts-Ireland-v1.0-Jan-2026_220126.pdf).
//
// Допущения: один человек без детей, моложе 65, обычный PAYE-работник; без кредита PRSI для низких зарплат.
const USC_BANDS = [
  { upTo: 12012, rate: 0.005 },
  { upTo: 28700, rate: 0.02 },
  { upTo: 70044, rate: 0.03 },
  { upTo: null, rate: 0.08 },
]

function byBands(income, bands) {
  let tax = 0
  let lower = 0
  for (const { upTo, rate } of bands) {
    const upper = upTo ?? Infinity
    if (income > lower) tax += (Math.min(income, upper) - lower) * rate
    lower = upper
  }
  return tax
}

// Подоходный налог (20% до 44 000 €, 40% выше, минус кредиты 2 000 + 2 000 €)
// плюс универсальный социальный сбор USC (не платится при доходе до 13 000 €)
function irishIncomeTax(_taxableIncome, { gross }) {
  const incomeTax = Math.max(
    0,
    byBands(gross, [
      { upTo: 44000, rate: 0.2 },
      { upTo: null, rate: 0.4 },
    ]) - 4000,
  )
  const usc = gross <= 13000 ? 0 : byBands(gross, USC_BANDS)
  return incomeTax + usc
}

export const ireland = {
  code: 'IE',
  year: 2026,

  contributions: [
    // PRSI: 4,2% с января по сентябрь и 4,35% с 1 октября 2026 → в среднем за год 4,2375%.
    // Не платится, если зарплата не больше 352 € в неделю (18 304 € в год)
    { id: 'prsi', rate: 0.042375, exemptUpTo: 352 * 52, reducesTaxBase: false },
  ],

  incomeTax: {
    formula: irishIncomeTax,
  },
}
