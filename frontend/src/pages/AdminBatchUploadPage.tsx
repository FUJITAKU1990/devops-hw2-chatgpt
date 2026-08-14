import React, { useState, useRef, useCallback } from 'react'
import axios from 'axios'
import { API_URL } from '../utils/apiBase'

interface BatchTicketType {
  external_id: string
  name: string
  availabilityModel?: string
  pricingModel?: string
  priceCents?: number
  maxPerOrder?: number
  maxPerUser?: number
  available?: number
}

interface BatchEvent {
  external_id: string
  name: string
  date: string
  description?: string
  location?: string
  image?: string
  status?: string
  publishAt?: string
  seatMapId?: number | null
  ticketTypes?: BatchTicketType[]
}

interface UploadResult {
  success: boolean
  events: { created: number; updated: number }
  ticketTypes: { created: number; updated: number }
  errors: { index: number; external_id?: string; error: string }[]
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function validateEvents(data: any): { events: BatchEvent[]; errors: string[] } {
  const errors: string[] = []

  if (!Array.isArray(data)) {
    return { events: [], errors: ['JSON must be an array of event objects'] }
  }

  const seenIds = new Set<string>()

  const events = data.map((item: any, i: number) => {
    if (!item.external_id) errors.push(`Event #${i + 1}: missing external_id`)
    if (!item.name) errors.push(`Event #${i + 1}: missing name`)
    if (!item.date) errors.push(`Event #${i + 1}: missing date`)

    if (item.external_id && seenIds.has(item.external_id)) {
      errors.push(`Event #${i + 1}: duplicate external_id "${item.external_id}"`)
    }
    if (item.external_id) seenIds.add(item.external_id)

    if (Array.isArray(item.ticketTypes)) {
      item.ticketTypes.forEach((tt: any, j: number) => {
        if (!tt.external_id) errors.push(`Event #${i + 1}, ticket type #${j + 1}: missing external_id`)
        if (!tt.name) errors.push(`Event #${i + 1}, ticket type #${j + 1}: missing name`)
      })
    }

    return item as BatchEvent
  })

  return { events, errors }
}

const AdminBatchUploadPage: React.FC<{ token: string | null }> = ({ token }) => {
  const [parsed, setParsed] = useState<BatchEvent[] | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [fileName, setFileName] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } }

  const processFile = useCallback((file: File) => {
    setResult(null)
    setUploadError('')

    if (!file.name.endsWith('.json')) {
      setValidationErrors(['File must be a .json file'])
      setParsed(null)
      setFileName('')
      return
    }

    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        const { events, errors } = validateEvents(data)
        setParsed(events)
        setValidationErrors(errors)
      } catch {
        setValidationErrors(['Invalid JSON — could not parse file'])
        setParsed(null)
      }
    }
    reader.readAsText(file)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleUpload = async () => {
    if (!parsed || validationErrors.length > 0) return
    setUploading(true)
    setUploadError('')
    setResult(null)

    try {
      const res = await axios.post(
        `${API_URL}/api/admin/events/batch`,
        { events: parsed },
        authHeaders,
      )
      setResult(res.data)
    } catch (err: any) {
      const data = err.response?.data
      if (data?.errors?.length) {
        setResult(data)
      } else {
        setUploadError(data?.error || 'Upload failed')
      }
    } finally {
      setUploading(false)
    }
  }

  const handleReset = () => {
    setParsed(null)
    setValidationErrors([])
    setFileName('')
    setResult(null)
    setUploadError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (!token) {
    return (
      <div className="admin-page">
        <p className="error">You must be logged in as an admin to view this page.</p>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h2 className="admin-title">Batch Event Upload</h2>
          <p className="admin-subtitle">Upload a JSON file to create or update events in bulk using external IDs.</p>
        </div>
      </div>

      {/* Drop zone */}
      {!result && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--cmu-red, #c41230)' : '#ccc'}`,
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? '#fef2f2' : '#fafafa',
            marginBottom: '1rem',
            transition: 'all 0.15s ease',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>
            {fileName || 'Drop a JSON file here, or click to browse'}
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#888' }}>
            Accepts .json files with an array of event objects
          </p>
        </div>
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
          <strong style={{ color: '#b91c1c' }}>Validation errors ({validationErrors.length}):</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
            {validationErrors.map((err, i) => (
              <li key={i} style={{ color: '#b91c1c', fontSize: '0.85rem' }}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview table */}
      {parsed && parsed.length > 0 && !result && (
        <>
          <div className="admin-events-table-wrap">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
              <strong>{parsed.length} event{parsed.length !== 1 ? 's' : ''} in file</strong>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-outline" onClick={handleReset}>Clear</button>
                <button
                  className="btn"
                  onClick={handleUpload}
                  disabled={uploading || validationErrors.length > 0}
                >
                  {uploading ? 'Uploading...' : 'Upload Batch'}
                </button>
              </div>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>External ID</th>
                  <th>Event Name</th>
                  <th>Date</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Ticket Types</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((evt, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td><code style={{ fontSize: '0.8rem' }}>{evt.external_id || '—'}</code></td>
                    <td>
                      <div className="admin-event-name">{evt.name || '—'}</div>
                    </td>
                    <td>{evt.date ? formatDate(evt.date) : '—'}</td>
                    <td>{evt.location || '—'}</td>
                    <td>
                      {evt.status && (
                        <span className={`status-badge status-badge--${(evt.status || '').toLowerCase()}`}>
                          {evt.status}
                        </span>
                      )}
                    </td>
                    <td>{evt.ticketTypes?.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="admin-notice" style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#b91c1c' }}>
          {uploadError}
        </div>
      )}

      {/* Result summary */}
      {result && (
        <div style={{ marginTop: '1rem' }}>
          {result.success ? (
            <div className="admin-notice admin-notice--success">
              Batch upload complete!
            </div>
          ) : (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '0.75rem 1rem', color: '#b91c1c', fontWeight: 600 }}>
              Batch upload failed — no events were created or updated. See errors below.
            </div>
          )}
          <div className="admin-events-table-wrap" style={{ marginTop: '0.75rem' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Created</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Events</strong></td>
                  <td>{result.events.created}</td>
                  <td>{result.events.updated}</td>
                </tr>
                <tr>
                  <td><strong>Ticket Types</strong></td>
                  <td>{result.ticketTypes.created}</td>
                  <td>{result.ticketTypes.updated}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {result.errors.length > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '0.75rem 1rem', marginTop: '0.75rem' }}>
              <strong style={{ color: '#b91c1c' }}>{result.errors.length} error{result.errors.length !== 1 ? 's' : ''}:</strong>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                {result.errors.map((err, i) => (
                  <li key={i} style={{ color: '#b91c1c', fontSize: '0.85rem' }}>
                    Event #{err.index + 1}{err.external_id ? ` (${err.external_id})` : ''}: {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ marginTop: '1rem' }}>
            <button className="btn" onClick={handleReset}>Upload Another File</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminBatchUploadPage
