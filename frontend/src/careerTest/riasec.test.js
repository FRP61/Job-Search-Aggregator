import {
	hollandCode,
	QUESTIONS,
	rankTypes,
	recommendIndustries,
	scoresFromQuery,
	scoresToQuery,
	scoreAnswers,
	TYPES,
} from './riasec'

// Ответить на все вопросы: для каждого типа свой ответ
function answerAll(byType) {
	return Object.fromEntries(QUESTIONS.map((question) => [question.id, byType[question.type]]))
}

test('30 вопросов, по 5 на каждый тип, у каждого есть текст на двух языках', () => {
	expect(QUESTIONS).toHaveLength(30)
	for (const type of TYPES) {
		expect(QUESTIONS.filter((question) => question.type === type)).toHaveLength(5)
	}
	for (const question of QUESTIONS) {
		expect(question.uk).toBeTruthy()
		expect(question.en).toBeTruthy()
	}
	expect(new Set(QUESTIONS.map((question) => question.id)).size).toBe(30)
})

test('баллы в процентах: «нравится» везде = 100, «не уверен» = 50, «не нравится» = 0', () => {
	const scores = scoreAnswers(answerAll({ R: 2, I: 1, A: 0, S: 2, E: 1, C: 0 }))

	expect(scores).toEqual({ R: 100, I: 50, A: 0, S: 100, E: 50, C: 0 })
})

test('код Голланда — три сильнейших типа, при равенстве порядок R I A S E C', () => {
	expect(hollandCode({ R: 10, I: 90, A: 20, S: 30, E: 40, C: 80 })).toBe('ICE')
	expect(rankTypes({ R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 })).toEqual(TYPES)
})

test('исследователь + организатор → первой идёт IT', () => {
	const industries = recommendIndustries({ R: 10, I: 100, A: 10, S: 10, E: 10, C: 100 })

	expect(industries[0]).toEqual({ slug: 'it', score: 100, types: ['I'] })
	expect(industries.map((industry) => industry.slug)).toContain('science')
})

test('творец + лидер → маркетинг и дизайн', () => {
	const slugs = recommendIndustries({ R: 0, I: 0, A: 100, S: 20, E: 90, C: 0 }).map((industry) => industry.slug)

	expect(slugs.slice(0, 2)).toEqual(['design', 'marketing'])
})

test('результат в адресе и обратно; испорченный адрес → null', () => {
	const scores = { R: 60, I: 80, A: 20, S: 40, E: 70, C: 30 }
	const query = scoresToQuery(scores)

	expect(query).toBe('r=60&i=80&a=20&s=40&e=70&c=30')
	expect(scoresFromQuery(new URLSearchParams(query))).toEqual(scores)
	expect(scoresFromQuery(new URLSearchParams('r=60&i=80'))).toBeNull()
	expect(scoresFromQuery(new URLSearchParams('r=600&i=80&a=20&s=40&e=70&c=30'))).toBeNull()
	expect(scoresFromQuery(new URLSearchParams('r=x&i=80&a=20&s=40&e=70&c=30'))).toBeNull()
})
