import { useEffect, useRef, useState } from 'react'
import Link from '../router/Link'
import { useData } from '../hooks/useData'
import CoreLogo from './CoreLogo'

const NAV_ITEMS = [
  { to: '/', label: 'About' },
  { to: '/news', label: 'News' },
  { to: '/research?tab=publications', label: 'Research' },
  { to: '/people?tab=faculty', label: 'People' },
  { to: '/lablife', label: 'Lab Life' },
]

/**
 * brandLogo: [임시] true면 상단 "CoRe Lab"에서 "CoRe" 부분을 로고로 보여줍니다.
 * 기본값은 false라서 실제 사이트(모든 페이지)는 지금과 완전히 똑같고,
 * 테스트 홈 화면(#/logo-preview)에서만 App.jsx가 true로 켭니다.
 */
export default function Header({ brandLogo = false }) {
  const [open, setOpen] = useState(false)
  const { data } = useData('site.json')
  const headerRef = useRef(null)
  const labName = data?.labName ?? 'CoRe Lab'
  const labRest = labName.replace(/^\s*CoRe\s*/i, '')

  // 모바일 메뉴: 페이지가 바뀌거나 메뉴 바깥을 누르면 닫힘
  useEffect(() => {
    const close = () => setOpen(false)
    const onPointer = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) close()
    }
    window.addEventListener('hashchange', close)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('hashchange', close)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [])

  return (
    <header className="site-header" ref={headerRef}>
      <div className="container">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-dept">이화여자대학교 교육공학과</span>
          {brandLogo ? (
            <span className="brand-name brand-name-logo">
              <CoreLogo tone="dark" className="brand-logo-mark" title="CoRe" />
              {labRest && <span>{labRest}</span>}
            </span>
          ) : (
            <span className="brand-name">{labName}</span>
          )}
        </Link>

        <button
          type="button"
          className={`nav-toggle${open ? ' open' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={open}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`nav${open ? ' open' : ''}`}>
          {NAV_ITEMS.map((item) => (
            <Link key={item.to} to={item.to} onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
