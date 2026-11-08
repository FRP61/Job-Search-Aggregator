// Бельгия, 2026 год (доходы 2026 года, налоговая декларация 2027).
// Источники: Dexxter, ставки 2026 (https://dexxter.be/blog/wat-zijn-de-belastingschijven-in-belgie-2026/),
// PwC Tax Summaries (https://taxsummaries.pwc.com/belgium/individual/other-taxes и /deductions),
// RSZ, особый взнос на соцобеспечение
// (https://www.socialsecurity.be/employer/instructions/dmfappl/nl/latest/instructions/special_contributions/other_specialcontributions/specialsocialsecuritycontribution.html).
//
// Допущения: одинокий без детей; коммунальная надбавка 7% (средняя по стране);
// без «рабочего бонуса» для низких зарплат; расходы работника — 30%, не больше 5 930 €
// (последний опубликованный максимум, для доходов 2025 года).

// Особый взнос на соцобеспечение для одинокого: считается по месячной зарплате
function specialSocialContribution(grossAnnual) {
  const monthly = grossAnnual / 12
  let perMonth
  if (monthly <= 1945.38) perMonth = 0
  else if (monthly <= 2190.18) perMonth = 0.076 * (monthly - 1945.38)
  else if (monthly <= 6038.82) perMonth = 18.6 + 0.011 * (monthly - 2190.18)
  else perMonth = 60.94
  return Math.round(perMonth * 100) / 100 * 12
}

const BRACKETS = [
  { upTo: 16720, rate: 0.25 },
  { upTo: 29510, rate: 0.4 },
  { upTo: 51070, rate: 0.45 },
  { upTo: null, rate: 0.5 },
]

// Федеральный налог по шкале минус скидка за необлагаемую сумму (25% × 11 550 €),
// плюс коммунальная надбавка 7%
function belgianIncomeTax(taxableIncome) {
  let tax = 0
  let lower = 0
  for (const { upTo, rate } of BRACKETS) {
    const upper = upTo ?? Infinity
    if (taxableIncome > lower) tax += (Math.min(taxableIncome, upper) - lower) * rate
    lower = upper
  }
  const federal = Math.max(0, tax - 0.25 * 11550)
  return federal * 1.07
}

export const belgium = {
  code: 'BE',
  year: 2026,

  contributions: [
    // соцстрахование работника 13,07%, без потолка; уменьшает базу налога
    { id: 'socialSecurity', rate: 0.1307, reducesTaxBase: true },
    // особый взнос на соцобеспечение; базу налога не уменьшает
    { id: 'specialSocialSecurity', amount: specialSocialContribution, reducesTaxBase: false },
  ],

  incomeTax: {
    // расходы работника считаются от зарплаты после взносов, поэтому — в формуле ниже
    allowance: 0,
    formula: (incomeAfterContributions) =>
      belgianIncomeTax(incomeAfterContributions - Math.min(5930, 0.3 * incomeAfterContributions)),
  },
}
