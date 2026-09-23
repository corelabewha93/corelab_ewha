import { useState } from 'react'
import { useData } from '../hooks/useData'
import { useAdminAuth } from '../admin/AdminAuthContext'
import AdminLoginModal from './AdminLoginModal'

export default function Footer() {
  const { data: site } = useData('site.json')
  const { isAdmin, logout } = useAdminAuth()
  const [showLogin, setShowLogin] = useState(false)
  const year = new Date().getFullYear()
  const contact = site?.contact ?? {}

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <img
          src={`${import.meta.env.BASE_URL}images/ewha-emblem.png`}
          alt="이화여자대학교"
          className="footer-emblem"
        />
        <p className="footer-contact">
          {[contact.address, contact.email, contact.phone].filter(Boolean).join('  ·  ')}
        </p>
        <p className="footer-copyright">
          © {year} {site?.labName ?? 'CoRe Lab'}
          {site?.university ? `, ${site.university}` : ''}. All rights reserved.
        </p>

        <button type="button" className="footer-admin-link" onClick={isAdmin ? logout : () => setShowLogin(true)}>
          {isAdmin ? '관리자 모드 · 로그아웃' : '관리자 로그인'}
        </button>
      </div>

      {showLogin && <AdminLoginModal onClose={() => setShowLogin(false)} />}
    </footer>
  )
}
