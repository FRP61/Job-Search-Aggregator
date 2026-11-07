// Литва, 2026 год.
// Источники: VMI, изменения налоговых законов с 2026-01-01
// (https://www.vmi.lt/evmi/documents/20142/391071/Mokes%C4%8Di%C5%B3+%C4%AFstatymo+pakeitimai+nuo+2026-01-01.pdf/),
// PwC Tax Summaries (https://taxsummaries.pwc.com/lithuania/individual/taxes-on-personal-income),
// финансовые показатели 2026 (https://www.visosskaiciuokles.lt/finansiniai-rodikliai.html).
//
// Допущения: работник по трудовому договору, налоговый резидент, без инвалидности,
// НЕ участвует во II пенсионной ступени (участники платят ещё 3%).
// Повышенные ставки 25% и 32% работодатель обычно не удерживает —
// они доплачиваются в годовой декларации; мы считаем налог за год, поэтому учитываем их.
// Взносы работодателя платятся сверх зарплаты, поэтому их здесь нет.

// Средняя зарплата (VDU) для порогов 2026 года: 2 312,15 € в месяц
const AVERAGE_WAGE_ANNUAL = 2312.15 * 12

export const lithuania = {
  code: 'LT',
  year: 2026,

  // В Литве взносы НЕ уменьшают базу подоходного налога
  contributions: [
    // соцстрахование (VSD): пенсия 8,72% + болезнь 1,99% + материнство 1,81%;
    // потолок — 60 средних зарплат в год (138 729 €)
    { id: 'socialInsurance', rate: 0.1252, capBase: 60 * AVERAGE_WAGE_ANNUAL, reducesTaxBase: false },
    // обязательное медстрахование (PSD), без потолка
    { id: 'healthInsurance', rate: 0.0698, reducesTaxBase: false },
  ],

  incomeTax: {
    // Необлагаемый минимум (NPD) «тает» с ростом зарплаты:
    // 8 964 € в год (747 € × 12) при зарплате до минимальной (1 153 € × 12 = 13 836 €),
    // дальше минус 0,49 € за каждый евро сверху, но не меньше нуля
    allowance: { max: 8964, taperFrom: 13836, taperRate: 0.49 },
    brackets: [
      { upTo: 36 * AVERAGE_WAGE_ANNUAL, rate: 0.2 }, // до 83 237,40 €
      { upTo: 60 * AVERAGE_WAGE_ANNUAL, rate: 0.25 }, // до 138 729 €
      { upTo: null, rate: 0.32 },
    ],
  },
}
