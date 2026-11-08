// Болгария, 2026 год. С 1 января 2026 года Болгария в еврозоне, всё в евро.
// Источники: Innovires, налоги и взносы 2026 (https://www.innovires.com/en/blog/danaci-i-osigurovki.html),
// Valem, калькулятор Болгарии (https://valem.run/calculators/bulgaria/net-salary).
//
// Допущения: трудовой договор, родился после 1959 года (есть II пенсионная ступень).
export const bulgaria = {
  code: 'BG',
  year: 2026,

  contributions: [
    // пенсия 6,58% + II ступень 2,2% + болезнь и материнство 1,4% + безработица 0,4% + здоровье 3,2% = 13,78%.
    // Потолок дохода: 2 111,64 € в месяц до июля и 2 300 € с августа 2026 → за год 7 × 2 111,64 + 5 × 2 300
    { id: 'socialInsurance', rate: 0.1378, capBase: 26281.48, reducesTaxBase: true },
  ],

  incomeTax: {
    // необлагаемого минимума нет
    allowance: 0,
    brackets: [{ upTo: null, rate: 0.1 }],
  },
}
