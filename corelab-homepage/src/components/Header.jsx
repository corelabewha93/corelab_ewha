import { useState } from 'react'
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

  return (
    <header className="site-header">
      <div className="container">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-dept">이화여자대학교 교육공학과</span>
          <span className="brand-name">{data?.labName ?? 'CoRe Lab'}</span>
        </Link>

        <button
          className="nav-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-label="메뉴 열기"
          aria-expanded={open}
        >
          ☰
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
