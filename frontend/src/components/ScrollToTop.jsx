import { useEffect } from 'react'
import { useLocation } from 'react-router'

// При переходе на другую страницу — прокрутить наверх (иначе новая страница
// откроется с той же прокруткой, что была на старой). Смена фильтров в адресе не считается
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo?.(0, 0)
  }, [pathname])

  return null
}

export default ScrollToTop
