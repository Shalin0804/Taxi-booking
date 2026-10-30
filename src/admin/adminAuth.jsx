// Admin session: separate cookie and endpoints from the customer session (src/lib/auth.jsx).
// Permissions come from the server; the UI uses them only to hide what the API would refuse anyway.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { UNAUTHORIZED_EVENT, request } from '../lib/api'

const Ctx = createContext(null)

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    request('/api/admin/auth/me').then((d) => setUser(d.user)).catch(() => setUser(null)).finally(() => setReady(true))
    const onExpired = (e) => e.detail === 'admin' && setUser(null)
    window.addEventListener(UNAUTHORIZED_EVENT, onExpired)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onExpired)
  }, [])

  const login = useCallback((email, password) =>
    request('/api/admin/auth/login', { method: 'POST', body: { email, password } }).then((d) => { setUser(d.user); return d.user }), [])
  const logout = useCallback(() => request('/api/admin/auth/logout', { method: 'POST' }).catch(() => {}).finally(() => setUser(null)), [])
  const can = useCallback((perm) => !!user?.permissions?.includes(perm), [user])

  return <Ctx.Provider value={{ user, ready, login, logout, can, setUser }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAdmin = () => useContext(Ctx)

// eslint-disable-next-line react-refresh/only-export-components
export const roleLabel = (r) => ({
  SUPER_ADMIN: 'Super admin', ADMIN: 'Admin', BOOKING_MANAGER: 'Booking manager',
  FLEET_MANAGER: 'Fleet manager', SUPPORT_STAFF: 'Support staff', CUSTOMER: 'Customer',
}[r] || r)
