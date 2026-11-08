// Швеция, 2026 год. Все суммы — в шведских кронах (SEK).
// Источники: Skatteverket, суммы и проценты 2026 (https://www.skatteverket.se/privat/skatter/beloppochprocent/2026)
// и техническое описание SKV 433 (2026) — формулы базового вычета и jobbskatteavdrag.
//
// Допущения: моложе 66 лет; средний муниципальный налог 32,38%;
// без церковного взноса и взноса на похороны (begravningsavgift, около 0,3%).
const PBB = 59200 // базовая сумма (prisbasbelopp) 2026
const MUNICIPAL_RATE = 0.3238

const floorTo100 = (x) => Math.floor(x / 100) * 100

// Базовый вычет (grundavdrag) для моложе 66 лет, округляется вверх до сотни
function basicDeduction(income) {
  let deduction
  if (income <= 0.99 * PBB) deduction = 0.423 * PBB
  else if (income <= 2.72 * PBB) deduction = 0.423 * PBB + 0.2 * (income - 0.99 * PBB)
  else if (income <= 3.11 * PBB) deduction = 0.77 * PBB
  else if (income <= 7.88 * PBB) deduction = 0.77 * PBB - 0.1 * (income - 3.11 * PBB)
  else deduction = 0.293 * PBB
  return Math.min(income, Math.ceil(deduction / 100) * 100)
}

// Скидка работающим (jobbskatteavdrag)
function jobTaxCredit(workIncome, deduction) {
  const ai = floorTo100(workIncome)
  let base
  if (ai <= 0.91 * PBB) base = ai
  else if (ai <= 3.24 * PBB) base = 0.91 * PBB + 0.3874 * (ai - 0.91 * PBB)
  else if (ai <= 8.08 * PBB) base = 1.813 * PBB + 0.251 * (ai - 3.24 * PBB)
  else base = 3.027 * PBB
  return Math.max(0, Math.floor((base - deduction) * MUNICIPAL_RATE))
}

function swedishIncomeTax(grossIncome, { socialContributions }) {
  const income = floorTo100(grossIncome)
  const deduction = basicDeduction(income)
  const taxable = income - deduction
  const municipal = Math.floor(taxable * MUNICIPAL_RATE)
  // государственный налог 20% с части выше 643 000 kr
  const state = taxable - 643000 >= 200 ? Math.floor(0.2 * (taxable - 643000)) : 0
  // пенсионный взнос полностью возвращается скидкой с налога
  const pensionCredit = Math.min(socialContributions, municipal + state)
  // скидка на трудовой доход: 0,75% от 40 000 до 240 000 kr, не больше 1 500 kr
  const earnedIncomeCredit = Math.min(1500, 0.0075 * Math.max(0, taxable - 40000))
  // взнос на общественное телерадио: 1%, не больше 1 184 kr
  const publicService = Math.min(1184, Math.floor(0.01 * taxable))
  const tax = municipal + state - pensionCredit - jobTaxCredit(grossIncome, deduction) - earnedIncomeCredit
  return Math.max(0, tax) + publicService
}

// Пенсионный взнос 7%, округляется до сотни (50 — вниз), не больше 47 100 kr
function pensionFee(grossIncome) {
  if (grossIncome < 25042) return 0
  return Math.min(47100, Math.ceil((0.07 * grossIncome - 50) / 100) * 100)
}

export const sweden = {
  code: 'SE',
  year: 2026,
  currency: 'SEK',

  contributions: [{ id: 'pension', amount: pensionFee, reducesTaxBase: false }],

  incomeTax: {
    allowance: 0,
    formula: swedishIncomeTax,
  },
}
