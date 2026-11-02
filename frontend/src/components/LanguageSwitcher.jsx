import { useTranslation } from 'react-i18next'

import styles from './LanguageSwitcher.module.css'

// Языки сайта: code — как язык называется в i18next, label — что написано на кнопке
const LANGUAGES = [
  { code: 'uk', label: 'UA' },
  { code: 'en', label: 'EN' },
]

// Переключатель языка: две кнопки рядом, выбранная подсвечена
function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  return (
    <div className={styles.switcher} role="group" aria-label={t('header.language')}>
      {LANGUAGES.map((language) => {
        const isActive = i18n.language === language.code

        return (
          <button
            key={language.code}
            type="button"
            className={isActive ? `${styles.button} ${styles.active}` : styles.button}
            aria-pressed={isActive}
            onClick={() => i18n.changeLanguage(language.code)}
          >
            {language.label}
          </button>
        )
      })}
    </div>
  )
}

export default LanguageSwitcher
