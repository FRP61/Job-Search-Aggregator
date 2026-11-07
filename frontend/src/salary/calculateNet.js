import { eurRate } from './exchangeRates'
import { estonia } from './rules/ee'
import { lithuania } from './rules/lt'
import { latvia } from './rules/lv'
import { poland } from './rules/pl'

// Налоговые правила по коду страны. Новую страну добавляем сюда.
const RULES_BY_COUNTRY = {
  EE: estonia,
  LV: latvia,
  LT: lithuania,
  PL: poland,
}

// Коды стран, для которых калькулятор умеет считать: ['EE', 'LV', 'LT', 'PL']
export const SUPPORTED_COUNTRIES = Object.keys(RULES_BY_COUNTRY)

function rulesFor(countryCode) {
  return RULES_BY_COUNTRY[countryCode?.toUpperCase()] ?? null
}

// В какой валюте страна считает налоги: 'EUR', 'PLN'...; null, если страны нет
export function currencyOf(countryCode) {
  const rules = rulesFor(countryCode)
  return rules ? (rules.currency ?? 'EUR') : null
}

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

// Необлагаемый минимум за год. Бывает двух видов:
// - просто число: одинаковый для всех (Эстония, Латвия, расходы работника в Польше);
// - { max, taperFrom, taperRate }: «тает» с ростом зарплаты (Литва) —
//   полный до taperFrom, дальше минус taperRate за каждый евро сверху, но не меньше нуля
function annualAllowance(allowance, grossAnnual) {
  if (typeof allowance === 'number') {
    return allowance
  }
  const reduction = allowance.taperRate * Math.max(0, grossAnnual - allowance.taperFrom)
  return Math.max(0, allowance.max - reduction)
}

// Сколько останется на руки из годовой зарплаты брутто В ВАЛЮТЕ СТРАНЫ
// (для Польши — в злотых). Возвращает разбивку или null, если для страны нет правил.
export function calculateNetLocal(grossAnnual, countryCode) {
  const rules = rulesFor(countryCode)
  if (!rules) {
    return null
  }

  // 1. Взносы работника
  let socialContributions = 0
  let contributionsReducingTax = 0
  for (const contribution of rules.contributions) {
    // Обычно взнос считается от брутто. Польская медстраховка — от «брутто минус взносы выше».
    const fullBase = contribution.afterPreviousContributions ? grossAnnual - socialContributions : grossAnnual
    // capBase — потолок: взнос берётся только с этой части (если потолок есть)
    const base = Math.min(fullBase, contribution.capBase ?? Infinity)
    const amount = roundToCents(base * contribution.rate)
    socialContributions += amount
    if (contribution.reducesTaxBase) {
      contributionsReducingTax += amount
    }
  }

  // 2. С какой суммы считать подоходный налог (не меньше нуля)
  const allowance = annualAllowance(rules.incomeTax.allowance, grossAnnual)
  const taxableIncome = Math.max(0, grossAnnual - contributionsReducingTax - allowance)

  // 3. Подоходный налог по ступеням, минус скидка с налога (если она есть, как в Польше)
  const taxBeforeCredit = taxByBrackets(taxableIncome, rules.incomeTax.brackets)
  const incomeTax = roundToCents(Math.max(0, taxBeforeCredit - (rules.incomeTax.taxCredit ?? 0)))

  // 4. На руки и доля налогов в процентах (один знак после запятой)
  const net = roundToCents(grossAnnual - socialContributions - incomeTax)
  const effectiveRate = grossAnnual > 0 ? Math.round(((socialContributions + incomeTax) / grossAnnual) * 1000) / 10 : 0

  return {
    currency: rules.currency ?? 'EUR',
    gross: grossAnnual,
    socialContributions: roundToCents(socialContributions),
    incomeTax,
    net,
    effectiveRate,
  }
}

// Сколько останется на руки из годовой зарплаты брутто В ЕВРО.
// Для стран не в евро: переводим в валюту страны по курсу ЕЦБ, считаем
// по местным правилам и переводим результат обратно в евро.
export function calculateNet(grossAnnual, countryCode) {
  const currency = currencyOf(countryCode)
  const rate = currency && eurRate(currency)
  if (!rate) {
    return null
  }

  const local = calculateNetLocal(roundToCents(grossAnnual * rate), countryCode)
  const toEur = (amount) => roundToCents(amount / rate)

  return {
    currency: 'EUR',
    gross: grossAnnual,
    socialContributions: toEur(local.socialContributions),
    incomeTax: toEur(local.incomeTax),
    net: toEur(local.net),
    effectiveRate: local.effectiveRate,
  }
}
