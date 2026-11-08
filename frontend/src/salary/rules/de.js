// Германия, 2026 год.
// Источники: § 32a EStG (https://www.gesetze-im-internet.de/estg/__32a.html),
// ставки и потолки соцстрахования 2026 (https://lohn-info.de/sozialversicherungsbeitraege2026.html),
// Soli 2026 (https://www.tk.de/firmenkunden/service/fachthemen/fachthema-beitraege/solidaritaetszuschlag-2075802),
// Vorsorgepauschale с 2026 (https://www.lohnsteuer-kompakt.de/steuerwissen/lohnsteuer-neue-berechnung-der-vorsorgepauschale-ab-2026/).
//
// Допущения: класс налога I, без церковного налога, без детей (надбавка 0,6% на уход),
// государственная медстраховка со средним дополнительным взносом 2,9%, не Саксония.
// Взносы работодателя платятся сверх зарплаты, поэтому их здесь нет.

// Подоходный налог по формуле § 32a EStG (2026): доход и результат округляются вниз до евро
function incomeTax2026(taxableIncome) {
  const x = Math.floor(taxableIncome)
  let tax
  if (x <= 12348) {
    tax = 0
  } else if (x <= 17799) {
    const y = (x - 12348) / 10000
    tax = (914.51 * y + 1400) * y
  } else if (x <= 69878) {
    const z = (x - 17799) / 10000
    tax = (173.1 * z + 2397) * z + 1034.87
  } else if (x <= 277825) {
    tax = 0.42 * x - 11135.63
  } else {
    tax = 0.45 * x - 19470.38
  }
  return Math.floor(tax)
}

export const germany = {
  code: 'DE',
  year: 2026,

  contributions: [
    // пенсионное страхование: потолок 101 400 € в год
    { id: 'pension', rate: 0.093, capBase: 101400, reducesTaxBase: true },
    // страхование от безработицы: тот же потолок. Для налога засчитывается, только если
    // медстраховка + уход + безработица ≤ 1 900 € в год — а при такой зарплате налога и так нет
    { id: 'unemployment', rate: 0.013, capBase: 101400, reducesTaxBase: false },
    // медстраховка: 7,3% + половина среднего доп. взноса 2,9%; потолок 69 750 €.
    // Для налога засчитывается по урезанной ставке 7,0% + 1,45% = 8,45%
    { id: 'health', rate: 0.0875, capBase: 69750, reducesTaxBase: true, taxBaseRate: 0.0845 },
    // страхование по уходу: 1,8% + 0,6% надбавка для бездетных; потолок 69 750 €
    { id: 'care', rate: 0.024, capBase: 69750, reducesTaxBase: true },
  ],

  incomeTax: {
    // вычеты без документов: расходы работника 1 230 € + особые расходы 36 €
    allowance: 1266,
    // вместо ступеней — формула из закона
    formula: incomeTax2026,
    // надбавка солидарности: 5,5% от налога, если он больше 20 350 € в год;
    // в переходной зоне — не больше 11,9% от превышения
    solidarity: { rate: 0.055, exemptionLimit: 20350, phaseInRate: 0.119 },
  },
}
