import { fireEvent, render, screen, within } from '@testing-library/react'
import App from '../App'
import { mockServer, page, requestedUrls, VACANCY } from '../test/mockServer'

// Исследователь + организатор: галузі IT, Наука та дослідження, Інженерія
const RESULT = '/career-test/result?r=10&i=100&a=10&s=10&e=10&c=90'

function openAt(path) {
	window.history.replaceState(null, '', path)
	render(<App />)
}

// Блок одной галузі на странице результата
function industryBlock(name) {
	return screen.getByRole('heading', { name }).closest('li')
}

afterEach(() => {
	vi.unstubAllGlobals()
})

test('под каждой галуззю — свежие вакансии этой галузі и ссылка на весь поиск', async () => {
	const fetchMock = mockServer({
		vacancies: (url) => {
			const industry = new URL(url).searchParams.get('industry')
			return page([{ ...VACANCY, id: industry.length, title: `Вакансія ${industry}` }], 12)
		},
	})
	openAt(RESULT)

	expect(await screen.findByText('Вакансія it')).toBeInTheDocument()
	expect(await screen.findByText('Вакансія science')).toBeInTheDocument()

	const it = industryBlock('IT та розробка')
	expect(within(it).getByRole('link', { name: 'Дивитися всі 12 вакансій →' })).toHaveAttribute(
		'href',
		'/search?industry=it',
	)
	// у каждой галузі свой запрос, по 3 вакансии
	const urls = requestedUrls(fetchMock, '/vacancies?')
	expect(urls.some((url) => url.includes('industry=it&page=1&page_size=3'))).toBe(true)
	expect(urls.some((url) => url.includes('industry=science&page=1&page_size=3'))).toBe(true)
})

test('выбор страны: адрес, запросы и ссылки — с этой страной', async () => {
	const fetchMock = mockServer()
	openAt(RESULT)
	await screen.findAllByText('Python Developer')

	fireEvent.change(screen.getByLabelText('Шукати вакансії в країні:'), { target: { value: 'PL' } })

	expect(window.location.search).toBe('?r=10&i=100&a=10&s=10&e=10&c=90&country=PL')
	await screen.findAllByText('Python Developer')
	expect(requestedUrls(fetchMock, '/vacancies?').at(-1)).toContain('country=PL')
	expect(within(industryBlock('IT та розробка')).getByRole('link', { name: /Дивитися/ })).toHaveAttribute(
		'href',
		'/search?country=PL&industry=it',
	)
})

test('вакансий в галузі нет → подсказка выбрать другую страну', async () => {
	mockServer({ vacancies: page([]) })
	openAt(RESULT)

	expect(await screen.findAllByText(/Зараз вакансій у цій галузі немає/)).toHaveLength(3)
})

test('сервер не ответил → сообщение и повтор для этой галузі', async () => {
	mockServer({ fail: true })
	openAt(RESULT)

	const errors = await screen.findAllByText(/Не вдалося завантажити вакансії/)
	expect(errors).toHaveLength(3)

	mockServer()
	fireEvent.click(within(industryBlock('IT та розробка')).getByRole('button', { name: 'Спробувати ще раз' }))

	expect(await within(industryBlock('IT та розробка')).findByText('Python Developer')).toBeInTheDocument()
})
