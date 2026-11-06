// Добавляет в expect() проверки для страницы: toBeInTheDocument(), toHaveTextContent() и другие
import '@testing-library/jest-dom/vitest'

// Включаем перевод и в тестах, как на настоящем сайте (см. src/main.jsx)
import i18n from './i18n'

// Перед каждым тестом начинаем «с чистого листа»:
// стираем сохранённое в браузере, возвращаем украинский язык
// и открываем главную страницу, чтобы один тест не влиял на следующие
beforeEach(async () => {
  localStorage.clear()
  window.history.replaceState(null, '', '/')
  await i18n.changeLanguage('uk')
})
