import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'

import { useCostOfLiving } from '../api/useCostOfLiving'
import { hollandCode, rankTypes, recommendIndustries, scoresFromQuery } from '../careerTest/riasec'
import IndustryVacancies from '../components/IndustryVacancies'
import { SUPPORTED_COUNTRIES } from '../salary/calculateNet'
import { usePageTitle } from '../components/usePageTitle'
import styles from './CareerTestResultPage.module.css'

// Страница результата теста: /career-test/result?r=60&i=80&a=20&s=40&e=70&c=30.
// Всё нужное — в адресе, поэтому результатом можно поделиться ссылкой
function CareerTestResultPage() {
  const { t, i18n } = useTranslation()
  usePageTitle(t('careerResult.title'))
  const [searchParams, setSearchParams] = useSearchParams()
  const scores = scoresFromQuery(searchParams)
  const costOfLiving = useCostOfLiving()

  // Страна для подбора вакансий — тоже в адресе (&country=PL), рядом с баллами
  const country = SUPPORTED_COUNTRIES.includes(searchParams.get('country')) ? searchParams.get('country') : ''
  const sortedCountries = [...SUPPORTED_COUNTRIES].sort((a, b) =>
    t(`countries.${a}`).localeCompare(t(`countries.${b}`), i18n.language),
  )

  function chooseCountry(code) {
    const params = new URLSearchParams(searchParams)
    if (code) params.set('country', code)
    else params.delete('country')
    setSearchParams(params, { replace: true })
  }

  if (!scores) {
    return (
      <section className={styles.page}>
        <h1 className={styles.title}>{t('careerResult.title')}</h1>
        <p>{t('careerResult.invalid')}</p>
        <Link to="/career-test" className={styles.primaryButton}>
          {t('careerTest.start')}
        </Link>
      </section>
    )
  }

  const ranked = rankTypes(scores)
  const code = hollandCode(scores)
  const industries = recommendIndustries(scores)

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>{t('careerResult.title')}</h1>
      <p className={styles.code}>
        {t('careerResult.code')} <strong>{code}</strong>
      </p>
      <p className={styles.codeHint}>{t('careerResult.codeHint')}</p>

      <h2 className={styles.sectionTitle}>{t('careerResult.topTypes')}</h2>
      <ol className={styles.types}>
        {ranked.slice(0, 3).map((type) => (
          <li key={type} className={styles.typeCard}>
            <h3>
              <span className={styles.letter} aria-hidden="true">
                {type}
              </span>
              {t(`careerTypes.${type}.name`)}
            </h3>
            <p>{t(`careerTypes.${type}.description`)}</p>
          </li>
        ))}
      </ol>

      <h2 className={styles.sectionTitle}>{t('careerResult.allTypes')}</h2>
      <ul className={styles.bars}>
        {ranked.map((type) => (
          <li key={type} className={styles.bar}>
            <span className={styles.barLabel}>
              {type} · {t(`careerTypes.${type}.name`)}
            </span>
            <span className={styles.barTrack} aria-hidden="true">
              <span className={styles.barFill} style={{ width: `${scores[type]}%` }} />
            </span>
            <span className={styles.barValue}>{scores[type]}%</span>
          </li>
        ))}
      </ul>

      <h2 className={styles.sectionTitle}>{t('careerResult.industries')}</h2>
      <p className={styles.countryChoice}>
        <label htmlFor="result-country">{t('careerResult.country')}</label>{' '}
        <select id="result-country" value={country} onChange={(event) => chooseCountry(event.target.value)}>
          <option value="">{t('search.allCountries')}</option>
          {sortedCountries.map((code) => (
            <option key={code} value={code}>
              {t(`countries.${code}`)}
            </option>
          ))}
        </select>
      </p>
      <ol className={styles.industries}>
        {industries.map((industry) => (
          <li key={industry.slug} className={styles.industry}>
            <div className={styles.industryHeader}>
              <h3>{t(`industries.${industry.slug}`)}</h3>
              <span className={styles.match}>{t('careerResult.match', { value: industry.score })}</span>
            </div>
            <p className={styles.why}>
              {t('careerResult.why', {
                types: industry.types.map((type) => t(`careerTypes.${type}.name`)).join(', '),
              })}
            </p>
            <IndustryVacancies industry={industry.slug} country={country} costOfLiving={costOfLiving.byCountry} />
          </li>
        ))}
      </ol>

      <p className={styles.disclaimer}>{t('careerResult.disclaimer')}</p>
      <Link to="/career-test" className={styles.linkButton}>
        {t('careerResult.again')}
      </Link>
    </section>
  )
}

export default CareerTestResultPage
