import { fireEvent, render, screen, within } from '@testing-library/react'
import App from '../App'
import { mockServer, VACANCY } from '../test/mockServer'

function openAt(path) {
	window.history.replaceState(null, '', path)
	render(<App />)
}

afterEach(() => {
	vi.unstubAllGlobals()
})

test('из карточки в поиске открывается страница вакансии, «назад» возвращает те же фильтры', async () => {
	mockServer()
	openAt('/search?country=PL&q=python')

	fireEvent.click(await screen.findByRole('link', { name: 'Python Developer' }))

	expect(await screen.findByRole('heading', { level: 1, name: 'Python Developer' })).toBeInTheDocument()
	expect(window.location.pathname + window.location.search).toBe('/vacancies/1?country=PL')

	fireEvent.click(screen.getByRole('link', { name: '← До результатів пошуку' }))

	expect(window.location.search).toBe('?country=PL&q=python')
})

test('шапка вакансии и ссылка на источник', async () => {
	mockServer({
		vacancy: { ...VACANCY, other_sources: [{ source: 'eures', url: 'https://example.com/eures/1' }] },
	})
	openAt('/vacancies/1')

	expect(await screen.findByRole('heading', { level: 1, name: 'Python Developer' })).toBeInTheDocument()
	expect(screen.getByText('Acme · Warszawa, Польща')).toBeInTheDocument()
	expect(screen.getByRole('link', { name: 'Відкрити на сайті justjoin' })).toHaveAttribute(
		'href',
		'https://example.com/jobs/1',
	)
	expect(screen.getByRole('link', { name: 'eures' })).toHaveAttribute('href', 'https://example.com/eures/1')
})

test('таблица «брутто → на руки» для минимума и максимума, в среднем за месяц', async () => {
	mockServer()
	openAt('/vacancies/1')

	const table = await screen.findByRole('table')
	const row = (name) => within(table).getByRole('row', { name: new RegExp(`^${name}`) })

	expect(row('Брутто')).toHaveTextContent('2 500 €3 750 €')
	expect(row('Соціальні внески')).toHaveTextContent('537 €805 €')
	expect(row('Податок на доходи')).toHaveTextContent('184 €494 €')
	expect(row('На руки')).toHaveTextContent('1 779 €2 451 €')
	expect(row('Податки і внески')).toHaveTextContent('28,8%34,6%')
	expect(await screen.findByText('≈ 2 535 € – 3 491 € у цінах середнього ЄС')).toBeInTheDocument()
	expect(screen.getByRole('link', { name: 'Відкрити в калькуляторі' })).toHaveAttribute(
		'href',
		'/calculator?country=PL&gross=37500&period=year&currency=EUR',
	)
})

test('вакансия в двух странах — можно выбрать страну для расчёта', async () => {
	mockServer({ vacancy: { ...VACANCY, countries: ['PL', 'EE'] } })
	openAt('/vacancies/1?country=EE')

	const select = await screen.findByLabelText('Рахувати для країни:')
	expect(select).toHaveValue('EE')
	// Эстония: 30 000 € → 2 033,80 € в месяц
	expect(within(screen.getByRole('table')).getByRole('row', { name: /^На руки/ })).toHaveTextContent('2 034 €')

	fireEvent.change(select, { target: { value: 'PL' } })

	expect(window.location.search).toBe('?country=PL')
	expect(within(screen.getByRole('table')).getByRole('row', { name: /^На руки/ })).toHaveTextContent('1 779 €')
})

test('без зарплаты — предложение посчитать в калькуляторе', async () => {
	mockServer({ vacancy: { ...VACANCY, salary_annual_min_eur: null, salary_annual_max_eur: null } })
	openAt('/vacancies/1')

	expect(await screen.findByText(/Роботодавець не вказав зарплату/)).toBeInTheDocument()
	expect(screen.queryByRole('table')).not.toBeInTheDocument()
})

test('описание: опасный HTML вычищается, оформление остаётся', async () => {
	mockServer({
		vacancy: {
			...VACANCY,
			description:
				'<p>Шукаємо <b>розробника</b></p><script>alert(1)</script><img src=x onerror="alert(2)"><ul><li>Python</li></ul>',
		},
	})
	openAt('/vacancies/1')

	const heading = await screen.findByRole('heading', { name: 'Опис вакансії' })
	const description = heading.nextElementSibling

	expect(description.querySelector('b')).toHaveTextContent('розробника')
	expect(description.querySelector('li')).toHaveTextContent('Python')
	expect(description.querySelector('script')).toBeNull()
	expect(description.querySelector('img')).toBeNull()
})

test('описание обычным текстом показывается как текст', async () => {
	mockServer({ vacancy: { ...VACANCY, description: 'Рядок 1\nРядок 2 <3' } })
	openAt('/vacancies/1')

	const heading = await screen.findByRole('heading', { name: 'Опис вакансії' })

	expect(heading.nextElementSibling.textContent).toBe('Рядок 1\nРядок 2 <3')
})

test('вакансии нет (404) → «Вакансію не знайдено»', async () => {
	mockServer({ vacancy: null })
	openAt('/vacancies/999')

	expect(await screen.findByText(/Вакансію не знайдено/)).toBeInTheDocument()
	expect(screen.queryByRole('button', { name: 'Спробувати ще раз' })).not.toBeInTheDocument()
})

test('ошибка сервера → сообщение и «Спробувати ще раз»', async () => {
	mockServer({ fail: true })
	openAt('/vacancies/1')

	expect(await screen.findByText(/Не вдалося завантажити вакансію/)).toBeInTheDocument()

	mockServer()
	fireEvent.click(screen.getByRole('button', { name: 'Спробувати ще раз' }))

	expect(await screen.findByRole('heading', { level: 1, name: 'Python Developer' })).toBeInTheDocument()
})

test('«Відкрити в калькуляторі» открывает калькулятор с зарплатой вакансии', async () => {
	mockServer()
	openAt('/vacancies/1')

	fireEvent.click(await screen.findByRole('link', { name: 'Відкрити в калькуляторі' }))

	expect(screen.getByLabelText('Країна')).toHaveValue('PL')
	expect(screen.getByLabelText('Зарплата брутто, €')).toHaveValue('37500')
	expect(screen.getByLabelText('на рік')).toBeChecked()
})
