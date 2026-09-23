import { useState } from 'react'
import { useAdminAuth } from '../admin/AdminAuthContext'

export default function AdminLoginModal({ onClose }) {
  const { login, checking, error } = useAdminAuth()
  const [value, setValue] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!value) return
    const ok = await login(value)
    if (ok) onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">관리자 로그인</h2>
        <p className="modal-hint">비밀번호를 입력하면 People 페이지에 등록 버튼이 나타납니다.</p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            className="modal-input"
            placeholder="비밀번호"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="modal-btn-secondary" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn-primary" disabled={checking}>
              {checking ? '확인 중...' : '로그인'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
