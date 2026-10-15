import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../api'
import { TOPIC_ICON } from '../components/Layout'
import { Alert, Button, ConfirmDialog, PageLoader, ProgressRing, StatusPill } from '../components/ui'
import { fmtDate, useApp, useFetch, useToast } from '../context'

export default function Dashboard() {
  const { user, meta } = useApp()
  const toast = useToast()
  const nav = useNavigate()
  const { data: notes, error, loading, reload } = useFetch('/notes/')
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)

  if (loading && !notes) return <PageLoader />
  if (error) return <Alert type="error">{error.detail}</Alert>

  const byTopic = Object.fromEntries(notes.map((n) => [n.topic, n]))
  const submitted = notes.filter((n) => n.status === 'submitted').length
  const first = user.name.split(' ')[0]

  async function remove() {
    setBusy(true)
    try {
      await api.del(`/notes/${toDelete.id}/`)
      toast('Feedback note deleted.')
      setToDelete(null)
      await reload()
    } catch (e) {
      toast(e.detail, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className="card welcome">
        <div>
          <h1>Welcome, {first}</h1>
          <p>
            You can file <b>up to {meta.max_notes} feedback notes — one in each subject area</b>. Drafts save automatically; submit a note when it is final.
          </p>
          {notes.length === 0 && (
            <p style={{ marginTop: 14 }}>
              <Button icon={Plus} onClick={() => nav(`/notes/new/${meta.topics[0].key}`)}>
                Write your first note
              </Button>
            </p>
          )}
        </div>
        <div className="welcome-side">
          <ProgressRing value={submitted} max={meta.max_notes} />
          <div className="steps">
            {meta.topics.map((t) => {
              const n = byTopic[t.key]
              const done = n?.status === 'submitted'
              return (
                <div key={t.key} className={done ? 'done' : ''}>
                  {done ? <CheckCircle2 /> : <Circle />}
                  {t.title.split(',')[0].replace(' for Governance', '')}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <div className="page-head">
        <div>
          <h2>Conference topics</h2>
          <p>Choose a topic to start or continue your note.</p>
        </div>
      </div>

      <div className="topic-grid">
        {meta.topics.map((t, i) => {
          const n = byTopic[t.key]
          const Icon = TOPIC_ICON[t.key]
          const state = n ? n.status : 'none'
          return (
            <article key={t.key} className={`card topic-card is-${state}`}>
              <div className="topic-top">
                <span className="topic-icon">
                  <Icon />
                </span>
                <StatusPill status={n?.status} />
              </div>
              <div>
                <div className="no">Topic {i + 1}</div>
                <h3>{t.title}</h3>
              </div>
              <div className="meta">{n ? `Last updated ${fmtDate(n.updated_at)}` : 'You have not started a note on this topic.'}</div>
              <div className="actions">
                {n ? (
                  <>
                    <Link className="btn btn-primary btn-sm" to={`/notes/${n.id}`}>
                      <Pencil /> {n.status === 'submitted' ? 'Edit' : 'Continue'}
                    </Link>
                    <a className="btn btn-secondary btn-sm" href={`/print/notes/${n.id}/`} target="_blank" rel="noreferrer">
                      <ExternalLink /> Print view
                    </a>
                    <Button variant="danger" size="sm" className="btn-icon" icon={Trash2} aria-label={`Delete note on ${t.title}`} onClick={() => setToDelete(n)} />
                  </>
                ) : (
                  <Link className="btn btn-primary btn-sm" to={`/notes/new/${t.key}`}>
                    <Plus /> Start note
                  </Link>
                )}
              </div>
            </article>
          )
        })}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        danger
        busy={busy}
        title="Delete this feedback note?"
        confirmLabel="Delete note"
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      >
        Your note on “{toDelete?.topic_title}” will be permanently deleted. You can start a new one afterwards.
      </ConfirmDialog>
    </>
  )
}
