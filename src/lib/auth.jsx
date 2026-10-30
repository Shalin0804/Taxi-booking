import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { API_URL, getToken, request, setToken } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(!getToken() || !API_URL)

  useEffect(() => {
    if (ready) return
    request('/api/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setToken(null)) // expired or invalid token
      .finally(() => setReady(true))
  }, [ready])

  const finish = (d) => { setToken(d.token); setUser(d.user); return d.user }
  const login = useCallback((email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }).then(finish), [])
  const signup = useCallback((form) => request('/api/auth/signup', { method: 'POST', body: form }).then(finish), [])
  const logout = useCallback(() => { setToken(null); setUser(null) }, [])

  return <AuthContext.Provider value={{ user, ready, login, signup, logout }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
export const isStaff = (u) => u?.role === 'staff' || u?.role === 'admin'
