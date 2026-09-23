import { useAdminAuth } from '../../admin/AdminAuthContext'
import { useToast } from '../../admin/toast'

/** 각 항목 오른쪽 위에 붙는 작은 연필 버튼 (관리자에게만 보임) */
export function EditButton({ onClick, label = '수정', className = '' }) {
  const { isAdmin } = useAdminAuth()
  if (!isAdmin) return null
  return (
    <button
      type="button"
      className={`admin-edit-btn ${className}`}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={label}
      title={label}
    >
      ✎
    </button>
  )
}

/** 오른쪽 아래에 떠 있는 관리자 버튼 묶음 */
export function AdminFab({ children }) {
  const { isAdmin } = useAdminAuth()
  if (!isAdmin) return null
  return <div className="admin-fab-group">{children}</div>
}

export function Toaster() {
  const message = useToast()
  if (!message) return null
  return (
    <div className="admin-toast" role="status">
      {message}
    </div>
  )
}
