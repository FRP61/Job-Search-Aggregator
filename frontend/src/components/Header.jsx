import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router'

import LanguageSwitcher from './LanguageSwitcher'
import styles from './Header.module.css'

// Шапка сайта: показывается на каждой странице.
// Слева название сайта, дальше меню, справа переключатель языка.
function Header() {
  const { t } = useTranslation()

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo}>
        Job Search Aggregator
      </Link>

      <nav className={styles.nav} aria-label={t('nav.label')}>
        <NavLink
          to="/calculator"
          className={({ isActive }) => (isActive ? `${styles.navLink} ${styles.active}` : styles.navLink)}
        >
          {t('nav.calculator')}
        </NavLink>
      </nav>

      <LanguageSwitcher />
    </header>
  )
}

export default Header
