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
test('Германия: 60 000 € брутто в год (5 000 €/мес) → 37 561 € на руки', () => {
	const result = calculateNet(60000, 'DE')

	expect(result.socialContributions).toBeCloseTo(13050, 2)
	expect(result.incomeTax).toBeCloseTo(9389, 2)
	expect(result.net).toBeCloseTo(37561, 2)
	expect(result.effectiveRate).toBeCloseTo(37.4, 1)
})

test('Германия: при высокой зарплате потолки взносов и надбавка Soli', () => {
	const result = calculateNet(120000, 'DE')

	expect(result.socialContributions).toBeCloseTo(18525.53, 2)
	expect(result.incomeTax).toBeCloseTo(32930.92, 2)
})

test('Германия: доход ниже необлагаемого минимума → подоходного налога нет', () => {
	const result = calculateNet(12000, 'DE')

	expect(result.incomeTax).toBe(0)
	expect(result.net).toBeCloseTo(9390, 2)
})
test('Болгария: 15 600 € брутто в год (1 300 €/мес) → 12 105,29 € на руки', () => {
	const result = calculateNet(15600, 'BG')

	expect(result.socialContributions).toBeCloseTo(2149.68, 2)
	expect(result.incomeTax).toBeCloseTo(1345.03, 2)
	expect(result.net).toBeCloseTo(12105.29, 2)
})

test('Румыния: 96 000 lei брутто в год (8 000 lei/мес) → 56 160 lei на руки', () => {
	const result = calculateNetLocal(96000, 'RO')

	expect(result.socialContributions).toBeCloseTo(33600, 2)
	expect(result.incomeTax).toBeCloseTo(6240, 2)
	expect(result.net).toBeCloseTo(56160, 2)
})

test('Румыния: при минимальной зарплате действует полный личный вычет', () => {
	const result = calculateNetLocal(51900, 'RO')

	expect(result.incomeTax).toBeCloseTo(2335.5, 2)
})

test('Венгрия: 7 200 000 Ft брутто в год (600 000 Ft/мес) → 4 788 000 Ft на руки', () => {
	const result = calculateNetLocal(7200000, 'HU')

	expect(result.socialContributions).toBeCloseTo(1332000, 2)
	expect(result.incomeTax).toBeCloseTo(1080000, 2)
	expect(result.net).toBeCloseTo(4788000, 2)
})

test('Чехия: 960 000 Kč брутто в год (80 000 Kč/мес) → 735 480 Kč на руки', () => {
	const result = calculateNetLocal(960000, 'CZ')

	expect(result.socialContributions).toBeCloseTo(111360, 2)
	expect(result.incomeTax).toBeCloseTo(113160, 2)
	expect(result.net).toBeCloseTo(735480, 2)
})

test('Чехия: выше 1 762 812 Kč налог 23%, соцвзнос с потолком', () => {
	const result = calculateNetLocal(2400000, 'CZ')

	expect(result.socialContributions).toBeCloseTo(274879.54, 2)
	expect(result.incomeTax).toBeCloseTo(380135.04, 2)
})

test('Словакия: 18 000 € брутто в год (1 500 €/мес) → 13 614,16 € на руки', () => {
	const result = calculateNet(18000, 'SK')

	expect(result.socialContributions).toBeCloseTo(2592, 2)
	expect(result.incomeTax).toBeCloseTo(1793.84, 2)
	expect(result.net).toBeCloseTo(13614.16, 2)
})

test('Словакия: необлагаемая часть уменьшается при высокой зарплате', () => {
	const result = calculateNet(48000, 'SK')

	expect(result.incomeTax).toBeCloseTo(7623.35, 2)
})

test('Австрия: 42 000 € брутто в год (14 × 3 000 €) → 30 803,41 € на руки', () => {
	const result = calculateNet(42000, 'AT')

	expect(result.socialContributions).toBeCloseTo(7529.4, 2)
	expect(result.incomeTax).toBeCloseTo(3667.19, 2)
	expect(result.net).toBeCloseTo(30803.41, 2)
})

test('Ирландия: 50 000 € брутто в год → 39 648,43 € на руки', () => {
	const result = calculateNet(50000, 'IE')

	expect(result.socialContributions).toBeCloseTo(2118.75, 2)
	expect(result.incomeTax).toBeCloseTo(8232.82, 2)
	expect(result.net).toBeCloseTo(39648.43, 2)
})

test('Ирландия: при доходе до 18 304 € PRSI не платится', () => {
	const result = calculateNet(18000, 'IE')

	expect(result.socialContributions).toBe(0)
})

test('Кипр: 30 000 € брутто в год → 25 652 € на руки', () => {
	const result = calculateNet(30000, 'CY')

	expect(result.socialContributions).toBeCloseTo(3435, 2)
	expect(result.incomeTax).toBeCloseTo(913, 2)
	expect(result.net).toBeCloseTo(25652, 2)
})

test('Мальта: 30 000 € брутто в год → 22 991,64 € на руки', () => {
	const result = calculateNet(30000, 'MT')

	expect(result.socialContributions).toBeCloseTo(2908.36, 2)
	expect(result.incomeTax).toBeCloseTo(4100, 2)
	expect(result.net).toBeCloseTo(22991.64, 2)
})

test('Греция: 18 200 € брутто в год (14 × 1 300 €) → 14 414,99 € на руки', () => {
	const result = calculateNet(18200, 'GR')

	expect(result.socialContributions).toBeCloseTo(2433.34, 2)
	expect(result.incomeTax).toBeCloseTo(1351.67, 2)
	expect(result.net).toBeCloseTo(14414.99, 2)
})

