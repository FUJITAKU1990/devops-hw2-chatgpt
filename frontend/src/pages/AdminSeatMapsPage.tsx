import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { API_URL } from '../utils/apiBase'

interface SeatMapSummary {
  id: number
  name: string
  eventCount: number
  events: { id: number; name: string }[]
}

interface SectionConfig {
  id: string
  label: string
  rows: number
  cols: number
  aisles: number[]
  rowLabelStart: string
  colLabelStart: number
  accessibleSeats?: string[]
}

interface SeatMapDetail {
  id: number
  name: string
  config: { sections: SectionConfig[] }
  events: { id: number; name: string; date: string; location: string }[]
}

interface SectionFormState {
  id: string
  label: string
  rows: string
  cols: string
  aisles: string
  rowLabelStart: string
  colLabelStart: string
  accessibleSeats: string
}

interface BatchSeatMap {
  name: string
  config: { seatMapId?: string; sections: SectionConfig[] }
}

interface BatchUploadResult {
  success: boolean
  seatMaps: { created: number; updated: number }
  results: { index: number; id: number; name: string; status: 'created' | 'updated' }[]
  errors: { index: number; name?: string; error: string }[]
}

const EMPTY_SECTION: SectionFormState = {
  id: '',
  label: '',
  rows: '10',
  cols: '12',
  aisles: '',
  rowLabelStart: 'A',
  colLabelStart: '1',
  accessibleSeats: '',
}

function parseSectionForm(s: SectionFormState): SectionConfig {
  return {
    id: s.id,
    label: s.label || s.id,
    rows: parseInt(s.rows) || 0,
    cols: parseInt(s.cols) || 0,
    aisles: s.aisles.trim() ? s.aisles.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)) : [],
    rowLabelStart: s.rowLabelStart || 'A',
    colLabelStart: parseInt(s.colLabelStart) || 1,
    accessibleSeats: s.accessibleSeats.trim() ? s.accessibleSeats.split(',').map(s => s.trim()).filter(Boolean) : [],
  }
}

function getRowLabel(start: string, index: number): string {
  if (start.length === 1) {
    return String.fromCharCode(start.charCodeAt(0) + index)
  }
  const char = start.charAt(0)
  return String.fromCharCode(char.charCodeAt(0) + index).repeat(start.length)
}

