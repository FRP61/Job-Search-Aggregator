// Испания, 2026 год.
// Источники: взносы работника и потолок базы — приказ о взносах на 2026 год
// (https://www.ineaf.es/tribuna/base-maxima-cotizacion-2026/, https://calculadornomina.es/metodologia/);
// IRPF — закон 35/2006, ст. 19 (2 000 € прочих расходов), ст. 20 (скидка для небольших зарплат),
// ст. 57 и 63 (личный минимум 5 550 € и общая шкала).
//
// Допущения: 14 выплат в год (две «экстра» без разбивки по месяцам);
// региональная часть налога — как государственная (в каждом сообществе своя шкала);
// без вычета для зарплат около минимальной и без взноса солидарности выше потолка.
export const spain = {
  code: 'ES',
  year: 2026,
  paymentsPerYear: 14,

  contributions: [
    // общие риски 4,7% + безработица 1,55% + обучение 0,1% + MEI 0,15%, до 5 101,20 € в месяц
    { id: 'socialSecurity', rate: 0.065, capBase: 5101.2 * 12, reducesTaxBase: true },
  ],

  incomeTax: {
    // прочие расходы работника — 2 000 € в год
    allowance: 2000,
    formula: spanishIncomeTax,
  },
}

const BRACKETS = [
  { upTo: 12450, rate: 0.19 },
  { upTo: 20200, rate: 0.24 },
  { upTo: 35200, rate: 0.3 },
  { upTo: 60000, rate: 0.37 },
  { upTo: 300000, rate: 0.45 },
  { upTo: null, rate: 0.47 },
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

// Скидка для небольших зарплат (reducción por obtención de rendimientos del trabajo)
function workIncomeReduction(netWorkIncome) {
  if (netWorkIncome <= 14852) return 7302
  if (netWorkIncome <= 17673.52) return 7302 - 1.75 * (netWorkIncome - 14852)
  if (netWorkIncome <= 19747.5) return 2364.34 - 1.14 * (netWorkIncome - 17673.52)
  return 0
}

// Налог со всей базы минус налог с личного минимума (5 550 €)
function spanishIncomeTax(netWorkIncome) {
  const base = Math.max(0, netWorkIncome - workIncomeReduction(netWorkIncome))
  return Math.max(0, byBrackets(base) - byBrackets(5550))
}