test('Хорватия: 21 600 € брутто в год (1 800 €/мес, Загреб) → 14 961,60 € на руки', () => {
	const result = calculateNet(21600, 'HR')

	expect(result.socialContributions).toBeCloseTo(4320, 2)
	expect(result.incomeTax).toBeCloseTo(2318.4, 2)
	expect(result.net).toBeCloseTo(14961.6, 2)
})

test('Словения: 24 000 € брутто в год → 15 600,76 € на руки', () => {
	const result = calculateNet(24000, 'SI')

	expect(result.socialContributions).toBeCloseTo(6016.32, 2)
	expect(result.incomeTax).toBeCloseTo(2382.92, 2)
	expect(result.net).toBeCloseTo(15600.76, 2)
})

test('Нидерланды: 50 000 € брутто в год → 39 140,33 € на руки', () => {
	const result = calculateNet(50000, 'NL')

	expect(result.socialContributions).toBe(0)
	expect(result.incomeTax).toBeCloseTo(10859.67, 2)
	expect(result.net).toBeCloseTo(39140.33, 2)
})

test('Бельгия: 48 000 € брутто в год → 31 380,28 € на руки', () => {
	const result = calculateNet(48000, 'BE')

	expect(result.socialContributions).toBeCloseTo(6735.72, 2)
	expect(result.incomeTax).toBeCloseTo(9884, 2)
	expect(result.net).toBeCloseTo(31380.28, 2)
})

test('Люксембург: 56 400 € брутто в год → 42 023,83 € на руки', () => {
	const result = calculateNet(56400, 'LU')

	expect(result.socialContributions).toBeCloseTo(7190.24, 2)
	expect(result.incomeTax).toBeCloseTo(7185.93, 2)
	expect(result.net).toBeCloseTo(42023.83, 2)
})

test('Франция: 36 000 € брутто в год — налог уменьшает скидка décote', () => {
	const result = calculateNet(36000, 'FR')

	expect(result.socialContributions).toBeCloseTo(7502.49, 2)
	expect(result.incomeTax).toBeCloseTo(1518.98, 2)
	expect(result.net).toBeCloseTo(26978.53, 2)
})

test('Франция: 60 000 € брутто в год — часть зарплаты выше потолка PSS', () => {
	const result = calculateNet(60000, 'FR')

	expect(result.socialContributions).toBeCloseTo(12378.78, 2)
	expect(result.incomeTax).toBeCloseTo(6423.3, 2)
	expect(result.net).toBeCloseTo(41197.92, 2)
})

test('Италия: 35 000 € брутто в год → 25 937,35 € на руки', () => {
	const result = calculateNet(35000, 'IT')

	expect(result.socialContributions).toBeCloseTo(3216.5, 2)
	expect(result.incomeTax).toBeCloseTo(5846.15, 2)
	expect(result.net).toBeCloseTo(25937.35, 2)
})

test('Италия: 8 000 € брутто в год — доплата cuneo больше налога, налог отрицательный', () => {
	const result = calculateNet(8000, 'IT')

	expect(result.socialContributions).toBeCloseTo(735.2, 2)
	expect(result.incomeTax).toBeCloseTo(-515.8, 2)
	expect(result.net).toBeCloseTo(7780.6, 2)
})

test('Испания: 30 000 € брутто в год → 23 124 € на руки', () => {
	const result = calculateNet(30000, 'ES')

	expect(result.socialContributions).toBeCloseTo(1950, 2)
	expect(result.incomeTax).toBeCloseTo(4926, 2)
	expect(result.net).toBeCloseTo(23124, 2)
})

test('Португалия: 28 000 € брутто в год (14 × 2 000 €) → 20 831,73 € на руки', () => {
	const result = calculateNet(28000, 'PT')

	expect(result.socialContributions).toBeCloseTo(3080, 2)
	expect(result.incomeTax).toBeCloseTo(4088.27, 2)
	expect(result.net).toBeCloseTo(20831.73, 2)
})

test('Финляндия: 42 000 € брутто в год → 31 906,61 € на руки', () => {
	const result = calculateNet(42000, 'FI')

	expect(result.socialContributions).toBeCloseTo(3809.4, 2)
	expect(result.incomeTax).toBeCloseTo(6283.99, 2)
	expect(result.net).toBeCloseTo(31906.61, 2)
})

test('Швеция: 480 000 kr брутто в год → 382 917 kr на руки', () => {
	const result = calculateNetLocal(480000, 'SE')

	expect(result.socialContributions).toBeCloseTo(33600, 2)
	expect(result.incomeTax).toBeCloseTo(63483, 2)
	expect(result.net).toBeCloseTo(382917, 2)
})

test('Дания: 600 000 kr брутто в год → 383 638,75 kr на руки', () => {
	const result = calculateNetLocal(600000, 'DK')

	expect(result.socialContributions).toBeCloseTo(49092.96, 2)
	expect(result.incomeTax).toBeCloseTo(167268.29, 2)
	expect(result.net).toBeCloseTo(383638.75, 2)
})

test('Украина: 30 000 грн брутто в месяц → 23 100 грн на руки (ПДФО 18% + военный сбор 5%)', () => {
	const result = calculateNetLocal(30000 * 12, 'UA')

	expect(result.currency).toBe('UAH')
	expect(result.socialContributions).toBe(0)
	expect(result.incomeTax).toBeCloseTo(82800, 2)
	expect(result.net).toBeCloseTo(277200, 2)
	expect(result.effectiveRate).toBe(23)
})

test('Украина в евро: 1 000 € в месяц → 770 € на руки по курсу НБУ', () => {
	const result = calculateNet(12000, 'UA')

	expect(result.net).toBeCloseTo(9240, 2)
})
