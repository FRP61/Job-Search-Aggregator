import { BrowserRouter, Route, Routes } from 'react-router'

import Header from './components/Header'
import CalculatorPage from './pages/CalculatorPage'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import VacancyPage from './pages/VacancyPage'

// Главный компонент сайта: шапка на всех страницах,
// а под ней — страница, которая соответствует адресу в браузере.
function App() {
  return (
    <BrowserRouter>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/vacancies/:id" element={<VacancyPage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App
