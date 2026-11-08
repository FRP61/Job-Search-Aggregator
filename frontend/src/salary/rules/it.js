// Италия, 2026 год.
// Источники: закон о бюджете 2026 (ставки IRPEF 23% / 33% / 43%,
// https://www.diritto.it/irpef-2026-aliquote-detrazioni-e-riduzioni-dimposta-nella-legge-di-bilancio-2026/),
// TUIR ст. 13 (вычет для работников), закон 207/2024 ст. 1 п. 4–9 (cuneo fiscale).
//
// Допущения: работник частной компании с 13 выплатами в год (tredicesima);
// региональная надбавка 1,73% и муниципальная 0,8% — примерно как в крупных городах
// (в каждом регионе и городе свои ставки).
export const italy = {
  code: 'IT',
  year: 2026,
  paymentsPerYear: 13,

  contributions: [
    // пенсионный взнос INPS работника 9,19% и ещё 1% с части выше 56 224 € в год
    { id: 'inps', rate: 0.0919, reducesTaxBase: true },
    { id: 'inpsExtra', rate: 0.01, fromBase: 56224, reducesTaxBase: true },
  ],

  incomeTax: {
    allowance: 0,
    formula: italianIncomeTax,
  },
}

const BRACKETS = [
  { upTo: 28000, rate: 0.23 },
  { upTo: 50000, rate: 0.33 },
  { upTo: null, rate: 0.43 },
]

// Вычет для работников (detrazione per lavoro dipendente)
function employeeCredit(income) {
  let credit
  if (income <= 15000) credit = 1955
  else if (income <= 28000) credit = 1910 + (1190 * (28000 - income)) / 13000
  else if (income <= 50000) credit = (1910 * (50000 - income)) / 22000
  else credit = 0
  // ещё 65 € для дохода от 25 000 до 35 000 €
  if (income > 25000 && income <= 35000) credit += 65
  return credit
}

// Cuneo fiscale для дохода от 20 000 до 40 000 €: дополнительный вычет
function wedgeCredit(income) {
  if (income <= 20000 || income > 40000) return 0
  if (income <= 32000) return 1000
  return (1000 * (40000 - income)) / 8000
}

// Cuneo fiscale для дохода до 20 000 €: необлагаемая доплата в процентах от дохода
function wedgeBonus(income) {
  if (income <= 8500) return 0.071 * income
  if (income <= 15000) return 0.053 * income
  if (income <= 20000) return 0.048 * income
  return 0
}

function italianIncomeTax(income) {
  let grossTax = 0
  let lower = 0
  for (const { upTo, rate } of BRACKETS) {
    const upper = upTo ?? Infinity
    if (income > lower) grossTax += (Math.min(income, upper) - lower) * rate
    lower = upper
  }
  const irpef = Math.max(0, grossTax - employeeCredit(income) - wedgeCredit(income))
  // региональная и муниципальная надбавки — только если IRPEF больше нуля
  const surcharges = irpef > 0 ? income * (0.0173 + 0.008) : 0
  // доплата cuneo уменьшает налог (может сделать его отрицательным — тогда это доплата к зарплате)
  return irpef + surcharges - wedgeBonus(income)
}
