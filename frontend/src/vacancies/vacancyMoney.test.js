import { formatRange, grossRange, inEuPrices, netRange, pickCountry } from './vacancyMoney'

const vacancy = (fields) => ({ countries: ['PL'], salary_annual_min_eur: null, salary_annual_max_eur: null, ...fields })
// простая замена t(): подставляет значения в шаблон
const t = (key, values) =>
	({ 'vacancy.range': `${values?.min} – ${values?.max}`, 'vacancy.from': `від ${values?.amount}`, 'vacancy.to': `до ${values?.amount}` })[key]

test('страна для расчёта: из фильтра, если вакансия там есть, иначе первая', () => {
	expect(pickCountry(vacancy({ countries: ['PL', 'EE'] }), 'EE')).toBe('EE')
	expect(pickCountry(vacancy({ countries: ['PL', 'EE'] }), 'DE')).toBe('PL')
	expect(pickCountry(vacancy({ countries: [] }))).toBeNull()
	expect(pickCountry(vacancy({ countries: ['XX'] }))).toBeNull()
})

test('зарплата «только от» — считается только нижняя граница', () => {
	const v = vacancy({ salary_annual_min_eur: 30000 })

	expect(grossRange(v)).toEqual({ min: 30000, max: null })
	expect(netRange(v, 'PL')).toEqual({ min: 21352.26, max: null })
})

test('без зарплаты — null', () => {
	expect(grossRange(vacancy({}))).toBeNull()
	expect(netRange(vacancy({}), 'PL')).toBeNull()
})

test('в ценах ЕС: при уровне цен 50% деньги «стоят» вдвое больше', () => {
	expect(inEuPrices(1000, 50)).toBe(2000)
})

test('диапазон в тексте: от–до, только от, только до, одинаковые', () => {
	expect(formatRange({ min: 30000, max: 45000 }, 'en', t)).toBe('€30,000 – €45,000')
	expect(formatRange({ min: 30000, max: null }, 'en', t)).toBe('від €30,000')
	expect(formatRange({ min: null, max: 45000 }, 'en', t)).toBe('до €45,000')
	expect(formatRange({ min: 30000, max: 30000 }, 'en', t)).toBe('€30,000')
})
