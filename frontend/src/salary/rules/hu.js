// Венгрия, 2026 год. Все суммы в форинтах (HUF).
// Источник: Valem, калькулятор Венгрии (https://valem.run/calculators/hungary/net-salary),
// PwC Tax Summaries (https://taxsummaries.pwc.com/Hungary/Individual/Other-taxes).
//
// Допущения: старше 25 лет, без детей (без семейных льгот), не мать двоих и более детей.
export const hungary = {
  code: 'HU',
  year: 2026,
  currency: 'HUF',

  contributions: [
    // социальный взнос (TB-járulék) 18,5%, без потолка; базу налога не уменьшает
    { id: 'socialInsurance', rate: 0.185, reducesTaxBase: false },
  ],

  incomeTax: {
    // подоходный налог (SZJA) 15% со всей зарплаты брутто
    allowance: 0,
    brackets: [{ upTo: null, rate: 0.15 }],
  },
}
