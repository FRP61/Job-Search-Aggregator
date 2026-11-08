import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { ANSWERS, QUESTIONS, scoreAnswers, scoresToQuery } from '../careerTest/riasec'
import { usePageTitle } from '../components/usePageTitle'
import styles from './CareerTestPage.module.css'

// Незаконченный тест храним в sessionStorage: если случайно обновить страницу, ответы не пропадут.
// После закрытия вкладки браузер его стирает сам
const STORAGE_KEY = 'jsa-career-test'

function loadProgress() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY))
    if (saved && typeof saved.answers === 'object' && Number.isInteger(saved.index)) {
      return { started: true, index: Math.min(saved.index, QUESTIONS.length - 1), answers: saved.answers }
    }
  } catch {
    // хранилище недоступно или там мусор — начинаем сначала
  }
  return { started: false, index: 0, answers: {} }
}

function saveProgress(progress) {
  try {
    if (progress) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // не получилось сохранить — тест всё равно работает
  }
}

// Тест профориентации: вступление, потом по одному вопросу на экране
function CareerTestPage() {
  const { t, i18n } = useTranslation()
  usePageTitle(t('careerTest.title'))
  const language = i18n.language
  const navigate = useNavigate()

  const [progress, setProgress] = useState(loadProgress)
  const { started, index, answers } = progress
  const question = QUESTIONS[index]
  const questionRef = useRef(null)

  // Новый вопрос — переводим фокус на него, чтобы экранный диктор прочитал его сразу
  useEffect(() => {
    if (started) questionRef.current?.focus()
  }, [started, index])

  function start() {
    setProgress({ started: true, index: 0, answers: {} })
  }

  function answer(value) {
    const nextAnswers = { ...answers, [question.id]: value }
    if (index + 1 < QUESTIONS.length) {
      const next = { started: true, index: index + 1, answers: nextAnswers }
      setProgress(next)
      saveProgress(next)
    } else {
      // последний ответ — считаем результат и открываем страницу результата
      saveProgress(null)
      navigate(`/career-test/result?${scoresToQuery(scoreAnswers(nextAnswers))}`)
    }
  }

  function back() {
    const previous = { started: true, index: index - 1, answers }
    setProgress(previous)
    saveProgress(previous)
  }

  if (!started) {
    return (
      <section className={styles.page}>
        <h1 className={styles.title}>{t('careerTest.title')}</h1>
        <p className={styles.lead}>{t('careerTest.intro')}</p>
        <ul className={styles.facts}>
          <li>{t('careerTest.factQuestions', { count: QUESTIONS.length })}</li>
          <li>{t('careerTest.factTime')}</li>
          <li>{t('careerTest.factResult')}</li>
        </ul>
        <button type="button" className={styles.primaryButton} onClick={start}>
          {t('careerTest.start')}
        </button>
        <p className={styles.method}>{t('careerTest.method')}</p>
      </section>
    )
  }

  const answered = index
  const percent = Math.round((answered / QUESTIONS.length) * 100)

  return (
    <section className={styles.page}>
      <h1 className={styles.smallTitle}>{t('careerTest.title')}</h1>

      <div className={styles.progressRow}>
        <span>{t('careerTest.questionOf', { number: index + 1, total: QUESTIONS.length })}</span>
        <span>{percent}%</span>
      </div>
      <div
        className={styles.progress}
        role="progressbar"
        aria-label={t('careerTest.progress')}
        aria-valuemin={0}
        aria-valuemax={QUESTIONS.length}
        aria-valuenow={answered}
      >
        <div className={styles.progressFill} style={{ width: `${percent}%` }} />
      </div>

      <fieldset className={styles.question}>
        <legend className={styles.prompt}>{t('careerTest.prompt')}</legend>
        <p className={styles.statement} ref={questionRef} tabIndex={-1}>
          {language === 'en' ? question.en : question.uk}
        </p>
        <div className={styles.answers}>
          {ANSWERS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={answers[question.id] === option.value ? `${styles.answer} ${styles.chosen}` : styles.answer}
              aria-pressed={answers[question.id] === option.value}
              onClick={() => answer(option.value)}
            >
              {t(`careerTest.answers.${option.key}`)}
            </button>
          ))}
        </div>
      </fieldset>

      {index > 0 && (
        <button type="button" className={styles.backButton} onClick={back}>
          {t('careerTest.back')}
        </button>
      )}
    </section>
  )
}

export default CareerTestPage
