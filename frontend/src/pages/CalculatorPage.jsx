import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { calculateNet, SUPPORTED_COUNTRIES } from '../salary/calculateNet'
import { formatMoney, formatPercent } from '../utils/format'
import styles from './CalculatorPage.module.css'

// Превратить то, что ввёл человек, в число: «2 000,50» → 2000.5.
// Пустое поле, ноль, минус или буквы → null (считать нечего).
function parseAmount(text) {
  const value = Number(text.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(value) && value > 0 ? value : null
}

// Разделить годовую сумму на месяцы, с точностью до цента
function perMonth(annualAmount) {
  return Math.round((annualAmount / 12) * 100) / 100
}

// Страница калькулятора «брутто → на руки»
function CalculatorPage() {
  const { t, i18n } = useTranslation()

  // То, что выбрал и ввёл человек
  const [country, setCountry] = useState(SUPPORTED_COUNTRIES[0])
  const [amountText, setAmountText] = useState('')
  const [period, setPeriod] = useState('month')

  // Расчёт делаем сразу при каждом изменении: он мгновенный
  const amount = parseAmount(amountText)
  const grossAnnual = amount === null ? null : period === 'month' ? amount * 12 : amount
  const result = grossAnnual === null ? null : calculateNet(grossAnnual, country)

  const money = (value) => formatMoney(value, i18n.language)

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
          <select id="calculator-country" value={country} onChange={(event) => setCountry(event.target.value)}>
            {SUPPORTED_COUNTRIES.map((code) => (
              <option key={code} value={code}>
                {t(`countries.${code}`)}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="calculator-amount">{t('calculator.amount')}</label>
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

        <fieldset className={styles.period}>
          <legend>{t('calculator.period')}</legend>
          <div className={styles.periodOptions}>
            {['month', 'year'].map((option) => (
              <label key={option} className={period === option ? `${styles.periodOption} ${styles.checked}` : styles.periodOption}>
                <input
                  type="radio"
                  name="period"
                  value={option}
                  checked={period === option}
                  onChange={() => setPeriod(option)}
                />
                {option === 'month' ? t('calculator.perMonth') : t('calculator.perYear')}
              </label>
            ))}
          </div>
        </fieldset>
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
                  <td>{money(perMonth(row.annual))}</td>
                  <td>{money(row.annual)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className={styles.rate}>
            {t('calculator.effectiveRate', { rate: formatPercent(result.effectiveRate, i18n.language) })}
          </p>
          <p className={styles.note}>
            {t('calculator.assumptions')} {t(`calculator.notes.${country}`)}
          </p>
        </div>
      ) : (
        <p className={styles.hint}>{t('calculator.enterAmount')}</p>
      )}
    </section>
  )
}

export default CalculatorPage
