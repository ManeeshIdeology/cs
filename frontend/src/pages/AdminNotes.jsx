import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, Eye, FileSearch, Printer, Search } from 'lucide-react'
import { qs } from '../api'
import { Alert, Button, CloseButton, Empty, Modal, PageLoader, Pagination, StatusPill } from '../components/ui'
import { fmtDate, useApp, useDebounced, useFetch } from '../context'

const PAGE = 25

function NoteDrawer({ note, onClose }) {
  if (!note) return null
  const ro = (label, text) => (
    <>
      <h4>{label}</h4>
      <div className="answer-ro">{text || <span className="muted">—</span>}</div>
    </>
  )
  return (
    <Modal open onClose={onClose} side>
      <div className="drawer-head">
        <div>
          <h3 style={{ marginBottom: 2 }}>{note.name}</h3>
          <StatusPill status={note.status} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a className="btn btn-primary btn-sm" href={`/print/notes/${note.id}/`} target="_blank" rel="noreferrer"><Printer /> Print</a>
          <CloseButton onClick={onClose} />
        </div>
      </div>
      <div className="note-view">
        <dl className="kv">
          <dt>Email</dt><dd>{note.user_email}</dd>
          <dt>State / UT</dt><dd>{note.state_ut || '—'}</dd>
          <dt>Designation</dt><dd>{note.designation || '—'}</dd>
          <dt>Batch</dt><dd>{note.batch || '—'}</dd>
          <dt>Service status</dt><dd>{note.service_status || '—'}</dd>
          <dt>Training institute</dt><dd>{note.training_institute || '—'}</dd>
          <dt>Current posting</dt><dd>{note.current_posting || '—'}</dd>
          <dt>Topic</dt><dd>{note.topic_title}</dd>
          <dt>Submitted</dt><dd>{fmtDate(note.submitted_at)}</dd>
        </dl>
        {ro('2. Policy Gaps and Challenges', note.policy_gaps)}
        {ro('3. Potential Solutions', note.potential_solutions)}
        {ro('4. Best Practices', note.best_practices)}
      </div>
    </Modal>
  )
}

