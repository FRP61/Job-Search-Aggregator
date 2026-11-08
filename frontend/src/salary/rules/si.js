// Словения, 2026 год.
// Источники: Regfollower, шкала и вычеты 2026 (https://regfollower.com/slovenia-ministry-of-finance-publishes-2026-personal-income-tax-brackets-allowances/),
// PwC Tax Summaries, взносы (https://taxsummaries.pwc.com/slovenia/individual/other-taxes).
//
// Допущения: без детей; не учитываем дополнительный общий вычет для низких зарплат.
export const slovenia = {
  code: 'SI',
  year: 2026,

  contributions: [
    // пенсия 15,5% + здоровье 6,36% + безработица 0,14% + родительское 0,1% + уход 1% = 23,1%
    { id: 'socialInsurance', rate: 0.231, reducesTaxBase: true },
    // обязательный медвзнос: 39,36 € в месяц (с марта 2026), базу налога не уменьшает
    { id: 'healthFixed', fixedAnnual: 39.36 * 12, reducesTaxBase: false },
  ],

  incomeTax: {
    // общий вычет
    allowance: 5551.93,
    brackets: [
      { upTo: 9721.43, rate: 0.16 },
      { upTo: 28592.44, rate: 0.26 },
      { upTo: 57184.88, rate: 0.33 },
      { upTo: 82346.23, rate: 0.39 },
      { upTo: null, rate: 0.5 },
    ],
  },
}
