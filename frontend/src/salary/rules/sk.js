// Словакия, 2026 год.
// Источник: Forvis Mazars, «Konsolidácia 2026 — mzdové dopady»
// (https://www.forvismazars.com/sk/sk/postrehy/publikacie-a-podujatia/newslettre/payroll-alert-konsolidacia-2026-mzdove-dopady),
// Valem, калькулятор Словакии (https://valem.run/calculators/slovakia/net-salary).
//
// Допущения: трудовой договор, без детей (без налогового бонуса).
export const slovakia = {
  code: 'SK',
  year: 2026,

  contributions: [
    // медстраховка: 5% с 2026 года (было 4%), без потолка
    { id: 'health', rate: 0.05, reducesTaxBase: true },
    // соцстрахование: пенсия 4% + инвалидность 3% + болезнь 1,4% + безработица 1% = 9,4%;
    // потолок 16 764 € в месяц
    { id: 'socialInsurance', rate: 0.094, capBase: 16764 * 12, reducesTaxBase: true },
  ],

  incomeTax: {
    // Необлагаемая часть: 5 966,73 € в год (21 прожиточный минимум). Если база налога (брутто минус взносы)
    // больше 26 083,13 €, она равна 14 661,11 − база / 3 и при 43 983,32 € исчезает
    allowance: { max: 5966.73, taperFrom: 26083.13, taperRate: 1 / 3, onTaxBase: true },
    brackets: [
      { upTo: 43983.32, rate: 0.19 },
      { upTo: 60349.21, rate: 0.25 },
      { upTo: 75010.32, rate: 0.3 },
      { upTo: null, rate: 0.35 },
    ],
  },
}