export default function AdminNotes() {
  const { meta } = useApp()
  const [sp, setSp] = useSearchParams()
  const f = {
    topic: sp.get('topic') || '', state: sp.get('state') || '', status: sp.get('status') || '',
    service_status: sp.get('service_status') || '', q: sp.get('q') || '', page: Number(sp.get('page')) || 1,
  }
  const [q, setQ] = useState(f.q)
  const dq = useDebounced(q)
  const [selected, setSelected] = useState(new Set())
  const [summary, setSummary] = useState(true)
  const [noInstr, setNoInstr] = useState(false)
  const [open, setOpen] = useState(null)

  const update = (patch) => {
    const next = { ...f, ...patch }
    if (!('page' in patch)) next.page = 1
    const { page, ...rest } = next
    setSp({ ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v)), ...(page > 1 ? { page } : {}) }, { replace: true })
  }
  useEffect(() => {
    if (dq !== f.q) update({ q: dq })
  }, [dq]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setSelected(new Set()), [f.topic, f.state, f.status, f.service_status, f.q, f.page])

  const filters = { topic: f.topic, state: f.state, status: f.status, service_status: f.service_status, q: f.q }
  const path = `/admin/notes/${qs({ ...filters, page: f.page, page_size: PAGE })}`
  const { data, error, loading } = useFetch(path)

  const rows = data?.results || []
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const opts = { ...(summary ? { summary: 1 } : {}), ...(noInstr ? { noinstr: 1 } : {}) }
  const printSelected = () => window.open(`/print/?${[...selected].map((i) => `id=${i}`).join('&')}${summary ? '&summary=1' : ''}${noInstr ? '&noinstr=1' : ''}`, '_blank')
  const printCompiled = `/print/${qs({ topic: f.topic, state: f.state, status: f.status, service_status: f.service_status, q: f.q, summary: 1, ...(noInstr ? { noinstr: 1 } : {}) })}`
  const csv = `/api/admin/notes/export.csv${qs(filters)}`
  const hasFilter = Object.values(filters).some(Boolean)
  const topicTitle = useMemo(() => Object.fromEntries(meta.topics.map((t) => [t.key, t.title])), [meta])

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Feedback notes</h1>
          <p>Filter, review and print notes in the exact template layout.</p>
        </div>
        <div className="actions">
          <a className="btn btn-secondary" href={csv}><Download /> Export CSV</a>
          {f.topic ? (
            <a className="btn btn-primary" href={printCompiled} target="_blank" rel="noreferrer"><Printer /> Print compiled</a>
          ) : (
            <Button disabled title="Choose a topic to print a compiled set" icon={Printer}>Print compiled</Button>
          )}
        </div>
      </div>

      <section className="card">
        <div className="toolbar">
          <div className="search">
            <Search />
            <input className="input" type="search" placeholder="Search name, email, designation or posting" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
          </div>
          <select className="select" value={f.topic} onChange={(e) => update({ topic: e.target.value })} aria-label="Topic">
            <option value="">All topics</option>
            {meta.topics.map((t) => <option key={t.key} value={t.key}>{t.title.split(',')[0]}</option>)}
          </select>
          <select className="select" value={f.state} onChange={(e) => update({ state: e.target.value })} aria-label="State or UT">
            <option value="">All States / UTs</option>
            {meta.states.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="select" value={f.status} onChange={(e) => update({ status: e.target.value })} aria-label="Status">
            <option value="">Any status</option>
            <option value="submitted">Submitted</option>
            <option value="draft">Draft</option>
          </select>
          <select className="select" value={f.service_status} onChange={(e) => update({ service_status: e.target.value })} aria-label="Service status">
            <option value="">Officers + probationers</option>
            {meta.service_statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
          {hasFilter && <Button variant="ghost" size="sm" onClick={() => { setQ(''); setSp({}, { replace: true }) }}>Clear</Button>}
        </div>

        <div className="bulkbar">
          <b>{selected.size ? `${selected.size} selected` : 'Print options'}</b>
          <label><input className="check" type="checkbox" checked={summary} onChange={(e) => setSummary(e.target.checked)} /> Add State/UT summary page</label>
          <label><input className="check" type="checkbox" checked={noInstr} onChange={(e) => setNoInstr(e.target.checked)} /> Omit “Instructions” block</label>
          <span style={{ flex: 1 }} />
          <Button size="sm" icon={Printer} disabled={!selected.size} onClick={printSelected}>Print selected</Button>
        </div>

        {error ? (
          <div style={{ padding: 16 }}><Alert type="error">{error.detail}</Alert></div>
        ) : loading && !data ? (
          <PageLoader />
        ) : rows.length === 0 ? (
          <Empty icon={FileSearch} title="No notes found">{hasFilter ? 'Try changing or clearing the filters.' : 'Notes will appear here once officers start writing.'}</Empty>
        ) : (
          <>
            <div className="table-wrap" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity .15s' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input className="check" type="checkbox" aria-label="Select all on this page" checked={allOnPage}
                        onChange={() => setSelected(allOnPage ? new Set() : new Set(rows.map((r) => r.id)))} />
                    </th>
                    <th>Officer</th><th>State / UT</th><th>Topic</th><th>Status</th><th>Updated</th><th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((n) => (
                    <tr key={n.id} className={selected.has(n.id) ? 'selected' : ''}>
                      <td><input className="check" type="checkbox" aria-label={`Select ${n.name}`} checked={selected.has(n.id)} onChange={() => toggle(n.id)} /></td>
                      <td>
                        <b>{n.name}</b> {n.service_status === 'Probationer' && <span className="pill pill-info" style={{ marginLeft: 6 }}>Probationer</span>}
                        <div className="cell-sub">{n.designation}{n.current_posting ? ` · ${n.current_posting}` : ''}</div>
                        <div className="cell-sub">{n.user_email}</div>
                      </td>
                      <td>{n.state_ut || '—'}</td>
                      <td className="cell-title" title={topicTitle[n.topic]}>{topicTitle[n.topic].split(',')[0]}</td>
                      <td><StatusPill status={n.status} /></td>
                      <td className="nowrap small muted">{fmtDate(n.updated_at)}</td>
                      <td className="nowrap" style={{ textAlign: 'right' }}>
                        <Button variant="ghost" size="sm" icon={Eye} onClick={() => setOpen(n)}>View</Button>{' '}
                        <a className="btn btn-secondary btn-sm" href={`/print/notes/${n.id}/`} target="_blank" rel="noreferrer"><Printer /> Print</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={f.page} pageSize={PAGE} count={data.count} onPage={(p) => update({ page: p })} />
          </>
        )}
      </section>
      <NoteDrawer note={open} onClose={() => setOpen(null)} />
    </>
  )
}
