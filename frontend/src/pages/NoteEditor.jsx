import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, CheckCircle2, CloudOff, Eye, ListChecks, Loader2, Save, Send, Undo2, UserRound } from 'lucide-react'
import { api } from '../api'
import { TOPIC_ICON } from '../components/Layout'
import { Alert, Button, Choices, PageLoader, SelectField, StatusPill, TextField } from '../components/ui'
import { SERVICE_OPTIONS, batchOptions, validBatch } from '../components/OfficerFields'
import { fmtDate, useApp, useToast } from '../context'

const OFFICER = ['name', 'designation', 'batch', 'service_status', 'current_posting']
const BOXES = ['policy_gaps', 'potential_solutions', 'best_practices']
const LABELS = {
  name: 'Name', designation: 'Designation', batch: 'Batch', service_status: 'Current service status',
  current_posting: 'Current Posting', policy_gaps: 'Policy Gaps and Challenges',
  potential_solutions: 'Potential Solutions', best_practices: 'Best Practices',
}
const ANSWERS = [
  { key: 'policy_gaps', no: 2, title: 'Policy Gaps and Challenges', id: 'sec-gaps', rows: 10,
    hint: 'Current policy challenges, administrative and implementing challenges with respect to the topic selected' },
  { key: 'potential_solutions', no: 3, title: 'Potential Solutions', id: 'sec-solutions', rows: 9,
    hint: 'Can potentially highlight new technology solutions, scope for convergence with other schemes/ programmes, etc.' },
  { key: 'best_practices', no: 4, title: 'Best Practices', id: 'sec-best', rows: 7,
    hint: 'Highlights the practices, which are sustainable, replicable, scalable, monitorable, etc. Can also highlights the block/district/ State level practices' },
]
const SIG_FIELDS = ['topic', 'name', 'designation', 'batch', 'service_status', 'training_institute', 'current_posting', 'policy_gaps', 'potential_solutions', 'best_practices']
const signature = (n) => JSON.stringify(SIG_FIELDS.map((k) => n[k] ?? ''))
const words = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0)
const time = (d) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

