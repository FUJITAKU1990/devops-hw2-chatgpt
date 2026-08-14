import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import AdminPagination from '../components/AdminPagination'
import { API_URL } from '../utils/apiBase'

interface TicketTypeOption {
  id: number
  name: string
}

interface AdminEventOption {
  id: number
  name: string
  ticketTypes?: TicketTypeOption[]
}

interface AdminCoupon {
  id: number
  code: string
  eventId: number | null
  eventName: string | null
  ticketTypeId: number | null
  ticketTypeName: string | null
  discountType: string
  percentOff: number
  amountOffCents: number
  active: boolean
  startsAt: string | null
  endsAt: string | null
  maxRedemptions: number
  currentRedemptions: number
}

interface CouponFormState {
  code: string
  eventId: string
  ticketTypeId: string
  discountType: 'PERCENT' | 'AMOUNT'
  percentOff: string
  amountOffCents: string
  startsAt: string
  endsAt: string
  maxRedemptions: string
  currentRedemptions: string
  active: boolean
}

const EMPTY_FORM: CouponFormState = {
  code: '',
  eventId: '',
  ticketTypeId: '',
  discountType: 'PERCENT',
  percentOff: '10',
  amountOffCents: '0',
  startsAt: '',
  endsAt: '',
  maxRedemptions: '0',
  currentRedemptions: '0',
  active: true,
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

function formatDiscount(coupon: AdminCoupon): string {
  if (coupon.discountType === 'AMOUNT') {
    return `$${(coupon.amountOffCents / 100).toFixed(2)} off`
  }
  return `${coupon.percentOff}% off`
}

const AdminCouponsPage: React.FC<{ token: string | null }> = ({ token }) => {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([])
  const [events, setEvents] = useState<AdminEventOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingCouponId, setEditingCouponId] = useState<number | null>(null)
  const [form, setForm] = useState<CouponFormState>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [eventFilter, setEventFilter] = useState('')

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [sortBy, setSortBy] = useState('code')
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('ASC')
  const [fetchTick, setFetchTick] = useState(0)

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } }

  const selectedEventTicketTypes = useMemo(() => {
    const eventId = parseInt(form.eventId)
    if (!Number.isInteger(eventId)) return []
    return events.find(event => event.id === eventId)?.ticketTypes || []
  }, [events, form.eventId])

  const fetchCoupons = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (activeFilter) params.set('active', activeFilter)
      if (eventFilter) params.set('eventId', eventFilter)
      params.set('page', String(page))
      params.set('limit', String(limit))
      params.set('sortBy', sortBy)
      params.set('sortOrder', sortDir)
      const res = await axios.get(`${API_URL}/api/admin/coupons?${params}`, authHeaders)
      setCoupons(res.data.data)
      setTotal(res.data.total)
      setTotalPages(res.data.totalPages)
    } catch (err) {
      console.error('Failed to load coupons', err)
      setCoupons([])
    } finally {
      setLoading(false)
    }
  }

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/events?limit=100&sortBy=name&sortOrder=ASC`, authHeaders)
      setEvents(res.data.data)
    } catch (err) {
      console.error('Failed to load events for coupon form', err)
      setEvents([])
    }
  }

  useEffect(() => {
    if (token) fetchCoupons()
  }, [token, page, limit, sortBy, sortDir, fetchTick])

  useEffect(() => {
    if (token) fetchEvents()
  }, [token])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setFetchTick(t => t + 1)
  }

  const handleClear = () => {
    setSearch('')
    setActiveFilter('')
    setEventFilter('')
    setPage(1)
    setFetchTick(t => t + 1)
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(d => d === 'ASC' ? 'DESC' : 'ASC')
    } else {
      setSortBy(field)
      setSortDir(field === 'endsAt' ? 'DESC' : 'ASC')
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

  const openCreateForm = () => {
    setEditingCouponId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setSuccessMsg('')
    setShowForm(true)
  }

  const openEditForm = async (coupon: AdminCoupon) => {
    setFormError('')
    setSuccessMsg('')
    try {
      const res = await axios.get(`${API_URL}/api/admin/coupons/${coupon.id}`, authHeaders)
      const detail = res.data as AdminCoupon
      setEditingCouponId(coupon.id)
      setForm({
        code: detail.code,
        eventId: detail.eventId ? String(detail.eventId) : '',
        ticketTypeId: detail.ticketTypeId ? String(detail.ticketTypeId) : '',
        discountType: detail.discountType === 'AMOUNT' ? 'AMOUNT' : 'PERCENT',
        percentOff: String(detail.percentOff || 0),
        amountOffCents: String(detail.amountOffCents || 0),
        startsAt: toLocalDatetime(detail.startsAt),
        endsAt: toLocalDatetime(detail.endsAt),
        maxRedemptions: String(detail.maxRedemptions || 0),
        currentRedemptions: String(detail.currentRedemptions || 0),
        active: detail.active,
      })
      setShowForm(true)
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to load coupon details.')
    }
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement
    const value = target.type === 'checkbox' ? target.checked : target.value
    setForm(prev => {
      const next = { ...prev, [target.name]: value }
      if (target.name === 'eventId') {
        next.ticketTypeId = ''
      }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSuccessMsg('')

    if (!form.code.trim()) {
      setFormError('Coupon code is required.')
      return
    }

    const payload: Record<string, any> = {
      code: form.code.trim(),
      eventId: form.eventId ? parseInt(form.eventId) : null,
      ticketTypeId: form.ticketTypeId ? parseInt(form.ticketTypeId) : null,
      discountType: form.discountType,
      percentOff: parseInt(form.percentOff) || 0,
      amountOffCents: parseInt(form.amountOffCents) || 0,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
      maxRedemptions: parseInt(form.maxRedemptions) || 0,
      currentRedemptions: parseInt(form.currentRedemptions) || 0,
      active: form.active,
    }

    try {
      setSaving(true)
      if (editingCouponId) {
        await axios.patch(`${API_URL}/api/admin/coupons/${editingCouponId}`, payload, authHeaders)
        setSuccessMsg(`Coupon ${form.code.trim().toUpperCase()} updated.`)
      } else {
        delete payload.currentRedemptions
        await axios.post(`${API_URL}/api/admin/coupons`, payload, authHeaders)
        setSuccessMsg(`Coupon ${form.code.trim().toUpperCase()} created.`)
      }
      setShowForm(false)
      setEditingCouponId(null)
      setForm(EMPTY_FORM)
      fetchCoupons()
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to save coupon.')
    } finally {
      setSaving(false)
    }
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
          <h2 className="admin-title">Coupon Management</h2>
          <p className="admin-subtitle">Create, edit, and monitor promo codes across events and ticket types.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <form className="admin-search-form" onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="form-input" value={activeFilter} onChange={e => setActiveFilter(e.target.value)} style={{ minWidth: '140px' }}>
              <option value="">All Statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <select className="form-input" value={eventFilter} onChange={e => setEventFilter(e.target.value)} style={{ minWidth: '220px' }}>
              <option value="">All Events</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>{event.name}</option>
              ))}
            </select>
            <input
              className="form-input"
              placeholder="Search by code, event, or ticket type..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ minWidth: '240px' }}
            />
            <button className="btn" type="submit">Search</button>
            {(search || activeFilter || eventFilter) && (
              <button className="btn-outline" type="button" onClick={handleClear}>Clear</button>
            )}
          </form>
          <button className="btn" type="button" onClick={openCreateForm}>New Coupon</button>
        </div>
      </div>

      {successMsg && (
        <div className="admin-notice admin-notice--success" onClick={() => setSuccessMsg('')}>
          {successMsg}
        </div>
      )}

      {showForm && (
        <div className="admin-form-card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>{editingCouponId ? 'Edit Coupon' : 'Create Coupon'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.85rem' }}>
            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <label>
                <div>Coupon Code</div>
                <input className="form-input" name="code" value={form.code} onChange={handleFormChange} placeholder="SPRING15" />
              </label>
              <label>
                <div>Event</div>
                <select className="form-input" name="eventId" value={form.eventId} onChange={handleFormChange}>
                  <option value="">Global Coupon</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>{event.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <div>Ticket Type</div>
                <select className="form-input" name="ticketTypeId" value={form.ticketTypeId} onChange={handleFormChange} disabled={!form.eventId}>
                  <option value="">All Ticket Types</option>
                  {selectedEventTicketTypes.map(ticketType => (
                    <option key={ticketType.id} value={ticketType.id}>{ticketType.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <div>Discount Type</div>
                <select className="form-input" name="discountType" value={form.discountType} onChange={handleFormChange}>
                  <option value="PERCENT">Percent Off</option>
                  <option value="AMOUNT">Fixed Amount Off</option>
                </select>
              </label>
              <label>
                <div>Percent Off</div>
                <input className="form-input" name="percentOff" type="number" min="0" max="100" value={form.percentOff} onChange={handleFormChange} disabled={form.discountType !== 'PERCENT'} />
              </label>
              <label>
                <div>Amount Off (cents)</div>
                <input className="form-input" name="amountOffCents" type="number" min="0" value={form.amountOffCents} onChange={handleFormChange} disabled={form.discountType !== 'AMOUNT'} />
              </label>
              <label>
                <div>Starts At</div>
                <input className="form-input" name="startsAt" type="datetime-local" value={form.startsAt} onChange={handleFormChange} />
              </label>
              <label>
                <div>Ends At</div>
                <input className="form-input" name="endsAt" type="datetime-local" value={form.endsAt} onChange={handleFormChange} />
              </label>
              <label>
                <div>Max Redemptions</div>
                <input className="form-input" name="maxRedemptions" type="number" min="0" value={form.maxRedemptions} onChange={handleFormChange} />
              </label>
              {editingCouponId && (
                <label>
                  <div>Current Redemptions</div>
                  <input className="form-input" name="currentRedemptions" type="number" min="0" value={form.currentRedemptions} onChange={handleFormChange} />
                </label>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                <input name="active" type="checkbox" checked={form.active} onChange={handleFormChange} />
                Active
              </label>
            </div>
            {formError && <div className="error">{formError}</div>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving…' : editingCouponId ? 'Save Changes' : 'Create Coupon'}</button>
              <button className="btn-outline" type="button" onClick={() => { setShowForm(false); setEditingCouponId(null); setForm(EMPTY_FORM); setFormError('') }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-events-table-wrap">
        {loading ? (
          <p style={{ padding: '1rem' }}>Loading coupons...</p>
        ) : coupons.length === 0 ? (
          <p className="muted" style={{ padding: '1rem' }}>No coupons found.</p>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  {sortTh('code', 'Code')}
                  {sortTh('eventName', 'Scope')}
                  <th>Ticket Type</th>
                  {sortTh('discountType', 'Discount')}
                  {sortTh('currentRedemptions', 'Redemptions')}
                  {sortTh('endsAt', 'Window')}
                  {sortTh('active', 'Status')}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {coupons.map(coupon => (
                  <tr key={coupon.id}>
                    <td><code>{coupon.code}</code></td>
                    <td>
                      <div className="admin-event-name">{coupon.eventName || 'Global'}</div>
                      <div className="admin-event-location">{coupon.eventId ? `Event #${coupon.eventId}` : 'All events'}</div>
                    </td>
                    <td>{coupon.ticketTypeName || 'All ticket types'}</td>
                    <td>{formatDiscount(coupon)}</td>
                    <td>{coupon.currentRedemptions}{coupon.maxRedemptions > 0 ? ` / ${coupon.maxRedemptions}` : ''}</td>
                    <td>
                      <div>{formatDate(coupon.startsAt)}</div>
                      <div className="admin-event-location">through {formatDate(coupon.endsAt)}</div>
                    </td>
                    <td>
                      <span className={`status-badge status-badge--${coupon.active ? 'confirmed' : 'cancelled'}`}>
                        {coupon.active ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td>
                      <button className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }} onClick={() => openEditForm(coupon)}>
                        Edit
                      </button>
                    </td>
                  </tr>
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

export default AdminCouponsPage
