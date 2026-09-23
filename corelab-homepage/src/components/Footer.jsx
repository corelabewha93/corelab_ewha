import { useState } from 'react'
import { useData } from '../hooks/useData'
import { useAdminAuth } from '../admin/AdminAuthContext'
import { saveData } from '../admin/dataStore'
import { contactFields } from '../admin/schemas'
import AdminLoginModal from './AdminLoginModal'
import EditModal from './admin/EditModal'

export default function Footer() {
  const { data: site } = useData('site.json')
  const { isAdmin, token, logout } = useAdminAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [editingContact, setEditingContact] = useState(false)
  const year = new Date().getFullYear()
  const contact = site?.contact ?? {}

  const saveContact = (values) =>
    saveData(token, 'site.json', (d) => ({ ...d, contact: { ...(d.contact ?? {}), ...values } }), '연락처 수정')

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

        <div className="footer-admin-row">
          {isAdmin && (
            <button type="button" className="footer-admin-link" onClick={() => setEditingContact(true)}>
              연락처 수정
            </button>
          )}
          <button type="button" className="footer-admin-link" onClick={isAdmin ? logout : () => setShowLogin(true)}>
            {isAdmin ? '관리자 모드 · 로그아웃' : '관리자 로그인'}
          </button>
        </div>
      </div>

      {showLogin && <AdminLoginModal onClose={() => setShowLogin(false)} />}
      {editingContact && (
        <EditModal
          title="연락처 수정"
          fields={contactFields}
          initial={contact}
          onSave={saveContact}
          onClose={() => setEditingContact(false)}
        />
      )}
    </footer>
  )
}
