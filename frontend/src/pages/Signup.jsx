import { useState } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { AuthLayout } from '../components/Layout'
import OfficerFields from '../components/OfficerFields'
import { Alert, Button, PasswordField, TextField } from '../components/ui'
import { useApp } from '../context'

const EMPTY = {
  name: '', email: '', password: '', password2: '', designation: '', batch: '',
  service_status: '', training_institute: '', current_posting: '', state_ut: '',
}

export default function Signup() {
  const { signup, meta } = useApp()
  const [v, setV] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k, val) => {
    setV((s) => ({ ...s, [k]: val }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }
  const err = (k) => (Array.isArray(errors[k]) ? errors[k][0] : errors[k] || '')

  async function submit(e) {
    e.preventDefault()
    const local = {}
    for (const k of ['name', 'email', 'designation', 'batch', 'service_status', 'current_posting', 'state_ut'])
      if (!String(v[k]).trim()) local[k] = k === 'service_status' ? 'Choose Probationer or Confirmed.' : 'This field is required.'
    if (v.password.length < 8) local.password = 'Use at least 8 characters.'
    if (v.password !== v.password2) local.password2 = 'Passwords do not match.'
    if (Object.keys(local).length) {
      setErrors(local)
      setError('Please correct the highlighted fields.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const { password2, ...payload } = v
      await signup({ ...payload, email: v.email.trim() })
    } catch (e2) {
      setErrors(e2.fields || {})
      setError(e2.detail)
      setBusy(false)
    }
  }

  return (
    <AuthLayout wide>
      <h2>Create your account</h2>
      <p className="sub">
        For IAS officers, State Department officers and probationers of National and State Training Institutes and Academies. These details
        pre-fill Section 1 of every Feedback Note.
      </p>
      <form onSubmit={submit} noValidate>
        {error && <Alert type="error">{error}</Alert>}
        <div className="form-section">Account</div>
        <div className="form-grid">
          <div className="full">
            <TextField label="Full name" autoComplete="name" value={v.name} onChange={(e) => set('name', e.target.value)} error={err('name')} />
          </div>
          <div className="full">
            <TextField label="Email" type="email" autoComplete="username" placeholder="you@example.gov.in" value={v.email} onChange={(e) => set('email', e.target.value)} error={err('email')} />
          </div>
          <PasswordField label="Password" autoComplete="new-password" hint="At least 8 characters." value={v.password} onChange={(e) => set('password', e.target.value)} error={err('password')} />
          <PasswordField label="Confirm password" autoComplete="new-password" value={v.password2} onChange={(e) => set('password2', e.target.value)} error={err('password2')} />
        </div>
        <div className="form-section">Officer details</div>
        <div className="form-grid">
          <OfficerFields values={v} set={set} err={err} meta={meta} />
        </div>
        <Button type="submit" size="lg" block loading={busy} icon={UserPlus}>
          Create account
        </Button>
      </form>
      <p className="auth-switch">
        Already registered? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  )
}
