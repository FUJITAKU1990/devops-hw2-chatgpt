import React, { useState, useEffect } from 'react'
import axios from 'axios'
import AdminPagination from '../components/AdminPagination'
import { API_URL } from '../utils/apiBase'

interface TicketTypeData {
  id: number
  name: string
  availabilityModel: string
  pricingModel: string
  priceCents: number
  maxPerOrder: number
  maxPerUser: number
  available: number
}

interface AdminEvent {
  id: number
  name: string
  description: string | null
  date: string
  location: string | null
  image: string | null
  status: string
  publishAt: string | null
  createdAt: string
  ticketTypes?: TicketTypeData[]
  seatMap?: { id: number; name: string } | null
}

interface FormState {
  name: string
  description: string
  date: string
  location: string
  image: string
  publishAt: string
  publishNow: boolean
  seatMapId: string
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  date: '',
  location: '',
  image: '',
  publishAt: '',
  publishNow: false,
  seatMapId: '',
}

interface TTFormState {
  name: string
  availabilityModel: string
  pricingModel: string
  priceCents: string
  maxPerOrder: string
  maxPerUser: string
  available: string
}

const EMPTY_TT_FORM: TTFormState = {
  name: '',
  availabilityModel: 'GA_POOL',
  pricingModel: 'FREE',
  priceCents: '0',
  maxPerOrder: '0',
  maxPerUser: '0',
  available: '0',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function toLocalDatetime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatAmount(cents: number): string {
  if (cents === 0) return 'Free'
  return `$${(cents / 100).toFixed(2)}`
}

const AdminEventsPage: React.FC<{ token: string | null }> = ({ token }) => {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [publishing, setPublishing] = useState<number | null>(null)
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [showForm, setShowForm] = useState(false)

  const [seatMaps, setSeatMaps] = useState<{ id: number; name: string }[]>([])

  const [expandedTicketTypes, setExpandedTicketTypes] = useState<number | null>(null)
  const [ttForm, setTtForm] = useState<TTFormState>(EMPTY_TT_FORM)
  const [editingTTId, setEditingTTId] = useState<number | null>(null)
  const [showTTForm, setShowTTForm] = useState(false)
  const [ttSubmitting, setTtSubmitting] = useState(false)
  const [ttDeleting, setTtDeleting] = useState<number | null>(null)

  // Search
  const [search, setSearch] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Sorting
  const [sortBy, setSortBy] = useState('date')
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('ASC')

  // Counter to force re-fetch when search is submitted
  const [fetchTick, setFetchTick] = useState(0)

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } }

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      params.set('page', String(page))
      params.set('limit', String(limit))
      params.set('sortBy', sortBy)
      params.set('sortOrder', sortDir)
      const res = await axios.get(`${API_URL}/api/admin/events?${params}`, authHeaders)
      setEvents(res.data.data)
      setTotal(res.data.total)
      setTotalPages(res.data.totalPages)
    } catch (err: any) {
      console.error('Failed to load admin events', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setFetchTick(t => t + 1)
  }

  const handleClearSearch = () => {
    setSearch('')
    setPage(1)
    setFetchTick(t => t + 1)
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(d => d === 'ASC' ? 'DESC' : 'ASC')
    } else {
      setSortBy(field)
      setSortDir('ASC')
    }
    setPage(1)
  }

  const sortTh = (field: string, label: string) => (
    <th className="sortable" onClick={() => handleSort(field)}>
      {label}
      <span className={`sort-indicator${sortBy === field ? ' sort-indicator--active' : ''}`}>
        {sortBy === field ? (sortDir === 'ASC' ? '▲' : '▼') : '⇅'}
      </span>
    </th>
  )

  const fetchSeatMaps = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/seat-maps`, authHeaders)
      setSeatMaps(res.data.map((sm: any) => ({ id: sm.id, name: sm.name })))
    } catch (err) {
      console.error('Failed to load seat maps', err)
    }
  }

  useEffect(() => {
    if (token) fetchEvents()
  }, [token, page, limit, sortBy, sortDir, fetchTick])

  useEffect(() => {
    if (token) fetchSeatMaps()
  }, [token])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement
    const value = target.type === 'checkbox' ? target.checked : target.value
    setForm(prev => ({ ...prev, [target.name]: value }))
  }

  const openCreateForm = () => {
    setEditingEventId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
    setFormError('')
    setSuccessMsg('')
  }

  const openEditForm = (evt: AdminEvent) => {
    setEditingEventId(evt.id)
    setForm({
      name: evt.name,
      description: evt.description || '',
      date: toLocalDatetime(evt.date),
      location: evt.location || '',
      image: evt.image || '',
      publishAt: toLocalDatetime(evt.publishAt),
      publishNow: false,
      seatMapId: evt.seatMap?.id ? String(evt.seatMap.id) : '',
    })
    setShowForm(true)
    setFormError('')
    setSuccessMsg('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSuccessMsg('')

    if (!form.name.trim() || !form.date) {
      setFormError('Event name and event date are required.')
      return
    }

    if (!editingEventId && !form.publishNow && !form.publishAt) {
      setFormError('Please either set a scheduled publish date or check "Publish immediately".')
      return
    }

    try {
      setSubmitting(true)

      if (editingEventId) {
        const payload: Record<string, any> = {
          name: form.name.trim(),
          date: form.date,
          description: form.description.trim() || null,
          location: form.location.trim() || null,
          image: form.image.trim() || null,
          seatMapId: form.seatMapId ? parseInt(form.seatMapId) : null,
        }
        if (form.publishAt) payload.publishAt = form.publishAt
        else payload.publishAt = null

        await axios.patch(`${API_URL}/api/admin/events/${editingEventId}`, payload, authHeaders)
        setSuccessMsg(`Event "${form.name}" updated successfully.`)
      } else {
        const payload: Record<string, any> = {
          name: form.name.trim(),
          date: form.date,
        }
        if (form.description.trim()) payload.description = form.description.trim()
        if (form.location.trim()) payload.location = form.location.trim()
        if (form.image.trim()) payload.image = form.image.trim()
        if (form.publishAt) payload.publishAt = form.publishAt
        if (form.publishNow) payload.publishNow = true
        if (form.seatMapId) payload.seatMapId = parseInt(form.seatMapId)

        await axios.post(`${API_URL}/api/admin/events`, payload, authHeaders)

        if (form.publishNow) {
          setSuccessMsg(`Event "${form.name}" created and published immediately.`)
        } else {
          setSuccessMsg(`Event "${form.name}" saved as DRAFT — will publish on ${formatDate(form.publishAt)}.`)
        }
      }

      setForm(EMPTY_FORM)
      setShowForm(false)
      setEditingEventId(null)
      fetchEvents()
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to save event.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePublishNow = async (evt: AdminEvent) => {
    setSuccessMsg('')
    setPublishing(evt.id)
    try {
      await axios.patch(`${API_URL}/api/admin/events/${evt.id}/publish`, {}, authHeaders)
      setSuccessMsg(`"${evt.name}" is now published and visible to the public.`)
      fetchEvents()
    } catch (err: any) {
      setSuccessMsg('')
      alert(err.response?.data?.error || 'Failed to publish event.')
    } finally {
      setPublishing(null)
    }
  }

  // --- Ticket Type handlers ---

  const toggleTicketTypes = (eventId: number) => {
    if (expandedTicketTypes === eventId) {
      setExpandedTicketTypes(null)
      setShowTTForm(false)
      setEditingTTId(null)
    } else {
      setExpandedTicketTypes(eventId)
      setShowTTForm(false)
      setEditingTTId(null)
    }
  }

  const handleTTChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setTtForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const openTTCreateForm = () => {
    setEditingTTId(null)
    setTtForm(EMPTY_TT_FORM)
    setShowTTForm(true)
  }

  const openTTEditForm = (tt: TicketTypeData) => {
    setEditingTTId(tt.id)
    setTtForm({
      name: tt.name,
      availabilityModel: tt.availabilityModel,
      pricingModel: tt.pricingModel,
      priceCents: String(tt.priceCents),
      maxPerOrder: String(tt.maxPerOrder),
      maxPerUser: String(tt.maxPerUser),
      available: String(tt.available),
    })
    setShowTTForm(true)
  }

  const handleTTSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ttForm.name.trim() || expandedTicketTypes === null) return
    setTtSubmitting(true)
    try {
      const payload = {
        name: ttForm.name.trim(),
        availabilityModel: ttForm.availabilityModel,
        pricingModel: ttForm.pricingModel,
        priceCents: parseInt(ttForm.priceCents) || 0,
        maxPerOrder: parseInt(ttForm.maxPerOrder) || 0,
        maxPerUser: parseInt(ttForm.maxPerUser) || 0,
        available: parseInt(ttForm.available) || 0,
      }
      if (editingTTId) {
        await axios.patch(`${API_URL}/api/admin/events/${expandedTicketTypes}/ticket-types/${editingTTId}`, payload, authHeaders)
      } else {
        await axios.post(`${API_URL}/api/admin/events/${expandedTicketTypes}/ticket-types`, payload, authHeaders)
      }
      setTtForm(EMPTY_TT_FORM)
      setShowTTForm(false)
      setEditingTTId(null)
      fetchEvents()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save ticket type.')
    } finally {
      setTtSubmitting(false)
    }
  }

  const handleTTDelete = async (eventId: number, tt: TicketTypeData) => {
    if (!window.confirm(`Delete ticket type "${tt.name}"?`)) return
    setTtDeleting(tt.id)
    try {
      await axios.delete(`${API_URL}/api/admin/events/${eventId}/ticket-types/${tt.id}`, authHeaders)
      fetchEvents()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete ticket type.')
    } finally {
      setTtDeleting(null)
    }
  }

  if (!token) {
    return (
      <div className="admin-page">
        <p className="error">You must be logged in as an admin to view this page.</p>
      </div>
    )
  }

  const scheduledPublish = !form.publishNow && !!form.publishAt
  const isEditing = editingEventId !== null

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h2 className="admin-title">Event Management</h2>
          <p className="admin-subtitle">Create and edit events, manage ticket types, and control when events go live.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <form className="admin-search-form" onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              className="form-input"
              placeholder="Search by name or location..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ minWidth: '200px' }}
            />
            <button className="btn" type="submit">Search</button>
            {search && (
              <button className="btn-outline" type="button" onClick={handleClearSearch}>Clear</button>
            )}
          </form>
          <button className="btn" onClick={() => { if (showForm) { setShowForm(false); setEditingEventId(null) } else { openCreateForm() } }}>
            {showForm ? 'Cancel' : '+ New Event'}
          </button>
        </div>
      </div>

      {successMsg && <div className="admin-notice admin-notice--success" onClick={() => setSuccessMsg('')}>{successMsg}</div>}

      {showForm && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <h3 className="admin-form-title">{isEditing ? 'Edit Event' : 'Create New Event'}</h3>

          <div className="admin-form-grid">
            <div className="form-group form-group--full">
              <label className="form-label" htmlFor="name">Event Name <span className="required">*</span></label>
              <input
                id="name"
                name="name"
                className="form-input"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Spring Carnival Opening Ceremony"
                required
              />
            </div>

            <div className="form-group form-group--full">
              <label className="form-label" htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                className="form-input form-textarea"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe the event..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="date">Event Date &amp; Time <span className="required">*</span></label>
              <input
                id="date"
                name="date"
                type="datetime-local"
                className="form-input"
                value={form.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="location">Location</label>
              <input
                id="location"
                name="location"
                className="form-input"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g. Rangos Hall"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="seatMapId">Seat Map</label>
              <select
                id="seatMapId"
                name="seatMapId"
                className="form-input"
                value={form.seatMapId}
                onChange={handleChange}
              >
                <option value="">None (General Admission)</option>
                {seatMaps.map(sm => (
                  <option key={sm.id} value={String(sm.id)}>{sm.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group form-group--full">
              <label className="form-label" htmlFor="image">Image URL</label>
              <input
                id="image"
                name="image"
                className="form-input"
                value={form.image}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>

            <div className="form-group form-group--full">
              <label className="form-label" htmlFor="publishAt">
                Schedule Publish At
                <span className="form-hint"> — set a date/time for the event to go public automatically</span>
              </label>
              <input
                id="publishAt"
                name="publishAt"
                type="datetime-local"
                className="form-input"
                value={form.publishAt}
                onChange={handleChange}
                disabled={form.publishNow}
              />
              {scheduledPublish && !isEditing && (
                <p className="form-hint-inline">
                  This event will be saved as a <strong>DRAFT</strong> and automatically published on {formatDate(form.publishAt)}.
                </p>
              )}
            </div>

            {!isEditing && (
              <div className="form-group form-group--full">
                <label className="form-label-check">
                  <input
                    type="checkbox"
                    name="publishNow"
                    checked={form.publishNow}
                    onChange={handleChange}
                    className="form-checkbox"
                  />
                  Publish immediately (skip scheduling — event goes live right away)
                </label>
              </div>
            )}
          </div>

          {formError && <p className="error">{formError}</p>}

          <div className="admin-form-actions">
            <button type="submit" className="btn" disabled={submitting}>
              {submitting
                ? 'Saving...'
                : isEditing
                  ? 'Save Changes'
                  : form.publishNow
                    ? 'Create & Publish'
                    : 'Create as Draft'}
            </button>
            <button type="button" className="btn-outline" onClick={() => { setShowForm(false); setEditingEventId(null); setFormError('') }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="admin-events-table-wrap">
        {loading ? (
          <p style={{ padding: '1rem' }}>Loading events...</p>
        ) : events.length === 0 ? (
          <p className="muted" style={{ padding: '1rem' }}>No events yet. Create one above.</p>
        ) : (
          <>
          <table className="admin-table">
            <thead>
              <tr>
                {sortTh('name', 'Event')}
                {sortTh('date', 'Event Date')}
                {sortTh('status', 'Status')}
                <th>Ticket Types</th>
                <th>Publishes At</th>
                {sortTh('createdAt', 'Created')}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {events.map(evt => (
                <React.Fragment key={evt.id}>
                  <tr>
                    <td>
                      <div className="admin-event-name">{evt.name}</div>
                      {evt.location && <div className="admin-event-location">{evt.location}</div>}
                    </td>
                    <td>{formatDate(evt.date)}</td>
                    <td>
                      <span className={`status-badge status-badge--${evt.status.toLowerCase()}`}>
                        {evt.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-outline"
                        style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}
                        onClick={() => toggleTicketTypes(evt.id)}
                      >
                        {evt.ticketTypes?.length || 0} type{(evt.ticketTypes?.length || 0) !== 1 ? 's' : ''}
                        {expandedTicketTypes === evt.id ? ' ▲' : ' ▼'}
                      </button>
                    </td>
                    <td>{formatDate(evt.publishAt)}</td>
                    <td>{formatDate(evt.createdAt)}</td>
                    <td style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        className="btn-outline"
                        style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}
                        onClick={() => openEditForm(evt)}
                      >
                        Edit
                      </button>
                      {evt.status === 'DRAFT' && (
                        <button
                          className="btn-publish-now"
                          onClick={() => handlePublishNow(evt)}
                          disabled={publishing === evt.id}
                        >
                          {publishing === evt.id ? 'Publishing…' : 'Publish Now'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedTicketTypes === evt.id && (
                    <tr>
                      <td colSpan={7} style={{ background: 'var(--color-surface, #f9f9f9)', padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <strong>Ticket Types for {evt.name}</strong>
                          <button className="btn" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }} onClick={openTTCreateForm}>
                            + Add Type
                          </button>
                        </div>

                        {showTTForm && (
                          <form onSubmit={handleTTSubmit} style={{ border: '1px solid var(--color-border, #ddd)', borderRadius: '6px', padding: '0.75rem', marginBottom: '0.75rem', background: '#fff' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem' }}>
                              <div>
                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Name *</label>
                                <input name="name" className="form-input" value={ttForm.name} onChange={handleTTChange} required style={{ fontSize: '0.85rem' }} />
                              </div>
                              <div>
                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Availability</label>
                                <select name="availabilityModel" className="form-input" value={ttForm.availabilityModel} onChange={handleTTChange} style={{ fontSize: '0.85rem' }}>
                                  <option value="GA_POOL">General Admission</option>
                                  <option value="RESERVED_SEATS">Reserved Seats</option>
                                </select>
                              </div>
                              <div>
                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Pricing</label>
                                <select name="pricingModel" className="form-input" value={ttForm.pricingModel} onChange={handleTTChange} style={{ fontSize: '0.85rem' }}>
                                  <option value="FREE">Free</option>
                                  <option value="FIXED">Fixed Price</option>
                                </select>
                              </div>
                              <div>
                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Price (cents)</label>
                                <input name="priceCents" type="number" className="form-input" value={ttForm.priceCents} onChange={handleTTChange} style={{ fontSize: '0.85rem' }} />
                              </div>
                              <div>
                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Capacity</label>
                                <input name="available" type="number" className="form-input" value={ttForm.available} onChange={handleTTChange} style={{ fontSize: '0.85rem' }} />
                              </div>
                              <div>
                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Max/Order</label>
                                <input name="maxPerOrder" type="number" className="form-input" value={ttForm.maxPerOrder} onChange={handleTTChange} style={{ fontSize: '0.85rem' }} />
                              </div>
                              <div>
                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Max/User</label>
                                <input name="maxPerUser" type="number" className="form-input" value={ttForm.maxPerUser} onChange={handleTTChange} style={{ fontSize: '0.85rem' }} />
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                              <button type="submit" className="btn" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }} disabled={ttSubmitting}>
                                {ttSubmitting ? 'Saving…' : editingTTId ? 'Update' : 'Add'}
                              </button>
                              <button type="button" className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }} onClick={() => { setShowTTForm(false); setEditingTTId(null) }}>
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}

                        {(!evt.ticketTypes || evt.ticketTypes.length === 0) ? (
                          <p className="muted">No ticket types yet.</p>
                        ) : (
                          <table className="admin-table" style={{ margin: 0 }}>
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Availability</th>
                                <th>Pricing</th>
                                <th>Price</th>
                                <th>Capacity</th>
                                <th>Max/Order</th>
                                <th>Max/User</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {evt.ticketTypes!.map(tt => (
                                <tr key={tt.id}>
                                  <td>{tt.name}</td>
                                  <td>{tt.availabilityModel === 'GA_POOL' ? 'GA' : 'Reserved'}</td>
                                  <td>{tt.pricingModel}</td>
                                  <td>{formatAmount(tt.priceCents)}</td>
                                  <td>{tt.available}</td>
                                  <td>{tt.maxPerOrder || '—'}</td>
                                  <td>{tt.maxPerUser || '—'}</td>
                                  <td style={{ display: 'flex', gap: '0.3rem' }}>
                                    <button
                                      className="btn-outline"
                                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                                      onClick={() => openTTEditForm(tt)}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="btn-outline"
                                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: 'var(--color-danger, #c0392b)' }}
                                      onClick={() => handleTTDelete(evt.id, tt)}
                                      disabled={ttDeleting === tt.id}
                                    >
                                      {ttDeleting === tt.id ? '…' : 'Delete'}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <AdminPagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={p => setPage(p)}
            onLimitChange={l => { setLimit(l); setPage(1) }}
          />
          </>
        )}
      </div>
    </div>
  )
}

export default AdminEventsPage
