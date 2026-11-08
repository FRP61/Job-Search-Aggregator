import { useEffect } from 'react'

const SITE_NAME = 'Job Search Aggregator'

// Заголовок вкладки браузера: «Пошук вакансій · Job Search Aggregator».
// Его же первым читает экранный диктор, когда открывается страница
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME
  }, [title])
}
