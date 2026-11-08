import { useEffect, useState } from 'react'

import { getCostOfLiving } from './client'

// Индекс стоимости жизни для всех стран одним запросом.
// Возвращает { status: 'loading' | 'ready' | 'error', byCountry: { PL: {...}, ... }, count }.
// Если не загрузилось — страница работает дальше, просто без блоков стоимости жизни.
export function useCostOfLiving() {
  const [state, setState] = useState({ status: 'loading', byCountry: {}, count: 0 })

  useEffect(() => {
    const controller = new AbortController()
    getCostOfLiving(null, { signal: controller.signal })
      .then((ranking) =>
        setState({
          status: 'ready',
          byCountry: Object.fromEntries(ranking.map((item) => [item.country.code, item])),
          count: ranking.length,
        }),
      )
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ status: 'error', byCountry: {}, count: 0 })
      })
    return () => controller.abort()
  }, [])

  return state
}
