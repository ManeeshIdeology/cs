import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, UserPlus } from 'lucide-react'
import { AuthLayout } from '../components/Layout'
import OfficerFields from '../components/OfficerFields'
import { Alert, Button, PasswordField, StrengthMeter, TextField } from '../components/ui'
import { useApp } from '../context'

const EMPTY = {
  name: '', email: '', password: '', password2: '', designation: '', batch: '',
  service_status: '', training_institute: '', current_posting: '', state_ut: '',
}
const STEP1 = ['name', 'email', 'password', 'password2']
const STEP2 = ['designation', 'batch', 'service_status', 'current_posting', 'state_ut']

export default function Signup() {
  const { signup, meta } = useApp()
  const [step, setStep] = useState(1)
  const [v, setV] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const top = useRef(null)

  const set = (k, val) => {
    setV((s) => ({ ...s, [k]: val }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }
  const err = (k) => (Array.isArray(errors[k]) ? errors[k][0] : errors[k] || '')
  const goto = (n) => {
    setStep(n)
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function check(fields) {
    const local = {}
    for (const k of fields) {
      if (!String(v[k]).trim()) local[k] = k === 'service_status' ? 'Choose Probationer or Confirmed.' : 'This field is required.'
    }
    if (fields.includes('email') && v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) local.email = 'Enter a valid email address.'
    if (fields.includes('password') && v.password && v.password.length < 8) local.password = 'Use at least 8 characters.'
    if (fields.includes('password2') && v.password2 !== v.password) local.password2 = 'Passwords do not match.'
    setErrors(local)
    setError(Object.keys(local).length ? 'Please correct the highlighted fields.' : '')
    return Object.keys(local).length === 0
  }

  const next = (e) => {
    e.preventDefault()
    if (check(STEP1)) goto(2)
  }

  async function submit(e) {
    e.preventDefault()
    if (!check(STEP2)) return
    setBusy(true)
    setError('')
    try {
      const { password2, ...payload } = v
      await signup({ ...payload, email: v.email.trim() })
    } catch (e2) {
      const f = e2.fields || {}
      setErrors(f)
      setError(e2.detail)
      setBusy(false)
      if (STEP1.some((k) => f[k])) goto(1) // e.g. email already registered
    }
  }

  return (
    <AuthLayout wide>
      <div ref={top} style={{ scrollMarginTop: 12 }} />
      <h2>Create your account</h2>
      <p className="sub">For IAS officers, State Department officers and probationers. Your details pre-fill Section 1 of every Feedback Note.</p>

      <ol className="stepper" aria-label="Sign-up progress">
        <li className={step === 1 ? 'on' : 'done'} aria-current={step === 1 ? 'step' : undefined}>
          <span className="n">{step > 1 ? <Check /> : 1}</span> Account
        </li>
        <li className={step === 2 ? 'on' : ''} aria-current={step === 2 ? 'step' : undefined}>
          <span className="n">2</span> Officer details
        </li>
      </ol>

      {step === 1 ? (
        <form onSubmit={next} noValidate>
          {error && <Alert type="error">{error}</Alert>}
          <TextField label="Full name" autoComplete="name" autoFocus value={v.name} onChange={(e) => set('name', e.target.value)} error={err('name')} />
          <TextField label="Email" type="email" inputMode="email" autoCapitalize="none" autoComplete="username" placeholder="name@example.gov.in" value={v.email} onChange={(e) => set('email', e.target.value)} error={err('email')} />
          <div style={{ display: 'grid', gap: 8 }}>
            <PasswordField label="Password" autoComplete="new-password" hint="At least 8 characters. Avoid common passwords." value={v.password} onChange={(e) => set('password', e.target.value)} error={err('password')} />
            <StrengthMeter password={v.password} />
          </div>
          <PasswordField label="Confirm password" autoComplete="new-password" value={v.password2} onChange={(e) => set('password2', e.target.value)} error={err('password2')} />
          <Button type="submit" size="lg" block icon={ArrowRight}>
            Continue
          </Button>
        </form>
      ) : (
        <form onSubmit={submit} noValidate>
          {error && <Alert type="error">{error}</Alert>}
          <div className="form-grid">
            <OfficerFields values={v} set={set} err={err} meta={meta} />
          </div>
          <div className="step-actions">
            <Button type="button" variant="secondary" size="lg" icon={ArrowLeft} onClick={() => goto(1)} aria-label="Back to account details" />
            <Button type="submit" size="lg" loading={busy} icon={UserPlus}>
              Create account
            </Button>
          </div>
        </form>
      )}
      <p className="auth-switch">
        Already registered? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  )
}
