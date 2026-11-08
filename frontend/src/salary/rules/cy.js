// Кипр, 2026 год (после налоговой реформы 2026: без налога до 22 000 €).
// Источники: PwC Tax Summaries (https://taxsummaries.pwc.com/cyprus/individual/taxes-on-personal-income),
// Zeno Legal, зарплата на руки на Кипре 2026 (https://www.zenolegal.com/resources/cyprus-take-home-pay-net-salary-2026).
//
// Допущения: без льготы 50% для приезжих специалистов, без 13-й зарплаты как отдельной выплаты.
export const cyprus = {
  code: 'CY',
  year: 2026,

  contributions: [
    // соцстрахование 8,8%, потолок 68 904 € в год
    { id: 'socialInsurance', rate: 0.088, capBase: 68904, reducesTaxBase: true },
    // общая система здравоохранения (GESY) 2,65%, потолок 180 000 € в год
    { id: 'health', rate: 0.0265, capBase: 180000, reducesTaxBase: true },
  ],

  incomeTax: {
    allowance: 0,
    brackets: [
      { upTo: 22000, rate: 0 },
      { upTo: 32000, rate: 0.2 },
      { upTo: 42000, rate: 0.25 },
      { upTo: 72000, rate: 0.3 },
      { upTo: null, rate: 0.35 },
    ],
  },
}
