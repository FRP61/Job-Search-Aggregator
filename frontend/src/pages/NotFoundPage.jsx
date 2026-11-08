import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { usePageTitle } from '../components/usePageTitle'
import styles from './NotFoundPage.module.css'

// Страница для адреса, которого на сайте нет
function NotFoundPage() {
  const { t } = useTranslation()
  usePageTitle(t('notFound.title'))

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>{t('notFound.title')}</h1>
      <p>{t('notFound.text')}</p>
      <Link to="/" className={styles.button}>
        {t('notFound.home')}
      </Link>
    </section>
  )
}

export default NotFoundPage
