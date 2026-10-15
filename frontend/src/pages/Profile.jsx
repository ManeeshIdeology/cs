import { useState } from 'react'
import { KeyRound, Save } from 'lucide-react'
import { api } from '../api'
import OfficerFields from '../components/OfficerFields'
import { Alert, Button, PasswordField, TextField } from '../components/ui'
import { useApp, useToast } from '../context'

const errOf = (errors) => (k) => (Array.isArray(errors[k]) ? errors[k][0] : errors[k] || '')

function ProfileForm() {
  const { user, setUser, meta } = useApp()
  const toast = useToast()
  const [v, setV] = useState({ ...user })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k, val) => setV((s) => ({ ...s, [k]: val }))

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setErrors({})
    try {
      const { name, designation, batch, service_status, training_institute, current_posting, state_ut } = v
      setUser(await api.patch('/auth/me/', { name, designation, batch, service_status, training_institute, current_posting, state_ut }))
      toast('Profile saved.')
    } catch (e2) {
      setErrors(e2.fields || {})
      setError(e2.detail)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card card-pad" onSubmit={submit} noValidate style={{ display: 'grid', gap: 16 }}>
      <h2>Officer details</h2>
      <p className="muted small" style={{ marginTop: -8 }}>
        Changes apply to new notes. Notes you have already started keep the details typed in their Section 1.
      </p>
      {error && <Alert type="error">{error}</Alert>}
      <div className="form-grid">
        <div className="full">
          <TextField label="Full name" value={v.name} onChange={(e) => set('name', e.target.value)} error={errOf(errors)('name')} />
        </div>
        <div className="full">
          <TextField label="Email" value={user.email} disabled hint="Your email is your login and cannot be changed here." />
        </div>
        {!user.is_admin && <OfficerFields values={v} set={set} err={errOf(errors)} meta={meta} />}
      </div>
      <div>
        <Button type="submit" icon={Save} loading={busy}>
          Save profile
        </Button>
      </div>
    </form>
  )
}

function PasswordForm() {
  const toast = useToast()
  const empty = { current_password: '', new_password: '', confirm: '' }
  const [v, setV] = useState(empty)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (v.new_password !== v.confirm) return setErrors({ confirm: 'Passwords do not match.' })
    setBusy(true)
    setErrors({})
    try {
      await api.post('/auth/password/', { current_password: v.current_password, new_password: v.new_password })
      toast('Password updated.')
      setV(empty)
    } catch (e2) {
      setErrors(e2.fields || {})
      setError(e2.detail)
    } finally {
      setBusy(false)
    }
  }
  const err = errOf(errors)
  return (
    <form className="card card-pad" onSubmit={submit} noValidate style={{ display: 'grid', gap: 16 }}>
      <h2>Change password</h2>
      {error && <Alert type="error">{error}</Alert>}
      <PasswordField label="Current password" autoComplete="current-password" value={v.current_password} onChange={(e) => setV({ ...v, current_password: e.target.value })} error={err('current_password')} />
      <PasswordField label="New password" autoComplete="new-password" hint="At least 8 characters; avoid common passwords." value={v.new_password} onChange={(e) => setV({ ...v, new_password: e.target.value })} error={err('new_password')} />
      <PasswordField label="Confirm new password" autoComplete="new-password" value={v.confirm} onChange={(e) => setV({ ...v, confirm: e.target.value })} error={err('confirm')} />
      <div>
        <Button type="submit" variant="secondary" icon={KeyRound} loading={busy} disabled={!v.current_password || !v.new_password}>
          Update password
        </Button>
      </div>
    </form>
  )
}

export default function Profile() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>My profile</h1>
          <p>Keep your details up to date — they pre-fill Section 1 of your notes.</p>
        </div>
      </div>
      <div className="settings-grid">
        <ProfileForm />
        <PasswordForm />
      </div>
    </>
  )
}
