// Customer session. The admin portal has its own provider (src/admin/adminAuth.jsx):
// the two use different cookies and endpoints, so signing in to one never signs in to the other.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { UNAUTHORIZED_EVENT, request } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    request('/api/auth/me').then((d) => setUser(d.user)).catch(() => setUser(null)).finally(() => setReady(true))
    const onExpired = (e) => e.detail === 'customer' && setUser(null)
    window.addEventListener(UNAUTHORIZED_EVENT, onExpired)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onExpired)
  }, [])

  const login = useCallback((identifier, password, remember) =>
    request('/api/auth/login', { method: 'POST', body: { identifier, password, remember } }).then((d) => { setUser(d.user); return d.user }), [])
  const register = useCallback((form) =>
    request('/api/auth/register', { method: 'POST', body: form }).then((d) => { setUser(d.user); return d.user }), [])
  const logout = useCallback(() => request('/api/auth/logout', { method: 'POST' }).catch(() => {}).finally(() => setUser(null)), [])

  return <AuthContext.Provider value={{ user, ready, login, register, logout, setUser }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
