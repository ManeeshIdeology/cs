import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, MailCheck, Send } from 'lucide-react'
import { api } from '../api'
import { AuthLayout } from '../components/Layout'
import { Alert, Button, TextField } from '../components/ui'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter a valid email address.')
    setBusy(true)
    setError('')
    try {
      await api.post('/auth/password-reset/', { email: email.trim() })
      setSent(true)
    } catch (err) {
      setError(err.detail)
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout>
        <div className="done-icon"><MailCheck /></div>
        <h2>Check your email</h2>
        <p className="sub">
          If an account exists for <b>{email.trim()}</b>, we have sent a link to set a new password. It works for one hour.
        </p>
        <Alert type="info">Can’t see it? Check your spam or junk folder, and make sure you used the email you registered with.</Alert>
        <p className="auth-switch">
          <Link to="/login">Back to log in</Link>
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h2>Forgot your password?</h2>
      <p className="sub">Enter your registered email and we will send you a link to set a new password.</p>
      <form onSubmit={submit} noValidate>
        {error && <Alert type="error">{error}</Alert>}
        <TextField
          label="Email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" autoFocus
          placeholder="name@example.gov.in" value={email} onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" size="lg" block loading={busy} icon={Send}>
          Send reset link
        </Button>
      </form>
      <p className="auth-switch">
        <Link to="/login" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <ArrowLeft size={16} /> Back to log in
        </Link>
      </p>
    </AuthLayout>
  )
}
