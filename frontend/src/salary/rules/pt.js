// Португалия, 2026 год.
// Источники: шкала IRS 2026 после декрета-закона 212/2026 (ставки снижены задним числом с января,
// https://observador.pt/2026/11/04/publicado-em-diario-da-republica-decreto-lei-que-reduz-taxas-dos-seis-primeiros-escaloes-de-irs/),
// границы ступеней и специальный вычет 4 587,09 € (https://contasconnosco.cofidis.pt/impostos/escaloes-irs).
//
// Допущения: 14 выплат в год (отпускные и рождественские), одиночная декларация,
// без вычетов на расходы (здоровье, образование и т. п.) и без режима IRS Jovem.
const BRACKETS = [
  { upTo: 8342, rate: 0.122 },
  { upTo: 12587, rate: 0.152 },
  { upTo: 17838, rate: 0.207 },
  { upTo: 23089, rate: 0.236 },
  { upTo: 29397, rate: 0.306 },
  { upTo: 43090, rate: 0.346 },
  { upTo: 46566, rate: 0.431 },
  { upTo: 86634, rate: 0.446 },
  { upTo: null, rate: 0.48 },
]

// Минимум, который должен остаться после налога (mínimo de existência)
const MINIMUM_LEFT = 12880

function portugueseIncomeTax(grossIncome, { socialContributions }) {
  // специальный вычет: 4 587,09 € или взносы, если они больше
  const taxable = Math.max(0, grossIncome - Math.max(4587.09, socialContributions))
  let tax = 0
  let lower = 0
  for (const { upTo, rate } of BRACKETS) {
    const upper = upTo ?? Infinity
    if (taxable > lower) tax += (Math.min(taxable, upper) - lower) * rate
    lower = upper
  }
  // дополнительный налог солидарности: 2,5% от 80 000 до 250 000 € и 5% выше
  tax += 0.025 * Math.max(0, Math.min(taxable, 250000) - 80000) + 0.05 * Math.max(0, taxable - 250000)
  return Math.min(tax, Math.max(0, grossIncome - MINIMUM_LEFT))
}

export const portugal = {
  code: 'PT',
  year: 2026,
  paymentsPerYear: 14,

  contributions: [
    // соцобеспечение работника 11%; базу налога уменьшает через специальный вычет (в формуле)
    { id: 'socialSecurity', rate: 0.11, reducesTaxBase: false },
  ],

  incomeTax: {
    allowance: 0,
    formula: portugueseIncomeTax,
  },
}
