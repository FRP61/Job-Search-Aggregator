import { render, screen, fireEvent } from '@testing-library/react'
import CalculatorPage from './CalculatorPage'

test('ввёл 2 000 € в месяц → на руки 1 657,84 € в месяц и 19 894,08 € в год', () => {
	render(<CalculatorPage />)

	fireEvent.change(screen.getByLabelText('Зарплата брутто, €'), { target: { value: '2000' } })

	expect(screen.getByText('1 657,84 €')).toBeInTheDocument()
	expect(screen.getByText('19 894,08 €')).toBeInTheDocument()
})
