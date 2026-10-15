import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, ChevronDown, FileText, LogOut, UserCog, Users, ClipboardList, Database, Globe2, Dna, ShieldCheck } from 'lucide-react'
import { initials, useApp } from '../context'

export const TOPIC_ICON = { data: Database, geo: Globe2, micro: Dna }

export function Brand({ to = '/' }) {
  return (
    <Link to={to} className="brand">
      <img src="/logo.png" alt="" width="44" height="44" />
      <span>
        <b>Sixth National Conference of Chief Secretaries</b>
        <small>Feedback Note Portal</small>
      </span>
    </Link>
  )
}

function UserMenu() {
  const { user, logout } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const nav = useNavigate()
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [])
  return (
    <div className="usermenu" ref={ref}>
      <button className="usermenu-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <span className="avatar">{initials(user.name)}</span>
        <span className="usermenu-name">
          <b>{user.name}</b>
          <small>{user.is_admin ? 'Administrator' : user.state_ut || 'Officer'}</small>
        </span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-head">
            <b>{user.name}</b>
            <span className="muted small">{user.email}</span>
          </div>
          <Link to="/profile" role="menuitem" onClick={() => setOpen(false)}>
            <UserCog size={16} /> My profile
          </Link>
          <button
            role="menuitem"
            onClick={async () => {
              setOpen(false)
              await logout()
              nav('/login', { replace: true })
            }}
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      )}
    </div>
  )
}

export function AppShell() {
  const { user } = useApp()
  const loc = useLocation()
  useEffect(() => window.scrollTo(0, 0), [loc.pathname])
  const links = user.is_admin
    ? [
        ['/admin', 'Overview', BarChart3, true],
        ['/admin/notes', 'Feedback notes', FileText],
        ['/admin/users', 'Users', Users],
      ]
    : [['/notes', 'My notes', ClipboardList]]
  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-in">
          <Brand to={user.is_admin ? '/admin' : '/notes'} />
          <nav className="topnav" aria-label="Main">
            {links.map(([to, label, Icon, end]) => (
              <NavLink key={to} to={to} end={end}>
                <Icon size={16} /> {label}
              </NavLink>
            ))}
          </nav>
          <UserMenu />
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
      <footer className="foot">NITI Aayog · Sixth National Conference of Chief Secretaries · Feedback Note Portal</footer>
    </div>
  )
}

const POINTS = [
  [Database, 'Data Governance, Government Data for AI and Practical AI Adoption'],
  [Globe2, 'Geospatial Technologies for Governance'],
  [Dna, 'Microbiome Technologies for Governance'],
]

export function AuthLayout({ children, wide }) {
  return (
    <div className="auth">
      <aside className="auth-hero">
        <div className="auth-hero-in">
          <div className="seal">
            <img src="/logo.png" alt="NITI Aayog" />
          </div>
          <p className="eyebrow">NITI Aayog · Feedback Note Portal</p>
          <h1 className="serif">Sixth National Conference of Chief Secretaries</h1>
          <p className="lead">Share your feedback note on the conference topics — policy gaps, potential solutions and best practices from the field.</p>
          <ul className="topic-list">
            {POINTS.map(([Icon, t]) => (
              <li key={t}>
                <Icon size={18} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <p className="hero-foot">
            <ShieldCheck size={16} /> You may file up to three notes — one in each subject area.
          </p>
        </div>
      </aside>
      <section className="auth-form">
        <div className={wide ? 'auth-card wide' : 'auth-card'}>{children}</div>
      </section>
    </div>
  )
}
