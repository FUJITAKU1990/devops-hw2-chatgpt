import React, { useState } from 'react'
import axios from 'axios'
import { API_URL } from '../utils/apiBase'

interface RegistrationFormProps {
  token: string | null;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ token }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const res = await axios.post(
        `${API_URL}/api/register`,
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
        },
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      )
      setSuccess(res.data?.message || 'Account created. Check your email for the activation link.')
      setFormData({ name: '', email: '', password: '', confirmPassword: '' })
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="registration-page">
      <div className="breadcrumb">
        <a href="/">🏠 Home</a> &gt; Register
      </div>

      <h2 className="profile-heading">
        <span className="icon-user">👤</span> Create Your Account
      </h2>

      <div className="form-notice">
        All fields are required.
      </div>

      {success && <div className="alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="registration-form">
        <div className="form-section customer-info">
          <div className="form-row">
            <div className="form-group full-width">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                autoComplete="name"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full-width">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full-width">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <small className="field-hint">At least 8 characters.</small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full-width">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                autoComplete="new-password"
                required
              />
            </div>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="form-actions">
          <button type="submit" className="btn-save" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default RegistrationForm
