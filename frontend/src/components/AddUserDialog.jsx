import { useState } from 'react'
import { MailPlus, UserPlus } from 'lucide-react'
import { api } from '../api'
import OfficerFields from './OfficerFields'
import { Alert, Button, Choices, CloseButton, Modal, PasswordField, StrengthMeter, TextField } from './ui'
import { useApp, useToast } from '../context'

const ROLES = [
  { value: 'officer', label: 'Officer / Probationer', hint: 'Writes feedback notes' },
  { value: 'admin', label: 'Administrator', hint: 'Manages notes and users' },
]
const PASSWORD_MODES = [
  { value: 'invite', label: 'Email them a link', hint: 'They choose their own password (recommended)' },
  { value: 'password', label: 'Set a password now', hint: 'You tell them the password yourself' },
]

export default function AddUserDialog({ open, onClose, onCreated }) {
  const { meta } = useApp()
  const toast = useToast()
  const fresh = () => ({
    role: 'officer', name: '', email: '', mode: 'invite', password: '',
    designation: '', batch: '', training_institute: '', current_posting: '',
    service_status: meta.defaults.service_status, state_ut: meta.defaults.state_ut,
  })
  const [v, setV] = useState(fresh)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k, val) => {
    setV((s) => ({ ...s, [k]: val }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }
  const err = (k) => (Array.isArray(errors[k]) ? errors[k][0] : errors[k] || '')
  const close = () => {
    if (busy) return
    setV(fresh())
    setErrors({})
    setError('')
    onClose()
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setErrors({})
    const isAdmin = v.role === 'admin'
    const body = {
      email: v.email.trim(), name: v.name.trim(), is_admin: isAdmin,
      send_invite: v.mode === 'invite', password: v.mode === 'password' ? v.password : '',
    }
    if (!isAdmin) {
      Object.assign(body, {
        designation: v.designation, batch: v.batch, service_status: v.service_status,
        training_institute: v.training_institute, current_posting: v.current_posting, state_ut: v.state_ut,
      })
    }
    try {
      await api.post('/admin/users/', body)
      toast(v.mode === 'invite' ? `Account created. A set-password link was emailed to ${body.email}.` : `Account created for ${body.name}.`)
      setV(fresh())
      onCreated()
      onClose()
    } catch (e2) {
      setErrors(e2.fields || {})
      setError(e2.detail)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={close} wide>
      <form onSubmit={submit} noValidate>
        <div className="dlg-head">
          <div>
            <h3>Add a user</h3>
            <p className="muted small">Create an account for an officer or another administrator.</p>
          </div>
          <CloseButton onClick={close} />
        </div>

        <div className="dlg-body">
          {error && <Alert type="error">{error}</Alert>}
          <Choices label="Account type" name="role" value={v.role} onChange={(x) => set('role', x)} options={ROLES} />
          <div className="form-grid">
            <TextField label="Full name" autoComplete="off" value={v.name} onChange={(e) => set('name', e.target.value)} error={err('name')} />
            <TextField label="Email" type="email" inputMode="email" autoCapitalize="none" autoComplete="off" placeholder="name@example.gov.in" value={v.email} onChange={(e) => set('email', e.target.value)} error={err('email')} />
            {v.role === 'officer' && <OfficerFields values={v} set={set} err={err} meta={meta} />}
          </div>

          <Choices label="Password" name="mode" value={v.mode} onChange={(x) => set('mode', x)} options={PASSWORD_MODES} error={v.mode === 'invite' ? err('password') : ''} />
          {v.mode === 'password' && (
            <div style={{ display: 'grid', gap: 8 }}>
              <PasswordField label="Initial password" autoComplete="new-password" hint="At least 8 characters. Ask them to change it after logging in."
                value={v.password} onChange={(e) => set('password', e.target.value)} error={err('password')} />
              <StrengthMeter password={v.password} />
            </div>
          )}
        </div>

        <div className="dlg-foot">
          <Button type="button" variant="secondary" onClick={close} disabled={busy}>Cancel</Button>
          <Button type="submit" loading={busy} icon={v.mode === 'invite' ? MailPlus : UserPlus}>
            {v.mode === 'invite' ? 'Create and send link' : 'Create account'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