const AdminSeatMapsPage: React.FC<{ token: string | null }> = ({ token }) => {
  const [seatMaps, setSeatMaps] = useState<SeatMapSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [detailCache, setDetailCache] = useState<Record<number, SeatMapDetail>>({})
  const [detailLoading, setDetailLoading] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [successMsg, setSuccessMsg] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formSections, setFormSections] = useState<SectionFormState[]>([{ ...EMPTY_SECTION }])
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [showUpload, setShowUpload] = useState(false)
  const [uploadParsed, setUploadParsed] = useState<BatchSeatMap[] | null>(null)
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const [uploadFileName, setUploadFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<BatchUploadResult | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } }

  const fetchSeatMaps = () => {
    if (!token) return
    setLoading(true)
    axios.get(`${API_URL}/api/admin/seat-maps`, authHeaders)
      .then(res => setSeatMaps(res.data))
      .catch(err => console.error('Failed to load seat maps', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchSeatMaps()
  }, [token])

  const handleToggle = async (id: number) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (detailCache[id]) return
    setDetailLoading(true)
    try {
      const res = await axios.get(`${API_URL}/api/admin/seat-maps/${id}`, authHeaders)
      setDetailCache(prev => ({ ...prev, [id]: res.data }))
    } catch (err) {
      console.error('Failed to load seat map detail', err)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleDelete = async (sm: SeatMapSummary) => {
    if (!window.confirm(`Delete seat map "${sm.name}"? This cannot be undone.`)) return
    setDeleting(sm.id)
    setSuccessMsg('')
    try {
      await axios.delete(`${API_URL}/api/admin/seat-maps/${sm.id}`, authHeaders)
      setSuccessMsg(`Seat map "${sm.name}" deleted.`)
      setDetailCache(prev => { const next = { ...prev }; delete next[sm.id]; return next })
      if (expandedId === sm.id) setExpandedId(null)
      fetchSeatMaps()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete seat map.')
    } finally {
      setDeleting(null)
    }
  }

  const openCreateForm = () => {
    setFormName('')
    setFormSections([{ ...EMPTY_SECTION }])
    setFormError('')
    setSuccessMsg('')
    setShowUpload(false)
    setShowForm(true)
  }

  const validateSeatMaps = (raw: any): { seatMaps: BatchSeatMap[]; errors: string[] } => {
    const errors: string[] = []
    const data = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? [raw] : null)
    if (!data) {
      return { seatMaps: [], errors: ['JSON must be a seat map object or an array of seat map objects'] }
    }
    const seenNames = new Set<string>()
    const seatMaps = data.map((item: any, i: number) => {
      if (!item.name || !item.name.trim()) errors.push(`Seat map #${i + 1}: missing name`)
      if (!item.config) errors.push(`Seat map #${i + 1}: missing config`)
      else if (!Array.isArray(item.config.sections) || item.config.sections.length === 0)
        errors.push(`Seat map #${i + 1}: config.sections must be a non-empty array`)
      else {
        item.config.sections.forEach((sec: any, j: number) => {
          if (!sec.id) errors.push(`Seat map #${i + 1}, section #${j + 1}: missing id`)
          if (!sec.rows || sec.rows < 1) errors.push(`Seat map #${i + 1}, section #${j + 1}: rows must be >= 1`)
          if (!sec.cols || sec.cols < 1) errors.push(`Seat map #${i + 1}, section #${j + 1}: cols must be >= 1`)
        })
      }
      if (item.name && seenNames.has(item.name.trim())) {
        errors.push(`Seat map #${i + 1}: duplicate name "${item.name.trim()}"`)
      }
      if (item.name) seenNames.add(item.name.trim())
      return item as BatchSeatMap
    })
    return { seatMaps, errors }
  }

  const processUploadFile = useCallback((file: File) => {
    setUploadResult(null)
    setUploadError('')
    if (!file.name.endsWith('.json')) {
      setUploadErrors(['File must be a .json file'])
      setUploadParsed(null)
      setUploadFileName('')
      return
    }
    setUploadFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        const { seatMaps, errors } = validateSeatMaps(data)
        setUploadParsed(seatMaps)
        setUploadErrors(errors)
      } catch {
        setUploadErrors(['Invalid JSON — could not parse file'])
        setUploadParsed(null)
      }
    }
    reader.readAsText(file)
  }, [])

  const handleUploadSubmit = async () => {
    if (!uploadParsed || uploadErrors.length > 0) return
    setUploading(true)
    setUploadError('')
    setUploadResult(null)
    try {
      const res = await axios.post(
        `${API_URL}/api/admin/seat-maps/batch`,
        { seatMaps: uploadParsed },
        authHeaders,
      )
      setUploadResult(res.data)
      fetchSeatMaps()
    } catch (err: any) {
      const data = err.response?.data
      if (data?.errors?.length) {
        setUploadResult(data)
      } else {
        setUploadError(data?.error || 'Upload failed')
      }
    } finally {
      setUploading(false)
    }
  }

  const handleUploadReset = () => {
    setUploadParsed(null)
    setUploadErrors([])
    setUploadFileName('')
    setUploadResult(null)
    setUploadError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const openUpload = () => {
    handleUploadReset()
    setShowForm(false)
    setShowUpload(true)
  }

  const handleSectionChange = (idx: number, field: keyof SectionFormState, value: string) => {
    setFormSections(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  const addSection = () => {
    setFormSections(prev => [...prev, { ...EMPTY_SECTION }])
  }

  const removeSection = (idx: number) => {
    setFormSections(prev => prev.filter((_, i) => i !== idx))
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formName.trim()) {
      setFormError('Seat map name is required.')
      return
    }
    if (formSections.length === 0) {
      setFormError('At least one section is required.')
      return
    }
    for (let i = 0; i < formSections.length; i++) {
      const s = formSections[i]
      if (!s.id.trim()) {
        setFormError(`Section ${i + 1}: ID is required.`)
        return
      }
      if (!parseInt(s.rows) || !parseInt(s.cols)) {
        setFormError(`Section ${i + 1}: Rows and Cols must be positive numbers.`)
        return
      }
    }

    setSubmitting(true)
    try {
      const config = { sections: formSections.map(parseSectionForm) }
      await axios.post(`${API_URL}/api/admin/seat-maps`, { name: formName.trim(), config }, authHeaders)
      setSuccessMsg(`Seat map "${formName.trim()}" created.`)
      setShowForm(false)
      fetchSeatMaps()
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to create seat map.')
    } finally {
      setSubmitting(false)
    }
  }

  const previewSections: SectionConfig[] = formSections
    .filter(s => s.id.trim() && parseInt(s.rows) > 0 && parseInt(s.cols) > 0)
    .map(parseSectionForm)

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
          <h2 className="admin-title">Seat Maps</h2>
          <p className="admin-subtitle">Browse venue seat map configurations, create new maps, or upload from JSON files.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-outline" onClick={() => { if (showUpload) { setShowUpload(false) } else { openUpload() } }}>
            {showUpload ? 'Cancel Upload' : 'Upload JSON'}
          </button>
          <button className="btn" onClick={() => { if (showForm) { setShowForm(false) } else { openCreateForm() } }}>
            {showForm ? 'Cancel' : '+ New Seat Map'}
          </button>
        </div>
      </div>

      {successMsg && <div className="admin-notice admin-notice--success" onClick={() => setSuccessMsg('')}>{successMsg}</div>}

      {showUpload && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem' }}>Upload Seat Maps from JSON</h3>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#666' }}>
            Upload a JSON file containing an array of seat map objects. Existing seat maps with the same name will be updated.
          </p>

          {!uploadResult && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) processUploadFile(file) }}
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
                onChange={(e) => { const file = e.target.files?.[0]; if (file) processUploadFile(file) }}
                style={{ display: 'none' }}
              />
              <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>
                {uploadFileName || 'Drop a JSON file here, or click to browse'}
              </p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#888' }}>
                Accepts .json files with an array of seat map objects (each with name and config)
              </p>
            </div>
          )}

          {uploadErrors.length > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
              <strong style={{ color: '#b91c1c' }}>Validation errors ({uploadErrors.length}):</strong>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                {uploadErrors.map((err, i) => (
                  <li key={i} style={{ color: '#b91c1c', fontSize: '0.85rem' }}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {uploadParsed && uploadParsed.length > 0 && !uploadResult && (
            <div className="admin-events-table-wrap">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
                <strong>{uploadParsed.length} seat map{uploadParsed.length !== 1 ? 's' : ''} in file</strong>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-outline" onClick={handleUploadReset}>Clear</button>
                  <button
                    className="btn"
                    onClick={handleUploadSubmit}
                    disabled={uploading || uploadErrors.length > 0}
                  >
                    {uploading ? 'Uploading...' : 'Upload & Upsert'}
                  </button>
                </div>
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Sections</th>
                    <th>Total Seats (approx.)</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadParsed.map((sm, i) => {
                    const sections = sm.config?.sections || []
                    let totalSeats = 0
                    for (const s of sections) {
                      const aisleCount = s.aisles?.length || 0
                      totalSeats += s.rows * (s.cols - aisleCount)
                    }
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td><div className="admin-event-name">{sm.name || '—'}</div></td>
                        <td>{sections.length}</td>
                        <td>{totalSeats}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {uploadError && (
            <div className="admin-notice" style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#b91c1c' }}>
              {uploadError}
            </div>
          )}

          {uploadResult && (
            <div style={{ marginTop: '1rem' }}>
              {uploadResult.success ? (
                <div className="admin-notice admin-notice--success">
                  Seat map upload complete!
                </div>
              ) : (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '0.75rem 1rem', color: '#b91c1c', fontWeight: 600 }}>
                  Upload failed — see errors below.
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
                      <td><strong>Seat Maps</strong></td>
                      <td>{uploadResult.seatMaps.created}</td>
                      <td>{uploadResult.seatMaps.updated}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {uploadResult.results && uploadResult.results.length > 0 && (
                <div className="admin-events-table-wrap" style={{ marginTop: '0.75rem' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>ID</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResult.results.map((r) => (
                        <tr key={r.index}>
                          <td>{r.index + 1}</td>
                          <td>{r.name}</td>
                          <td>{r.id}</td>
                          <td>
                            <span className={`status-badge status-badge--${r.status === 'created' ? 'published' : 'draft'}`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {uploadResult.errors.length > 0 && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '0.75rem 1rem', marginTop: '0.75rem' }}>
                  <strong style={{ color: '#b91c1c' }}>{uploadResult.errors.length} error{uploadResult.errors.length !== 1 ? 's' : ''}:</strong>
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                    {uploadResult.errors.map((err, i) => (
                      <li key={i} style={{ color: '#b91c1c', fontSize: '0.85rem' }}>
                        Seat map #{err.index + 1}{err.name ? ` (${err.name})` : ''}: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ marginTop: '1rem' }}>
                <button className="btn" onClick={handleUploadReset}>Upload Another File</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <form className="admin-form" onSubmit={handleCreateSubmit}>
          <h3 className="admin-form-title">Create New Seat Map</h3>

          <div className="admin-form-grid">
            <div className="form-group form-group--full">
              <label className="form-label" htmlFor="sm-name">Seat Map Name <span className="required">*</span></label>
              <input
                id="sm-name"
                className="form-input"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g. Rangos Ballroom"
                required
              />
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <strong>Sections</strong>
              <button type="button" className="btn" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }} onClick={addSection}>
                + Add Section
              </button>
            </div>

            {formSections.map((sec, idx) => (
              <div key={idx} style={{ border: '1px solid var(--color-border, #ddd)', borderRadius: '6px', padding: '0.75rem', marginBottom: '0.75rem', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '0.85rem' }}>Section {idx + 1}</strong>
                  {formSections.length > 1 && (
                    <button type="button" className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: 'var(--color-danger, #c0392b)' }} onClick={() => removeSection(idx)}>
                      Remove
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>ID *</label>
                    <input className="form-input" value={sec.id} onChange={e => handleSectionChange(idx, 'id', e.target.value)} placeholder="e.g. A" style={{ fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Label</label>
                    <input className="form-input" value={sec.label} onChange={e => handleSectionChange(idx, 'label', e.target.value)} placeholder="e.g. Orchestra Center" style={{ fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Rows *</label>
                    <input type="number" className="form-input" value={sec.rows} onChange={e => handleSectionChange(idx, 'rows', e.target.value)} min="1" style={{ fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Columns *</label>
                    <input type="number" className="form-input" value={sec.cols} onChange={e => handleSectionChange(idx, 'cols', e.target.value)} min="1" style={{ fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Aisles (col indices)</label>
                    <input className="form-input" value={sec.aisles} onChange={e => handleSectionChange(idx, 'aisles', e.target.value)} placeholder="e.g. 5, 11" style={{ fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Row Label Start</label>
                    <input className="form-input" value={sec.rowLabelStart} onChange={e => handleSectionChange(idx, 'rowLabelStart', e.target.value)} placeholder="A" style={{ fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Col Label Start</label>
                    <input type="number" className="form-input" value={sec.colLabelStart} onChange={e => handleSectionChange(idx, 'colLabelStart', e.target.value)} min="1" style={{ fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Accessible Seats</label>
                    <input className="form-input" value={sec.accessibleSeats} onChange={e => handleSectionChange(idx, 'accessibleSeats', e.target.value)} placeholder="e.g. J1, J2" style={{ fontSize: '0.85rem' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {previewSections.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Preview</strong>
              <SeatMapPreview detail={{ id: 0, name: formName || 'New Seat Map', config: { sections: previewSections }, events: [] }} />
            </div>
          )}

          {formError && <p className="error">{formError}</p>}

          <div className="admin-form-actions">
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Seat Map'}
            </button>
            <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="admin-events-table-wrap">
        {loading ? (
          <p style={{ padding: '1rem' }}>Loading seat maps...</p>
        ) : seatMaps.length === 0 ? (
          <p className="muted" style={{ padding: '1rem' }}>No seat maps found.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Linked Events</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {seatMaps.map(sm => (
                <React.Fragment key={sm.id}>
                  <tr>
                    <td><div className="admin-event-name">{sm.name}</div></td>
                    <td>
                      {sm.eventCount === 0 ? (
                        <span className="muted">None</span>
                      ) : (
                        <button
                          onClick={() => handleToggle(sm.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            color: 'var(--color-primary, #6a4c9c)',
                            textDecoration: 'underline',
                            fontSize: 'inherit',
                          }}
                          title="Click to expand and see event details"
                        >
                          {sm.eventCount} {sm.eventCount === 1 ? 'event' : 'events'}
                        </button>
                      )}
                    </td>
                    <td style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        className="btn-outline"
                        style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}
                        onClick={() => handleToggle(sm.id)}
                      >
                        {expandedId === sm.id ? 'Hide' : 'View Map'}
                      </button>
                      <button
                        className="btn-outline"
                        style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', color: 'var(--color-danger, #c0392b)' }}
                        onClick={() => handleDelete(sm)}
                        disabled={sm.eventCount > 0 || deleting === sm.id}
                        title={sm.eventCount > 0 ? 'Cannot delete — seat map is used by events' : 'Delete this seat map'}
                      >
                        {deleting === sm.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === sm.id && (
                    <tr>
                      <td colSpan={3} style={{ background: 'var(--color-surface, #f9f9f9)', padding: '1rem' }}>
                        {detailLoading && !detailCache[sm.id] ? (
                          <p className="muted">Loading seat map...</p>
                        ) : !detailCache[sm.id] ? (
                          <p className="muted">Could not load seat map.</p>
                        ) : (
                          <SeatMapPreview detail={detailCache[sm.id]} />
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const SeatMapPreview: React.FC<{ detail: SeatMapDetail }> = ({ detail }) => {
  const sections = detail.config?.sections || []
  let totalSeats = 0
  let accessibleSeats = 0
  for (const s of sections) {
    const aisleCount = s.aisles?.length || 0
    const seatsPerRow = s.cols - aisleCount
    totalSeats += s.rows * seatsPerRow
    accessibleSeats += s.accessibleSeats?.length || 0
  }

  const [viewSection, setViewSection] = useState(sections[0]?.id || '')

  const currentSection = sections.find(s => s.id === viewSection) || sections[0]

  return (
    <div>
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div><strong>Sections:</strong> {sections.length}</div>
        <div><strong>Total Seats:</strong> {totalSeats}</div>
        <div><strong>Accessible Seats:</strong> {accessibleSeats}</div>
      </div>

      {detail.events.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <strong>Used by:</strong>
          <ul style={{ margin: '0.35rem 0 0 0', paddingLeft: '1.1rem', listStyle: 'none' }}>
            {detail.events.map(e => (
              <li key={e.id} style={{ marginBottom: '0.3rem' }}>
                <Link
                  to={`/event/${e.id}`}
                  style={{ color: 'var(--color-primary, #6a4c9c)', textDecoration: 'underline' }}
                >
                  {e.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sections.length > 1 && (
        <div style={{ marginBottom: '0.75rem' }}>
          {sections.map(s => (
            <button
              key={s.id}
              className={viewSection === s.id ? 'btn' : 'btn-outline'}
              style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', marginRight: '0.4rem' }}
              onClick={() => setViewSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {currentSection && (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
            {currentSection.label}
          </div>
          <div style={{ display: 'inline-block', border: '1px solid var(--color-border, #ddd)', borderRadius: '6px', padding: '0.75rem' }}>
            {Array.from({ length: currentSection.rows }, (_, rowIdx) => {
              const rowLabel = getRowLabel(currentSection.rowLabelStart, rowIdx)
              return (
                <div key={rowLabel} style={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '2px' }}>
                  <span style={{ width: '24px', fontSize: '0.7rem', textAlign: 'right', marginRight: '4px', color: '#888' }}>
                    {rowLabel}
                  </span>
                  {Array.from({ length: currentSection.cols }, (_, colIdx) => {
                    const isAisle = currentSection.aisles?.includes(colIdx)
                    if (isAisle) {
                      return <span key={colIdx} style={{ width: '12px' }} />
                    }
                    const seatNum = currentSection.colLabelStart + colIdx
                    const seatConfig = `${rowLabel}${seatNum}`
                    const isAccessible = currentSection.accessibleSeats?.includes(seatConfig)
                    return (
                      <span
                        key={colIdx}
                        title={`${currentSection.id}-${rowLabel}-${seatNum}${isAccessible ? ' (accessible)' : ''}`}
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '2px',
                          background: isAccessible ? '#3498db' : '#a0d468',
                          display: 'inline-block',
                        }}
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem' }}>
            <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#a0d468', borderRadius: '2px', marginRight: '4px' }} />Seat</span>
            <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#3498db', borderRadius: '2px', marginRight: '4px' }} />Accessible</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminSeatMapsPage
