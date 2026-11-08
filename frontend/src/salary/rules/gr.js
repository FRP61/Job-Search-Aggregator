// Греция, 2026 год (после снижения ставок с 2026 года). Зарплату платят 14 раз в год:
// 12 обычных + рождественская (1), пасхальная (0,5) и отпускная (0,5).
// Источники: Valem, калькулятор Греции (https://valem.run/calculators/greece/net-salary),
// Country Tax Calc, налоги Греции (https://www.countrytaxcalc.com/tax-guides/greece-tax-guide/).
//
// Допущения: без детей, старше 25 лет (без льгот для молодёжи).
const BRACKETS = [
  { upTo: 10000, rate: 0.09 },
  { upTo: 20000, rate: 0.2 },
  { upTo: 30000, rate: 0.26 },
  { upTo: 40000, rate: 0.34 },
  { upTo: 60000, rate: 0.39 },
  { upTo: null, rate: 0.44 },
]

// Налог по шкале минус скидка 777 €, которая уменьшается на 20 € за каждые 1 000 € дохода выше 12 000 €
function greekIncomeTax(taxableIncome) {
  let tax = 0
  let lower = 0
  for (const { upTo, rate } of BRACKETS) {
    const upper = upTo ?? Infinity
    if (taxableIncome > lower) tax += (Math.min(taxableIncome, upper) - lower) * rate
    lower = upper
  }
  const credit = Math.max(0, 777 - 0.02 * Math.max(0, taxableIncome - 12000))
  return Math.max(0, tax - credit)
}

export const greece = {
  code: 'GR',
  year: 2026,
  paymentsPerYear: 14,

  contributions: [
    // EFKA 13,37%, потолок 7 761,94 € с каждой из 14 выплат
    { id: 'efka', rate: 0.1337, capBase: 7761.94 * 14, reducesTaxBase: true },
  ],

  incomeTax: {
    allowance: 0,
    formula: greekIncomeTax,
  },
}
