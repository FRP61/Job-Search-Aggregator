// Мальта, 2026 год.
// Источники: PwC Tax Summaries (https://taxsummaries.pwc.com/malta/individual/taxes-on-personal-income),
// PwC Malta, изменения в зарплатах 2026 (https://www.pwc.com/mt/en/publications/tax-legal/payroll-updates-2026.html).
//
// Допущения: ставки для одиночки (single), родился после 1961 года;
// не учитываем обязательные государственные бонусы и доплату на стоимость жизни (COLA).
export const malta = {
  code: 'MT',
  year: 2026,

  contributions: [
    // соцстрахование класса 1: 10%, но не больше 55,93 € в неделю (2 908,36 € в год).
    // На Мальте взнос НЕ уменьшает базу налога
    { id: 'socialSecurity', rate: 0.1, capBase: (55.93 / 0.1) * 52, reducesTaxBase: false },
  ],

  incomeTax: {
    allowance: 0,
    brackets: [
      { upTo: 12000, rate: 0 },
      { upTo: 16000, rate: 0.15 },
      { upTo: 60000, rate: 0.25 },
      { upTo: null, rate: 0.35 },
    ],
  },
}
