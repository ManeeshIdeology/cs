import { useEffect, useState } from 'react'
import { Search, Trash2, UserPlus, UsersRound } from 'lucide-react'
import { api, qs } from '../api'
import AddUserDialog from '../components/AddUserDialog'
import { Alert, Button, ConfirmDialog, Empty, PageLoader, Pagination } from '../components/ui'
import { fmtDate, initials, useApp, useDebounced, useFetch, useToast } from '../context'

const PAGE = 25

export default function AdminUsers() {
  const { meta, user: me } = useApp()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [state, setState] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebounced(q)
  useEffect(() => setPage(1), [dq, state])
  const { data, error, loading, reload } = useFetch(`/admin/users/${qs({ q: dq, state, page, page_size: PAGE })}`)
  const rows = data?.results || []

  async function remove() {
    setBusy(true)
    try {
      await api.del(`/admin/users/${toDelete.id}/`)
      toast(`${toDelete.name} was deleted.`)
      setToDelete(null)
      if (rows.length === 1 && page > 1) setPage(page - 1)
      await reload()
    } catch (e) {
      toast(e.detail, 'error')
      setToDelete(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p>Registered officers, probationers and administrators.</p>
        </div>
        <div className="actions">
          <Button icon={UserPlus} onClick={() => setAdding(true)}>Add user</Button>
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
              <table className="table stack">
                <thead>
                  <tr><th>Name</th><th>State / UT</th><th>Designation</th><th>Status</th><th>Notes</th><th>Joined</th><th /></tr>
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
                      <td data-label="State / UT">{u.state_ut || '—'}</td>
                      <td data-label="Designation">{u.designation || '—'}<div className="cell-sub">{u.current_posting}</div></td>
                      <td data-label="Service status">{u.service_status || '—'}</td>
                      <td data-label="Notes" className="nowrap">{u.notes_submitted} submitted <span className="muted">/ {u.notes_total}</span></td>
                      <td data-label="Joined" className="nowrap small muted">{fmtDate(u.date_joined)}</td>
                      <td className="nowrap row-actions" style={{ textAlign: 'right' }}>
                        {u.id === me.id ? (
                          <span className="muted small">You</span>
                        ) : (
                          <Button variant="danger" size="sm" icon={Trash2} onClick={() => setToDelete(u)} aria-label={`Delete ${u.name}`}>
                            <span className="lbl">Delete</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE} count={data.count} onPage={setPage} />
          </>
        )}
      </section>

      <AddUserDialog open={adding} onClose={() => setAdding(false)} onCreated={reload} />
      <ConfirmDialog
        open={!!toDelete}
        danger
        busy={busy}
        title={`Delete ${toDelete?.name}?`}
        confirmLabel="Delete user"
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      >
        This permanently deletes the account <b>{toDelete?.email}</b>
        {toDelete?.notes_total > 0 ? (
          <> and their <b>{toDelete.notes_total} feedback note{toDelete.notes_total > 1 ? 's' : ''}</b> ({toDelete.notes_submitted} submitted)</>
        ) : null}
        . This cannot be undone.
      </ConfirmDialog>
    </>
  )
}
