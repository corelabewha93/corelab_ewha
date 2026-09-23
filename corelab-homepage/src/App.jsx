import { useHashRoute } from './router/useHashRoute'
import { AdminAuthProvider } from './admin/AdminAuthContext'
import Header from './components/Header'
import Footer from './components/Footer'
import About from './pages/About'
import News from './pages/News'
import Research from './pages/research/Research'
import People from './pages/People'
import LabLife from './pages/LabLife'

const ROUTES = {
  '/': About,
  '/news': News,
  '/research': Research,
  '/people': People,
  '/lablife': LabLife,
}

function NotFound() {
  return (
    <div className="page container">
      <h1 className="section-title">페이지를 찾을 수 없습니다</h1>
      <p>
        <a href="#/">홈으로 돌아가기</a>
      </p>
    </div>
  )
}

export default function App() {
  const { path } = useHashRoute()
  const Page = ROUTES[path] ?? NotFound

  return (
    <AdminAuthProvider>
      <Header />
      <main>
        <Page />
      </main>
      <Footer />
    </AdminAuthProvider>
  )
}
