import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'

// Пункт 1: в шапке сайта видно название «Job Search Aggregator».
// Напиши тест ниже.
test('шапка сайта содержит название Job Search Aggregator', () => {
	render(<App />)

	expect(screen.getByText('Job Search Aggregator')).toBeInTheDocument()
})
test('сайт при первом открытии показывает приветственное сообщение', () => {
	render(<App />)

	expect(screen.getByText('Робота в Європі з реальною зарплатою')).toBeInTheDocument()
})
test('после нажатия EN текст на английском', () => {
	render(<App />)

	const enButton = screen.getByRole('button', { name: 'EN' })
	fireEvent.click(enButton)

	expect(screen.getByText('Jobs in Europe with real take-home pay')).toBeInTheDocument()
})