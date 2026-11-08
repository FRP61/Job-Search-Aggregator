import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'

import { hollandCode, rankTypes, recommendIndustries, scoresFromQuery } from '../careerTest/riasec'
import styles from './CareerTestResultPage.module.css'

// Страница результата теста: /career-test/result?r=60&i=80&a=20&s=40&e=70&c=30.
// Всё нужное — в адресе, поэтому результатом можно поделиться ссылкой
function CareerTestResultPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const scores = scoresFromQuery(searchParams)

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
            <Link to={`/search?industry=${industry.slug}`} className={styles.secondaryButton}>
              {t('careerResult.seeVacancies')}
            </Link>
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
