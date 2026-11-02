import Header from './components/Header'
import HomePage from './pages/HomePage'

// Главный компонент сайта: из него собираются все части страницы.
function App() {
  return (
    <>
      <Header />
      <main>
        <HomePage />
      </main>
    </>
  )
}

export default App
