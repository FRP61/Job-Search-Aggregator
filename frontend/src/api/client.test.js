import { ApiError, buildUrl, getCountries, searchVacancies } from './client'

// Вместо настоящего сервера — подделка fetch: возвращает то, что скажем
function mockFetch(response) {
	const fetchMock = vi.fn().mockResolvedValue(response)
	vi.stubGlobal('fetch', fetchMock)
	return fetchMock
}

function jsonResponse(data, status = 200) {
	return { ok: status >= 200 && status < 300, status, json: async () => data }
}

afterEach(() => {
	vi.unstubAllGlobals()
})

test('адрес по умолчанию — локальный бэкенд', () => {
	expect(buildUrl('/countries')).toBe('http://localhost:8000/api/v1/countries')
})

test('несколько стран — повторяющийся параметр, пустые параметры пропускаются', () => {
	expect(buildUrl('/vacancies', { country: ['PL', 'GR'], industry: '', q: undefined, page: 2 })).toBe(
		'http://localhost:8000/api/v1/vacancies?country=PL&country=GR&page=2',
	)
})

test('поиск вакансий отправляет фильтры в адресе и возвращает ответ сервера', async () => {
	const page = { total: 0, page: 1, page_size: 20, items: [] }
	const fetchMock = mockFetch(jsonResponse(page))

	const result = await searchVacancies({ countries: ['PL'], industry: 'it', q: 'python' })

	expect(fetchMock.mock.calls[0][0]).toBe(
		'http://localhost:8000/api/v1/vacancies?country=PL&industry=it&q=python&page=1&page_size=20',
	)
	expect(result).toEqual(page)
})

test('ответ с ошибкой сервера → ApiError с кодом ответа', async () => {
	mockFetch(jsonResponse({ detail: 'oops' }, 500))

	await expect(getCountries()).rejects.toMatchObject({ name: 'ApiError', status: 500 })
})

test('сервер не отвечает → ApiError с кодом 0', async () => {
	vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

	const error = await getCountries().catch((e) => e)

	expect(error).toBeInstanceOf(ApiError)
	expect(error.status).toBe(0)
})
