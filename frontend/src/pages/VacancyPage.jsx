import DOMPurify from 'dompurify'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'

import { getVacancy } from '../api/client'
import { useCostOfLiving } from '../api/useCostOfLiving'
import CostOfLiving from '../components/CostOfLiving'
import { formatDate, formatPercent } from '../utils/format'
import { breakdownRange, formatRange, grossRange, inEuPrices, mapRange, perMonth, pickCountry } from '../vacancies/vacancyMoney'
import { usePageTitle } from '../components/usePageTitle'
import styles from './VacancyPage.module.css'

// Теги, которые оставляем в описании вакансии. Всё остальное (скрипты, стили, картинки, ссылки,
// обработчики onclick...) DOMPurify выбрасывает, а текст внутри убранных тегов сохраняет
const ALLOWED_TAGS = ['p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'h3', 'h4', 'h5']

// Описание из источника: HTML чистим, обычный текст показываем как есть (с переносами строк)
function prepareDescription(raw) {
  if (!raw) return null
  if (!/<[a-z][\s\S]*>/i.test(raw)) return { text: raw }
  return { html: DOMPurify.sanitize(raw, { ALLOWED_TAGS, ALLOWED_ATTR: [] }) }
}

// Таблица «брутто → на руки» для минимальной и максимальной зарплаты вакансии (в среднем за месяц)
function SalaryTable({ breakdown, language, t }) {
  const columns = [breakdown.min, breakdown.max].filter(Boolean)
  // одинаковые «от» и «до» — одна колонка
  const single = columns.length === 1 || columns[0].gross === columns[1].gross
  const shown = single ? [columns[0]] : columns
  const money = (annual) => formatRange({ min: perMonth(annual), max: perMonth(annual) }, language, t)
  const rows = [
    { key: 'gross', label: t('calculator.gross'), value: (r) => money(r.gross) },
    { key: 'contributions', label: t('calculator.contributions'), value: (r) => money(r.socialContributions) },
    { key: 'incomeTax', label: t('calculator.incomeTax'), value: (r) => money(r.incomeTax) },
    { key: 'net', label: t('calculator.net'), value: (r) => money(r.net) },
  ]

  return (
    <table className={styles.table}>
      <caption className={styles.caption}>{t('vacancyPage.tableCaption')}</caption>
      {!single && (
        <thead>
          <tr>
            <th scope="col">
              <span className={styles.visuallyHidden}>{t('calculator.item')}</span>
            </th>
            <th scope="col">{t('vacancyPage.min')}</th>
            <th scope="col">{t('vacancyPage.max')}</th>
          </tr>
        </thead>
      )}
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className={row.key === 'net' ? styles.netRow : undefined}>
            <th scope="row">{row.label}</th>
            {shown.map((result, index) => (
              <td key={index}>{row.value(result)}</td>
            ))}
          </tr>
        ))}
        <tr>
          <th scope="row">{t('vacancyPage.taxShare')}</th>
          {shown.map((result, index) => (
            <td key={index}>{formatPercent(result.effectiveRate, language)}%</td>
          ))}
        </tr>
      </tbody>
    </table>
  )
}

