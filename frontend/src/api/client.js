// Запросы к нашему бэкенду (FastAPI). Все адреса — относительно API_URL.
// Адрес берём из переменной окружения VITE_API_URL (файл .env, см. .env.example),
// а если её нет — локальный бэкенд, как в backend/README.md.
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, '')

// Ошибка запроса. status — код ответа сервера (404, 500...), 0 — сервер не ответил вообще
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// Собрать адрес с параметрами. Пустые значения пропускаем,
// массив превращаем в повторяющийся параметр: ?country=PL&country=GR
export function buildUrl(path, params = {}) {
  const url = new URL(API_URL + path)
  for (const [name, value] of Object.entries(params)) {
    const values = Array.isArray(value) ? value : [value]
    for (const item of values) {
      if (item !== undefined && item !== null && item !== '') {
        url.searchParams.append(name, item)
      }
    }
  }
  return url.toString()
}

// Сделать GET-запрос и вернуть ответ как объект.
// signal — чтобы отменить запрос, если он больше не нужен (человек сменил фильтр)
async function getJson(path, params, { signal } = {}) {
  let response
  try {
    response = await fetch(buildUrl(path, params), { signal, headers: { Accept: 'application/json' } })
  } catch (error) {
    // отменённый запрос — не ошибка, пробрасываем как есть, чтобы его можно было отличить
    if (error.name === 'AbortError') throw error
    throw new ApiError('Сервер не отвечает', 0)
  }
  if (!response.ok) {
    throw new ApiError(`Сервер ответил ошибкой ${response.status}`, response.status)
  }
  return response.json()
}

// 27 стран: [{ code, name_en, name_uk, currency }]
export function getCountries(options) {
  return getJson('/countries', {}, options)
}

// 19 галузей: [{ slug, name_en, name_uk }]
export function getIndustries(options) {
  return getJson('/industries', {}, options)
}

// Индекс стоимости жизни: без кода — рейтинг всех стран, с кодом — одна страна с историей
export function getCostOfLiving(countryCode, options) {
  return getJson(countryCode ? `/cost-of-living/${countryCode}` : '/cost-of-living', {}, options)
}

// Поиск вакансий за последние 30 дней, сначала новые.
// countries — массив кодов (пустой = все страны), industry — slug галузі, q — слово в названии или компании.
// Ответ: { total, page, page_size, items: [...] }
export function searchVacancies({ countries = [], industry, q, page = 1, pageSize = 20 } = {}, options) {
  return getJson('/vacancies', { country: countries, industry, q, page, page_size: pageSize }, options)
}

// Одна вакансия с полным описанием
export function getVacancy(id, options) {
  return getJson(`/vacancies/${id}`, {}, options)
}
