// Люксембург, 2026 год.
// Источники: PwC Luxembourg, социальные параметры с 1 января 2026
// (https://www.pwc.lu/en/newsletter/2026/social-parameters-jan-2026.html),
// PwC Tax Summaries, шкала налога (https://taxsummaries.pwc.com/luxembourg/individual/taxes-on-personal-income).
//
// Допущения: налоговый класс 1 (одинокий без детей); шкала налога — последняя опубликованная (2025);
// не учитываем налоговый кредит работника (CIS, до ~58 € в месяц) и кредит для минимальной зарплаты.
const CEILING = 162224.16 // потолок взносов: 5 минимальных зарплат в год
const MIN_WAGE = 2703.74 // минимальная зарплата с 1 января 2026

export const luxembourg = {
  code: 'LU',
  year: 2026,

  // Все взносы работника уменьшают базу налога
  contributions: [
    // медстраховка: 2,8% + 0,25% (пособия по болезни)
    { id: 'health', rate: 0.0305, capBase: CEILING, reducesTaxBase: true },
    // пенсия: 8,5% с 2026 года
    { id: 'pension', rate: 0.085, capBase: CEILING, reducesTaxBase: true },
    // страхование по уходу 1,4%, без потолка, но с вычетом 1/4 минимальной зарплаты в месяц
    { id: 'care', rate: 0.014, fromBase: (MIN_WAGE / 4) * 12, reducesTaxBase: true },
  ],

  incomeTax: {
    // расходы на получение дохода 540 € + особые расходы 480 €
    allowance: 1020,
    brackets: [
      { upTo: 13230, rate: 0 },
      { upTo: 15435, rate: 0.08 },
      { upTo: 17640, rate: 0.09 },
      { upTo: 19845, rate: 0.1 },
      { upTo: 22050, rate: 0.11 },
      { upTo: 24255, rate: 0.12 },
      { upTo: 26550, rate: 0.14 },
      { upTo: 28845, rate: 0.16 },
      { upTo: 31140, rate: 0.18 },
      { upTo: 33435, rate: 0.2 },
      { upTo: 35730, rate: 0.22 },
      { upTo: 38025, rate: 0.24 },
      { upTo: 40320, rate: 0.26 },
      { upTo: 42615, rate: 0.28 },
      { upTo: 44910, rate: 0.3 },
      { upTo: 47205, rate: 0.32 },
      { upTo: 49500, rate: 0.34 },
      { upTo: 51795, rate: 0.36 },
      { upTo: 54090, rate: 0.38 },
      { upTo: 117450, rate: 0.39 },
      { upTo: 176160, rate: 0.4 },
      { upTo: 234870, rate: 0.41 },
      { upTo: null, rate: 0.42 },
    ],
    // взнос в фонд занятости: 7% от налога (9%, если облагаемый доход больше 150 000 €)
    surchargeRate: (taxableIncome) => (taxableIncome > 150000 ? 0.09 : 0.07),
  },
}
