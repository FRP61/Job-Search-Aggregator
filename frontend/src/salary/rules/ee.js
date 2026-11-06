// Эстония, 2026 год.
// Источник: налоговая служба Эстонии (EMTA)
// https://emta.ee/en/business-client/taxes-and-payment/income-and-social-taxes/tax-rates
//
// Допущения: работник по трудовому договору, налоговый резидент, не пенсионер,
// во II пенсионную ступень платит 2% (так по умолчанию).
// Соцналог 33% платит работодатель сверх зарплаты, поэтому его здесь нет.
export const estonia = {
  code: 'EE',
  year: 2026,

  // Взносы, которые удерживают из зарплаты работника (доля от брутто)
  contributions: [
    // страхование от безработицы
    { id: 'unemployment', rate: 0.016, reducesTaxBase: true },
    // II пенсионная ступень
    { id: 'pension', rate: 0.02, reducesTaxBase: true },
  ],

  incomeTax: {
    // необлагаемый минимум за год: 700 € в месяц × 12
    allowance: 8400,
    // ставки по ступеням; upTo: null значит «и всё, что выше».
    // В Эстонии одна ставка на всю сумму.
    brackets: [{ upTo: null, rate: 0.22 }],
  },
}
