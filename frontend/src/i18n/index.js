// Настройка перевода сайта (i18next).
// Все тексты лежат в uk.json и en.json; в компонентах их достаём через t('ключ').
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './en.json'
import uk from './uk.json'

i18n.use(initReactI18next).init({
  resources: {
    uk: { translation: uk },
    en: { translation: en },
  },
  // язык при первом открытии сайта
  lng: 'uk',
  // если какого-то текста нет в выбранном языке, показываем украинский
  fallbackLng: 'uk',
  // React сам защищает текст от вредного HTML, второй раз это делать не нужно
  interpolation: { escapeValue: false },
  // тексты уже в коде, ждать загрузки не нужно: перевод готов сразу
  initAsync: false,
})

export default i18n
