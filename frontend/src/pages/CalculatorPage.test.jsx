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
test('Польша: по умолчанию злотые, 10 000 zł в месяц → 7 146,91 zł на руки', () => {
	render(<CalculatorPage />)

	fireEvent.change(screen.getByLabelText('Країна'), { target: { value: 'PL' } })
	fireEvent.change(screen.getByLabelText('Зарплата брутто, zł'), { target: { value: '10000' } })

	expect(screen.getByText('7 146,91 zł')).toBeInTheDocument()
	expect(screen.getByText('85 762,92 zł')).toBeInTheDocument()
})

test('Польша: при злотых под таблицей видно сумму на руки в евро', () => {
	render(<CalculatorPage />)

	fireEvent.change(screen.getByLabelText('Країна'), { target: { value: 'PL' } })
	fireEvent.change(screen.getByLabelText('Зарплата брутто, zł'), { target: { value: '10000' } })

	expect(screen.getByText('≈ 1 627,07 € на руки на місяць')).toBeInTheDocument()
})

test('Польша: при переключении на € число в поле остаётся', () => {
	render(<CalculatorPage />)

	fireEvent.change(screen.getByLabelText('Країна'), { target: { value: 'PL' } })
	fireEvent.change(screen.getByLabelText('Зарплата брутто, zł'), { target: { value: '10000' } })
	fireEvent.click(screen.getByLabelText('€'))

	expect(screen.getByLabelText('Зарплата брутто, €')).toHaveValue('10000')
})

test('Эстония: переключателя валюты нет', () => {
	render(<CalculatorPage />)

	expect(screen.queryByRole('group', { name: 'Валюта' })).not.toBeInTheDocument()
})