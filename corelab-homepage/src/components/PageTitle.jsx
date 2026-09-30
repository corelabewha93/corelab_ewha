import { useEffect, useRef, useState } from 'react'

/**
 * 페이지 큰 제목(h1) + 모바일 전용 "고정 제목 띠".
 * 모바일에서 아래로 스크롤해 큰 제목이 화면 밖으로 나가면, 상단 헤더 바로 아래에
 * "Research · Publications"처럼 지금 보고 있는 곳을 알려주는 작은 띠가 나타납니다.
 * (PC는 왼쪽 메뉴가 계속 따라와서 띠가 필요 없어 CSS로 숨깁니다.)
 */
export default function PageTitle({ children, sub = '' }) {
  const h1Ref = useRef(null)
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const header = document.querySelector('.site-header')
      const headerH = header ? header.getBoundingClientRect().height : 56
      const h1 = h1Ref.current
      if (!h1) return
      setStuck(h1.getBoundingClientRect().bottom < headerH)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <h1 ref={h1Ref} className="section-title">
        {children}
      </h1>
      <div className={`page-sticky-bar${stuck ? ' show' : ''}`} aria-hidden="true">
        <span className="page-sticky-title">{children}</span>
        {sub && <span className="page-sticky-sub">{sub}</span>}
      </div>
    </>
  )
}
