import { Link } from 'react-router-dom'
import { CheckCircle2, FileText, PenLine, Printer, Users } from 'lucide-react'
import { qs } from '../api'
import { TOPIC_ICON } from '../components/Layout'
import { Alert, PageLoader } from '../components/ui'
import { useFetch } from '../context'

function Stat({ tone, value, label }) {
  return (
    <div className={`card stat t-${tone}`}>
      <div>
        <b>{value}</b>
        <span>{label}</span>
      </div>
    </div>
  )
}

export default function AdminOverview() {
  const { data: s, error, loading } = useFetch('/admin/stats/')
  if (loading && !s) return <PageLoader />
  if (error) return <Alert type="error">{error.detail}</Alert>

  const maxTopic = Math.max(1, ...s.by_topic.map((t) => t.submitted + t.draft))
  const maxState = Math.max(1, ...s.by_state.map((x) => x.submitted))

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p>Progress of Feedback Notes across the conference topics.</p>
        </div>
        <div className="actions">
          <Link className="btn btn-primary" to="/admin/notes"><FileText /> Browse all notes</Link>
        </div>
      </div>

      <div className="stats">
        <Stat icon={Users} tone="blue" value={s.users} label="Registered officers" />
        <Stat icon={CheckCircle2} tone="green" value={s.submitted} label="Notes submitted" />
        <Stat icon={PenLine} tone="gold" value={s.draft} label="Drafts in progress" />
        <Stat icon={FileText} tone="slate" value={s.complete_users} label="Officers with all 3 notes" />
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="panel-head">
            <div>
              <h2>Notes by topic</h2>
              <p>Submitted and draft notes per conference topic.</p>
            </div>
            <div className="legend">
              <span><i style={{ background: 'var(--primary-600)' }} />Submitted</span>
              <span><i style={{ background: 'var(--gold-500)' }} />Draft</span>
            </div>
          </div>
          {s.by_topic.map((t) => {
            const Icon = TOPIC_ICON[t.key]
            return (
              <div className="topic-row" key={t.key}>
                <div className="topic-row-top">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0, flex: '1 1 280px' }}>
                    <span className="topic-icon" style={{ width: 38, height: 38 }}><Icon size={20} /></span>
                    <div>
                      <b>{t.title}</b>
                      <div className="muted small">{t.submitted} submitted · {t.draft} draft</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link className="btn btn-secondary btn-sm" to={`/admin/notes${qs({ topic: t.key, status: 'submitted' })}`}>View</Link>
                    <a className="btn btn-secondary btn-sm" target="_blank" rel="noreferrer" href={`/print/${qs({ topic: t.key, summary: 1 })}`}>
                      <Printer /> Print compiled
                    </a>
                  </div>
                </div>
                <div className="bar" role="img" aria-label={`${t.submitted} submitted, ${t.draft} draft`}>
                  <i className="b-ok" style={{ width: `${(t.submitted / maxTopic) * 100}%` }} />
                  <i className="b-draft" style={{ width: `${(t.draft / maxTopic) * 100}%` }} />
                </div>
              </div>
            )
          })}
        </section>

        <section className="card" style={{ paddingBottom: 10 }}>
          <div className="panel-head" style={{ paddingBottom: 10 }}>
            <div>
              <h2>Submitted by State / UT</h2>
              <p>Where the notes are coming from.</p>
            </div>
          </div>
          {s.by_state.length === 0 ? (
            <p className="muted" style={{ padding: '10px 20px 20px' }}>No submitted notes yet.</p>
          ) : (
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              {s.by_state.map((x) => (
                <div className="state-row" key={x.state}>
                  <span title={x.state} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.state}</span>
                  <div className="bar"><i className="b-ok" style={{ width: `${(x.submitted / maxState) * 100}%` }} /></div>
                  <b style={{ textAlign: 'right' }}>{x.submitted}</b>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <p className="muted small" style={{ marginTop: 20 }}>
        “Print compiled” prints, for every State/UT, the Summary of Feedback Notes page followed by that State/UT’s submitted notes in alphabetical order of officer name — the format in the compilation process document.
      </p>
    </>
  )
}
