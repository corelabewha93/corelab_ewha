import { useEffect } from 'react'
import { useHashRoute } from './router/useHashRoute'
import Link from './router/Link'
import { AdminAuthProvider } from './admin/AdminAuthContext'
import { LangProvider, useLang } from './i18n/LangContext'
import Header from './components/Header'
import Footer from './components/Footer'
import About from './pages/About'
import News from './pages/News'
import Research from './pages/research/Research'
import People from './pages/People'
import LabLife from './pages/LabLife'
import { Toaster } from './components/admin/AdminControls'
import Celebration from './components/Celebration'
import LogoJump from './components/LogoJump'
import NoticeBanner from './components/NoticeBanner'
import './styles/justify.css'
import './styles/motto.css'
import './styles/polish.css'
import './styles/i18n.css'

const ROUTES = {
  '/': About,
  '/news': News,
  '/research': Research,
  '/people': People,
  '/lablife': LabLife,
}

function NotFound() {
  const { tr } = useLang()
  return (
    <div className="page container">
      <h1 className="section-title">{tr('페이지를 찾을 수 없습니다', 'Page not found')}</h1>
      <p>
        <Link to="/">{tr('홈으로 돌아가기', 'Back to home')}</Link>
      </p>
    </div>
  )
}

export default function App() {
  const { path } = useHashRoute()
  // 소식 한 건(/news/소식id)은 News 화면이 열어 보여줍니다.
  const Page = ROUTES[path] ?? (path.startsWith('/news/') ? ROUTES['/news'] : NotFound)

  // 다른 페이지로 넘어가면 맨 위부터 보이게 합니다.
  // (주소 방식은 브라우저가 스크롤을 초기화해주지 않아서, 아래쪽에서 링크를 누르면
  //  새 페이지도 중간부터 보였습니다.) 같은 페이지 안의 탭 전환은 위치를 그대로 둡니다.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [path])

  return (
    <AdminAuthProvider>
      <LangProvider>
      <Celebration />
      <LogoJump />
      <NoticeBanner />
      <Header />
      <main>
        <Page />
      </main>
      <Footer />
      <Toaster />
      </LangProvider>
    </AdminAuthProvider>
  )
}
