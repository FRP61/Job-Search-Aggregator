import { estonia } from './rules/ee'
import { latvia } from './rules/lv'

// Налоговые правила по коду страны. Новую страну добавляем сюда.
const RULES_BY_COUNTRY = {
  EE: estonia,
  LV: latvia,
}

// Коды стран, для которых калькулятор умеет считать: ['EE', 'LV']
export const SUPPORTED_COUNTRIES = Object.keys(RULES_BY_COUNTRY)

// Округлить сумму до центов: 384.00000000000006 → 384
function roundToCents(amount) {
  return Math.round(amount * 100) / 100
}

// Подоходный налог по ступеням: каждая часть суммы облагается своей ставкой
function taxByBrackets(taxableIncome, brackets) {
  let tax = 0
  let lowerLimit = 0

  for (const bracket of brackets) {
    const upperLimit = bracket.upTo ?? Infinity
    if (taxableIncome > lowerLimit) {
      const partInThisBracket = Math.min(taxableIncome, upperLimit) - lowerLimit
      tax += partInThisBracket * bracket.rate
    }
    lowerLimit = upperLimit
  }

  return tax
}

// Сколько останется на руки из годовой зарплаты брутто (в евро).
// Возвращает разбивку или null, если для страны ещё нет правил.
export function calculateNet(grossAnnual, countryCode) {
  const rules = RULES_BY_COUNTRY[countryCode?.toUpperCase()]
  if (!rules) {
    return null
  }

  // 1. Взносы работника
  let socialContributions = 0
  let contributionsReducingTax = 0
  for (const contribution of rules.contributions) {
    // capBase — потолок: взнос берётся только с этой части зарплаты (если потолок есть)
    const base = Math.min(grossAnnual, contribution.capBase ?? Infinity)
    const amount = roundToCents(base * contribution.rate)
    socialContributions += amount
    if (contribution.reducesTaxBase) {
      contributionsReducingTax += amount
    }
  }

  // 2. С какой суммы считать подоходный налог (не меньше нуля)
  const taxableIncome = Math.max(0, grossAnnual - contributionsReducingTax - rules.incomeTax.allowance)

  // 3. Подоходный налог
  const incomeTax = roundToCents(taxByBrackets(taxableIncome, rules.incomeTax.brackets))

  // 4. На руки и доля налогов в процентах (один знак после запятой)
  const net = roundToCents(grossAnnual - socialContributions - incomeTax)
  const effectiveRate = grossAnnual > 0 ? Math.round(((socialContributions + incomeTax) / grossAnnual) * 1000) / 10 : 0

  return {
    gross: grossAnnual,
    socialContributions: roundToCents(socialContributions),
    incomeTax,
    net,
    effectiveRate,
  }
}
