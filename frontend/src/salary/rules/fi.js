// Финляндия, 2026 год.
// Источники: Veronmaksajat — государственная шкала 2026
// (https://www.veronmaksajat.fi/neuvot/henkiloverotus/tyo-elake-ja-etuudet/ansiotulojen-verot-ja-maksut/valtion-tulovero/),
// вычеты 2026 (https://www.veronmaksajat.fi/neuvot/henkiloverotus/tyo-elake-ja-etuudet/verovahennykset/ansiotuloista-tehtavat-vahennykset-2026-2022/),
// взносы и средний муниципальный налог 7,57% (KPMG, https://kpmg.com/fi/fi/ajankohtaista/verotus-ja-lainsaadanto/vuoden-2026-henkiloveromuutokset-mita-sinun-tulee-tietaa.html).
//
// Допущения: 18–52 года, без церковного налога, средний муниципальный налог;
// медвзнос 1,10% и Yle-налог входят в строку налога.
const MUNICIPAL_RATE = 0.0757

const STATE_BRACKETS = [
  { upTo: 22000, rate: 0.1264 },
  { upTo: 32600, rate: 0.19 },
  { upTo: 40100, rate: 0.3025 },
  { upTo: 52100, rate: 0.3325 },
  { upTo: null, rate: 0.375 },
]

function stateTax(income) {
  let tax = 0
  let lower = 0
  for (const { upTo, rate } of STATE_BRACKETS) {
    const upper = upTo ?? Infinity
    if (income > lower) tax += (Math.min(income, upper) - lower) * rate
    lower = upper
  }
  return tax
}

// pureIncome — «чистый трудовой доход»: брутто минус взносы минус 750 € расходов
function finnishIncomeTax(pureIncome, { gross }) {
  // базовый вычет (только для муниципального налога): 4 265 €, уменьшается на 18% дохода выше
  const basicDeduction = Math.max(0, 4265 - 0.18 * Math.max(0, pureIncome - 4265))
  const municipalBase = Math.max(0, pureIncome - basicDeduction)
  const municipal = municipalBase * MUNICIPAL_RATE
  // медвзнос 1,10% с облагаемого дохода
  const healthCare = municipalBase * 0.011
  // скидка работающим: 18% зарплаты, не больше 3 430 €; минус 2% дохода выше 35 000 € (до 50 550 €)
  const workCredit = Math.max(
    0,
    Math.min(3430, 0.18 * gross) - 0.02 * Math.max(0, Math.min(pureIncome, 50550) - 35000),
  )
  // Yle-налог: 2,5% дохода выше 15 150 €, не больше 160 €
  const yle = Math.min(160, 0.025 * Math.max(0, pureIncome - 15150))
  return Math.max(0, stateTax(pureIncome) + municipal + healthCare - workCredit) + yle
}

export const finland = {
  code: 'FI',
  year: 2026,

  // Все три взноса вычитаются из дохода перед налогом
  contributions: [
    // пенсия TyEL
    { id: 'pension', rate: 0.073, reducesTaxBase: true },
    // страхование от безработицы
    { id: 'unemployment', rate: 0.0089, reducesTaxBase: true },
    // взнос на больничные — только если зарплата от 17 255 € в год
    { id: 'sickness', rate: 0.0088, exemptUpTo: 17254.99, reducesTaxBase: true },
  ],

  incomeTax: {
    // вычет расходов на получение дохода
    allowance: 750,
    formula: finnishIncomeTax,
  },
}
