import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { usePageTitle } from '../components/usePageTitle'
import styles from './HomePage.module.css'

// Главная страница: заголовок, короткое описание и две кнопки.
// Кнопки ведут на страницу поиска и на тест профориентации.
function HomePage() {
  const { t } = useTranslation()
  usePageTitle(null)

  return (
    <section className={styles.hero}>
      <h1 className={styles.title}>{t('home.title')}</h1>
      <p className={styles.subtitle}>{t('home.subtitle')}</p>

      <div className={styles.actions}>
        <Link to="/search" className={styles.primaryButton}>
          {t('home.searchJobs')}
        </Link>
        <Link to="/career-test" className={styles.secondaryButton}>
          {t('home.takeTest')}
        </Link>
      </div>
    </section>
  )
}

export default HomePage
