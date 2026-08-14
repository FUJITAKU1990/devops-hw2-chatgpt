import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'

interface TicketType {
  id: string;
  name: string;
  price: number;
  available: number;
  availabilityModel: string;
}

type Props = {
  token: string | null;
  isSoldOut: boolean;
  event: any;
  ticketTypes: TicketType[];
  selectedTickets: Record<string, number>;
  onQuantityChange: (ticketId: string, quantity: number) => void;
}

const TicketOptions: React.FC<Props> = ({ token, isSoldOut, event, ticketTypes, selectedTickets, onQuantityChange }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const getTotalTickets = () => {
    return Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0)
  }

  const getTotalPrice = () => {
    return ticketTypes.reduce((total, ticket) => {
      const qty = selectedTickets[ticket.id] || 0
      return total + (ticket.price * qty)
    }, 0)
  }

  const handleSelectSeats = () => {
    const totalTickets = getTotalTickets()
    console.log("Selected tickets:", selectedTickets, "Total tickets:", totalTickets, "Total price:", getTotalPrice())
    if (totalTickets === 0) {
      alert('Please select at least one ticket')
      return
    }

    if (!token) {
      alert('Please log in to purchase tickets')
      return
    }

    // Determine the number of seated tickets selected
    const totalSeats = ticketTypes.reduce((sum, ticket) => {
      console.log(`Processing ticket type ${ticket.name} (ID: ${ticket.id}) with availability model ${ticket.availabilityModel}`);
      const qty = selectedTickets[ticket.id] || 0;
      if (ticket.availabilityModel == "RESERVED_SEATS") {
        return sum + qty
      }
      return sum;
    }, 0);

    // Navigate to seat selection page with ticket info if appropriate
    if (totalSeats > 0) {
      navigate(`/event/${id}/seats`, {
        state: {
          ticketInfo: {
            totalTickets,
            totalPrice: getTotalPrice(),
            tickets: selectedTickets
          }
        }
      })
      return
    }

    // For pure GA tickets, we can skip seat selection and go straight to checkout or confirmation
    navigate(`/checkout`, {
      state: {
        event,
        ticketInfo: {
          totalTickets,
          totalPrice: getTotalPrice(),
          tickets: selectedTickets
        }
      }
    })
  }

  return (
    <div className="ticket-options-card">
    <h3 className="ticket-options-title">Ticket Options</h3>
    {token ? (
      <>
      {!isSoldOut ? (
        <div className="ticket-types-container">
          <div className="ticket-type-row">
            <div className="ticket-type-label">
              <span className="ticket-label">Ticket Type</span>
            </div>
            <div className="ticket-type-price">
              <span className="price-label">Price</span>
            </div>
            <div className="ticket-type-remaining">
              <span className="remaining-label">Remaining</span>
            </div>
            <div className="ticket-type-quantity">
              <span className="quantity-label">Quantity</span>
            </div>
          </div>
          {ticketTypes.map(ticket => (
            <div key={ticket.id} className="ticket-type-row">
              <div className="ticket-type-label">
                <span>{ticket.name}</span>
              </div>
              <div className="ticket-type-price">
                <span className="price-value">
                {ticket.price === 0 ? 'FREE' : `$${(ticket.price / 100).toFixed(2)}`}
                </span>
              </div>
              <div className="ticket-type-remaining">
                <span className="remaining-value">{ticket.available}</span>
              </div>
              <div className="ticket-type-quantity">
                <select
                value={selectedTickets[ticket.id] || 0}
                onChange={(e) => onQuantityChange(ticket.id, Number(e.target.value))}
                className="quantity-select"
                >
                {[...Array(Math.min(ticket.available + 1, 11))].map((_, i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
                </select>
              </div>
            </div>
          ))}

        {getTotalTickets() > 0 && (
          <div className="ticket-summary">
            <div className="summary-row">
              <span className="summary-label">Total Tickets:</span>
              <span className="summary-value">{getTotalTickets()}</span>
            </div>
            <div className="summary-row total">
              <span className="summary-label">Total Amount:</span>
              <span className="summary-value price">
              {getTotalPrice() === 0 ? 'FREE' : `$${(getTotalPrice() / 100).toFixed(2)}`}
              </span>
            </div>
          </div>
        )}

        <button
        className="btn-select-seats"
        onClick={handleSelectSeats}
        disabled={getTotalTickets() === 0}
        >
        Select Seats
        </button>
        </div>
      ) : (
        <div className="sold-out-notice">
        <p>This event is currently sold out.</p>
        </div>
      )}
      </>
    ) : (
      <>
      <div className="availability-notice">
      Please log in to determine event availability.
      </div>
      <button
      className="btn-select-seats"
      onClick={() => alert('Please log in first')}
      >
      Log In to Purchase
      </button>
      </>
    )}
    </div>
  )
}

export default TicketOptions
