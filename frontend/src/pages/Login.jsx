import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { AuthLayout } from '../components/Layout'
import { Alert, Button, PasswordField, TextField } from '../components/ui'
import { useApp } from '../context'

export default function Login() {
  const { login } = useApp()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(form.email.trim(), form.password)
    } catch (err) {
      setError(err.detail)
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <h2>Log in</h2>
      <p className="sub">Use the email and password you registered with.</p>
      <form onSubmit={submit} noValidate>
        {error && <Alert type="error">{error}</Alert>}
        <TextField
          label="Email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" autoFocus required
          placeholder="name@example.gov.in" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <PasswordField
          label="Password" autoComplete="current-password" required
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Button type="submit" size="lg" block loading={busy} icon={LogIn} disabled={!form.email || !form.password}>
          Log in
        </Button>
        <p className="auth-help"><Link to="/forgot-password">Forgot your password?</Link></p>
      </form>
      <p className="auth-switch">
        New here? <Link to="/signup">Create an account</Link>
      </p>
    </AuthLayout>
  )
}
