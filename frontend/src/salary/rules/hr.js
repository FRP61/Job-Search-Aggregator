// Хорватия, 2026 год. Ставки налога устанавливает город; берём Загреб (23% и 33%).
// Источник: Valem, калькулятор Хорватии (https://valem.run/calculators/croatia/net-salary),
// Boundless, налоги после отмены prirez (https://boundlesshq.com/blog/what-employers-owe-after-croatia-prirez-abolition/).
//
// Допущения: работа в Загребе, без детей и иждивенцев, моложе 25 лет льготы не учитываем;
// не учитываем максимальную базу пенсионного взноса (касается только очень высоких зарплат).
// Медстраховку 16,5% платит работодатель сверху.
export const croatia = {
  code: 'HR',
  year: 2026,

  contributions: [
    // пенсия: I ступень 15% + II ступень 5%
    { id: 'pension', rate: 0.2, reducesTaxBase: true },
  ],

  incomeTax: {
    // личный вычет 600 € в месяц
    allowance: 600 * 12,
    brackets: [
      // нижняя ставка до 5 000 € базы в месяц, верхняя — выше
      { upTo: 5000 * 12, rate: 0.23 },
      { upTo: null, rate: 0.33 },
    ],
  },
}
