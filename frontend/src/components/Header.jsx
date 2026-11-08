import { useTranslation } from 'react-i18next'
import { Link, NavLink, useLocation } from 'react-router'

import LanguageSwitcher from './LanguageSwitcher'
import styles from './Header.module.css'

// Шапка сайта: показывается на каждой странице.
// Слева название сайта, дальше меню, справа переключатель языка.
function Header() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const linkClass = ({ isActive }) => (isActive ? `${styles.navLink} ${styles.active}` : styles.navLink)
  // страница вакансии — тоже часть поиска
  const searchClass = ({ isActive }) => linkClass({ isActive: isActive || pathname.startsWith('/vacancies/') })

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo}>
        Job Search Aggregator
      </Link>

      <nav className={styles.nav} aria-label={t('nav.label')}>
        <NavLink to="/search" className={searchClass}>
          {t('nav.search')}
        </NavLink>
        <NavLink to="/calculator" className={linkClass}>
          {t('nav.calculator')}
        </NavLink>
        <NavLink to="/career-test" className={linkClass}>
          {t('nav.test')}
        </NavLink>
      </nav>

      <LanguageSwitcher />
    </header>
  )
}

export default Header
