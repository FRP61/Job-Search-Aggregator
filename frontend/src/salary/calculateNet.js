import { eurRate } from './exchangeRates'
import { austria } from './rules/at'
import { belgium } from './rules/be'
import { bulgaria } from './rules/bg'
import { cyprus } from './rules/cy'
import { czechia } from './rules/cz'
import { germany } from './rules/de'
import { denmark } from './rules/dk'
import { estonia } from './rules/ee'
import { spain } from './rules/es'
import { finland } from './rules/fi'
import { france } from './rules/fr'
import { greece } from './rules/gr'
import { croatia } from './rules/hr'
import { hungary } from './rules/hu'
import { ireland } from './rules/ie'
import { italy } from './rules/it'
import { lithuania } from './rules/lt'
import { luxembourg } from './rules/lu'
import { latvia } from './rules/lv'
import { malta } from './rules/mt'
import { netherlands } from './rules/nl'
import { poland } from './rules/pl'
import { portugal } from './rules/pt'
import { romania } from './rules/ro'
import { sweden } from './rules/se'
import { slovenia } from './rules/si'
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
  AT: austria,
  IE: ireland,
  CY: cyprus,
  MT: malta,
  GR: greece,
  HR: croatia,
  SI: slovenia,
  NL: netherlands,
  BE: belgium,
  LU: luxembourg,
  FR: france,
  IT: italy,
  ES: spain,
  PT: portugal,
  FI: finland,
  SE: sweden,
  DK: denmark,
}

// Коды стран, для которых калькулятор умеет считать: ['EE', 'LV', ...]
export const SUPPORTED_COUNTRIES = Object.keys(RULES_BY_COUNTRY)

function rulesFor(countryCode) {
  return RULES_BY_COUNTRY[countryCode?.toUpperCase()] ?? null
}

// Сколько раз в год платят зарплату: обычно 12, в Австрии и Греции — 14
export function paymentsPerYearOf(countryCode) {
  return rulesFor(countryCode)?.paymentsPerYear ?? 12
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
  // суммы взносов по их id — пригодятся формуле налога (Австрия)
  const contributionsById = {}
  for (const contribution of rules.contributions) {
    // Обычно взнос считается от брутто. Польская медстраховка — от «брутто минус взносы выше».
    // shareOfGross — взнос только с части зарплаты (австрийские 13-я и 14-я зарплаты = 2/14)
    const fromGross = grossAnnual * (contribution.shareOfGross ?? 1)
    const fullBase = contribution.afterPreviousContributions ? grossAnnual - socialContributions : fromGross
    // capBase — потолок: взнос берётся только с этой части (если потолок есть);
    // fromBase — взнос только с части выше этой суммы (французская «вторая полоса», люксембургский уход)
    const base = Math.max(0, Math.min(fullBase, contribution.capBase ?? Infinity) - (contribution.fromBase ?? 0))
    // fixedAnnual — фиксированная сумма в год (Словения); amount — своя формула (Бельгия)
    let amount = contribution.amount
      ? roundToCents(contribution.amount(grossAnnual))
      : (contribution.fixedAnnual ?? roundToCents(base * contribution.rate))
    // exemptUpTo — при зарплате до этой суммы взнос не платится вообще (ирландский PRSI)
    if (contribution.exemptUpTo && grossAnnual <= contribution.exemptUpTo) {
      amount = 0
    }
    contributionsById[contribution.id] = amount
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
  const { formula, brackets, taxCredit, solidarity, surchargeRate } = rules.incomeTax
  // формула получает и брутто — в некоторых странах скидки с налога зависят от зарплаты
  const taxBeforeCredit = formula
    ? formula(taxableIncome, { gross: grossAnnual, socialContributions, contributionsById })
    : taxByBrackets(taxableIncome, brackets)
  // скидка с налога не делает его меньше нуля; формула может вернуть минус (итальянская доплата)
  const taxAfterCredit = taxCredit ? Math.max(0, taxBeforeCredit - taxCredit) : taxBeforeCredit
  // surchargeRate — надбавка в процентах к налогу (люксембургский фонд занятости)
  const tax = surchargeRate ? taxAfterCredit * (1 + surchargeRate(taxableIncome)) : taxAfterCredit
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
