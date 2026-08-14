import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { formatEventDate } from '../utils/formatDate'
import TicketOptions from './TicketOptions'

type Props = {
  token: string | null;
  events: any[];
}

interface TicketType {
  id: string;
  name: string;
  price: number;
  available: number;
  availabilityModel: string;
}

const EventDetail: React.FC<Props> = ({ token, events }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const event = events.find(e => e.id === Number(id));

  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({})

  if (!event) {
    return (
      <div className="event-detail-container">
        <div className="event-detail-content">
          <button onClick={() => navigate('/')} className="btn-back">← Home</button>
          <h2>Event not found</h2>
          <p>The event you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    )
  }

  const dt = formatEventDate(event.date);

  const ticketTypes: TicketType[] = event.ticketTypes?.map((tt: any) => ({
    id: String(tt.id),
    name: tt.name,
    price: tt.priceCents, // Map backend 'priceCents' to frontend 'price'
    available: tt.available,
    availabilityModel: tt.availabilityModel,
  })) || [];

  // Determine sold-out from ticket type availability. If there are no ticket types, treat as sold out/unavailable.
  const totalAvailable = ticketTypes.reduce((sum, t) => sum + (t.available || 0), 0);
  const isSoldOut = totalAvailable <= 0;

  const handleQuantityChange = (ticketId: string, quantity: number) => {
    setSelectedTickets(prev => ({
      ...prev,
      [ticketId]: quantity
    }))
  }

  return (
    <div className="event-detail-container">
      <div className="breadcrumb">
        <button onClick={() => navigate('/')} className="breadcrumb-link">🏠 Home</button>
        <span className="breadcrumb-separator">&gt;</span>
        <span className="breadcrumb-current">Carnegie Mellon University</span>
        <span className="breadcrumb-separator">&gt;</span>
        <span className="breadcrumb-current">{event.name}</span>
      </div>

      <div className="event-detail-layout">
        <div className="event-detail-main">
          <div className="event-detail-card">
            <div className="event-card-header"></div>
            <div className="event-detail-header">
              {event.image && (
                <div className="event-detail-image">
                  <img src={event.image} alt={event.name} />
                </div>
              )}
              <div className="event-detail-info">
                <h1 className="event-detail-title">{event.name}</h1>
                <div className="event-detail-org">
                  <strong>Carnegie Mellon University</strong>
                </div>
                <div className="event-detail-meta">
                  <div className="meta-item">
                    <span className="meta-icon">📍</span>
                    <span>{event.location}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-icon">🕐</span>
                    <span>{dt.date} at {dt.time}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="event-detail-description">
              <p>{event.description}</p>
            </div>
          </div>
        </div>

        <aside className="event-detail-sidebar">
          <TicketOptions
            token={token}
            isSoldOut={isSoldOut}
            event={event}
            ticketTypes={ticketTypes}
            selectedTickets={selectedTickets}
            onQuantityChange={handleQuantityChange}
          />
        </aside>
      </div>
    </div>
  )
}

export default EventDetail
