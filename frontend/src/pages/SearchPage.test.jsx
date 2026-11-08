import { fireEvent, render, screen } from '@testing-library/react'
import App from '../App'
import { mockServer, page, requestedUrls, VACANCY } from '../test/mockServer'

// Адреса запросов поиска вакансий
function searchUrls(fetchMock) {
	return requestedUrls(fetchMock, '/vacancies')
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
	expect(screen.getByRole('link', { name: 'Python Developer' })).toHaveAttribute('href', '/vacancies/1?country=PL')
})

test('в карточке — «на руки» по налогам страны и «реальный доход» в ценах ЕС', async () => {
	mockServer()
	openAt('/search')

	// 30 000 € в Польше → 21 352,26 € на руки в год → 1 779 € в месяц; 45 000 € → 2 451 €
	expect(await screen.findByText('≈ 1 779 € – 2 451 € на руки на місяць')).toBeInTheDocument()
	expect(screen.getByText('у середньому, за податками країни: Польща')).toBeInTheDocument()
	// уровень цен в Польше 70,2% от ЕС: 1 779 / 0,702 ≈ 2 535 €
	expect(await screen.findByText('≈ 2 535 € – 3 491 € у цінах середнього ЄС')).toBeInTheDocument()
})

test('вакансия без зарплаты — без строк про деньги', async () => {
	mockServer({ vacancies: page([{ ...VACANCY, salary_annual_min_eur: null, salary_annual_max_eur: null }]) })
	openAt('/search')

	await screen.findByText('Python Developer')

	expect(screen.queryByText(/на руки на місяць/)).not.toBeInTheDocument()
})

test('выбрана страна → над результатами блок «Вартість життя»', async () => {
	mockServer()
	openAt('/search?country=PL')

	const block = await screen.findByRole('complementary', { name: 'Вартість життя: Польща' })

	expect(block).toHaveTextContent('70,2% від середнього в ЄС')
	expect(block).toHaveTextContent('1 445 € на місяць')
	expect(block).toHaveTextContent('86 (ЄС = 100), 15 місце з 2')
})

test('индексы стоимости жизни не загрузились — поиск всё равно работает', async () => {
	mockServer({ costOfLivingFails: true })
	openAt('/search?country=PL')

	expect(await screen.findByText('≈ 1 779 € – 2 451 € на руки на місяць')).toBeInTheDocument()
	expect(screen.queryByText(/Вартість життя/)).not.toBeInTheDocument()
	expect(screen.queryByText(/у цінах середнього ЄС/)).not.toBeInTheDocument()
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
