import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api'

/* ---------------- Auth + reference data ---------------- */
const AppCtx = createContext(null)
export const useApp = () => useContext(AppCtx)

export function AppProvider({ children }) {
  const [state, setState] = useState({ ready: false, user: null, meta: null, fatal: null })

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await api.csrf()
        const [meta, user] = await Promise.all([
          api.get('/meta/'),
          api.get('/auth/me/').catch((e) => (e.status === 403 || e.status === 401 ? null : Promise.reject(e))),
        ])
        if (alive) setState({ ready: true, user, meta, fatal: null })
      } catch (e) {
        if (alive) setState({ ready: true, user: null, meta: null, fatal: e.detail || 'Unable to start the app.' })
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const setUser = useCallback((user) => setState((s) => ({ ...s, user })), [])
  const login = useCallback(async (email, password) => {
    const user = await api.post('/auth/login/', { email, password })
    await api.csrf() // session rotated: refresh the CSRF cookie
    setUser(user)
    return user
  }, [setUser])
  const signup = useCallback(async (data) => {
    const user = await api.post('/auth/signup/', data)
    await api.csrf()
    setUser(user)
    return user
  }, [setUser])
  const logout = useCallback(async () => {
    await api.post('/auth/logout/').catch(() => {})
    await api.csrf()
    setUser(null)
  }, [setUser])

  const value = useMemo(() => ({ ...state, setUser, login, signup, logout }), [state, setUser, login, signup, logout])
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

/* ---------------- Toasts ---------------- */
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const id = useRef(0)
  const push = useCallback((message, type = 'success') => {
    const key = ++id.current
    setItems((l) => [...l, { key, message, type }])
    setTimeout(() => setItems((l) => l.filter((t) => t.key !== key)), type === 'error' ? 6500 : 3800)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.key} className={`toast toast-${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

/* ---------------- Data hook ---------------- */
export function useFetch(path, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true }))
    return api
      .get(path)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => setState({ data: null, error, loading: false }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps])
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true }))
    api
      .get(path)
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps])
  return { ...state, reload }
}

export function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || '?'
