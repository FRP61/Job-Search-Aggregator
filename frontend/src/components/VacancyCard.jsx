import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'

import { formatDate } from '../utils/format'
import { formatRange, grossRange, inEuPrices, mapRange, netRange, perMonth, pickCountry } from '../vacancies/vacancyMoney'
import styles from './VacancyCard.module.css'

// Название галузі на языке сайта: у бэкенда есть name_uk и name_en
function industryName(industry, language) {
  return language === 'en' ? industry.name_en : industry.name_uk
}

// Карточка вакансии в списке.
// preferredCountry — страна из фильтра: по ней считаем «на руки»;
// costOfLiving — индексы стран { PL: {...} } для «реального дохода» (может быть пустым)
function VacancyCard({ vacancy, preferredCountry, costOfLiving = {}, headingLevel = 2 }) {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const location = useLocation()
  const Heading = `h${headingLevel}`

  const place = [vacancy.city, vacancy.countries.map((code) => t(`countries.${code}`)).join(', ')]
    .filter(Boolean)
    .join(', ')

  // Деньги: брутто → на руки (в месяц, в среднем) → в ценах среднего ЕС
  const gross = grossRange(vacancy)
  const country = pickCountry(vacancy, preferredCountry)
  const netMonthly = mapRange(netRange(vacancy, country), perMonth)
  const priceLevel = country && costOfLiving[country]?.price_level_index
  const realMonthly = netMonthly && priceLevel ? mapRange(netMonthly, (amount) => inEuPrices(amount, priceLevel)) : null

  // Ссылка на страницу вакансии: страна для расчёта и откуда пришли (чтобы вернуться к тем же фильтрам)
  const detailsUrl = `/vacancies/${vacancy.id}${country ? `?country=${country}` : ''}`

  return (
    <article className={styles.card}>
      <Heading className={styles.title}>
        <Link to={detailsUrl} state={{ from: location.pathname + location.search }}>
          {vacancy.title}
        </Link>
      </Heading>
      <p className={styles.meta}>
        {[vacancy.company, place].filter(Boolean).join(' · ')}
        {vacancy.remote && <span className={styles.badge}>{t('vacancy.remote')}</span>}
      </p>

      {gross && (
        <div className={styles.money}>
          <p className={styles.gross}>
            {formatRange(gross, language, t)} <span className={styles.note}>{t('vacancy.grossPerYear')}</span>
          </p>
          {netMonthly && (
            <p className={styles.net}>
              {t('vacancy.netPerMonth', { range: formatRange(netMonthly, language, t) })}{' '}
              <span className={styles.note}>{t('vacancy.netNote', { country: t(`countries.${country}`) })}</span>
            </p>
          )}
          {realMonthly && (
            <p className={styles.real}>
              {t('vacancy.realPerMonth', { range: formatRange(realMonthly, language, t) })}{' '}
              <span className={styles.note}>
                {t('vacancy.realNote', { value: Math.round(priceLevel) })}
              </span>
            </p>
          )}
        </div>
      )}

      <p className={styles.footer}>
        {vacancy.industry && <span>{industryName(vacancy.industry, language)}</span>}
        {vacancy.posted_at && <span>{t('vacancy.posted', { date: formatDate(vacancy.posted_at, language) })}</span>}
      </p>
    </article>
  )
}

export default VacancyCard
