import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { KeyRound, LinkIcon } from 'lucide-react'
import { api } from '../api'
import { AuthLayout } from '../components/Layout'
import { Alert, Button, PasswordField, StrengthMeter } from '../components/ui'
import { useToast } from '../context'

export default function ResetPassword() {
  const { uid, token } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [expired, setExpired] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const local = {}
    if (pw.length < 8) local.new_password = 'Use at least 8 characters.'
    if (pw2 !== pw) local.confirm = 'Passwords do not match.'
    setErrors(local)
    if (Object.keys(local).length) return
    setBusy(true)
    setError('')
    try {
      await api.post('/auth/password-reset/confirm/', { uid, token, new_password: pw })
      toast('Password changed. Please log in.')
      nav('/login', { replace: true })
    } catch (err) {
      if (err.fields?.new_password) setErrors({ new_password: err.fields.new_password[0] })
      else if (err.status === 400) setExpired(true)
      else setError(err.detail)
      setBusy(false)
    }
  }

  if (expired) {
    return (
      <AuthLayout>
        <div className="done-icon warn"><LinkIcon /></div>
        <h2>This link has expired</h2>
        <p className="sub">Reset links work once and only for one hour. Request a new one to continue.</p>
        <Link className="btn btn-primary btn-lg btn-block" to="/forgot-password">Request a new link</Link>
        <p className="auth-switch"><Link to="/login">Back to log in</Link></p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h2>Set a new password</h2>
      <p className="sub">Choose a password you have not used elsewhere.</p>
      <form onSubmit={submit} noValidate>
        {error && <Alert type="error">{error}</Alert>}
        <div style={{ display: 'grid', gap: 8 }}>
          <PasswordField label="New password" autoComplete="new-password" autoFocus hint="At least 8 characters. Avoid common passwords."
            value={pw} onChange={(e) => setPw(e.target.value)} error={errors.new_password} />
          <StrengthMeter password={pw} />
        </div>
        <PasswordField label="Confirm new password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} error={errors.confirm} />
        <Button type="submit" size="lg" block loading={busy} icon={KeyRound}>
          Change password
        </Button>
      </form>
    </AuthLayout>
  )
}
