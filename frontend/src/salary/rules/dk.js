// Дания, 2026 год. Все суммы — в датских кронах (DKK).
// Источник: суммы и ставки 2026 (https://themis.dk/synopsis/docs/Oversigt_over_beloebsgraenser_2026_.html);
// новые ступени 2026 (средний и верхний налог) — https://www.thelocal.dk/20251113/middle-top-and-top-top-how-denmarks-tax-brackets-are-changing-in-2026.
//
// Допущения: средний муниципальный налог 25%, без церковного налога;
// ATP работника 99 kr в месяц (полная занятость); без пенсии от работодателя.
const PERSONAL_ALLOWANCE = 54100

function danishIncomeTax(personalIncome, { gross, contributionsById }) {
  // трудовой доход для вычетов — зарплата минус ATP
  const workIncome = gross - contributionsById.atp
  // вычет за занятость 12,75% (не больше 63 300 kr) и jobfradrag 4,5% выше 235 200 kr (не больше 3 100 kr)
  const employmentDeduction = Math.min(63300, 0.1275 * workIncome)
  const jobDeduction = Math.min(3100, 0.045 * Math.max(0, workIncome - 235200))
  const taxableIncome = personalIncome - employmentDeduction - jobDeduction

  // муниципальный налог 25% и нижний государственный 12,01% — с дохода выше личного вычета
  const municipal = 0.25 * Math.max(0, taxableIncome - PERSONAL_ALLOWANCE)
  const bottom = 0.1201 * Math.max(0, personalIncome - PERSONAL_ALLOWANCE)
  // средний 7,5% выше 641 200 kr, верхний 7,5% выше 777 900 kr, самый верхний 5% выше 2 592 500 kr
  const middle = 0.075 * Math.max(0, personalIncome - 641200)
  const top = 0.075 * Math.max(0, personalIncome - 777900)
  const topTop = 0.05 * Math.max(0, personalIncome - 2592500)
  return municipal + bottom + middle + top + topTop
}

export const denmark = {
  code: 'DK',
  year: 2026,
  currency: 'DKK',

  contributions: [
    // пенсионный взнос ATP: 99 kr в месяц
    { id: 'atp', fixedAnnual: 99 * 12, reducesTaxBase: true },
    // взнос на рынок труда (AM-bidrag) 8% с зарплаты после ATP
    { id: 'labourMarket', rate: 0.08, afterPreviousContributions: true, reducesTaxBase: true },
  ],

  incomeTax: {
    allowance: 0,
    formula: danishIncomeTax,
  },
}
