// Деньги вакансии: брутто из объявления → «на руки» по правилам страны → в ценах среднего ЕС.
// Суммы — годовые, в евро. Бэкенд отдаёт salary_annual_min_eur / salary_annual_max_eur;
// любое из них может быть null (в объявлении только «от» или только «до»).
import { calculateNet, SUPPORTED_COUNTRIES } from '../salary/calculateNet'
import { formatMoneyWhole } from '../utils/format'

// По какой стране считать «на руки»: страна из фильтра, если вакансия в ней есть,
// иначе первая страна вакансии. Если калькулятор страну не знает — null
export function pickCountry(vacancy, preferredCountry) {
  const countries = vacancy.countries ?? []
  const code = preferredCountry && countries.includes(preferredCountry) ? preferredCountry : countries[0]
  return code && SUPPORTED_COUNTRIES.includes(code) ? code : null
}

// Зарплата брутто за год: { min, max } (одно из них может быть null) или null, если зарплаты нет
export function grossRange(vacancy) {
  const min = vacancy.salary_annual_min_eur || null
  const max = vacancy.salary_annual_max_eur || null
  return min || max ? { min, max } : null
}

// Применить расчёт к обоим концам диапазона
export function mapRange(range, convert) {
  return range && { min: range.min && convert(range.min), max: range.max && convert(range.max) }
}

// Полный расчёт калькулятора для обоих концов: { min, max } с объектами calculateNet
export function breakdownRange(vacancy, countryCode) {
  const gross = grossRange(vacancy)
  if (!gross || !countryCode) return null
  return mapRange(gross, (amount) => calculateNet(amount, countryCode))
}

// «На руки» за год: { min, max } или null
export function netRange(vacancy, countryCode) {
  return mapRange(breakdownRange(vacancy, countryCode), (result) => result.net)
}

// Средняя сумма за месяц
export function perMonth(annualAmount) {
  return annualAmount / 12
}

// Сколько эта сумма стоит «в ценах среднего ЕС»: при уровне цен 70% те же деньги
// покупают столько же, сколько 1/0,7 ≈ в 1,43 раза больше денег в средней стране ЕС
export function inEuPrices(amount, priceLevelIndex) {
  return amount / (priceLevelIndex / 100)
}

// Диапазон для текста: «30 000 – 45 000 €», «від 30 000 €», «до 45 000 €», «30 000 €»
export function formatRange(range, language, t) {
  const money = (value) => formatMoneyWhole(value, language)
  if (range.min && range.max && Math.round(range.min) !== Math.round(range.max)) {
    return t('vacancy.range', { min: money(range.min), max: money(range.max) })
  }
  if (range.min && range.max) return money(range.min)
  if (range.min) return t('vacancy.from', { amount: money(range.min) })
  return t('vacancy.to', { amount: money(range.max) })
}
