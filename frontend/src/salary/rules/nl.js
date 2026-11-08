// Нидерланды, 2026 год.
// Источник: Belastingdienst, тарифы и налоговые скидки 2026
// (https://www.belastingdienst.nl/wps/wcm/connect/nl/voorlopige-aanslag/content/voorlopige-aanslag-tarieven-en-heffingskortingen).
//
// В Нидерландах работник отдельно не платит соцвзносы: страховые премии уже входят в ставки налога,
// а медстраховку по зарплате (Zvw) платит работодатель.
// Допущения: моложе пенсионного возраста, без взноса в пенсионный фонд работодателя,
// без 30%-льготы для приезжих специалистов; отпускные (8%) входят в годовую сумму брутто.
const BRACKETS = [
  { upTo: 38883, rate: 0.3575 },
  { upTo: 78426, rate: 0.3756 },
  { upTo: null, rate: 0.495 },
]

function byBrackets(income) {
  let tax = 0
  let lower = 0
  for (const { upTo, rate } of BRACKETS) {
    const upper = upTo ?? Infinity
    if (income > lower) tax += (Math.min(income, upper) - lower) * rate
    lower = upper
  }
  return tax
}

// Общая налоговая скидка (algemene heffingskorting): 3 115 €, уменьшается на 6,398% дохода выше 29 736 €
function generalCredit(income) {
  return Math.max(0, 3115 - 0.06398 * Math.max(0, income - 29736))
}

// Скидка работающим (arbeidskorting): растёт до 5 685 € и потом уменьшается
function labourCredit(income) {
  if (income < 11965) return 0.08324 * income
  if (income < 25845) return 996 + 0.31009 * (income - 11965)
  if (income < 45592) return 5300 + 0.0195 * (income - 25845)
  if (income < 132920) return 5685 - 0.0651 * (income - 45592)
  return 0
}

function dutchIncomeTax(taxableIncome) {
  return Math.max(0, byBrackets(taxableIncome) - generalCredit(taxableIncome) - labourCredit(taxableIncome))
}

export const netherlands = {
  code: 'NL',
  year: 2026,

  contributions: [],

  incomeTax: {
    allowance: 0,
    formula: dutchIncomeTax,
  },
}
