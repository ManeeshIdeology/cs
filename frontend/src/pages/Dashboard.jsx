import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../api'
import { TOPIC_ICON } from '../components/Layout'
import { Alert, Button, ConfirmDialog, PageLoader, ProgressRing, StatusPill } from '../components/ui'
import { fmtDate, useApp, useFetch, useToast } from '../context'

/** A short label for a note: the start of its first answer, so several notes on one topic are easy to tell apart. */
function noteLabel(n) {
  const text = (n.policy_gaps || n.potential_solutions || n.best_practices || '').replace(/\s+/g, ' ').trim()
  return text ? (text.length > 90 ? text.slice(0, 90) + '…' : text) : 'Untitled note — nothing written yet'
}

export default function Dashboard() {
  const { user, meta } = useApp()
  const toast = useToast()
  const nav = useNavigate()
  const { data: notes, error, loading, reload } = useFetch('/notes/')
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)

  if (loading && !notes) return <PageLoader />
  if (error) return <Alert type="error">{error.detail}</Alert>

  const byTopic = Object.fromEntries(meta.topics.map((t) => [t.key, notes.filter((n) => n.topic === t.key)]))
  const submitted = notes.filter((n) => n.status === 'submitted').length
  const drafts = notes.length - submitted
  const covered = meta.topics.filter((t) => byTopic[t.key].some((n) => n.status === 'submitted')).length
  const full = notes.length >= meta.max_notes
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
            Write <b>as many feedback notes as you need</b> — you can add more than one note on the same topic. Drafts save automatically; submit a note when it is final.
          </p>
          <div className="counts">
            <span><b>{notes.length}</b> note{notes.length === 1 ? '' : 's'}</span>
            <span><b>{submitted}</b> submitted</span>
            <span><b>{drafts}</b> draft{drafts === 1 ? '' : 's'}</span>
          </div>
          {notes.length === 0 && (
            <p style={{ marginTop: 14 }}>
              <Button icon={Plus} onClick={() => nav(`/notes/new/${meta.topics[0].key}`)}>
                Write your first note
              </Button>
            </p>
          )}
        </div>
        <div className="welcome-side">
          <ProgressRing value={covered} max={meta.topics.length} label="topics" />
          <div className="steps">
            {meta.topics.map((t) => {
              const done = byTopic[t.key].some((n) => n.status === 'submitted')
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
          <p>Add a note under any topic — as many as you like.</p>
        </div>
      </div>

      {full && <Alert type="warn" className="mb">You have reached the limit of {meta.max_notes} notes. Delete a note you no longer need to add another.</Alert>}

      <div className="topic-stack">
        {meta.topics.map((t, i) => {
          const list = byTopic[t.key]
          const Icon = TOPIC_ICON[t.key]
          const done = list.filter((n) => n.status === 'submitted').length
          return (
            <article key={t.key} className={`card topic-block ${done ? 'has-submitted' : list.length ? 'has-draft' : ''}`}>
              <header className="topic-head">
                <span className="topic-icon"><Icon /></span>
                <div className="topic-title">
                  <div className="no">Topic {i + 1}</div>
                  <h3>{t.title}</h3>
                </div>
                <div className="topic-count">
                  {list.length === 0 ? (
                    <StatusPill />
                  ) : (
                    <span className="count-chip"><b>{list.length}</b> note{list.length === 1 ? '' : 's'}{done ? <> · <b>{done}</b> submitted</> : null}</span>
                  )}
                </div>
              </header>

              {list.length > 0 && (
                <ul className="entries">
                  {list.map((n, k) => (
                    <li key={n.id} className="entry">
                      <div className="entry-main">
                        <div className="entry-top">
                          <span className="entry-no">Note {k + 1}</span>
                          <StatusPill status={n.status} />
                        </div>
                        <div className="entry-label">{noteLabel(n)}</div>
                        <div className="entry-meta">Last updated {fmtDate(n.updated_at)}</div>
                      </div>
                      <div className="entry-actions">
                        <Link className="btn btn-primary btn-sm" to={`/notes/${n.id}`}>
                          <Pencil /> {n.status === 'submitted' ? 'Edit' : 'Continue'}
                        </Link>
                        <a className="btn btn-secondary btn-sm" href={`/print/notes/${n.id}/`} target="_blank" rel="noreferrer">
                          <ExternalLink /> Print view
                        </a>
                        <Button variant="danger" size="sm" className="btn-icon" icon={Trash2} aria-label={`Delete note ${k + 1} on ${t.title}`} onClick={() => setToDelete(n)} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <footer className="topic-foot">
                {list.length === 0 && <span className="muted small">You have not started a note on this topic.</span>}
                <Link
                  className={`btn btn-sm ${list.length ? 'btn-secondary' : 'btn-primary'} ${full ? 'is-disabled' : ''}`}
                  to={`/notes/new/${t.key}`}
                  aria-disabled={full}
                  onClick={(e) => full && e.preventDefault()}
                >
                  <Plus /> {list.length ? 'Add another note on this topic' : 'Start note'}
                </Link>
              </footer>
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
        This note on “{toDelete?.topic_title}” will be permanently deleted. Your other notes are not affected.
      </ConfirmDialog>
    </>
  )
}
