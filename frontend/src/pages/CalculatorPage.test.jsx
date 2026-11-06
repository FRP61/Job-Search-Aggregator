import { render, screen, fireEvent } from '@testing-library/react'
import CalculatorPage from './CalculatorPage'
import i18n from '../i18n'

test('ввёл 2 000 € в месяц → на руки 1 657,84 € в месяц и 19 894,08 € в год', () => {
	render(<CalculatorPage />)

	fireEvent.change(screen.getByLabelText('Зарплата брутто, €'), { target: { value: '2000' } })

	expect(screen.getByText('1 657,84 €')).toBeInTheDocument()
	expect(screen.getByText('19 894,08 €')).toBeInTheDocument()
})

test('переключил на «на рік» и ввёл 24 000 → на руки 19 894,08 € в год', () => {
	render(<CalculatorPage />)

	fireEvent.click(screen.getByLabelText('на рік'))
	fireEvent.change(screen.getByLabelText('Зарплата брутто, €'), { target: { value: '24000' } })

	expect(screen.getByText('19 894,08 €')).toBeInTheDocument()
})

test('пока сумма не введена, результата нет', () => {
	render(<CalculatorPage />)

	expect(screen.queryByText('На руки')).not.toBeInTheDocument()
	expect(screen.getByText('Введіть суму, щоб побачити розрахунок.')).toBeInTheDocument()
})

test('на английском суммы в формате €1,657.84', async () => {
	await i18n.changeLanguage('en')
	render(<CalculatorPage />)

	fireEvent.change(screen.getByLabelText('Gross salary, €'), { target: { value: '2000' } })

	expect(screen.getByText('€1,657.84')).toBeInTheDocument()
})
