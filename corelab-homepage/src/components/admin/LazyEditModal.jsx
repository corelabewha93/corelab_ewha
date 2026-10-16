import { lazy, Suspense } from 'react'

/**
 * 관리자 편집 창(EditModal)은 관리자가 "수정"을 눌렀을 때만 내려받습니다.
 * 방문자는 편집 창 코드(입력 폼 · 사진 자르기 · 업로드)를 받지 않아 첫 화면이 가벼워집니다.
 * 쓰는 법은 EditModal과 똑같습니다.
 */
const EditModalImpl = lazy(() => import('./EditModal'))

export default function EditModal(props) {
  return (
    <Suspense fallback={null}>
      <EditModalImpl {...props} />
    </Suspense>
  )
}
