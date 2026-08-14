import React from 'react'
import { useNavigate } from 'react-router-dom'
import { formatEventDate } from '../utils/formatDate'

type Event = any

type Props = {
  evt: Event;
}

const EventCard: React.FC<Props> = ({ evt }) => {
  const navigate = useNavigate();
  const dt = formatEventDate(evt.date)

  const handleCardClick = () => {
    navigate(`/event/${evt.id}`);
  }

  const handleBookClick = () => {
    navigate(`/event/${evt.id}`);
  }

  const ticketTypes: { priceCents: number; available: number }[] = evt.ticketTypes ?? [];
  const totalAvailable = ticketTypes.reduce((sum, tt) => sum + (tt.available ?? 0), 0);
  const minPriceCents = ticketTypes.length > 0
    ? Math.min(...ticketTypes.map(tt => tt.priceCents ?? 0))
    : null;
  const startingPrice = minPriceCents != null
    ? (minPriceCents === 0 ? 'Free' : `$${(minPriceCents / 100).toFixed(2)}`)
    : null;

  return (
    <div className="event-card" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
      <div className="event-thumb" aria-hidden>
        {evt.image ? (
          <img src={evt.image} alt={`${evt.name} thumbnail`} className="thumb-img" />
        ) : null}
      </div>
      <div className="event-body">
        <div>
          <h4 className="event-title">{evt.name}</h4>
          <div className="event-category">
            <strong>{evt.category}</strong>
          </div>
          <div className="event-desc meta-item event-location">
            <span>{evt.location}</span>
          </div>
        </div>
        <div className="event-card-meta">
          {totalAvailable > 0 && (
            <span className="event-card-meta-tickets">{totalAvailable} ticket{totalAvailable !== 1 ? 's' : ''} left</span>
          )}
          {startingPrice != null && (
            <span className="event-card-meta-price">Starting from <strong>{startingPrice}</strong></span>
          )}
        </div>
      </div>
      <aside className="event-side" aria-hidden>
        <div className="event-date">{dt.date}</div>
        <div className="event-time">{dt.time}</div>
        <button className="btn full" disabled={totalAvailable <= 0} onClick={handleBookClick}>
          {totalAvailable > 0 ? 'Get Tickets' : 'Sold Out'}
        </button>
      </aside>
    </div>
  )
}

export default EventCard