export default function NoteEditor() {
  const { id, topic: topicParam } = useParams()
  const { user, meta } = useApp()
  const nav = useNavigate()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [redirect, setRedirect] = useState(null)
  const [noteId, setNoteId] = useState(id ? Number(id) : null)
  const [status, setStatus] = useState('draft')
  const [v, setV] = useState(null)
  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState('')
  const [dirty, setDirty] = useState(false)
  const [save, setSave] = useState({ state: 'idle', at: null }) // idle | saving | saved | error
  const [busy, setBusy] = useState('') // '' | 'draft' | 'submit' | 'preview'

  const vRef = useRef(v)
  vRef.current = v
  const idRef = useRef(noteId)
  idRef.current = noteId
  const ver = useRef(0)
  const inflight = useRef(null)
  const lastSent = useRef('') // JSON of the last content known to be on the server

  /* ---------- load ---------- */
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        if (id) {
          const n = await api.get(`/notes/${id}/`)
          if (!alive) return
          setV({ ...n, batch: validBatch(meta, n.batch) }) // an invalid old batch shows blank and must be re-picked
          lastSent.current = signature(n)
          setStatus(n.status)
          setSave({ state: 'saved', at: new Date(n.updated_at) })
        } else {
          const mine = await api.get('/notes/')
          if (!alive) return
          if (mine.length >= meta.max_notes || !meta.topics.some((t) => t.key === topicParam)) return setRedirect('/notes')
          setV({
            topic: topicParam, name: user.name, designation: user.designation, batch: validBatch(meta, user.batch),
            service_status: user.service_status, training_institute: user.training_institute,
            current_posting: user.current_posting, policy_gaps: '', potential_solutions: '', best_practices: '',
          })
        }
      } catch (e) {
        if (alive) setRedirect(e.status === 404 ? '/notes' : '/notes')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [id, topicParam]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = useCallback((k, val) => {
    ver.current += 1
    setV((s) => ({ ...s, [k]: val }))
    setDirty(true)
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e))
  }, [])

  /* ---------- persist ---------- */
  // submit: true | false | undefined. Serialised so two saves never race.
  const persist = useCallback(async (submit, { silent = false } = {}) => {
    while (inflight.current) await inflight.current.catch(() => {})
    const snapshot = ver.current
    const cur = vRef.current
    const body = {
      topic: cur.topic, name: cur.name, designation: cur.designation, batch: cur.batch,
      service_status: cur.service_status, training_institute: cur.training_institute, current_posting: cur.current_posting,
      policy_gaps: cur.policy_gaps, potential_solutions: cur.potential_solutions, best_practices: cur.best_practices,
    }
    if (submit !== undefined) body.submit = submit
    const sig = signature(cur)
    if (silent && idRef.current && sig === lastSent.current) {
      // Nothing changed since the last save: skip the request (keeps the server light during long editing sessions).
      if (ver.current === snapshot) setDirty(false)
      return null
    }
    if (silent) setSave((s) => ({ ...s, state: 'saving' }))
    const run = (async () => {
      const saved = idRef.current ? await api.patch(`/notes/${idRef.current}/`, body) : await api.post('/notes/', body)
      if (!idRef.current) {
        idRef.current = saved.id
        setNoteId(saved.id)
        // Update the URL without remounting the editor (keeps the cursor where it is).
        window.history.replaceState(window.history.state, '', `/notes/${saved.id}`)
      }
      setStatus(saved.status)
      lastSent.current = sig
      setSave({ state: 'saved', at: new Date() })
      if (ver.current === snapshot) setDirty(false)
      return saved
    })()
    inflight.current = run
    try {
      return await run
    } catch (e) {
      setSave((s) => ({ ...s, state: 'error' }))
      throw e
    } finally {
      inflight.current = null
    }
  }, [])

  // Autosave drafts shortly after the user stops typing.
  useEffect(() => {
    if (!dirty || status === 'submitted' || loading || !v?.name?.trim()) return
    const t = setTimeout(() => {
      persist(false, { silent: true }).catch(() => {})
    }, 2500)
    return () => clearTimeout(t)
  }, [v, dirty, status, loading, persist])

  // A failed autosave (network blip, busy server) is retried by itself every few seconds - no need to type again.
  const [retries, setRetries] = useState(0)
  useEffect(() => {
    if (save.state !== 'error' || !dirty || status === 'submitted') return
    const t = setTimeout(() => {
      persist(false, { silent: true }).then(() => setRetries(0)).catch(() => setRetries((n) => n + 1))
    }, Math.min(5000 * (retries + 1), 30000))
    return () => clearTimeout(t)
  }, [save.state, dirty, status, retries, persist])

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!dirty) return
    const h = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const showErrors = (e) => {
    const f = e.fields || {}
    setErrors(f)
    setBanner(e.detail)
    const first = [...OFFICER, ...BOXES, 'topic'].find((k) => f[k])
    if (first) {
      const target = BOXES.includes(first)
        ? ANSWERS.find((a) => a.key === first).id
        : first === 'topic' ? 'sec-topic' : 'sec-officer'
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  async function act(kind) {
    setBusy(kind)
    setBanner('')
    setErrors({})
    try {
      if (kind === 'draft') {
        await persist(false)
        toast('Draft saved.')
      } else if (kind === 'submit') {
        // Check locally first for instant feedback; the server re-validates.
        const miss = [...OFFICER, ...BOXES].filter((k) => !String(vRef.current[k] || '').trim())
        if (miss.length) {
          showErrors({ detail: 'Please complete every field to submit — or save as a draft and finish later.', fields: Object.fromEntries(miss.map((k) => [k, [`${LABELS[k]} is required to submit.`]])) })
          return
        }
        await persist(true)
        toast('Feedback note submitted.')
        nav('/notes')
      }
    } catch (e) {
      showErrors(e)
    } finally {
      setBusy('')
    }
  }

  async function preview() {
    const w = window.open('', '_blank') // open synchronously so pop-up blockers allow it
    setBusy('preview')
    try {
      if (dirty || !idRef.current) await persist(status === 'submitted' ? true : false)
      if (w) w.location.href = `/print/notes/${idRef.current}/`
    } catch (e) {
      w?.close()
      showErrors(e)
    } finally {
      setBusy('')
    }
  }

  /* ---------- derived ---------- */
  const done = useMemo(() => {
    if (!v) return {}
    const ok = (k) => String(v[k] || '').trim().length > 0
    return {
      'sec-officer': OFFICER.every(ok),
      'sec-topic': !!v.topic,
      'sec-gaps': ok('policy_gaps'),
      'sec-solutions': ok('potential_solutions'),
      'sec-best': ok('best_practices'),
    }
  }, [v])

  if (redirect) return <Navigate to={redirect} replace />
  if (loading || !v) return <PageLoader />

  const isNew = !noteId
  const submitted = status === 'submitted'
  const err = (k) => (Array.isArray(errors[k]) ? errors[k][0] : errors[k] || '')
  const topic = meta.topics.find((t) => t.key === v.topic)
  const steps = [
    ['sec-officer', 'Officer details'],
    ['sec-topic', 'Name of the topic'],
    ['sec-gaps', 'Policy gaps and challenges'],
    ['sec-solutions', 'Potential solutions'],
    ['sec-best', 'Best practices'],
  ]
  const bind = (k) => ({ value: v[k] ?? '', onChange: (e) => set(k, e.target.value), error: err(k) })

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/notes" className="small" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
            <ArrowLeft size={14} /> My notes
          </Link>
          <h1>{isNew ? 'New feedback note' : 'Edit feedback note'}</h1>
          <p>{topic?.title}</p>
        </div>
      </div>

      <div className="editor-progress" aria-live="polite">
        <div className="row">
          <span>{Object.values(done).filter(Boolean).length} of {steps.length} sections complete</span>
          <span className={save.state === 'saved' && !dirty ? 'saved' : ''}>
            {save.state === 'saving' ? 'Saving…' : save.state === 'error' ? 'Not saved' : dirty ? (submitted ? 'Unsaved changes' : 'Saving shortly…') : save.at ? `Saved ${time(save.at)}` : ''}
          </span>
        </div>
        <div className="bar"><i className="b-ok" style={{ width: `${(Object.values(done).filter(Boolean).length / steps.length) * 100}%` }} /></div>
      </div>

      <div className="editor">
        <aside className="editor-nav" aria-label="Sections">
          <h4>Progress</h4>
          <ol>
            {steps.map(([sid, label]) => (
              <li key={sid}>
                <a href={`#${sid}`} className={done[sid] ? 'ok' : ''} onClick={(e) => { e.preventDefault(); document.getElementById(sid)?.scrollIntoView({ behavior: 'smooth' }) }}>
                  <span className="dot"><Check /></span> {label}
                </a>
              </li>
            ))}
          </ol>
          <div className={`savestate ${save.state}`} aria-live="polite">
            {save.state === 'saving' ? <Loader2 className="spin" /> : save.state === 'error' ? <CloudOff /> : save.state === 'saved' && !dirty ? <CheckCircle2 /> : <Save />}
            <span>
              {save.state === 'saving' && 'Saving…'}
              {save.state === 'error' && 'Could not save. Check your connection.'}
              {save.state !== 'saving' && save.state !== 'error' && (dirty ? (submitted ? 'Unsaved changes' : 'Saving shortly…') : save.at ? `Saved at ${time(save.at)}` : 'Not saved yet')}
            </span>
          </div>
        </aside>

        <form className="card paper-form" onSubmit={(e) => e.preventDefault()} noValidate>
          <div className="paper-head">
            <img src="/logo.png" alt="NITI Aayog" />
            <div className="t">
              Sixth National Conference of Chief Secretaries
              <br />
              Feedback Note
            </div>
            <div className="st">
              <StatusPill status={noteId ? status : 'none'} />
            </div>
          </div>

          <div className="doc-block" style={{ paddingBottom: 0, borderBottom: 0 }}>
            {submitted && (
              <Alert type="ok" className="mb">
                This note has been submitted{v.submitted_at ? ` on ${fmtDate(v.submitted_at)}` : ''}. Edits must keep every field filled; use “Move back to draft” to work on it freely.
              </Alert>
            )}
            {banner && (
              <Alert type="error" className="mb">
                {banner}
              </Alert>
            )}
            <p className="doc-title-u" style={{ marginTop: banner || submitted ? 18 : 0 }}>
              <u>Feedback Note (by all IAS officers / State Department Officers/All Probationers of National and State Training Institutes and Academies)</u>
            </p>
          </div>

          <section className="doc-block" id="sec-officer">
            <div className="doc-label">
              <span className="n sec"><UserRound /></span>
              <h3>Section 1: Officer Name and Details</h3>
            </div>
            <div className="form-grid" style={{ marginTop: 16 }}>
              <div className="full"><TextField label="Name" autoComplete="name" {...bind('name')} /></div>
              <TextField label="Designation" {...bind('designation')} />
              <SelectField label="Batch" options={batchOptions(meta)} placeholder="Select batch" {...bind('batch')} />
              <div className="full">
                <Choices label="Current service status" name="service_status" value={v.service_status} onChange={(x) => set('service_status', x)} options={SERVICE_OPTIONS} error={err('service_status')} />
              </div>
              <div className="full">
                <TextField label="Training Institute / Academy" optional hint="If currently undergoing institutional training." {...bind('training_institute')} />
              </div>
              <div className="full"><TextField label="Current Posting" {...bind('current_posting')} /></div>
            </div>
          </section>

          <section className="doc-block" id="sec-topic">
            <div className="doc-label">
              <span className="n sec"><ListChecks /></span>
              <h3>Section 2: Feedback for Sixth National Conference of Chief Secretaries</h3>
            </div>
            <div className="doc-label" style={{ marginTop: 26 }}>
              <span className="n">1</span>
              <h3>1. Name of the topic</h3>
            </div>
            <p className="doc-hint">(Choose from the topics of the conference)</p>
            <div className="topic-choice" role="radiogroup" aria-label="Topic">
              {meta.topics.map((t) => {
                const Icon = TOPIC_ICON[t.key]
                const on = v.topic === t.key
                const locked = !isNew && !on
                return (
                  <label key={t.key} className={`topic-opt ${on ? 'on' : ''} ${locked ? 'taken' : ''}`}>
                    <input type="radio" name="topic" checked={on} disabled={!isNew} onChange={() => set('topic', t.key)} />
                    <span className="mark"><Check /></span>
                    <span>
                      <b><Icon size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />{t.title}</b>
                      {locked && <small>A note stays on the topic it was started under. Add a new note from My notes to write on another topic.</small>}
                    </span>
                  </label>
                )
              })}
            </div>
            <div className={`topic-box ${topic ? '' : 'empty'}`} aria-live="polite">{topic ? topic.title : 'Select a topic above'}</div>
            {err('topic') && <div className="field has-error"><div className="err">{err('topic')}</div></div>}
          </section>

          {ANSWERS.map((a) => (
            <section className="doc-block" id={a.id} key={a.key}>
              <div className="doc-label">
                <span className="n">{a.no}</span>
                <h3>{a.no}. {a.title}</h3>
              </div>
              <p className="doc-hint">({a.hint})</p>
              <textarea
                className={`answer ${err(a.key) ? 'err' : ''}`} rows={a.rows} value={v[a.key]} aria-label={a.title}
                onChange={(e) => set(a.key, e.target.value)} maxLength={20000}
                placeholder="Type here. Add in-text citations and web links (https://…) where useful."
              />
              <div className="answer-meta">
                <span className={err(a.key) ? 'err' : ''} style={err(a.key) ? { color: 'var(--danger)', fontWeight: 500 } : undefined}>{err(a.key)}</span>
                <span>{words(v[a.key])} words</span>
              </div>
            </section>
          ))}

          <div className="instr">
            <b>Instructions for filing feedback note</b>
            <ul>
              <li><b>References:</b> use in-text citing and list all the references used for compiling the data and information. Hyperlinks can be added — they print as clickable links.</li>
              <li>The printed note follows the official template: A4, one-inch margins, Times New Roman.</li>
            </ul>
          </div>

          <div className="action-bar">
            <Button variant="secondary" className="preview" icon={Eye} onClick={preview} loading={busy === 'preview'} type="button" aria-label="Preview print view"><span>Preview print view</span></Button>
            <span className="spacer" />
            {submitted ? (
              <>
                <Button variant="secondary" icon={Undo2} onClick={() => act('draft')} loading={busy === 'draft'} type="button">Move back to draft</Button>
                <Button icon={Send} onClick={() => act('submit')} loading={busy === 'submit'} disabled={!dirty} type="button">Save changes</Button>
              </>
            ) : (
              <>
                <Button variant="secondary" icon={Save} onClick={() => act('draft')} loading={busy === 'draft'} type="button">Save draft</Button>
                <Button icon={Send} onClick={() => act('submit')} loading={busy === 'submit'} type="button">Submit note</Button>
              </>
            )}
          </div>
        </form>
      </div>
    </>
  )
}
