import LanguageSwitcher from './LanguageSwitcher'
import styles from './Header.module.css'

// Шапка сайта: показывается на каждой странице.
// Слева название сайта, справа переключатель языка; позже добавим навигацию.
function Header() {
  return (
    <header className={styles.header}>
      <a href="/" className={styles.logo}>
        Job Search Aggregator
      </a>
      <LanguageSwitcher />
    </header>
  )
}

export default Header
