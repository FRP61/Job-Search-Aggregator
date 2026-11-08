// Подделка нашего бэкенда для тестов: вместо настоящего fetch отвечает заготовками.
// Каждый тест может поменять любой ответ: mockServer({ vacancies: ..., vacancy: ... })

export const COUNTRIES = [
	{ code: 'PL', name_en: 'Poland', name_uk: 'Польща', currency: 'PLN' },
	{ code: 'EE', name_en: 'Estonia', name_uk: 'Естонія', currency: 'EUR' },
]

export const INDUSTRIES = [
	{ slug: 'it', name_en: 'IT', name_uk: 'ІТ' },
	{ slug: 'finance', name_en: 'Finance', name_uk: 'Фінанси' },
]

export const COST_OF_LIVING = [
	{
		rank: 15,
		year: 2024,
		price_level_index: 70.2,
		avg_net_earnings_eur: 17339.93,
		purchasing_power_index: 85.8,
		source: 'Eurostat',
		country: COUNTRIES[0],
	},
	{
		rank: 18,
		year: 2024,
		price_level_index: 96.5,
		avg_net_earnings_eur: 21462.22,
		purchasing_power_index: 77.3,
		source: 'Eurostat',
		country: COUNTRIES[1],
	},
]

export const VACANCY = {
	id: 1,
	source: 'justjoin',
	title: 'Python Developer',
	company: 'Acme',
	countries: ['PL'],
	city: 'Warszawa',
	url: 'https://example.com/jobs/1',
	remote: true,
	industry: { slug: 'it', name_en: 'IT', name_uk: 'ІТ' },
	salary_annual_min_eur: 30000,
	salary_annual_max_eur: 45000,
	posted_at: '2026-11-05T10:00:00Z',
	other_sources: [],
}

// Страница результатов поиска
export function page(items, total = items.length, number = 1) {
	return { total, page: number, page_size: 20, items }
}

function json(data, status = 200) {
	return { ok: status >= 200 && status < 300, status, json: async () => data }
}

// vacancies — ответ на поиск (объект или функция от адреса запроса);
// vacancy — ответ на одну вакансию (объект, функция от адреса или null = 404);
// fail — поиск и вакансия отвечают ошибкой 500; costOfLivingFails — индексы не загрузились
export function mockServer({
	vacancies = page([VACANCY]),
	vacancy = { ...VACANCY, description: '<p>Опис</p>' },
	fail = false,
	costOfLivingFails = false,
} = {}) {
	const fetchMock = vi.fn(async (url) => {
		const path = new URL(url).pathname
		if (path.endsWith('/countries')) return json(COUNTRIES)
		if (path.endsWith('/industries')) return json(INDUSTRIES)
		if (path.endsWith('/cost-of-living')) return costOfLivingFails ? json({}, 500) : json(COST_OF_LIVING)
		if (fail) return json({}, 500)
		if (path.endsWith('/vacancies')) return json(typeof vacancies === 'function' ? vacancies(url) : vacancies)
		if (path.includes('/vacancies/')) {
			const data = typeof vacancy === 'function' ? vacancy(url) : vacancy
			return data ? json(data) : json({ detail: 'Not found' }, 404)
		}
		return json({ detail: 'Not found' }, 404)
	})
	vi.stubGlobal('fetch', fetchMock)
	return fetchMock
}

// Адреса всех запросов, в которых встречается кусок текста
export function requestedUrls(fetchMock, part) {
	return fetchMock.mock.calls.map(([url]) => url).filter((url) => url.includes(part))
}
