// Подсчёт теста профориентации по модели RIASEC (Джон Голланд).
// Шесть типов интересов:
//   R — практик (руками, с техникой), I — исследователь, A — творец,
//   S — помощник (с людьми), E — лидер (убеждать, руководить), C — организатор (порядок, цифры).
// На каждый тип — 5 утверждений; ответ: 2 — нравится, 1 — не уверен, 0 — не нравится.
import QUESTIONS from './questions.json'

export { QUESTIONS }

export const TYPES = ['R', 'I', 'A', 'S', 'E', 'C']

// Ответы и их баллы
export const ANSWERS = [
  { value: 2, key: 'yes' },
  { value: 1, key: 'maybe' },
  { value: 0, key: 'no' },
]

// Какие галузі подходят каким типам: 1 — главный тип для галузі, 0.5 — тоже подходит.
// Слаги — те же, что у бэкенда (GET /industries)
export const INDUSTRY_TYPES = {
  it: { I: 1, C: 0.5 },
  engineering: { R: 1, I: 1 },
  finance: { C: 1, E: 0.5 },
  healthcare: { S: 1, I: 0.5 },
  sales: { E: 1, S: 0.5 },
  marketing: { A: 1, E: 1 },
  education: { S: 1, A: 0.5 },
  hospitality: { S: 1, E: 0.5, R: 0.5 },
  logistics: { R: 1, C: 1 },
  construction: { R: 1 },
  manufacturing: { R: 1, C: 0.5 },
  'customer-service': { S: 1, C: 0.5 },
  admin: { C: 1 },
  hr: { S: 1, E: 0.5 },
  legal: { E: 1, C: 1, I: 0.5 },
  design: { A: 1 },
  science: { I: 1 },
  retail: { E: 1, S: 0.5 },
}

// Баллы по типам в процентах от максимума (0–100): { R: 60, I: 80, ... }.
// answers — { r1: 2, i1: 0, ... }; вопросы без ответа считаются как 0
export function scoreAnswers(answers) {
  const scores = {}
  for (const type of TYPES) {
    const questions = QUESTIONS.filter((question) => question.type === type)
    const points = questions.reduce((sum, question) => sum + (answers[question.id] ?? 0), 0)
    scores[type] = Math.round((points / (questions.length * 2)) * 100)
  }
  return scores
}

// Типы от сильного к слабому; при равенстве — в порядке R, I, A, S, E, C
export function rankTypes(scores) {
  return [...TYPES].sort((a, b) => scores[b] - scores[a] || TYPES.indexOf(a) - TYPES.indexOf(b))
}

// Код Голланда — три самых сильных типа: например, «ISC»
export function hollandCode(scores) {
  return rankTypes(scores).slice(0, 3).join('')
}

// Галузі, которые подходят лучше всего: средний балл подходящих типов с их весами.
// Возвращает [{ slug, score, types: ['I', 'C'] }] от лучшей к худшей
export function recommendIndustries(scores, count = 3) {
  return Object.entries(INDUSTRY_TYPES)
    .map(([slug, weights]) => {
      const entries = Object.entries(weights)
      const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0)
      const score = entries.reduce((sum, [type, weight]) => sum + scores[type] * weight, 0) / totalWeight
      const types = entries.filter(([, weight]) => weight === 1).map(([type]) => type)
      return { slug, score: Math.round(score), types }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
}

// Результат в адресе страницы: ?r=60&i=80&a=20&s=40&e=70&c=30 — им можно поделиться
export function scoresToQuery(scores) {
  return new URLSearchParams(TYPES.map((type) => [type.toLowerCase(), String(scores[type])])).toString()
}

// Обратно из адреса; если чего-то нет или число странное — null
export function scoresFromQuery(params) {
  const scores = {}
  for (const type of TYPES) {
    const text = params.get(type.toLowerCase())
    const value = Number(text)
    if (text === null || text === '' || !Number.isInteger(value) || value < 0 || value > 100) return null
    scores[type] = value
  }
  return scores
}
