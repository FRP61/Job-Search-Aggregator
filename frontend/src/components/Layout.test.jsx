import { fireEvent, render, screen } from '@testing-library/react'
import App from '../App'
import { mockServer } from '../test/mockServer'

function openAt(path) {
	window.history.replaceState(null, '', path)
	render(<App />)
}

afterEach(() => {
	vi.unstubAllGlobals()
})

test('первая ссылка на странице — «Перейти до змісту», она ведёт к основному содержимому', () => {
	openAt('/')

	const skip = screen.getAllByRole('link')[0]

	expect(skip).toHaveTextContent('Перейти до змісту')
	expect(skip).toHaveAttribute('href', '#main')
	expect(document.getElementById('main')).toBe(screen.getByRole('main'))
})

test('у каждой страницы свой заголовок вкладки', () => {
	mockServer()
	openAt('/')
	expect(document.title).toBe('Job Search Aggregator')

	fireEvent.click(screen.getByRole('link', { name: 'Калькулятор зарплати' }))
	expect(document.title).toBe('Калькулятор зарплати · Job Search Aggregator')

	fireEvent.click(screen.getByRole('link', { name: 'Пошук вакансій' }))
	expect(document.title).toBe('Пошук вакансій · Job Search Aggregator')
})

test('несуществующий адрес → «Сторінку не знайдено» и ссылка на главную', () => {
	openAt('/no-such-page')

	expect(screen.getByRole('heading', { name: 'Сторінку не знайдено' })).toBeInTheDocument()

	fireEvent.click(screen.getByRole('link', { name: 'На головну' }))

	expect(screen.getByRole('heading', { name: 'Робота в Європі з реальною зарплатою' })).toBeInTheDocument()
})

test('на странице вакансии в меню подсвечен «Пошук вакансій»', async () => {
	mockServer()
	openAt('/vacancies/1')

	await screen.findByRole('heading', { level: 1, name: 'Python Developer' })

	expect(screen.getByRole('link', { name: 'Пошук вакансій' }).className).toMatch(/active/)
})

test('в подвале — источники данных и предупреждение о приблизительных расчётах', () => {
	openAt('/')

	expect(screen.getByRole('contentinfo')).toHaveTextContent('Eurostat')
	expect(screen.getByRole('contentinfo')).toHaveTextContent('приблизні')
})
