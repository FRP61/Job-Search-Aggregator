import { useTranslation } from 'react-i18next'

import styles from './Footer.module.css'

// Подвал сайта: откуда данные и что расчёты приблизительные
function Footer() {
  const { t } = useTranslation()

  return (
    <footer className={styles.footer}>
      <p>{t('footer.sources')}</p>
      <p>{t('footer.disclaimer')}</p>
    </footer>
  )
}

export default Footer
