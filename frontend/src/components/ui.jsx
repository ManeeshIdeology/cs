import { useEffect, useId, useRef, useState } from 'react'
import { AlertCircle, Check, CheckCircle2, ChevronLeft, ChevronRight, Eye, EyeOff, Info, Loader2, PencilLine, X } from 'lucide-react'

export const cx = (...a) => a.filter(Boolean).join(' ')

export function Button({ variant = 'primary', size, block, loading, icon: Icon, children, className, ...rest }) {
  return (
    <button
      className={cx('btn', `btn-${variant}`, size && `btn-${size}`, block && 'btn-block', className)}
      disabled={rest.disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="spin" /> : Icon ? <Icon /> : null}
      {children}
    </button>
  )
}

/** Label + control + hint + error. `error` is a string. */
export function Field({ label, optional, hint, error, children, className, htmlFor }) {
  return (
    <div className={cx('field', error && 'has-error', className)}>
      {label && (
        <label htmlFor={htmlFor}>
          {label} {optional && <span className="opt">(optional)</span>}
        </label>
      )}
      {children}
      {hint && !error && <div className="hint">{hint}</div>}
      {error && (
        <div className="err" role="alert">
          <AlertCircle size={15} style={{ flex: 'none', marginTop: 2 }} /> {error}
        </div>
      )}
    </div>
  )
}

export function TextField({ label, optional, hint, error, className, ...input }) {
  const id = useId()
  return (
    <Field label={label} optional={optional} hint={hint} error={error} className={className} htmlFor={id}>
      <input id={id} className="input" aria-invalid={!!error} {...input} />
    </Field>
  )
}

export function PasswordField({ label, hint, error, className, ...input }) {
  const id = useId()
  const [show, setShow] = useState(false)
  return (
    <Field label={label} hint={hint} error={error} className={className} htmlFor={id}>
      <div className="input-wrap">
        <input id={id} className="input" type={show ? 'text' : 'password'} aria-invalid={!!error} {...input} />
        <button type="button" className="btn btn-ghost btn-icon btn-sm toggle" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff /> : <Eye />}
        </button>
      </div>
    </Field>
  )
}

export function SelectField({ label, optional, hint, error, options, placeholder = 'Select…', className, ...select }) {
  const id = useId()
  return (
    <Field label={label} optional={optional} hint={hint} error={error} className={className} htmlFor={id}>
      <select id={id} className="select" aria-invalid={!!error} {...select}>
        <option value="">{placeholder}</option>
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value
          const l = typeof o === 'string' ? o : o.label
          return (
            <option key={v} value={v}>
              {l}
            </option>
          )
        })}
      </select>
    </Field>
  )
}

/** Radio option cards. options: [{ value, label, hint }] (or plain strings). */
export function Choices({ label, name, value, onChange, options, error, disabledValues = [] }) {
  return (
    <Field label={label} error={error}>
      <div className="choices" role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value
          const disabled = disabledValues.includes(v)
          return (
            <label key={v} className={cx('choice', disabled && 'is-disabled')}>
              <input type="radio" name={name} value={v} checked={value === v} disabled={disabled} onChange={() => onChange(v)} />
              <span className="mark"><Check /></span>
              <span>
                <b>{typeof o === 'string' ? o : o.label}</b>
                {o.hint && <small>{o.hint}</small>}
              </span>
            </label>
          )
        })}
      </div>
    </Field>
  )
}

export function Alert({ type = 'info', children, className }) {
  const Icon = type === 'ok' ? CheckCircle2 : type === 'info' ? Info : AlertCircle
  return (
    <div className={cx('alert', `alert-${type}`, className)} role={type === 'error' ? 'alert' : 'status'}>
      <Icon />
      <div>{children}</div>
    </div>
  )
}

export function StatusPill({ status }) {
  if (status === 'submitted') return <span className="pill pill-ok"><Check /> Submitted</span>
  if (status === 'draft') return <span className="pill pill-draft"><PencilLine /> Draft</span>
  return <span className="pill pill-none">Not started</span>
}

export const PageLoader = () => (
  <div className="page-loader">
    <Loader2 className="spin" aria-label="Loading" />
  </div>
)

export function Empty({ icon: Icon, title, children, action }) {
  return (
    <div className="empty">
      {Icon && <Icon />}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}

/* Focus-trapped modal that closes on Escape / backdrop click. */
export function Modal({ open, onClose, children, side, wide }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus?.()
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className={cx('overlay', side && 'right')} onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" className={side ? 'drawer' : cx('modal', wide && 'wide')} style={{ outline: 'none' }}>
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', danger, onConfirm, onClose, busy }) {
  return (
    <Modal open={open} onClose={busy ? undefined : onClose}>
      <h3>{title}</h3>
      <div className="muted">{children}</div>
      <div className="actions">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant={danger ? 'danger-solid' : 'primary'} onClick={onConfirm} loading={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

export function Pagination({ page, pageSize, count, onPage }) {
  const pages = Math.max(1, Math.ceil(count / pageSize))
  const from = count === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(count, page * pageSize)
  return (
    <div className="pagination">
      <span className="muted small">
        {from}–{to} of {count}
      </span>
      <div className="pages">
        <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page" />
        <span className="small muted">
          Page {page} of {pages}
        </span>
        <Button variant="secondary" size="sm" icon={ChevronRight} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page" />
      </div>
    </div>
  )
}

export function ProgressRing({ value, max, size = 96, stroke = 9 }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const frac = max ? Math.min(1, value / max) : 0
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8e3d6" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--green-600)" strokeWidth={stroke} strokeLinecap="butt"
          strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={{ transition: 'stroke-dashoffset .5s ease' }}
        />
      </svg>
      <div className="num">
        <div>
          {value}/{max}
          <small>submitted</small>
        </div>
      </div>
    </div>
  )
}

export const CloseButton = (props) => (
  <Button variant="ghost" size="sm" className="btn-icon" icon={X} aria-label="Close" {...props} />
)

/** 0-4 score from length and character variety (guidance only; the server enforces the real rules). */
export function passwordScore(pw = '') {
  if (!pw) return 0
  let n = 0
  if (pw.length >= 8) n++
  if (pw.length >= 12) n++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) n++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) n++
  return Math.min(4, Math.max(pw.length >= 1 ? 1 : 0, n))
}

export function StrengthMeter({ password }) {
  const score = passwordScore(password)
  const labels = ['', 'Too weak', 'Fair', 'Good', 'Strong']
  const colors = ['', 'var(--red-700)', 'var(--saffron-600)', 'var(--green-600)', 'var(--green-700)']
  if (!password) return null
  return (
    <div className="strength" aria-live="polite">
      <div className="strength-bars">
        {[1, 2, 3, 4].map((i) => (
          <i key={i} style={{ background: i <= score ? colors[score] : undefined }} />
        ))}
      </div>
      <span style={{ color: colors[score] }}>{labels[score]}</span>
    </div>
  )
}