// Страница одной вакансии: /vacancies/123?country=PL
function VacancyPage() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  // откуда пришли: «назад к результатам» вернёт те же фильтры
  const backTo = location.state?.from ?? '/search'

  const [attempt, setAttempt] = useState(0)
  const requestKey = `${id}:${attempt}`
  const [loaded, setLoaded] = useState({ key: null, status: 'loading', vacancy: null })
  const state = loaded.key === requestKey ? loaded : { status: 'loading', vacancy: null }
  usePageTitle(state.vacancy?.title ?? t('vacancyPage.pageTitle'))

  useEffect(() => {
    const controller = new AbortController()
    const key = `${id}:${attempt}`
    getVacancy(id, { signal: controller.signal })
      .then((vacancy) => setLoaded({ key, status: 'ready', vacancy }))
      .catch((error) => {
        if (error.name === 'AbortError') return
        setLoaded({ key, status: error.status === 404 ? 'notFound' : 'error', vacancy: null })
      })
    return () => controller.abort()
  }, [id, attempt])

  const costOfLiving = useCostOfLiving()

  const backLink = (
    <Link to={backTo} className={styles.back}>
      {t('vacancyPage.back')}
    </Link>
  )

  if (state.status === 'loading') {
    return (
      <section className={styles.page}>
        {backLink}
        <p className={styles.message} role="status">
          {t('vacancyPage.loading')}
        </p>
      </section>
    )
  }

  if (state.status === 'notFound' || state.status === 'error') {
    return (
      <section className={styles.page}>
        {backLink}
        <div className={styles.errorBox} role="alert">
          <p>{state.status === 'notFound' ? t('vacancyPage.notFound') : t('vacancyPage.error')}</p>
          {state.status === 'error' && (
            <button type="button" className={styles.primaryButton} onClick={() => setAttempt((n) => n + 1)}>
              {t('search.retry')}
            </button>
          )}
        </div>
      </section>
    )
  }

  const vacancy = state.vacancy
  const country = pickCountry(vacancy, searchParams.get('country'))
  const place = [vacancy.city, vacancy.countries.map((code) => t(`countries.${code}`)).join(', ')]
    .filter(Boolean)
    .join(', ')
  const gross = grossRange(vacancy)
  const breakdown = breakdownRange(vacancy, country)
  const countryData = country ? costOfLiving.byCountry[country] : null
  const realMonthly =
    breakdown && countryData
      ? mapRange(
          mapRange(breakdown, (r) => r.net),
          (net) => inEuPrices(perMonth(net), countryData.price_level_index),
        )
      : null
  const description = prepareDescription(vacancy.description)
  // для калькулятора — средняя зарплата вакансии
  const calculatorGross = gross && Math.round(((gross.min ?? gross.max) + (gross.max ?? gross.min)) / 2)
  // страны вакансии, которые умеет считать калькулятор
  const countryChoices = vacancy.countries.filter((code) => pickCountry({ countries: [code] }) === code)

  return (
    <article className={styles.page}>
      {backLink}

      <h1 className={styles.title}>{vacancy.title}</h1>
      <p className={styles.meta}>
        {[vacancy.company, place].filter(Boolean).join(' · ')}
        {vacancy.remote && <span className={styles.badge}>{t('vacancy.remote')}</span>}
      </p>
      <p className={styles.details}>
        {vacancy.industry && <span>{language === 'en' ? vacancy.industry.name_en : vacancy.industry.name_uk}</span>}
        {vacancy.posted_at && <span>{t('vacancy.posted', { date: formatDate(vacancy.posted_at, language) })}</span>}
      </p>

      <p className={styles.actions}>
        <a href={vacancy.url} target="_blank" rel="noopener noreferrer" className={styles.primaryButton}>
          {t('vacancyPage.openSource', { source: vacancy.source })}
        </a>
      </p>
      {vacancy.other_sources?.length > 0 && (
        <p className={styles.otherSources}>
          {t('vacancyPage.alsoOn')}{' '}
          {vacancy.other_sources.map((other, index) => (
            <span key={other.url}>
              {index > 0 && ', '}
              <a href={other.url} target="_blank" rel="noopener noreferrer">
                {other.source}
              </a>
            </span>
          ))}
        </p>
      )}

      <section className={styles.section} aria-labelledby="vacancy-salary">
        <h2 id="vacancy-salary">{t('vacancyPage.salary')}</h2>
        {gross ? (
          <>
            <p className={styles.gross}>
              {formatRange(gross, language, t)} <span className={styles.note}>{t('vacancy.grossPerYear')}</span>
            </p>
            {countryChoices.length > 1 && (
              <p className={styles.countryChoice}>
                <label htmlFor="vacancy-country">{t('vacancyPage.countFor')}</label>{' '}
                <select
                  id="vacancy-country"
                  value={country}
                  onChange={(event) =>
                    setSearchParams({ country: event.target.value }, { replace: true, state: location.state })
                  }
                >
                  {countryChoices.map((code) => (
                    <option key={code} value={code}>
                      {t(`countries.${code}`)}
                    </option>
                  ))}
                </select>
              </p>
            )}
            {breakdown && (
              <>
                <SalaryTable breakdown={breakdown} language={language} t={t} />
                {realMonthly && (
                  <p className={styles.real}>
                    {t('vacancy.realPerMonth', { range: formatRange(realMonthly, language, t) })}{' '}
                    <span className={styles.note}>
                      {t('vacancy.realNote', { value: Math.round(countryData.price_level_index) })}
                    </span>
                  </p>
                )}
                <p className={styles.note}>
                  {t('vacancyPage.salaryNote', { country: t(`countries.${country}`) })}{' '}
                  <Link to={`/calculator?country=${country}&gross=${calculatorGross}&period=year&currency=EUR`}>
                    {t('vacancyPage.openCalculator')}
                  </Link>
                </p>
              </>
            )}
          </>
        ) : (
          <p>
            {t('vacancyPage.noSalary')} <Link to="/calculator">{t('vacancyPage.openCalculator')}</Link>
          </p>
        )}
      </section>

      {countryData && <CostOfLiving item={countryData} total={costOfLiving.count} />}

      <section className={styles.section} aria-labelledby="vacancy-description">
        <h2 id="vacancy-description">{t('vacancyPage.description')}</h2>
        {description?.html && (
          // HTML уже очищен DOMPurify: остались только безопасные теги без атрибутов
          <div className={styles.description} dangerouslySetInnerHTML={{ __html: description.html }} />
        )}
        {description?.text && <div className={`${styles.description} ${styles.plain}`}>{description.text}</div>}
        {!description && <p>{t('vacancyPage.noDescription')}</p>}
      </section>
    </article>
  )
}

export default VacancyPage
