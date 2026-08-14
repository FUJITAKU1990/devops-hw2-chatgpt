import React, { useState, useEffect } from 'react'
import axios from 'axios'
import AdminPagination from '../components/AdminPagination'
import { API_URL } from '../utils/apiBase'

interface AdminOrder {
  id: number
  recordLocator: string
  userId: number
  userName: string | null
  userEmail: string | null
  eventId: number
  eventName: string | null
  ticketCount: number
  totalAmountCents: number
  couponCode: string | null
  discountAmountCents: number
  paymentTransactionId: string | null
  status: string
  fulfillmentStatus: string
  createdAt: string
}

interface OrderDetail {
  id: number
  recordLocator: string
  userName: string | null
  userEmail: string | null
  eventName: string | null
  eventDate: string | null
  eventLocation: string | null
  totalAmountCents: number
  couponCode: string | null
  discountAmountCents: number
  paymentTransactionId: string | null
  status: string
  fulfillmentStatus: string
  createdAt: string
  tickets: { id: number; seatNumber: string | null; status: string }[]
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

function formatAmount(cents: number): string {
  if (cents === 0) return 'Free'
  return `$${(cents / 100).toFixed(2)}`
}

const AdminOrdersPage: React.FC<{ token: string | null }> = ({ token }) => {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null)
  const [detailCache, setDetailCache] = useState<Record<number, OrderDetail>>({})
  const [detailLoading, setDetailLoading] = useState(false)
  const [cancelling, setCancelling] = useState<number | null>(null)
  const [successMsg, setSuccessMsg] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Sorting
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC')

