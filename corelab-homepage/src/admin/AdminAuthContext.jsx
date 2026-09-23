import { createContext, useCallback, useContext, useState } from 'react'
import { ADMIN_PASSWORD_HASH, sha256Hex } from './adminConfig'

const FLAG_KEY = 'corelab_admin'
const AdminAuthContext = createContext(null)

function readStoredFlag() {
  try {
    return localStorage.getItem(FLAG_KEY) === '1'
  } catch {
    return false
  }
}

export function AdminAuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(readStoredFlag)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(null)

  const login = useCallback(async (password) => {
    setChecking(true)
    setError(null)
    try {
      const hash = await sha256Hex(password)
      if (hash !== ADMIN_PASSWORD_HASH) {
        setError('비밀번호가 올바르지 않습니다.')
        return false
      }
      setIsAdmin(true)
      try {
        localStorage.setItem(FLAG_KEY, '1')
      } catch {
        /* 저장이 안 돼도 이번 세션 동안은 로그인 상태가 유지됩니다. */
      }
      return true
    } finally {
      setChecking(false)
    }
  }, [])

  const logout = useCallback(() => {
    setIsAdmin(false)
    try {
      localStorage.removeItem(FLAG_KEY)
    } catch {
      /* noop */
    }
  }, [])

  return (
    <AdminAuthContext.Provider value={{ isAdmin, login, logout, checking, error }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth는 AdminAuthProvider 안에서만 사용할 수 있습니다.')
  return ctx
}
