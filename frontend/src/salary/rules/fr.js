// Франция, 2026 год.
// Источник: шкала налога 2026 и décote (https://www.lescalculateurs.fr/pages/guide-complet-impot-revenu-2026);
// ставки взносов работника — URSSAF/AGIRC-ARRCO (вычисления по стандартным ставкам 2026).
//
// Допущения: работник не-кадр (non-cadre) частной компании, одинокий (1 налоговая часть),
// без дополнительной медстраховки (mutuelle) и прочих взносов по коллективному договору.
// Потолок соцобеспечения (PSS) 2026: 4 005 € в месяц = 48 060 € в год.
const PSS = 48060

export const france = {
  code: 'FR',
  year: 2026,

  contributions: [
    // базовая пенсия: 6,9% до потолка + 0,4% со всей зарплаты
    { id: 'pensionCapped', rate: 0.069, capBase: PSS, reducesTaxBase: true },
    { id: 'pension', rate: 0.004, reducesTaxBase: true },
    // дополнительная пенсия AGIRC-ARRCO: до потолка 3,15% + 0,86%,
    // между 1 и 8 потолками 8,64% + 1,08% + 0,14%
    { id: 'complementaryT1', rate: 0.0401, capBase: PSS, reducesTaxBase: true },
    { id: 'complementaryT2', rate: 0.0986, capBase: 8 * PSS, fromBase: PSS, reducesTaxBase: true },
    // CSG 6,8% с 98,25% зарплаты — вычитается из базы налога
    { id: 'csgDeductible', rate: 0.068 * 0.9825, reducesTaxBase: true },
    // CSG 2,4% + CRDS 0,5% с 98,25% зарплаты — не вычитаются
    { id: 'csgCrds', rate: 0.029 * 0.9825, reducesTaxBase: false },
  ],

  incomeTax: {
    allowance: 0,
    formula: frenchIncomeTax,
  },
}

// Налог: зарплата после вычитаемых взносов минус 10% (от 504 до 14 426 €), шкала для 1 части,
// и скидка «décote» для небольших налогов
function frenchIncomeTax(taxableSalary) {
  const netTaxable = taxableSalary - Math.min(Math.max(taxableSalary * 0.1, 504), 14426)
  const brackets = [
    { upTo: 11600, rate: 0 },
    { upTo: 29579, rate: 0.11 },
    { upTo: 84577, rate: 0.3 },
    { upTo: 181917, rate: 0.41 },
    { upTo: null, rate: 0.45 },
  ]
  let tax = 0
  let lower = 0
  for (const { upTo, rate } of brackets) {
    const upper = upTo ?? Infinity
    if (netTaxable > lower) tax += (Math.min(netTaxable, upper) - lower) * rate
    lower = upper
  }
  if (tax < 1929) {
    tax -= Math.max(0, 873 - 0.4525 * tax)
  }
  return Math.max(0, tax)
}
