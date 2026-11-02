// Добавляет в expect() проверки для страницы: toBeInTheDocument(), toHaveTextContent() и другие
import '@testing-library/jest-dom/vitest'

// Включаем перевод и в тестах, как на настоящем сайте (см. src/main.jsx)
import i18n from './i18n'

// Перед каждым тестом возвращаем украинский язык,
// чтобы тест, который переключил язык, не влиял на следующие тесты
beforeEach(async () => {
  await i18n.changeLanguage('uk')
})
