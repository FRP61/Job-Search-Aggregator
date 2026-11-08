import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { getCountries, getIndustries, searchVacancies } from '../api/client'
import { formatDate } from '../utils/format'
import styles from './SearchPage.module.css'

// Сколько вакансий на одной странице результатов
const PAGE_SIZE = 20

// Название страны или галузі на языке сайта: у бэкенда есть name_uk и name_en
function localName(item, language) {
  return language === 'en' ? item.name_en : item.name_uk
}

// Номер страницы из адреса: только целое число от 1, иначе 1
function parsePage(text) {
  const page = Number(text)
  return Number.isInteger(page) && page >= 1 ? page : 1
}

// Зарплата вакансии в целых евро: «30 000 – 45 000 €», «від 30 000 €», «до 45 000 €»; нет — null
function formatSalary(min, max, language, t) {
  const money = (value) =>
    new Intl.NumberFormat(language, {
      style: 'currency',
      currency: 'EUR',
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0,
    }).format(value)
  if (min && max && min !== max) return t('search.salaryRange', { min: money(min), max: money(max) })
  if (min && max) return money(min)
  if (min) return t('search.salaryFrom', { amount: money(min) })
  if (max) return t('search.salaryTo', { amount: money(max) })
  return null
}

// Страница поиска вакансий. Фильтры живут в адресе страницы:
// /search?country=PL&industry=it&q=python&page=2 — такую ссылку можно отправить другу,
// а кнопки «назад/вперёд» в браузере возвращают прошлые фильтры.
function SearchPage() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const [searchParams, setSearchParams] = useSearchParams()

  // Фильтры из адреса
  const country = searchParams.get('country') ?? ''
  const industry = searchParams.get('industry') ?? ''
  const query = searchParams.get('q') ?? ''
  const page = parsePage(searchParams.get('page'))

  // Слово в поле поиска: применяется только по кнопке «Шукати» (или Enter)
  const [queryText, setQueryText] = useState(query)
  // если адрес поменялся (кнопка «назад»), поле показывает слово из адреса
  const [shownQuery, setShownQuery] = useState(query)
  if (query !== shownQuery) {
    setShownQuery(query)
    setQueryText(query)
  }

  // Списки для выпадающих меню: страны и галузі с бэкенда
  // attempt — номер попытки: «Спробувати ще раз» увеличивает его и запускает загрузку заново
  const [optionsAttempt, setOptionsAttempt] = useState(0)
  const [loadedOptions, setLoadedOptions] = useState({ attempt: -1, status: 'loading', countries: [], industries: [] })
  // ответ ещё не пришёл для текущей попытки — значит, грузится
  const options =
    loadedOptions.attempt === optionsAttempt ? loadedOptions : { status: 'loading', countries: [], industries: [] }

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getCountries({ signal: controller.signal }), getIndustries({ signal: controller.signal })])
      .then(([countries, industries]) =>
        setLoadedOptions({ attempt: optionsAttempt, status: 'ready', countries, industries }),
      )
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setLoadedOptions({ attempt: optionsAttempt, status: 'error', countries: [], industries: [] })
        }
      })
    // страница закрылась раньше, чем пришёл ответ — запрос больше не нужен
    return () => controller.abort()
  }, [optionsAttempt])

  // Результаты поиска: загружаем заново при каждом изменении фильтров в адресе
  const [searchAttempt, setSearchAttempt] = useState(0)
  // «отпечаток» запроса: фильтры + номер попытки. Ответ показываем, только если он для текущего запроса,
  // иначе пишем «Шукаємо вакансії…»
  const searchKey = JSON.stringify([country, industry, query, page, searchAttempt])
  const [loadedResults, setLoadedResults] = useState({ key: null, status: 'loading', data: null })
  const results = loadedResults.key === searchKey ? loadedResults : { status: 'loading', data: null }

  useEffect(() => {
    const controller = new AbortController()
    const key = JSON.stringify([country, industry, query, page, searchAttempt])
    searchVacancies(
      { countries: country ? [country] : [], industry, q: query, page, pageSize: PAGE_SIZE },
      { signal: controller.signal },
    )
      .then((data) => setLoadedResults({ key, status: 'ready', data }))
      .catch((error) => {
        if (error.name !== 'AbortError') setLoadedResults({ key, status: 'error', data: null })
      })
    // фильтр сменился, пока шёл запрос — старый ответ уже не нужен
    return () => controller.abort()
  }, [country, industry, query, page, searchAttempt])

  // Поменять фильтры в адресе. Пустые убираем; при смене фильтров — снова первая страница
  function updateFilters(changes) {
    const next = { country, industry, q: query, page: '', ...changes }
    const params = {}
    for (const [name, value] of Object.entries(next)) {
      if (value) params[name] = String(value)
    }
    setSearchParams(params)
  }

  function submitQuery(event) {
    event.preventDefault()
    updateFilters({ q: queryText.trim() })
  }

  // «Спробувати ще раз» в большом сообщении: заново и поиск, и списки (если они тоже не загрузились)
  function retryAll() {
    setSearchAttempt((n) => n + 1)
    if (options.status === 'error') setOptionsAttempt((n) => n + 1)
  }

  function goToPage(number) {
    updateFilters({ page: number > 1 ? number : '' })
    window.scrollTo?.(0, 0)
  }

  // Названия для карточек: код страны → название на языке сайта
  const countryName = (code) => {
    const found = options.countries.find((item) => item.code === code)
    return found ? localName(found, language) : t(`countries.${code}`, { defaultValue: code })
  }
  const sortByName = (items) => [...items].sort((a, b) => localName(a, language).localeCompare(localName(b, language), language))

  const hasFilters = Boolean(country || industry || query)
  const totalPages = results.data ? Math.max(1, Math.ceil(results.data.total / PAGE_SIZE)) : 1

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>{t('search.title')}</h1>
      <p className={styles.intro}>{t('search.intro')}</p>

      <form className={styles.form} onSubmit={submitQuery} role="search">
        <div className={styles.field}>
          <label htmlFor="search-country">{t('search.country')}</label>
          <select
            id="search-country"
            value={country}
            onChange={(event) => updateFilters({ country: event.target.value })}
          >
            <option value="">{t('search.allCountries')}</option>
            {sortByName(options.countries).map((item) => (
              <option key={item.code} value={item.code}>
                {localName(item, language)}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="search-industry">{t('search.industry')}</label>
          <select
            id="search-industry"
            value={industry}
            onChange={(event) => updateFilters({ industry: event.target.value })}
          >
            <option value="">{t('search.allIndustries')}</option>
            {sortByName(options.industries).map((item) => (
              <option key={item.slug} value={item.slug}>
                {localName(item, language)}
              </option>
            ))}
          </select>
        </div>

        <div className={`${styles.field} ${styles.queryField}`}>
          <label htmlFor="search-query">{t('search.query')}</label>
          <div className={styles.queryRow}>
            <input
              id="search-query"
              type="search"
              autoComplete="off"
              placeholder={t('search.queryPlaceholder')}
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
            />
            <button type="submit" className={styles.primaryButton}>
              {t('search.submit')}
            </button>
          </div>
        </div>
      </form>

      {/* если и поиск не загрузился, хватит одного сообщения об ошибке ниже */}
      {options.status === 'error' && results.status !== 'error' && (
        <p className={styles.warning} role="alert">
          {t('search.optionsError')}{' '}
          <button type="button" className={styles.linkButton} onClick={() => setOptionsAttempt((n) => n + 1)}>
            {t('search.retry')}
          </button>
        </p>
      )}

      <div className={styles.results} aria-live="polite" aria-busy={results.status === 'loading'}>
        {results.status === 'loading' && (
          <p className={styles.message} role="status">
            {t('search.loading')}
          </p>
        )}

        {results.status === 'error' && (
          <div className={styles.errorBox} role="alert">
            <p>{t('search.error')}</p>
            <button type="button" className={styles.primaryButton} onClick={retryAll}>
              {t('search.retry')}
            </button>
          </div>
        )}

        {results.status === 'ready' && results.data.total === 0 && (
          <div className={styles.message}>
            <p>{hasFilters ? t('search.emptyFiltered') : t('search.emptyAll')}</p>
            {hasFilters && (
              <button type="button" className={styles.linkButton} onClick={() => setSearchParams({})}>
                {t('search.resetFilters')}
              </button>
            )}
          </div>
        )}

        {results.status === 'ready' && results.data.total > 0 && page > totalPages && (
          <div className={styles.message}>
            <p>{t('search.noSuchPage')}</p>
            <button type="button" className={styles.linkButton} onClick={() => goToPage(1)}>
              {t('search.firstPage')}
            </button>
          </div>
        )}

        {results.status === 'ready' && results.data.total > 0 && page <= totalPages && (
          <>
            <p className={styles.count}>{t('search.found', { count: results.data.total })}</p>

            <ul className={styles.list}>
              {results.data.items.map((vacancy) => {
                const salary = formatSalary(vacancy.salary_annual_min_eur, vacancy.salary_annual_max_eur, language, t)
                const place = [vacancy.city, vacancy.countries.map(countryName).join(', ')].filter(Boolean).join(', ')
                return (
                  <li key={vacancy.id} className={styles.item}>
                    <h2 className={styles.itemTitle}>
                      <a href={vacancy.url} target="_blank" rel="noopener noreferrer">
                        {vacancy.title}
                      </a>
                    </h2>
                    <p className={styles.itemMeta}>
                      {[vacancy.company, place].filter(Boolean).join(' · ')}
                      {vacancy.remote && <span className={styles.badge}>{t('search.remote')}</span>}
                    </p>
                    {salary && (
                      <p className={styles.salary}>
                        {salary} <span className={styles.salaryNote}>{t('search.salaryNote')}</span>
                      </p>
                    )}
                    <p className={styles.itemFooter}>
                      {vacancy.industry && <span>{localName(vacancy.industry, language)}</span>}
                      <span>{t('search.posted', { date: formatDate(vacancy.posted_at, language) })}</span>
                    </p>
                  </li>
                )
              })}
            </ul>

            {totalPages > 1 && (
              <nav className={styles.pagination} aria-label={t('search.pagination')}>
                <button
                  type="button"
                  className={styles.pageButton}
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                >
                  {t('search.previous')}
                </button>
                <span>{t('search.pageOf', { page, total: totalPages })}</span>
                <button
                  type="button"
                  className={styles.pageButton}
                  disabled={page >= totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  {t('search.next')}
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  )
}

export default SearchPage
