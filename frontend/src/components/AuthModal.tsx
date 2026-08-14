import React, { useState } from 'react'

type Props = {
  open: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<string>;
}

const AuthModal: React.FC<Props> = ({ open, onClose, onLogin, onRegister }) => {
  const [mode, setMode] = useState<'login'|'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!open) return null

  const switchMode = (next: 'login' | 'register') => {
    setMode(next)
    setError('')
    setSuccess('')
    setName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters')
        return
      }
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        await onLogin(email, password)
        onClose()
      } else {
        const message = await onRegister(name, email, password)
        setMode('login')
        setName('')
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        setSuccess(message)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || (mode === 'login' ? 'Invalid email or password' : 'Registration failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-modal-backdrop" role="dialog" aria-modal="true">
      <div className="auth-modal">
        <button className="auth-close" onClick={onClose} aria-label="Close">×</button>
        <h3>{mode === 'login' ? 'Sign in' : 'Create an account'}</h3>
        <form onSubmit={submit}>
          {mode === 'register' && (
            <div className="form-row">
              <label htmlFor="auth-name">Name</label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
          )}
          <div className="form-row">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>
          {mode === 'register' && (
            <div className="form-row">
              <label htmlFor="auth-confirm-password">Confirm Password</label>
              <input
                id="auth-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
          )}
          {success && <div className="alert-success">{success}</div>}
          {error && <div className="error">{error}</div>}
          <div className="form-actions">
            <button className="btn" type="submit" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </div>
        </form>
        <div className="auth-toggle">
          {mode === 'login' ? (
            <span>Don't have an account? <button className="link-btn" onClick={() => switchMode('register')}>Register</button></span>
          ) : (
            <span>Already have an account? <button className="link-btn" onClick={() => switchMode('login')}>Sign in</button></span>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthModal
