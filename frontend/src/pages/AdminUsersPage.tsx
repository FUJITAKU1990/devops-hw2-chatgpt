import React, { useState, useEffect } from 'react'
import axios from 'axios'
import AdminPagination from '../components/AdminPagination'
import { API_URL } from '../utils/apiBase'

interface AdminUser {
  id: number
  name: string
  email: string
  role: string
  createdAt: string
}

interface UserOrder {
  id: number
  recordLocator: string
  eventId: number
  eventName: string | null
  totalAmountCents: number
  status: string
  createdAt: string
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

const AdminUsersPage: React.FC<{ token: string | null }> = ({ token }) => {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pendingRoles, setPendingRoles] = useState<Record<number, string>>({})
  const [savingRole, setSavingRole] = useState<number | null>(null)
  const [expandedOrders, setExpandedOrders] = useState<number | null>(null)
  const [ordersCache, setOrdersCache] = useState<Record<number, UserOrder[]>>({})
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Sorting
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC')

  // Counter to force re-fetch when search is submitted
  const [fetchTick, setFetchTick] = useState(0)

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      params.set('page', String(page))
      params.set('limit', String(limit))
      params.set('sortBy', sortBy)
      params.set('sortOrder', sortDir)
      const res = await axios.get(`${API_URL}/api/admin/users?${params}`, authHeaders)
      setUsers(res.data.data)
      setTotal(res.data.total)
      setTotalPages(res.data.totalPages)
    } catch (err) {
      console.error('Failed to load users', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) fetchUsers()
  }, [token, page, limit, sortBy, sortDir, fetchTick])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setFetchTick(t => t + 1)
  }

  const handleClear = () => {
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

  const handleRoleChange = (userId: number, role: string) => {
    setPendingRoles(prev => ({ ...prev, [userId]: role }))
  }

  const handleSaveRole = async (user: AdminUser) => {
    const newRole = pendingRoles[user.id]
    if (!newRole || newRole === user.role) return
    setSavingRole(user.id)
    try {
      await axios.patch(`${API_URL}/api/admin/users/${user.id}/role`, { role: newRole }, authHeaders)
      setSuccessMsg(`${user.name}'s role updated to "${newRole}".`)
      setPendingRoles(prev => { const next = { ...prev }; delete next[user.id]; return next })
      setFetchTick(t => t + 1)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update role.')
    } finally {
      setSavingRole(null)
    }
  }

  const handleToggleOrders = async (userId: number) => {
    if (expandedOrders === userId) {
      setExpandedOrders(null)
      return
    }
    setExpandedOrders(userId)
    if (ordersCache[userId]) return
    setOrdersLoading(true)
    try {
      const res = await axios.get(`${API_URL}/api/admin/users/${userId}/orders`, authHeaders)
      setOrdersCache(prev => ({ ...prev, [userId]: res.data }))
    } catch (err) {
      console.error('Failed to load orders', err)
      setOrdersCache(prev => ({ ...prev, [userId]: [] }))
    } finally {
      setOrdersLoading(false)
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
          <h2 className="admin-title">User Management</h2>
          <p className="admin-subtitle">View all registered users, change roles, and inspect order history.</p>
        </div>
        <form className="admin-search-form" onSubmit={handleSearch}>
          <input
            className="form-input"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ minWidth: '220px' }}
          />
          <button className="btn" type="submit">Search</button>
          {search && (
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
          <p style={{ padding: '1rem' }}>Loading users...</p>
        ) : users.length === 0 ? (
          <p className="muted" style={{ padding: '1rem' }}>No users found.</p>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  {sortTh('name', 'Name')}
                  {sortTh('email', 'Email')}
                  {sortTh('role', 'Role')}
                  {sortTh('createdAt', 'Joined')}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <React.Fragment key={user.id}>
                    <tr>
                      <td>
                        <div className="admin-event-name">{user.name}</div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <select
                            className="form-input"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                            value={pendingRoles[user.id] ?? user.role}
                            onChange={e => handleRoleChange(user.id, e.target.value)}
                          >
                            <option value="student">student</option>
                            <option value="admin">admin</option>
                          </select>
                          {pendingRoles[user.id] && pendingRoles[user.id] !== user.role && (
                            <button
                              className="btn"
                              style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                              onClick={() => handleSaveRole(user)}
                              disabled={savingRole === user.id}
                            >
                              {savingRole === user.id ? 'Saving…' : 'Save'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        <button
                          className="btn-outline"
                          style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}
                          onClick={() => handleToggleOrders(user.id)}
                        >
                          {expandedOrders === user.id ? 'Hide Orders' : 'Orders'}
                        </button>
                      </td>
                    </tr>
                    {expandedOrders === user.id && (
                      <tr>
                        <td colSpan={5} style={{ background: 'var(--color-surface, #f9f9f9)', padding: '0.75rem 1rem' }}>
                          {ordersLoading && !ordersCache[user.id] ? (
                            <p className="muted">Loading orders...</p>
                          ) : !ordersCache[user.id] || ordersCache[user.id].length === 0 ? (
                            <p className="muted">No orders for this user.</p>
                          ) : (
                            <table className="admin-table" style={{ margin: 0 }}>
                              <thead>
                                <tr>
                                  <th>Record Locator</th>
                                  <th>Event</th>
                                  <th>Amount</th>
                                  <th>Status</th>
                                  <th>Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ordersCache[user.id].map(order => (
                                  <tr key={order.id}>
                                    <td><code>{order.recordLocator}</code></td>
                                    <td>{order.eventName ?? `Event #${order.eventId}`}</td>
                                    <td>{formatAmount(order.totalAmountCents)}</td>
                                    <td>
                                      <span className={`status-badge status-badge--${order.status.toLowerCase()}`}>
                                        {order.status}
                                      </span>
                                    </td>
                                    <td>{formatDate(order.createdAt)}</td>
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

export default AdminUsersPage
