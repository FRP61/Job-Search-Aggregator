import { useTranslation } from 'react-i18next'

import styles from './CalculatorPage.module.css'

// Страница калькулятора «брутто → на руки».
// Пока только заголовок; форму и результат добавим следующими пунктами.
function CalculatorPage() {
  const { t } = useTranslation()

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>{t('calculator.title')}</h1>
      <p className={styles.intro}>{t('calculator.intro')}</p>
    </section>
  )
}

export default CalculatorPage
