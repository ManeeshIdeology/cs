import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useApp } from './context'
import { AppShell } from './components/Layout'
import { Alert, PageLoader } from './components/ui'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'

// Heavier screens load on demand.
const NoteEditor = lazy(() => import('./pages/NoteEditor'))
const AdminOverview = lazy(() => import('./pages/AdminOverview'))
const AdminNotes = lazy(() => import('./pages/AdminNotes'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))

const home = (user) => (user.is_admin ? '/admin' : '/notes')

function Guest({ children }) {
  const { user } = useApp()
  const loc = useLocation()
  if (user) return <Navigate to={loc.state?.from || home(user)} replace />
  return children
}

function Protected({ admin, children }) {
  const { user } = useApp()
  const loc = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />
  if (admin && !user.is_admin) return <Navigate to="/notes" replace />
  if (!admin && admin !== undefined && user.is_admin) return <Navigate to="/admin" replace />
  return children
}

export default function App() {
  const { ready, user, fatal } = useApp()
  if (!ready) return <PageLoader />
  if (fatal) {
    return (
      <div className="container" style={{ maxWidth: 560, paddingTop: 80 }}>
        <Alert type="error">{fatal}</Alert>
      </div>
    )
  }
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Guest><Login /></Guest>} />
        <Route path="/signup" element={<Guest><Signup /></Guest>} />
        <Route element={user ? <AppShell /> : <Navigate to="/login" replace />}>
          <Route index element={user ? <Navigate to={home(user)} replace /> : null} />
          <Route path="/notes" element={<Protected admin={false}><Dashboard /></Protected>} />
          <Route path="/notes/new/:topic" element={<Protected admin={false}><NoteEditor /></Protected>} />
          <Route path="/notes/:id" element={<Protected admin={false}><NoteEditor /></Protected>} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />
          <Route path="/admin" element={<Protected admin><AdminOverview /></Protected>} />
          <Route path="/admin/notes" element={<Protected admin><AdminNotes /></Protected>} />
          <Route path="/admin/users" element={<Protected admin><AdminUsers /></Protected>} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}
