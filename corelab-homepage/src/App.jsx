import { lazy, Suspense, useEffect } from 'react'
import { useHashRoute } from './router/useHashRoute'
import { AdminAuthProvider } from './admin/AdminAuthContext'
import Header from './components/Header'
import Footer from './components/Footer'
import About from './pages/About'
import News from './pages/News'
import Research from './pages/research/Research'
import People from './pages/People'
import LabLife from './pages/LabLife'
// [임시] 로고 시안 예시 화면 — 이 주소로 들어올 때만 따로 불러와서, 다른 페이지 속도에는 영향이 없습니다.
const LogoPreview = lazy(() => import('./pages/LogoPreview'))
import { Toaster } from './components/admin/AdminControls'

const ROUTES = {
  '/': About,
  '/news': News,
  '/research': Research,
  '/people': People,
  '/lablife': LabLife,
  '/logo-preview': LogoPreview, // [임시] 메뉴에는 없음. 시안 확정 후 이 줄과 위 import를 지우면 됩니다.
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
      {/* [임시] 테스트 홈 화면(#/logo-preview)에서만 상단 "CoRe"를 로고로 보여줍니다. 다른 페이지는 그대로예요. */}
      <Header brandLogo={path === '/logo-preview'} />
      <main>
        <Suspense fallback={null}>
          <Page />
        </Suspense>
      </main>
      <Footer />
      <Toaster />
    </AdminAuthProvider>
  )
}
