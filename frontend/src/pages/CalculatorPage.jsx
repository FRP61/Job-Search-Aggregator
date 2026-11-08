import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  calculateNet,
  calculateNetLocal,
  currencyOf,
  paymentsPerYearOf,
  SUPPORTED_COUNTRIES,
} from '../salary/calculateNet'
import { eurRate, EXCHANGE_RATES_DATE } from '../salary/exchangeRates'
import { currencySymbol, formatDate, formatMoney, formatPercent, formatRate } from '../utils/format'
import { usePageTitle } from '../components/usePageTitle'
import styles from './CalculatorPage.module.css'

// Превратить то, что ввёл человек, в число: «2 000,50» → 2000.5.
// Пустое поле, ноль, минус или буквы → null (считать нечего).
function parseAmount(text) {
  const value = Number(text.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(value) && value > 0 ? value : null
}

// Страна, открытая по умолчанию
const DEFAULT_COUNTRY = 'EE'

// Начальные значения формы из адреса страницы; всё непонятное — по умолчанию
function startValues(params) {
  const code = params.get('country')?.toUpperCase()
  const country = SUPPORTED_COUNTRIES.includes(code) ? code : DEFAULT_COUNTRY
  const amount = parseAmount(params.get('gross') ?? '')
  return {
    country,
    amountText: amount === null ? '' : String(amount),
    period: params.get('period') === 'year' ? 'year' : 'month',
    currency: params.get('currency') === 'EUR' ? 'EUR' : currencyOf(country),
  }
}

// Разделить годовую сумму на выплаты (обычно 12, в Австрии и Греции 14), с точностью до цента
function perPayment(annualAmount, payments = 12) {
  return Math.round((annualAmount / payments) * 100) / 100
}

// Группа радиокнопок, оформленная как переключатель (период, валюта)
function Switch({ legend, name, options, value, onChange }) {
  return (
    <fieldset className={styles.switch}>
      <legend>{legend}</legend>
      <div className={styles.switchOptions}>
        {options.map((option) => (
          <label
            key={option.value}
            className={value === option.value ? `${styles.switchOption} ${styles.checked}` : styles.switchOption}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

// Страница калькулятора «брутто → на руки»
function CalculatorPage() {
  const { t, i18n } = useTranslation()
  usePageTitle(t('calculator.title'))
  const language = i18n.language

  // Начальные значения можно передать в адресе — так открывает калькулятор страница вакансии:
  // /calculator?country=PL&gross=36000&period=year&currency=EUR
  // (читаем адрес один раз при открытии страницы)
  const [start] = useState(() => startValues(new URLSearchParams(window.location.search)))

  // То, что выбрал и ввёл человек
  const [country, setCountry] = useState(start.country)
  const [amountText, setAmountText] = useState(start.amountText)
  const [period, setPeriod] = useState(start.period)
  // В какой валюте введена сумма. Для страны не в евро по умолчанию — её валюта
  const [currency, setCurrency] = useState(start.currency)

  // Валюта, в которой страна считает налоги, и есть ли смысл в выборе валюты
  const localCurrency = currencyOf(country)
  const canChooseCurrency = localCurrency !== 'EUR'

  // Страны в списке — по алфавиту на языке сайта
  const sortedCountries = [...SUPPORTED_COUNTRIES].sort((a, b) =>
    t(`countries.${a}`).localeCompare(t(`countries.${b}`), language),
  )

  function chooseCountry(code) {
    setCountry(code)
    setCurrency(currencyOf(code))
  }

  // Расчёт делаем сразу при каждом изменении: он мгновенный.
  // Сумма в евро → calculateNet, в валюте страны → calculateNetLocal
  const amount = parseAmount(amountText)
  // сколько раз в год платят зарплату: «на місяць» умножаем на это число
  const payments = paymentsPerYearOf(country)
  const grossAnnual = amount === null ? null : period === 'month' ? amount * payments : amount
  const calculate = currency === 'EUR' ? calculateNet : calculateNetLocal
  const result = grossAnnual === null ? null : calculate(grossAnnual, country)

  const money = (value) => formatMoney(value, language, result.currency)

  // Если считали в валюте страны — сколько это в евро на руки за месяц, для сравнения
  const netInEurPerMonth =
    result && result.currency !== 'EUR' ? perPayment(result.net / eurRate(result.currency), payments) : null

  // Строки таблицы результата: подпись и значение за год
  const rows = result && [
    { key: 'gross', label: t('calculator.gross'), annual: result.gross },
    { key: 'contributions', label: t('calculator.contributions'), annual: result.socialContributions },
    { key: 'incomeTax', label: t('calculator.incomeTax'), annual: result.incomeTax },
    { key: 'net', label: t('calculator.net'), annual: result.net },
  ]

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>{t('calculator.title')}</h1>
      <p className={styles.intro}>{t('calculator.intro')}</p>

      <form className={styles.form} onSubmit={(event) => event.preventDefault()}>
        <div className={styles.field}>
          <label htmlFor="calculator-country">{t('calculator.country')}</label>
          <select id="calculator-country" value={country} onChange={(event) => chooseCountry(event.target.value)}>
            {sortedCountries.map((code) => (
              <option key={code} value={code}>
                {t(`countries.${code}`)}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="calculator-amount">
            {t('calculator.amount', { currency: currencySymbol(currency, language) })}
          </label>
          <input
            id="calculator-amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={t('calculator.amountPlaceholder')}
            value={amountText}
            onChange={(event) => setAmountText(event.target.value)}
          />
        </div>

        <div className={styles.switches}>
          <Switch
            legend={t('calculator.period')}
            name="period"
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'month', label: t('calculator.perMonth') },
              { value: 'year', label: t('calculator.perYear') },
            ]}
          />

          {canChooseCurrency && (
            <Switch
              legend={t('calculator.currency')}
              name="currency"
              value={currency}
              onChange={setCurrency}
              options={[localCurrency, 'EUR'].map((code) => ({
                value: code,
                label: currencySymbol(code, language),
              }))}
            />
          )}
        </div>
      </form>

      {result ? (
        <div className={styles.result}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">
                  <span className={styles.visuallyHidden}>{t('calculator.item')}</span>
                </th>
                <th scope="col">{t('calculator.columnMonth')}</th>
                <th scope="col">{t('calculator.columnYear')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className={row.key === 'net' ? styles.netRow : undefined}>
                  <th scope="row">{row.label}</th>
                  <td>{money(perPayment(row.annual, payments))}</td>
                  <td>{money(row.annual)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {netInEurPerMonth !== null && (
            <p className={styles.inEur}>
              {t('calculator.netInEur', { amount: formatMoney(netInEurPerMonth, language) })}
            </p>
          )}

          <p className={styles.rate}>
            {t('calculator.effectiveRate', { rate: formatPercent(result.effectiveRate, language) })}
          </p>
          <p className={styles.note}>
            {payments !== 12 && `${t('calculator.paymentsNote', { count: payments })} `}
            {t('calculator.assumptions')}{' '}
            {t(`calculator.notes.${country}`, {
              // для стран не в евро в заметке пишем курс и его дату
              rate: formatRate(eurRate(localCurrency), language),
              date: formatDate(EXCHANGE_RATES_DATE, language),
            })}
          </p>
        </div>
      ) : (
        <p className={styles.hint}>{t('calculator.enterAmount')}</p>
      )}
    </section>
  )
}

export default CalculatorPage
