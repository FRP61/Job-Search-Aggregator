import { fireEvent, render, screen } from '@testing-library/react'
import App from '../App'

// Маленькие «ответы сервера» для тестов
const COUNTRIES = [
	{ code: 'PL', name_en: 'Poland', name_uk: 'Польща', currency: 'PLN' },
	{ code: 'EE', name_en: 'Estonia', name_uk: 'Естонія', currency: 'EUR' },
]
const INDUSTRIES = [
	{ slug: 'it', name_en: 'IT', name_uk: 'ІТ' },
	{ slug: 'finance', name_en: 'Finance', name_uk: 'Фінанси' },
]
const VACANCY = {
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

function page(items, total = items.length, number = 1) {
	return { total, page: number, page_size: 20, items }
}

// Подделка сервера: смотрит на адрес запроса и отвечает.
// vacancies — что вернуть на поиск (объект или функция от адреса); fail — ответить ошибкой 500
function mockServer({ vacancies = page([VACANCY]), fail = false } = {}) {
	const fetchMock = vi.fn(async (url) => {
		const json = (data) => ({ ok: true, status: 200, json: async () => data })
		if (url.includes('/countries')) return json(COUNTRIES)
		if (url.includes('/industries')) return json(INDUSTRIES)
		if (fail) return { ok: false, status: 500, json: async () => ({}) }
		return json(typeof vacancies === 'function' ? vacancies(url) : vacancies)
	})
	vi.stubGlobal('fetch', fetchMock)
	return fetchMock
}

// Адреса всех запросов поиска вакансий
function searchUrls(fetchMock) {
	return fetchMock.mock.calls.map(([url]) => url).filter((url) => url.includes('/vacancies'))
}

// Открыть сайт сразу на нужном адресе
function openAt(path) {
	window.history.replaceState(null, '', path)
	render(<App />)
}

afterEach(() => {
	vi.unstubAllGlobals()
})

test('в шапке есть ссылка «Пошук вакансій», по ней открывается страница поиска', async () => {
	mockServer()
	openAt('/')

	fireEvent.click(screen.getByRole('link', { name: 'Пошук вакансій' }))

	expect(screen.getByRole('heading', { name: 'Пошук вакансій' })).toBeInTheDocument()
	expect(await screen.findByText('Python Developer')).toBeInTheDocument()
})

test('списки стран и галузей приходят с сервера', async () => {
	mockServer()
	openAt('/search')

	expect(await screen.findByRole('option', { name: 'Польща' })).toBeInTheDocument()
	expect(screen.getByRole('option', { name: 'Фінанси' })).toBeInTheDocument()
	expect(screen.getByRole('option', { name: 'Усі країни' })).toBeInTheDocument()
})

test('пока идёт поиск, видно «Шукаємо вакансії…», потом — карточку вакансии', async () => {
	mockServer()
	openAt('/search')

	expect(screen.getByText('Шукаємо вакансії…')).toBeInTheDocument()
	expect(await screen.findByText('Python Developer')).toBeInTheDocument()
	expect(screen.getByText('Знайдено 1 вакансію')).toBeInTheDocument()
	expect(screen.getByText('Acme · Warszawa, Польща')).toBeInTheDocument()
	expect(screen.getByText('30 000 € – 45 000 €')).toBeInTheDocument()
	expect(screen.getByText('Віддалено')).toBeInTheDocument()
	expect(screen.getByRole('link', { name: 'Python Developer' })).toHaveAttribute('href', 'https://example.com/jobs/1')
})

test('фильтры из адреса страницы попадают в запрос и в форму', async () => {
	const fetchMock = mockServer()
	openAt('/search?country=PL&industry=it&q=python')

	await screen.findByText('Python Developer')

	expect(searchUrls(fetchMock)[0]).toContain('country=PL&industry=it&q=python&page=1')
	expect(screen.getByLabelText('Країна')).toHaveValue('PL')
	expect(screen.getByLabelText('Галузь')).toHaveValue('it')
	expect(screen.getByLabelText('Ключове слово')).toHaveValue('python')
})

test('выбор страны меняет адрес и запускает новый поиск', async () => {
	const fetchMock = mockServer()
	openAt('/search')
	await screen.findByRole('option', { name: 'Польща' })

	fireEvent.change(screen.getByLabelText('Країна'), { target: { value: 'PL' } })

	expect(window.location.search).toBe('?country=PL')
	await screen.findByText('Python Developer')
	expect(searchUrls(fetchMock).at(-1)).toContain('country=PL')
})

test('ключевое слово применяется по кнопке «Шукати»', async () => {
	const fetchMock = mockServer()
	openAt('/search')
	await screen.findByText('Python Developer')

	fireEvent.change(screen.getByLabelText('Ключове слово'), { target: { value: ' python ' } })
	expect(window.location.search).toBe('')

	fireEvent.click(screen.getByRole('button', { name: 'Шукати' }))

	expect(window.location.search).toBe('?q=python')
	await screen.findByText('Python Developer')
	expect(searchUrls(fetchMock).at(-1)).toContain('q=python')
})

test('ничего не нашлось → сообщение и кнопка «Скинути фільтри»', async () => {
	mockServer({ vacancies: page([]) })
	openAt('/search?country=EE&q=cobol')

	expect(await screen.findByText(/За цими фільтрами нічого не знайдено/)).toBeInTheDocument()

	fireEvent.click(screen.getByRole('button', { name: 'Скинути фільтри' }))

	expect(window.location.search).toBe('')
})

test('сервер ответил ошибкой → сообщение; «Спробувати ще раз» повторяет поиск', async () => {
	mockServer({ fail: true })
	openAt('/search')

	expect(await screen.findByText(/Не вдалося завантажити вакансії/)).toBeInTheDocument()

	mockServer()
	fireEvent.click(screen.getByRole('button', { name: 'Спробувати ще раз' }))

	expect(await screen.findByText('Python Developer')).toBeInTheDocument()
})

test('45 вакансий → 3 страницы; «Наступна» открывает вторую', async () => {
	const fetchMock = mockServer({
		vacancies: (url) => page([VACANCY], 45, Number(new URL(url).searchParams.get('page'))),
	})
	openAt('/search?industry=it')

	expect(await screen.findByText('Сторінка 1 з 3')).toBeInTheDocument()
	expect(screen.getByRole('button', { name: '← Попередня' })).toBeDisabled()

	fireEvent.click(screen.getByRole('button', { name: 'Наступна →' }))

	expect(window.location.search).toBe('?industry=it&page=2')
	expect(await screen.findByText('Сторінка 2 з 3')).toBeInTheDocument()
	expect(searchUrls(fetchMock).at(-1)).toContain('page=2')
})

test('на английском — названия стран и сумма в английском формате', async () => {
	mockServer()
	localStorage.setItem('jsa-language', 'en')
	openAt('/search')
	fireEvent.click(screen.getByRole('button', { name: 'EN' }))

	expect(await screen.findByText('1 vacancy found')).toBeInTheDocument()
	expect(screen.getByText('Acme · Warszawa, Poland')).toBeInTheDocument()
	expect(screen.getByText('€30,000 – €45,000')).toBeInTheDocument()
})

test('сервер не отвечает совсем → одно сообщение об ошибке, «Спробувати ще раз» загружает и списки', async () => {
	vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
	openAt('/search')

	expect(await screen.findByText(/Не вдалося завантажити вакансії/)).toBeInTheDocument()
	expect(screen.queryByText(/Не вдалося завантажити списки/)).not.toBeInTheDocument()

	mockServer()
	fireEvent.click(screen.getByRole('button', { name: 'Спробувати ще раз' }))

	expect(await screen.findByText('Python Developer')).toBeInTheDocument()
	expect(await screen.findByRole('option', { name: 'Польща' })).toBeInTheDocument()
})
