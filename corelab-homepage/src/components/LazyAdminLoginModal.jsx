import { lazy, Suspense } from 'react'

/** 관리자 로그인 창은 푸터의 "관리자"를 눌렀을 때만 내려받습니다. */
const AdminLoginModalImpl = lazy(() => import('./AdminLoginModal'))

export default function AdminLoginModal(props) {
  return (
    <Suspense fallback={null}>
      <AdminLoginModalImpl {...props} />
    </Suspense>
  )
}
