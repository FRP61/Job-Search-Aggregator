// Латвия, 2026 год.
// Источники: PwC Latvia, «2026. gada špikeris» (https://www.pwc.com/lv/lv/news/2026-gada-spikeris.html),
// PwC Tax Summaries (https://taxsummaries.pwc.com/latvia/individual),
// Минфин Латвии (https://www.fm.gov.lv/en/changes-taxation-and-finances-2026).
//
// Допущения: работник по трудовому договору с подданной налоговой книжкой,
// налоговый резидент, не пенсионер, без иждивенцев.
// Не учитываем: доплату 3% с дохода свыше 200 000 € в год (она идёт через годовую декларацию).
// Порог 33% применяем к сумме после вычетов — источники это прямо не уточняют.
// Взносы работодателя (23,59%) платятся сверх зарплаты, поэтому их здесь нет.
export const latvia = {
  code: 'LV',
  year: 2026,

  contributions: [
    // государственное социальное страхование (VSAOI): только с первых 105 300 € в год
    { id: 'socialInsurance', rate: 0.105, capBase: 105300, reducesTaxBase: true },
  ],

  incomeTax: {
    // необлагаемый минимум за год: 550 € в месяц × 12
    allowance: 6600,
    brackets: [
      { upTo: 105300, rate: 0.255 },
      { upTo: null, rate: 0.33 },
    ],
  },
}
