import { fireEvent, render, screen } from '@testing-library/react'
import App from '../App'
import { QUESTIONS } from '../careerTest/riasec'

function openAt(path) {
	window.history.replaceState(null, '', path)
	render(<App />)
}

// Ответить на текущий вопрос: «Подобається», если его тип в списке, иначе «Не подобається»
function answerCurrent(likedTypes) {
	const text = screen.getByText((content, element) => element?.tagName === 'P' && QUESTIONS.some((q) => q.uk === content))
	const question = QUESTIONS.find((q) => q.uk === text.textContent)
	fireEvent.click(screen.getByRole('button', { name: likedTypes.includes(question.type) ? 'Подобається' : 'Не подобається' }))
}

beforeEach(() => {
	sessionStorage.clear()
})

test('в шапке есть ссылка на тест; сначала вступление с кнопкой «Почати тест»', () => {
	openAt('/')

	fireEvent.click(screen.getByRole('link', { name: 'Тест профорієнтації' }))

	expect(screen.getByRole('heading', { name: 'Тест профорієнтації' })).toBeInTheDocument()
	expect(screen.getByText('30 питань')).toBeInTheDocument()
	expect(screen.getByRole('button', { name: 'Почати тест' })).toBeInTheDocument()
})

test('по одному вопросу на экране, ответ переводит к следующему, «назад» возвращает', () => {
	openAt('/career-test')
	fireEvent.click(screen.getByRole('button', { name: 'Почати тест' }))

	expect(screen.getByText('Питання 1 з 30')).toBeInTheDocument()
	expect(screen.getByText(QUESTIONS[0].uk)).toBeInTheDocument()
	expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')

	fireEvent.click(screen.getByRole('button', { name: 'Подобається' }))

	expect(screen.getByText('Питання 2 з 30')).toBeInTheDocument()
	expect(screen.getByText(QUESTIONS[1].uk)).toBeInTheDocument()

	fireEvent.click(screen.getByRole('button', { name: '← Попереднє питання' }))

	expect(screen.getByText(QUESTIONS[0].uk)).toBeInTheDocument()
	// прошлый ответ отмечен
	expect(screen.getByRole('button', { name: 'Подобається' })).toHaveAttribute('aria-pressed', 'true')
})

test('после 30 ответов открывается результат: код Голланда и подходящие галузі', () => {
	openAt('/career-test')
	fireEvent.click(screen.getByRole('button', { name: 'Почати тест' }))

	for (let i = 0; i < 30; i++) answerCurrent(['I', 'C'])

	expect(window.location.pathname).toBe('/career-test/result')
	expect(window.location.search).toBe('?r=0&i=100&a=0&s=0&e=0&c=100')
	expect(screen.getByRole('heading', { name: 'Ваш результат' })).toBeInTheDocument()
	expect(screen.getByText('ICR')).toBeInTheDocument()
	expect(screen.getByRole('heading', { name: /Дослідник/ })).toBeInTheDocument()
	expect(screen.getByRole('heading', { name: 'IT та розробка' })).toBeInTheDocument()
	expect(screen.getAllByRole('link', { name: 'Дивитися вакансії' })[0]).toHaveAttribute('href', '/search?industry=it')
})

test('незаконченный тест не теряется при обновлении страницы', () => {
	openAt('/career-test')
	fireEvent.click(screen.getByRole('button', { name: 'Почати тест' }))
	fireEvent.click(screen.getByRole('button', { name: 'Подобається' }))
	fireEvent.click(screen.getByRole('button', { name: 'Не впевнений(-а)' }))

	// «обновили страницу»: всё рисуется заново
	document.body.innerHTML = ''
	openAt('/career-test')

	expect(screen.getByText('Питання 3 з 30')).toBeInTheDocument()
})

test('испорченная ссылка на результат → предложение пройти тест', () => {
	openAt('/career-test/result?r=1')

	expect(screen.getByText(/Результат не знайдено/)).toBeInTheDocument()
	expect(screen.getByRole('link', { name: 'Почати тест' })).toHaveAttribute('href', '/career-test')
})

test('результат на английском', () => {
	localStorage.setItem('jsa-language', 'en')
	openAt('/career-test/result?r=10&i=20&a=100&s=30&e=90&c=0')
	fireEvent.click(screen.getByRole('button', { name: 'EN' }))

	expect(screen.getByText('AES')).toBeInTheDocument()
	expect(screen.getByRole('heading', { name: 'Design & Creative' })).toBeInTheDocument()
	expect(screen.getByRole('heading', { name: 'Marketing & PR' })).toBeInTheDocument()
})
