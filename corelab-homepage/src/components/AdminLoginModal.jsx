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
        <p className="modal-hint">
          GitHub 개인 토큰(PAT)을 입력하면 People 페이지에서 바로 등록/수정이 가능해집니다.
          토큰은 이 브라우저에만 저장되고 GitHub로만 전송됩니다.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            className="modal-input"
            placeholder="GitHub 토큰 (ghp_...)"
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
