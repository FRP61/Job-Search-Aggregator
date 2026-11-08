// Австрия, 2026 год. Зарплату платят 14 раз в год: 12 обычных + 13-я и 14-я (Sonderzahlungen).
// Источники: PwC Tax Summaries (https://taxsummaries.pwc.com/austria/individual/taxes-on-personal-income),
// Finanzguide, брутто-нетто 2026 (https://finanzguide.at/steuern/brutto-netto-rechner/),
// Finanzguide, Lohnsteuer 2026 (https://finanzguide.at/steuern/lohnsteuer/).
//
// Допущения: служащий (Angestellter), без детей, без Pendlerpauschale, обычные 14 выплат одинакового размера;
// не учитываем доплату к Verkehrsabsetzbetrag для низких доходов и ставки выше 6% для 13-й/14-й зарплат
// (они начинаются, когда 13-я + 14-я больше 25 000 €).
const REGULAR_SHARE = 12 / 14
const SPECIAL_SHARE = 2 / 14

const BRACKETS = [
  { upTo: 13539, rate: 0 },
  { upTo: 21992, rate: 0.2 },
  { upTo: 36458, rate: 0.3 },
  { upTo: 70365, rate: 0.4 },
  { upTo: 104859, rate: 0.48 },
  { upTo: 1000000, rate: 0.5 },
  { upTo: null, rate: 0.55 },
]

function byBrackets(income) {
  let tax = 0
  let lower = 0
  for (const { upTo, rate } of BRACKETS) {
    const upper = upTo ?? Infinity
    if (income > lower) tax += (Math.min(income, upper) - lower) * rate
    lower = upper
  }
  return tax
}

// Налог в Австрии считается отдельно для 12 обычных зарплат и для 13-й и 14-й
function austrianIncomeTax(_taxableIncome, { gross, contributionsById }) {
  // обычные зарплаты: по шкале, минус 132 € расходов, минус Verkehrsabsetzbetrag 496 €
  const regular = gross * REGULAR_SHARE - contributionsById.regular - 132
  const regularTax = Math.max(0, byBrackets(Math.max(0, regular)) - 496)

  // 13-я и 14-я: первые 620 € без налога, дальше 6%; если после взносов они не больше 2 615 € — налога нет
  const special = gross * SPECIAL_SHARE - contributionsById.special
  const specialTax = special <= 2615 ? 0 : (special - 620) * 0.06

  return regularTax + specialTax
}

export const austria = {
  code: 'AT',
  year: 2026,
  paymentsPerYear: 14,

  contributions: [
    // соцстрахование с обычных зарплат: 18,07%, потолок 6 930 € в месяц
    { id: 'regular', rate: 0.1807, shareOfGross: REGULAR_SHARE, capBase: 6930 * 12, reducesTaxBase: false },
    // с 13-й и 14-й зарплат: 17,07% (без взносов в Палату труда и на жильё), потолок 13 860 € в год
    { id: 'special', rate: 0.1707, shareOfGross: SPECIAL_SHARE, capBase: 13860, reducesTaxBase: false },
  ],

  incomeTax: {
    // всё считает формула выше: у обычных и особых выплат разные правила
    formula: austrianIncomeTax,
  },
}
