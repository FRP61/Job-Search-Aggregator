// Настройка перевода сайта (i18next).
// Все тексты лежат в uk.json и en.json; в компонентах их достаём через t('ключ').
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './en.json'
import uk from './uk.json'

// Какие языки есть на сайте и какой показывать, если человек ещё ничего не выбирал
const SUPPORTED_LANGUAGES = ['uk', 'en']
const DEFAULT_LANGUAGE = 'uk'

// Название ячейки в браузере (localStorage), где запоминаем выбранный язык
const STORAGE_KEY = 'jsa-language'

// С какого языка открыть сайт: сохранённый выбор, а если его нет или он странный — украинский
export function getStartLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return SUPPORTED_LANGUAGES.includes(saved) ? saved : DEFAULT_LANGUAGE
  } catch {
    // браузер не даёт читать хранилище (например, в приватном режиме)
    return DEFAULT_LANGUAGE
  }
}

// Запомнить язык, который человек выбрал сам
export function saveLanguage(language) {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // не получилось сохранить — не страшно, просто в следующий раз будет украинский
  }
}

i18n.use(initReactI18next).init({
  resources: {
    uk: { translation: uk },
    en: { translation: en },
  },
  // язык при открытии сайта
  lng: getStartLanguage(),
  // если какого-то текста нет в выбранном языке, показываем украинский
  fallbackLng: DEFAULT_LANGUAGE,
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
