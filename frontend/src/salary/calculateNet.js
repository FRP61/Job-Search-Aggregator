import { eurRate } from './exchangeRates'
import { bulgaria } from './rules/bg'
import { czechia } from './rules/cz'
import { germany } from './rules/de'
import { estonia } from './rules/ee'
import { hungary } from './rules/hu'
import { lithuania } from './rules/lt'
import { latvia } from './rules/lv'
import { poland } from './rules/pl'
import { romania } from './rules/ro'
import { slovakia } from './rules/sk'

// Налоговые правила по коду страны. Новую страну добавляем сюда.
const RULES_BY_COUNTRY = {
  EE: estonia,
  LV: latvia,
  LT: lithuania,
  PL: poland,
  DE: germany,
  BG: bulgaria,
  RO: romania,
  HU: hungary,
  CZ: czechia,
  SK: slovakia,
}

// Коды стран, для которых калькулятор умеет считать: ['EE', 'LV', ...]
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
// - { max, taperFrom, taperRate }: «тает» с ростом зарплаты (Литва, Румыния) —
//   полный до taperFrom, дальше минус taperRate за каждый евро сверху, но не меньше нуля.
//   Обычно «зарплата» здесь — брутто; с onTaxBase: true — брутто минус взносы (Словакия)
function annualAllowance(allowance, grossAnnual, incomeAfterContributions) {
  if (typeof allowance === 'number') {
    return allowance
  }
  const income = allowance.onTaxBase ? incomeAfterContributions : grossAnnual
  const reduction = allowance.taperRate * Math.max(0, income - allowance.taperFrom)
  return Math.max(0, allowance.max - reduction)
}

// Надбавка к налогу (немецкий Soli): rate от налога, но только если налог больше
// exemptionLimit, и не больше phaseInRate от превышения — так она вводится плавно
function solidaritySurcharge(tax, solidarity) {
  if (!solidarity || tax <= solidarity.exemptionLimit) {
    return 0
  }
  return Math.min(tax * solidarity.rate, (tax - solidarity.exemptionLimit) * solidarity.phaseInRate)
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
      // Обычно для налога засчитывается весь взнос. Немецкая медстраховка — по своей,
      // меньшей ставке (taxBaseRate)
      contributionsReducingTax += contribution.taxBaseRate ? roundToCents(base * contribution.taxBaseRate) : amount
    }
  }

  // 2. С какой суммы считать подоходный налог (не меньше нуля)
  const incomeAfterContributions = grossAnnual - contributionsReducingTax
  const allowance = annualAllowance(rules.incomeTax.allowance ?? 0, grossAnnual, incomeAfterContributions)
  const taxableIncome = Math.max(0, incomeAfterContributions - allowance)

  // 3. Подоходный налог: по формуле (Германия) или по ступеням,
  //    минус скидка с налога (если она есть, как в Польше),
  //    плюс надбавка солидарности (если она есть, как в Германии)
  const { formula, brackets, taxCredit, solidarity } = rules.incomeTax
  // формула получает и брутто — в некоторых странах скидки с налога зависят от зарплаты
  const taxBeforeCredit = formula
    ? formula(taxableIncome, { gross: grossAnnual, socialContributions })
    : taxByBrackets(taxableIncome, brackets)
  const tax = Math.max(0, taxBeforeCredit - (taxCredit ?? 0))
  const incomeTax = roundToCents(tax + solidaritySurcharge(tax, solidarity))

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
