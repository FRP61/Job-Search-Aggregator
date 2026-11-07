import { calculateNet, calculateNetLocal } from './calculateNet'

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
test('Латвия: 24 000 € брутто в год → 17 685,60 € на руки', () => {
	const result = calculateNet(24000, 'LV')

	expect(result.socialContributions).toBeCloseTo(2520, 2)
	expect(result.incomeTax).toBeCloseTo(3794.4, 2)
	expect(result.net).toBeCloseTo(17685.6, 2)
	expect(result.effectiveRate).toBeCloseTo(26.3, 1)
})

test('Латвия: соцвзносы берутся только с первых 105 300 € в год', () => {
	const result = calculateNet(120000, 'LV')

	expect(result.socialContributions).toBeCloseTo(11056.5, 2)
})
test('Литва: 32 400 € брутто в год (2 700 €/мес) → 19 602 € на руки', () => {
	const result = calculateNet(32400, 'LT')

	expect(result.socialContributions).toBeCloseTo(6318, 2)
	expect(result.incomeTax).toBeCloseTo(6480, 2)
	expect(result.net).toBeCloseTo(19602, 2)
	expect(result.effectiveRate).toBeCloseTo(39.5, 1)
})

test('Литва: необлагаемый минимум уменьшается с ростом зарплаты', () => {
	const result = calculateNet(24000, 'LT')

	expect(result.incomeTax).toBeCloseTo(4003.27, 2)
	expect(result.net).toBeCloseTo(15316.73, 2)
})

test('Литва: при минимальной зарплате необлагаемый минимум полный', () => {
	const result = calculateNet(13836, 'LT')

	expect(result.incomeTax).toBeCloseTo(974.4, 2)
	expect(result.net).toBeCloseTo(10163.58, 2)
})
test('Польша: 120 000 zł брутто в год → 85 762,92 zł на руки', () => {
	const result = calculateNetLocal(120000, 'PL')

	expect(result.socialContributions).toBeCloseTo(25771.32, 2)
	expect(result.incomeTax).toBeCloseTo(8465.76, 2)
	expect(result.net).toBeCloseTo(85762.92, 2)
	expect(result.effectiveRate).toBeCloseTo(28.5, 1)
})

test('Польша: с базы выше 120 000 zł налог 32%', () => {
	const result = calculateNetLocal(200000, 'PL')

	expect(result.incomeTax).toBeCloseTo(26665.6, 2)
})

test('Польша: 24 000 € переводятся в злотые по курсу ЕЦБ и обратно', () => {
	const result = calculateNet(24000, 'PL')

	expect(result.net).toBeCloseTo(17262.12, 1)
})