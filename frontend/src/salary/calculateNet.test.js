import { calculateNet } from './calculateNet'

test('Эстония: 24 000 € брутто в год → 19 894,08 € на руки', () => {
	const result = calculateNet(24000, 'EE')

	expect(result.gross).toBe(24000)
	expect(result.socialContributions).toBeCloseTo(864, 2)
	expect(result.incomeTax).toBeCloseTo(3241.92, 2)
	expect(result.net).toBeCloseTo(19894.08, 2)
	expect(result.effectiveRate).toBeCloseTo(17.1, 1)
})
test('Эстония: зарплата 0 → всё по нулям', () => {
	const result = calculateNet(0, 'EE')

	expect(result.socialContributions).toBe(0)
	expect(result.incomeTax).toBe(0)
	expect(result.net).toBe(0)
	expect(result.effectiveRate).toBe(0)
})

test('Эстония: зарплата меньше необлагаемого минимума → подоходного налога нет', () => {
	const result = calculateNet(6000, 'EE')

	expect(result.socialContributions).toBeCloseTo(216, 2)
	expect(result.incomeTax).toBe(0)
	expect(result.net).toBeCloseTo(5784, 2)
})

test('страна без правил → null', () => {
	expect(calculateNet(30000, 'XX')).toBeNull()
})