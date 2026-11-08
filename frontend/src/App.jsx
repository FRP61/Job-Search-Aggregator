import { useTranslation } from 'react-i18next'
import { BrowserRouter, Route, Routes } from 'react-router'

import styles from './App.module.css'
import Footer from './components/Footer'
import Header from './components/Header'
import ScrollToTop from './components/ScrollToTop'
import CalculatorPage from './pages/CalculatorPage'
import CareerTestPage from './pages/CareerTestPage'
import CareerTestResultPage from './pages/CareerTestResultPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import SearchPage from './pages/SearchPage'
import VacancyPage from './pages/VacancyPage'

// Главный компонент сайта: шапка на всех страницах,
// а под ней — страница, которая соответствует адресу в браузере.
function App() {
  const { t } = useTranslation()

  return (
    <BrowserRouter>
      <ScrollToTop />
      {/* Первая ссылка на странице: с клавиатуры можно сразу перейти к содержимому, минуя меню */}
      <a href="#main" className={styles.skipLink}>
        {t('nav.skipToContent')}
      </a>
      <Header />
      <main id="main" tabIndex={-1} className={styles.main}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/vacancies/:id" element={<VacancyPage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/career-test" element={<CareerTestPage />} />
          <Route path="/career-test/result" element={<CareerTestResultPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  )
}

export default App
