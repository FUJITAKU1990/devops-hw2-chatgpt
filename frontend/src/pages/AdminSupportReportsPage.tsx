import React, { useEffect, useState } from 'react'
import axios from 'axios'
import AdminPagination from '../components/AdminPagination'
import { API_URL } from '../utils/apiBase'

interface SupportReportRow {
  id: number
  userId: number | null
  reporterName: string | null
  reporterEmail: string | null
  name: string | null
  email: string | null
  isBot: boolean
  subject: string
  pageUrl: string | null
  createdAt: string
}

interface SupportReportDetail extends SupportReportRow {
  description: string
  userAgent: string | null
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

const AdminSupportReportsPage: React.FC<{ token: string | null }> = ({ token }) => {
  const [reports, setReports] = useState<SupportReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [expandedReport, setExpandedReport] = useState<number | null>(null)
  const [detailCache, setDetailCache] = useState<Record<number, SupportReportDetail>>({})
  const [detailLoading, setDetailLoading] = useState(false)

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC')
  const [fetchTick, setFetchTick] = useState(0)

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } }

  const fetchReports = async () => {
    try {
      setLoading(true)
      setLoadError('')
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      params.set('page', String(page))
      params.set('limit', String(limit))
      params.set('sortBy', sortBy)
      params.set('sortOrder', sortDir)
      const res = await axios.get(`${API_URL}/api/admin/support/reports?${params}`, authHeaders)
      setReports(res.data.data)
      setTotal(res.data.total)
      setTotalPages(res.data.totalPages)
    } catch (err) {
      console.error('Failed to load support reports', err)
      setLoadError('Failed to load support reports. Please refresh and try again.')
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) fetchReports()
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

  const toggleDetails = async (reportId: number) => {
    if (expandedReport === reportId) {
      setExpandedReport(null)
      return
    }
    setExpandedReport(reportId)
    if (detailCache[reportId]) return
    setDetailLoading(true)
    try {
      const res = await axios.get(`${API_URL}/api/admin/support/reports/${reportId}`, authHeaders)
      setDetailCache(prev => ({ ...prev, [reportId]: res.data }))
    } catch (err) {
      console.error('Failed to load report details', err)
    } finally {
      setDetailLoading(false)
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
          <h2 className="admin-title">Support Reports</h2>
          <p className="admin-subtitle">Review customer-submitted issues and investigate details.</p>
        </div>
        <form className="admin-search-form" onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            className="form-input"
            placeholder="Search by subject, description, name, or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ minWidth: '280px' }}
          />
          <button className="btn" type="submit">Search</button>
          {search && (
            <button className="btn-outline" type="button" onClick={handleClear}>
              Clear
            </button>
          )}
        </form>
      </div>

      <div className="admin-events-table-wrap">
        {loading ? (
          <p style={{ padding: '1rem' }}>Loading reports...</p>
        ) : loadError ? (
          <p className="error" style={{ margin: '1rem' }}>{loadError}</p>
        ) : reports.length === 0 ? (
          <p className="muted" style={{ padding: '1rem' }}>No support reports found.</p>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  {sortTh('subject', 'Subject')}
                  <th>Submitted By</th>
                  <th>Source</th>
                  {sortTh('createdAt', 'Date')}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {reports.map(report => (
                  <React.Fragment key={report.id}>
                    <tr>
                      <td>#{report.id}</td>
                      <td>{report.subject}</td>
                      <td>
                        <div className="admin-event-name">{report.name || report.reporterName || '—'}</div>
                        <div className="admin-event-location">{report.email || report.reporterEmail || 'No email provided'}</div>
                      </td>
                      <td>{report.isBot ? 'Automated' : 'Manual'}</td>
                      <td>{formatDate(report.createdAt)}</td>
                      <td>
                        <button
                          className="btn-outline"
                          style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}
                          onClick={() => toggleDetails(report.id)}
                        >
                          {expandedReport === report.id ? 'Hide' : 'Details'}
                        </button>
                      </td>
                    </tr>
                    {expandedReport === report.id && (
                      <tr>
                        <td colSpan={6} style={{ background: 'var(--color-surface, #f9f9f9)', padding: '0.85rem 1rem' }}>
                          {detailLoading && !detailCache[report.id] ? (
                            <p className="muted">Loading details...</p>
                          ) : !detailCache[report.id] ? (
                            <p className="muted">Could not load report details.</p>
                          ) : (
                            <div style={{ display: 'grid', gap: '0.6rem' }}>
                              <div><strong>Description:</strong></div>
                              <div style={{ whiteSpace: 'pre-wrap' }}>{detailCache[report.id].description}</div>
                              <div><strong>Page URL:</strong> {detailCache[report.id].pageUrl || '—'}</div>
                              <div><strong>User Agent:</strong> {detailCache[report.id].userAgent || '—'}</div>
                              {detailCache[report.id].userId && (
                                <div><strong>User ID:</strong> {detailCache[report.id].userId}</div>
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

export default AdminSupportReportsPage
