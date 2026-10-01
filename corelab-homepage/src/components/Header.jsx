import { useEffect, useRef, useState } from 'react'
import Link from '../router/Link'
import { useHashRoute } from '../router/useHashRoute'
import { scrollToSection } from '../router/scrollToSection'
import { useData } from '../hooks/useData'
import CoreLogo from './CoreLogo'
import CoreWordmark from './CoreWordmark'

const NAV_ITEMS = [
  { to: '/?section=overview', label: 'About', about: true },
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
  const { path } = useHashRoute()
  const [aboutActive, setAboutActive] = useState(false)
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

  // About 메뉴: 홈에서 Lab Overview 구역이 화면에 들어와 있는 동안만 강조합니다.
  // (맨 위 인트로 화면에서는 로고가 "홈"이고, 어느 메뉴도 강조되지 않습니다.)
  useEffect(() => {
    if (path !== '/') {
      setAboutActive(false)
      return
    }
    let raf = 0
    const update = () => {
      raf = 0
      const el = document.getElementById('overview')
      if (!el) return setAboutActive(false)
      const r = el.getBoundingClientRect()
      setAboutActive(r.top < window.innerHeight * 0.45 && r.bottom > 80)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    const t = setTimeout(update, 600) // 소개 데이터가 늦게 뜨는 경우 대비
    return () => {
      clearTimeout(t)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [path])

  // 로고(홈): 이미 홈이면 맨 위로, About: 이미 홈이면 Lab Overview로 부드럽게 이동
  const onLogoClick = () => {
    setOpen(false)
    if (path === '/') window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const onNavClick = (item) => () => {
    setOpen(false)
    if (item.about && path === '/') setTimeout(() => scrollToSection('overview'), 0)
  }

  return (
    <header className="site-header" ref={headerRef}>
      <div className="container">
        <Link to="/" className="brand" onClick={onLogoClick} active={false}>
          <span className="brand-dept">이화여자대학교 교육공학과</span>
          {brandLogo ? (
            <span className="brand-name brand-name-logo">
              <CoreLogo tone="dark" className="brand-logo-mark" title="CoRe" />
              {labRest && <span>{labRest}</span>}
            </span>
          ) : (
            <span className="brand-name">
              {/^\s*CoRe/i.test(labName) ? (
                <span className="brand-wordmark">
                  {/* 메인 화면에서 완성되는 CoRe 로고와 같은 모양·색 */}
                  <CoreWordmark className="brand-core-logo" />
                  {labRest && <span className="brand-rest">{labRest}</span>}
                </span>
              ) : (
                labName
              )}
            </span>
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
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavClick(item)}
              active={item.about ? aboutActive : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
