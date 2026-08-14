import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import axios from 'axios'
import Header from './components/Header'
import SidebarFilters, { Filters, DEFAULT_FILTERS } from './components/SidebarFilters'
import EventList from './components/EventList'
import EventCalendar from './components/EventCalendar'
import EventDetail from './components/EventDetail'
import MyOrders from './components/MyOrders'
import SeatSelection from './components/SeatSelection'
import Checkout from './components/Checkout'
import OrderConfirmation from './components/OrderConfirmation'
import Footer from './components/Footer'
import AdminEventsPage from './pages/AdminEventsPage'
import AdminOrdersPage from './pages/AdminOrdersPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminSeatMapsPage from './pages/AdminSeatMapsPage'
import AdminBatchUploadPage from './pages/AdminBatchUploadPage'
import SupportPage from './pages/SupportPage'
import AdminSupportReportsPage from './pages/AdminSupportReportsPage'
import AdminCouponsPage from './pages/AdminCouponsPage'
import ActivationPage from './pages/ActivationPage'
import AdminRoute from './components/AdminRoute'
import { API_URL } from './utils/apiBase'

function EventListPage({
  token,
  events,
  loading,
  searchQuery,
  setSearchQuery
}: {
  token: string | null;
  events: any[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [currentMonth, setCurrentMonth] = useState(() => new Date())

  const filteredEvents = events.filter(evt => {
    const ticketTypes: { priceCents: number; available: number; availabilityModel: string }[] =
      evt.ticketTypes ?? []
    const totalAvailable = ticketTypes.reduce((s, tt) => s + (tt.available ?? 0), 0)
    const minPriceCents = ticketTypes.length > 0
      ? Math.min(...ticketTypes.map(tt => tt.priceCents ?? 0))
      : 0
    const hasReserved = ticketTypes.some(tt => tt.availabilityModel === 'RESERVED_SEATS')

    if (filters.hasTicketsLeft && totalAvailable <= 0) return false

    if (filters.maxPrice !== '') {
      const cap = parseInt(filters.maxPrice, 10)
      if (minPriceCents > cap) return false
    }

    if (filters.reservedSeating && !hasReserved) return false

    if (filters.dateFrom) {
      const evtDate = new Date(evt.date)
      const from = new Date(filters.dateFrom)
      if (evtDate < from) return false
    }
    if (filters.dateTo) {
      const evtDate = new Date(evt.date)
      const to = new Date(filters.dateTo)
      to.setHours(23, 59, 59, 999)
      if (evtDate > to) return false
    }

    return true
  })

  return (
    <div className="layout">
      <SidebarFilters filters={filters} onChange={setFilters} />

      <main className="main-content">
        <div className="page-header">
          <h3 className="page-title">All Upcoming Events</h3>
        </div>

        <div className="toolbar">
          {viewMode === 'list' ? (
            <button type="button" className="btn-outline" onClick={() => setViewMode('calendar')}>
              View Calendar
            </button>
          ) : (
            <button type="button" className="btn-outline" onClick={() => setViewMode('list')}>
              View List
            </button>
          )}
          <div className="search-wrap">
            <input
              placeholder="Search events"
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="btn">Search</button>
          </div>
        </div>

        {viewMode === 'list' && loading && <p>Loading Events ...</p>}

        {viewMode === 'list' && <EventList events={filteredEvents} />}
        {viewMode === 'calendar' && (
          <EventCalendar
            events={events}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
          />
        )}
      </main>
    </div>
  )
}

function decodeToken(token: string | null): { name: string | null; role: string | null } {
  if (!token) return { name: null, role: null }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return {
      name: payload.name ?? payload.email ?? null,
      role: payload.role ?? null,
    }
  } catch {
    return { name: null, role: null }
  }
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [events, setEvents] = useState<any[]>([]); // Start with empty array
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { name: username, role } = decodeToken(token);
  const isAdmin = role === 'admin';

  const fetchEvents = async (search: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      const url = params.toString() ? `${API_URL}/api/events?${params}` : `${API_URL}/api/events`
      const res = await axios.get(url)
      setEvents(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents(searchQuery)
  }, [searchQuery])

  const login = async (email: string, password: string) => {
    try {
      const res = await axios.post(`${API_URL}/api/login`, { email, password })
      const t = res.data.token
      setToken(t)
      localStorage.setItem('token', t)
      setError('')
    } catch (e) {
      setError('Login failed')
      throw e
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      const res = await axios.post(`${API_URL}/api/register`, { name, email, password })
      setError('')
      return res.data.message || 'Account created. Check your email for the activation link.'
    } catch (e) {
      setError('Registration failed')
      throw e
    }
  }

  const logout = () => {
    setToken(null)
    localStorage.removeItem('token')
  }

  return (
    <Router>
      <div className="app-container">
        <Header token={token} username={username} isAdmin={isAdmin} onLogin={login} onLogout={logout} onRegister={register} />
        <div className="content">
          <Routes>
            <Route path="/" element={<EventListPage token={token} events={events} loading={loading} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />} />
            <Route path="/event/:id" element={<EventDetail token={token} events={events} />} />
            <Route path="/event/:id/seats" element={<SeatSelection token={token} events={events} />} />
            <Route path="/checkout" element={<Checkout token={token} />} />
            <Route path="/confirmation" element={<OrderConfirmation />} />
            <Route path="/activate" element={<ActivationPage />} />
            <Route path="/orders" element={<MyOrders token={token} onLogin={login} onRegister={register} />} />
            <Route path="/help" element={<SupportPage token={token} />} />
            <Route path="/admin/events" element={<AdminRoute token={token} role={role}><AdminEventsPage token={token} /></AdminRoute>} />
            <Route path="/admin/orders" element={<AdminRoute token={token} role={role}><AdminOrdersPage token={token} /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute token={token} role={role}><AdminUsersPage token={token} /></AdminRoute>} />
            <Route path="/admin/coupons" element={<AdminRoute token={token} role={role}><AdminCouponsPage token={token} /></AdminRoute>} />
            <Route path="/admin/support-reports" element={<AdminRoute token={token} role={role}><AdminSupportReportsPage token={token} /></AdminRoute>} />
            <Route path="/admin/seat-maps" element={<AdminRoute token={token} role={role}><AdminSeatMapsPage token={token} /></AdminRoute>} />
            <Route path="/admin/batch-upload" element={<AdminRoute token={token} role={role}><AdminBatchUploadPage token={token} /></AdminRoute>} />
          </Routes>

          {error && <p className="error">{error}</p>}
        </div>

        <Footer />
      </div>
    </Router>
  )
}

export default App
