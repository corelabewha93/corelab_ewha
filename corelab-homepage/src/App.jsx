import { useEffect } from 'react'
import { useHashRoute } from './router/useHashRoute'
import { AdminAuthProvider } from './admin/AdminAuthContext'
import Header from './components/Header'
import Footer from './components/Footer'
import About from './pages/About'
import News from './pages/News'
import Research from './pages/research/Research'
import People from './pages/People'
import LabLife from './pages/LabLife'
import { Toaster } from './components/admin/AdminControls'

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

  // 다른 페이지로 넘어가면 맨 위부터 보이게 합니다.
  // (해시 주소 방식은 브라우저가 스크롤을 초기화해주지 않아서, 아래쪽에서 링크를 누르면
  //  새 페이지도 중간부터 보였습니다.) 같은 페이지 안의 탭 전환은 위치를 그대로 둡니다.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [path])

  return (
    <AdminAuthProvider>
      <Header />
      <main>
        <Page />
      </main>
      <Footer />
      <Toaster />
    </AdminAuthProvider>
  )
}
