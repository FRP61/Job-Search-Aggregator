// Чехия, 2026 год. Все суммы в кронах (CZK).
// Источник: ASB Group, изменения в зарплатах на 2026 (https://asbgroup.eu/en/news/legislative-changes-in-payroll-for-2026),
// Country Tax Calc, зарплата в Праге 2026 (https://www.countrytaxcalc.com/tax-guides/prague-salary-take-home-pay-2026/).
// Средняя зарплата для расчётов 2026: 48 967 Kč в месяц.
//
// Допущения: трудовой договор, без детей и без других скидок кроме основной скидки на налогоплательщика.
const AVERAGE_WAGE = 48967

export const czechia = {
  code: 'CZ',
  year: 2026,
  currency: 'CZK',

  // В Чехии взносы НЕ уменьшают базу налога: налог считается с брутто
  contributions: [
    // соцстрахование: пенсия 6,5% + болезнь 0,6%; потолок 48 средних зарплат в год (2 350 416 Kč)
    { id: 'socialInsurance', rate: 0.071, capBase: 48 * AVERAGE_WAGE, reducesTaxBase: false },
    // медстраховка 4,5%, без потолка
    { id: 'health', rate: 0.045, reducesTaxBase: false },
  ],

  incomeTax: {
    allowance: 0,
    brackets: [
      // 15% до 36 средних зарплат в год (1 762 812 Kč), 23% выше
      { upTo: 36 * AVERAGE_WAGE, rate: 0.15 },
      { upTo: null, rate: 0.23 },
    ],
    // скидка на налогоплательщика (sleva na poplatníka): 2 570 Kč в месяц
    taxCredit: 30840,
  },
}
