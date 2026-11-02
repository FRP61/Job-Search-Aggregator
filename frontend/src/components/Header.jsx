import styles from './Header.module.css'

// Шапка сайта: показывается на каждой странице.
// Сейчас в ней только название; позже сюда добавим навигацию и переключатель языка.
function Header() {
  return (
    <header className={styles.header}>
      <a href="/" className={styles.logo}>
        Job Search Aggregator
      </a>
    </header>
  )
}

export default Header
