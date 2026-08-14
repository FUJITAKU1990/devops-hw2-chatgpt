import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link, useSearchParams } from 'react-router-dom'
import { API_URL } from '../utils/apiBase'

const ActivationPage = () => {
  const [searchParams] = useSearchParams()
  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams])
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error')
  const [message, setMessage] = useState(
    token ? 'Activating your account...' : 'This activation link is missing its token.'
  )

  useEffect(() => {
    if (!token) return

    let cancelled = false

    const activate = async () => {
      try {
        const res = await axios.post(`${API_URL}/api/activate`, { token })
        if (cancelled) return
        setStatus('success')
        setMessage(res.data?.message || 'Your account has been activated. You can sign in now.')
      } catch (err: any) {
        if (cancelled) return
        setStatus('error')
        setMessage(err?.response?.data?.message || 'We could not activate your account. Please try again.')
      }
    }

    activate()

    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <main className="main-content">
      <div className="page-header">
        <h3 className="page-title">Account Activation</h3>
      </div>

      <div className="registration-page">
        {status === 'loading' && <p>{message}</p>}
        {status === 'success' && (
          <>
            <div className="alert-success">{message}</div>
            <p>You can close this page or return to the homepage and sign in.</p>
          </>
        )}
        {status === 'error' && <div className="error">{message}</div>}

        <div className="form-actions">
          <Link className="btn" to="/">Back to events</Link>
        </div>
      </div>
    </main>
  )
}

export default ActivationPage
