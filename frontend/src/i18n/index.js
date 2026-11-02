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

// Сообщаем браузеру, на каком языке страница (<html lang="uk"> или "en").
// Это нужно экранным чтецам для правильного произношения и поисковикам.
function updateHtmlLang(language) {
  document.documentElement.lang = language
}
updateHtmlLang(i18n.language)
i18n.on('languageChanged', updateHtmlLang)

export default i18n
