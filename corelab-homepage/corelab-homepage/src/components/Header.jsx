import { useEffect, useRef, useState } from 'react'
import Link from '../router/Link'
import { useData } from '../hooks/useData'

const NAV_ITEMS = [
  { to: '/', label: 'About' },
  { to: '/news', label: 'News' },
  { to: '/research?tab=publications', label: 'Research' },
  { to: '/people?tab=faculty', label: 'People' },
  { to: '/lablife', label: 'Lab Life' },
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const { data } = useData('site.json')
  const headerRef = useRef(null)

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
          <span className="brand-name">{data?.labName ?? 'CoRe Lab'}</span>
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
