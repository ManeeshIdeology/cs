import { useEffect, useState } from 'react'
import { Search, UsersRound } from 'lucide-react'
import { qs } from '../api'
import { Alert, Empty, PageLoader, Pagination } from '../components/ui'
import { fmtDate, initials, useApp, useDebounced, useFetch } from '../context'

const PAGE = 25

export default function AdminUsers() {
  const { meta } = useApp()
  const [q, setQ] = useState('')
  const [state, setState] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebounced(q)
  useEffect(() => setPage(1), [dq, state])
  const { data, error, loading } = useFetch(`/admin/users/${qs({ q: dq, state, page, page_size: PAGE })}`)
  const rows = data?.results || []

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p>Registered officers, probationers and administrators.</p>
        </div>
      </div>
      <section className="card">
        <div className="toolbar">
          <div className="search">
            <Search />
            <input className="input" type="search" placeholder="Search name, email or posting" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
          </div>
          <select className="select" value={state} onChange={(e) => setState(e.target.value)} aria-label="State or UT">
            <option value="">All States / UTs</option>
            {meta.states.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        {error ? (
          <div style={{ padding: 16 }}><Alert type="error">{error.detail}</Alert></div>
        ) : loading && !data ? (
          <PageLoader />
        ) : rows.length === 0 ? (
          <Empty icon={UsersRound} title="No users found">Try a different search.</Empty>
        ) : (
          <>
            <div className="table-wrap" style={{ opacity: loading ? 0.6 : 1 }}>
              <table className="table">
                <thead>
                  <tr><th>Name</th><th>State / UT</th><th>Designation</th><th>Status</th><th>Notes</th><th>Joined</th></tr>
                </thead>
                <tbody>
                  {rows.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <span className="avatar">{initials(u.name)}</span>
                          <div>
                            <b>{u.name}</b> {u.is_admin && <span className="pill pill-info" style={{ marginLeft: 6 }}>Admin</span>}
                            <div className="cell-sub">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{u.state_ut || '—'}</td>
                      <td>{u.designation || '—'}<div className="cell-sub">{u.current_posting}</div></td>
                      <td>{u.service_status || '—'}</td>
                      <td className="nowrap">{u.notes_submitted} submitted <span className="muted">/ {u.notes_total}</span></td>
                      <td className="nowrap small muted">{fmtDate(u.date_joined)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE} count={data.count} onPage={setPage} />
          </>
        )}
      </section>
    </>
  )
}
