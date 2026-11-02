import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Настройки тестов (Vitest)
  test: {
    // jsdom — "браузер внутри теста": даёт document, кнопки, клики без настоящего браузера
    environment: 'jsdom',
    // test, expect, describe доступны в тестах без импорта
    globals: true,
    // этот файл выполняется перед каждым файлом тестов
    setupFiles: './src/setupTests.js',
  },
})
