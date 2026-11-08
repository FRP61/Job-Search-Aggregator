import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { searchVacancies } from '../api/client'
import VacancyCard from './VacancyCard'
import styles from './IndustryVacancies.module.css'

// Сколько свежих вакансий показывать под каждой галуззю
const PREVIEW_SIZE = 3

// Несколько свежих вакансий одной галузі (и страны, если выбрана) + ссылка на полный поиск.
// Бэкенд ищет только по одной галузі за раз, поэтому у каждой галузі свой запрос
function IndustryVacancies({ industry, country, costOfLiving }) {
  const { t } = useTranslation()
  const [attempt, setAttempt] = useState(0)
  const key = `${industry}:${country}:${attempt}`
  const [loaded, setLoaded] = useState({ key: null, status: 'loading', data: null })
  const state = loaded.key === key ? loaded : { status: 'loading', data: null }

  useEffect(() => {
    const controller = new AbortController()
    const requestKey = `${industry}:${country}:${attempt}`
    searchVacancies(
      { industry, countries: country ? [country] : [], pageSize: PREVIEW_SIZE },
      { signal: controller.signal },
    )
      .then((data) => setLoaded({ key: requestKey, status: 'ready', data }))
      .catch((error) => {
        if (error.name !== 'AbortError') setLoaded({ key: requestKey, status: 'error', data: null })
      })
    return () => controller.abort()
  }, [industry, country, attempt])

  const searchUrl = `/search?${new URLSearchParams({ ...(country ? { country } : {}), industry })}`

  if (state.status === 'loading') {
    return (
      <p className={styles.message} role="status">
        {t('careerResult.loadingVacancies')}
      </p>
    )
  }

  if (state.status === 'error') {
    return (
      <p className={styles.message} role="alert">
        {t('careerResult.vacanciesError')}{' '}
        <button type="button" className={styles.linkButton} onClick={() => setAttempt((n) => n + 1)}>
          {t('search.retry')}
        </button>
      </p>
    )
  }

  const { total, items } = state.data
  if (total === 0) {
    return <p className={styles.message}>{t('careerResult.noVacancies')}</p>
  }

  return (
    <div className={styles.block}>
      <ul className={styles.list}>
        {items.map((vacancy) => (
          <li key={vacancy.id}>
            <VacancyCard
              vacancy={vacancy}
              preferredCountry={country}
              costOfLiving={costOfLiving}
              headingLevel={4}
            />
          </li>
        ))}
      </ul>
      <Link to={searchUrl} className={styles.allLink}>
        {t('careerResult.allVacancies', { count: total })}
      </Link>
    </div>
  )
}

export default IndustryVacancies
