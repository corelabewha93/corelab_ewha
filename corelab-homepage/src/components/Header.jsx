import { useState } from 'react'
import Link from '../router/Link'

const NAV_ITEMS = [
  { to: '/', label: 'About' },
  { to: '/news', label: 'News' },
  { to: '/research?tab=publications', label: 'Research' },
  { to: '/people?tab=faculty', label: 'People' },
  { to: '/lablife', label: 'Lab Life' },
]

export default function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="site-header">
      <div className="container">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <img src={`${import.meta.env.BASE_URL}images/logo.svg`} alt="" />
          <span>CoreLab</span>
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
