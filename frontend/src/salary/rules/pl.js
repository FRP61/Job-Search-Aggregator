// Польша, 2026 год. Все суммы в злотых (PLN).
// Источники: Freenance, расчётная ведомость 2026 (https://freenance.io/guides/how-to-read-payslip-poland-2026/),
// ставки PIT 2026 (https://freenance.io/podatki/stawki-pit-2026-skala-liniowy-ryczalt-kwota-wolna-przeglad-zmian/),
// годовой лимит взносов 2026 (https://poradnikprzedsiebiorcy.pl/-przekroczenie-rocznej-podstawy-wymiaru-skladek-emerytalno-rentowych).
//
// Допущения: трудовой договор (umowa o pracę), старше 26 лет (без «ulga dla młodych»),
// без добровольного PPK, работает в своём городе (обычные расходы 250 zł в месяц).
// Налог считаем точно за год; работодатель каждый месяц округляет его до злотого,
// разница выравнивается в годовой декларации.
// Взносы работодателя платятся сверх зарплаты, поэтому их здесь нет.
export const poland = {
  code: 'PL',
  year: 2026,
  currency: 'PLN',

  contributions: [
    // пенсионный и по инвалидности: только с первых 282 600 zł в год (30 средних зарплат)
    { id: 'pension', rate: 0.0976, capBase: 282600, reducesTaxBase: true },
    { id: 'disability', rate: 0.015, capBase: 282600, reducesTaxBase: true },
    // больничный: без потолка
    { id: 'sickness', rate: 0.0245, reducesTaxBase: true },
    // медстраховка: 9% от «брутто минус взносы выше», подоходный налог НЕ уменьшает
    { id: 'health', rate: 0.09, afterPreviousContributions: true, reducesTaxBase: false },
  ],

  incomeTax: {
    // расходы работника (koszty uzyskania przychodu): 250 zł × 12 — уменьшают базу налога
    allowance: 3000,
    brackets: [
      { upTo: 120000, rate: 0.12 },
      { upTo: null, rate: 0.32 },
    ],
    // скидка с уже посчитанного налога (kwota zmniejszająca podatek) = 12% от 30 000 zł
    taxCredit: 3600,
  },
}
