import { createContext, useCallback, useContext, useState } from 'react'
import { verifyToken } from './githubApi'

const TOKEN_KEY = 'corelab_admin_token'
const AdminAuthContext = createContext(null)

function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(readStoredToken)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(null)

  const login = useCallback(async (newToken) => {
    setChecking(true)
    setError(null)
    try {
      await verifyToken(newToken)
      setToken(newToken)
      try {
        localStorage.setItem(TOKEN_KEY, newToken)
      } catch {
        /* 저장이 안 돼도 이번 세션 동안은 로그인 상태가 유지됩니다. */
      }
      return true
    } catch (err) {
      setError(err.message || '로그인에 실패했습니다.')
      return false
    } finally {
      setChecking(false)
    }
  }, [])

  const logout = useCallback(() => {
    setToken('')
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* noop */
    }
  }, [])

  return (
    <AdminAuthContext.Provider
      value={{ isAdmin: Boolean(token), token, login, logout, checking, error }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth는 AdminAuthProvider 안에서만 사용할 수 있습니다.')
  return ctx
}