  // Counter to force re-fetch when search/filter is submitted
  const [fetchTick, setFetchTick] = useState(0)

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } }

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (statusFilter) params.set('status', statusFilter)
      params.set('page', String(page))
      params.set('limit', String(limit))
      params.set('sortBy', sortBy)
      params.set('sortOrder', sortDir)
      const res = await axios.get(`${API_URL}/api/admin/orders?${params}`, authHeaders)
      setOrders(res.data.data)
      setTotal(res.data.total)
      setTotalPages(res.data.totalPages)
    } catch (err) {
      console.error('Failed to load orders', err)
    } finally {
      setLoading(false)
    }
  }

  // Re-fetch when page, limit, sort, or fetchTick changes
  useEffect(() => {
    if (token) fetchOrders()
  }, [token, page, limit, sortBy, sortDir, fetchTick])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setFetchTick(t => t + 1)
  }

  const handleClear = () => {
    setSearch('')
    setStatusFilter('')
    setPage(1)
    setFetchTick(t => t + 1)
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(d => d === 'ASC' ? 'DESC' : 'ASC')
    } else {
      setSortBy(field)
      setSortDir('DESC')
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

  const handleToggleDetail = async (orderId: number) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null)
      return
    }
    setExpandedOrder(orderId)
    if (detailCache[orderId]) return
    setDetailLoading(true)
    try {
      const res = await axios.get(`${API_URL}/api/admin/orders/${orderId}`, authHeaders)
      setDetailCache(prev => ({ ...prev, [orderId]: res.data }))
    } catch (err) {
      console.error('Failed to load order detail', err)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleCancel = async (order: AdminOrder) => {
    if (!window.confirm(`Cancel order ${order.recordLocator}? This will cancel all tickets for this order.`)) return
    setCancelling(order.id)
    setSuccessMsg('')
    try {
      await axios.post(`${API_URL}/api/admin/orders/${order.id}/cancel`, {}, authHeaders)
      setSuccessMsg(`Order ${order.recordLocator} has been cancelled.`)
      setDetailCache(prev => { const next = { ...prev }; delete next[order.id]; return next })
      setFetchTick(t => t + 1)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel order.')
    } finally {
      setCancelling(null)
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
          <h2 className="admin-title">Order Management</h2>
          <p className="admin-subtitle">Browse all orders, view details, and process cancellations.</p>
        </div>
        <form className="admin-search-form" onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            className="form-input"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '0.4rem 0.5rem', fontSize: '0.85rem', minWidth: '120px' }}
          >
            <option value="">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
          <input
            className="form-input"
            placeholder="Search by locator, email, or event..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ minWidth: '240px' }}
          />
          <button className="btn" type="submit">Search</button>
          {(search || statusFilter) && (
            <button className="btn-outline" type="button" onClick={handleClear}>
              Clear
            </button>
          )}
        </form>
      </div>

      {successMsg && (
        <div className="admin-notice admin-notice--success" onClick={() => setSuccessMsg('')}>
          {successMsg}
        </div>
      )}

      <div className="admin-events-table-wrap">
        {loading ? (
          <p style={{ padding: '1rem' }}>Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="muted" style={{ padding: '1rem' }}>No orders found.</p>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  {sortTh('recordLocator', 'Record Locator')}
                  {sortTh('userName', 'Customer')}
                  {sortTh('eventName', 'Event')}
                  <th>Tickets</th>
                  {sortTh('amount', 'Amount')}
                  {sortTh('status', 'Status')}
                  <th>Fulfillment</th>
                  {sortTh('createdAt', 'Date')}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <React.Fragment key={order.id}>
                    <tr>
                      <td>
                        <code style={{ cursor: 'pointer' }} onClick={() => handleToggleDetail(order.id)}>
                          {order.recordLocator}
                        </code>
                      </td>
                      <td>
                        <div className="admin-event-name">{order.userName || '—'}</div>
                        <div className="admin-event-location">{order.userEmail}</div>
                      </td>
                      <td>{order.eventName || `Event #${order.eventId}`}</td>
                      <td>{order.ticketCount}</td>
                      <td>
                        <div>{formatAmount(order.totalAmountCents)}</div>
                        {order.couponCode && order.discountAmountCents > 0 && (
                          <div className="admin-event-location">
                            {order.couponCode} (-{formatAmount(order.discountAmountCents)})
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge status-badge--${order.status.toLowerCase()}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-badge--${order.fulfillmentStatus.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                          {order.fulfillmentStatus}
                        </span>
                      </td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          className="btn-outline"
                          style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}
                          onClick={() => handleToggleDetail(order.id)}
                        >
                          {expandedOrder === order.id ? 'Hide' : 'Details'}
                        </button>
                        {order.status === 'confirmed' && (
                          <button
                            className="btn-outline"
                            style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', color: 'var(--color-danger, #c0392b)' }}
                            onClick={() => handleCancel(order)}
                            disabled={cancelling === order.id}
                          >
                            {cancelling === order.id ? 'Cancelling…' : 'Cancel'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedOrder === order.id && (
                      <tr>
                        <td colSpan={9} style={{ background: 'var(--color-surface, #f9f9f9)', padding: '0.75rem 1rem' }}>
                          {detailLoading && !detailCache[order.id] ? (
                            <p className="muted">Loading details...</p>
                          ) : !detailCache[order.id] ? (
                            <p className="muted">Could not load order details.</p>
                          ) : (
                            <div>
                              <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                                <div><strong>Event:</strong> {detailCache[order.id].eventName}</div>
                                <div><strong>Date:</strong> {formatDate(detailCache[order.id].eventDate)}</div>
                                <div><strong>Location:</strong> {detailCache[order.id].eventLocation || '—'}</div>
                                <div><strong>Total:</strong> {formatAmount(detailCache[order.id].totalAmountCents)}</div>
                                <div><strong>Fulfillment:</strong> {detailCache[order.id].fulfillmentStatus}</div>
                                {detailCache[order.id].couponCode && (
                                  <div>
                                    <strong>Coupon:</strong> {detailCache[order.id].couponCode}
                                    {detailCache[order.id].discountAmountCents > 0 ? ` (-${formatAmount(detailCache[order.id].discountAmountCents)})` : ''}
                                  </div>
                                )}
                                {detailCache[order.id].paymentTransactionId && (
                                  <div><strong>Payment ID:</strong> <code>{detailCache[order.id].paymentTransactionId}</code></div>
                                )}
                              </div>
                              {detailCache[order.id].tickets.length > 0 && (
                                <table className="admin-table" style={{ margin: 0 }}>
                                  <thead>
                                    <tr>
                                      <th>Ticket ID</th>
                                      <th>Seat</th>
                                      <th>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detailCache[order.id].tickets.map(t => (
                                      <tr key={t.id}>
                                        <td>#{t.id}</td>
                                        <td>{t.seatNumber || 'General Admission'}</td>
                                        <td>
                                          <span className={`status-badge status-badge--${t.status.toLowerCase()}`}>
                                            {t.status}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
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

export default AdminOrdersPage
