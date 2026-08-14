import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthModal from './AuthModal'
import { API_URL } from '../utils/apiBase'

interface Order {
  id: number
  recordLocator: string
  eventId: number
  eventName: string
  eventDate: string
  location: string
  ticketCount: number
  totalAmountCents: number
  status: string
  seatNumbers: string[]
  seatDisplay: string
  createdAt: string
}

interface MyOrdersProps {
  token: string | null
  onLogin: (email: string, password: string) => Promise<void>
  onRegister: (name: string, email: string, password: string) => Promise<string>
}

const MyOrders: React.FC<MyOrdersProps> = ({ token, onLogin, onRegister }) => {
  const navigate = useNavigate()
  const [authOpen, setAuthOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [searchQuery, setSearchQuery] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    const fetchOrders = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_URL}/api/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.status === 401) {
          setError('Your session has expired. Please sign in again.')
          setLoading(false)
          return
        }
        if (!res.ok) {
          throw new Error('Failed to load orders')
        }
        const data = await res.json()
        setOrders(data)
      } catch (err) {
        setError('Unable to load your orders. Please try again.')
        setOrders([])
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [token, navigate])

  const filteredOrders = orders.filter(order => {
    const eventDate = new Date(order.eventDate)
    const now = new Date()

    if (activeTab === 'upcoming' && eventDate < now) return false
    if (activeTab === 'past' && eventDate >= now) return false

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      return (
        order.eventName.toLowerCase().includes(query) ||
        order.recordLocator.toLowerCase().includes(query) ||
        order.location.toLowerCase().includes(query)
      )
    }
    return true
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const formatPrice = (cents: number) => {
    if (cents === 0) return 'FREE'
    return `$${(cents / 100).toFixed(2)}`
  }

  // Format seat display for reserved seating (e.g. "A-K-15" → "Orchestra Center · Row K · Seat 15")
  const formatSeatForDisplay = (seatId: string): string => {
    const parts = seatId.split('-')
    if (parts.length >= 3) {
      const [sectionId, row, seat] = parts
      return `Section ${sectionId} · Row ${row} · Seat ${seat}`
    }
    return seatId
  }

  const handleViewDetails = (orderId: number) => {
    setExpandedOrderId(prev => (prev === orderId ? null : orderId))
  }

  if (!token) {
    return (
      <div className="orders-page">
        <div className="breadcrumb">
          <Link to="/">🏠 Home</Link> &gt; Your Orders
        </div>
        <div className="orders-login-prompt">
          <h2>Sign in to view your orders</h2>
          <p>You need to be logged in to see your ticket purchases and order history.</p>
          <button className="btn" onClick={() => setAuthOpen(true)}>Sign In</button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onLogin={onLogin} onRegister={onRegister} />
      </div>
    )
  }

  return (
    <div className="orders-page">
      <div className="breadcrumb">
        <Link to="/">🏠 Home</Link> &gt; Your Orders
      </div>

      <h2 className="orders-heading">
        <span className="icon-orders">🎫</span> Your Orders
      </h2>

      <div className="orders-container">
        <div className="order-section-header">
          <span className="section-icon">📋</span> Order History
        </div>

        <div className="order-tabs">
          <button
            className={`order-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming Events
          </button>
          <button
            className={`order-tab ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past Events
          </button>
        </div>

        <div className="order-search-bar">
          <input
            type="text"
            placeholder="Search by event name or record locator"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="order-search-input"
          />
        </div>

        {loading ? (
          <div className="orders-loading">
            <div className="orders-loading-spinner" />
            <p>Loading your orders...</p>
          </div>
        ) : error ? (
          <div className="orders-error">
            <p>{error}</p>
            <button className="btn" onClick={() => window.location.reload()}>Retry</button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="no-orders-message">
            {orders.length === 0 ? (
              <>
                <p className="no-orders-title">No orders yet</p>
                <p>When you purchase tickets, they will appear here. Browse our upcoming events to get started!</p>
                <Link to="/" className="btn">Browse Events</Link>
              </>
            ) : (
              <p>No orders match your search. Try a different search term or switch tabs.</p>
            )}
          </div>
        ) : (
          <div className="orders-list">
            {filteredOrders.map(order => (
              <div key={order.id} className="order-card">
                <div className="order-card-header">
                  <div className="order-event-info">
                    <h3 className="order-event-name">{order.eventName}</h3>
                    <p className="order-event-date">{formatDate(order.eventDate)}</p>
                    <p className="order-event-location">📍 {order.location}</p>
                  </div>
                  <div className="order-status-badge">
                    <span className={`status-pill status-${order.status}`}>
                      {order.status === 'confirmed' ? 'TICKETS READY' : order.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="order-card-details">
                  <div className="order-detail-item">
                    <span className="detail-label">Confirmation #</span>
                    <span className="detail-value record-locator">{order.recordLocator}</span>
                  </div>
                  <div className="order-detail-item">
                    <span className="detail-label">Tickets</span>
                    <span className="detail-value">{order.ticketCount}</span>
                  </div>
                  {order.seatNumbers.length > 0 && (
                    <div className="order-detail-item">
                      <span className="detail-label">Seats</span>
                      <span className="detail-value seats">{order.seatDisplay}</span>
                    </div>
                  )}
                  <div className="order-detail-item">
                    <span className="detail-label">Total</span>
                    <span className="detail-value price">{formatPrice(order.totalAmountCents)}</span>
                  </div>
                </div>

                {expandedOrderId === order.id && (
                  <div className="order-expanded-details">
                    <h4>Ticket Details</h4>
                    <ul className="ticket-detail-list">
                      {order.seatNumbers.map((seatId, i) => (
                        <li key={i}>{formatSeatForDisplay(seatId)}</li>
                      ))}
                    </ul>
                    <p className="order-purchased-date">Purchased {formatShortDate(order.createdAt)}</p>
                  </div>
                )}

                <div className="order-card-actions">
                  <button
                    className="btn-order-action"
                    onClick={() => handleViewDetails(order.id)}
                  >
                    {expandedOrderId === order.id ? 'Hide Details' : 'View Details'}
                  </button>
                  {activeTab === 'upcoming' && (
                    <Link
                      to={`/event/${order.eventId}`}
                      className="btn-order-action event-link"
                    >
                      Event Info
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MyOrders
