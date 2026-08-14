import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { API_URL } from '../utils/apiBase'

type SeatStatus = 'available' | 'unavailable' | 'selected' | 'accessible' | 'aisle'

interface Seat {
  sectionId: string;
  row: string;
  number: number;
  status: SeatStatus;
}

interface SectionConfig {
  id: string;
  label: string;
  rows: number;
  cols: number;
  aisles: number[];
  rowLabelStart: string;
  colLabelStart: number;
  accessibleSeats?: string[];
}

interface VenueData {
  seatMapId: string;
  sections: SectionConfig[];
}

type Props = {
  token: string | null;
  events: any[];
}

// Helper to generate row label
const getRowLabel = (start: string, index: number): string => {
  if (start.length === 1) {
    return String.fromCharCode(start.charCodeAt(0) + index);
  }
  // Handle AA, BB etc
  const char = start.charAt(0);
  return String.fromCharCode(char.charCodeAt(0) + index).repeat(start.length);
};

const SeatSelection: React.FC<Props> = ({ token, events }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const event = events.find(e => e.id === Number(id));

  const venueData = event?.seatMap?.config as unknown as VenueData | undefined;
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [currentSectionId, setCurrentSectionId] = useState<string>(venueData?.sections?.[0]?.id || "main"); 
  const [seatAvailability, setSeatAvailability] = useState<Record<string, string>>({});
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [reserving, setReserving] = useState(false);

  const fetchAvailability = () => {
    if (id && token) {
      setLoadingSeats(true);
      fetch(`${API_URL}/api/events/${id}/seats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setSeatAvailability(data.availability || {}))
        .catch(err => console.error("Failed to load seats", err))
        .finally(() => setLoadingSeats(false));
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [id, token]);

  const ticketInfo = location.state?.ticketInfo;

  if (!event) {
    return (
      <div className="seat-selection-container">
        <div className="seat-selection-content">
          <button onClick={() => navigate('/')} className="btn-back">← Home</button>
          <h2>Event not found</h2>
        </div>
      </div>
    )
  }

  if (!token) {
    navigate(`/event/${id}`);
    return null;
  }

  if (!venueData?.sections?.length) {
    return (
      <div className="seat-selection-container">
        <div className="seat-selection-content">
          <button onClick={() => navigate(`/event/${id}`)} className="btn-back">← Back to Event</button>
          <h2>No seat map available</h2>
          <p>This event does not have a seat map configured. Please contact the event organizer.</p>
        </div>
      </div>
    )
  }

  const currentSection = venueData.sections.find(s => s.id === currentSectionId) || venueData.sections[0];

  const generateSeatStatus = (rowLabel: string, seatLabel: number): SeatStatus => {
    const seatId = `${currentSection.id}-${rowLabel}-${seatLabel}`; // Unique ID logic needs to match backend
    
    if (seatAvailability[seatId] === 'unavailable' || seatAvailability[seatId] === 'sold') {
      return 'unavailable';
    }

    const seatConfig = `${rowLabel}${seatLabel}`;
    const isAccessible = currentSection.accessibleSeats?.includes(seatConfig);
    if (isAccessible) return 'accessible';

    return 'available';
  };
  
  const toggleSeat = async (row: string, seatNum: number, status: SeatStatus) => {
    const seatId = `${currentSection.id}-${row}-${seatNum}`;
    const seatKey = `${row}-${seatNum}`;
    const existingIndex = selectedSeats.findIndex(s => `${s.row}-${s.number}` === seatKey);

    if (existingIndex >= 0) {
      // Deselect - release reservation
      setReserving(true);
      try {
        const res = await fetch(`${API_URL}/api/events/${id}/seats/${encodeURIComponent(seatId)}/release`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setSelectedSeats(selectedSeats.filter((_, i) => i !== existingIndex));
          fetchAvailability();
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to release seat');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to release seat');
      } finally {
        setReserving(false);
      }
    } else {
      // Select - reserve seat
      if (selectedSeats.length >= ticketInfo.totalTickets) return;
      if (status !== 'available' && status !== 'accessible') return;

      setReserving(true);
      try {
        const res = await fetch(`${API_URL}/api/events/${id}/seats/${encodeURIComponent(seatId)}/reserve`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setSelectedSeats([...selectedSeats, { sectionId: currentSection.id, row, number: seatNum, status: 'selected' }]);
          fetchAvailability();
        } else {
          const msg = data.error || 'Failed to reserve seat';
          alert(msg);
          fetchAvailability();
        }
      } catch (err) {
        console.error(err);
        alert('Failed to reserve seat');
      } finally {
        setReserving(false);
      }
    }
  };

  const isSeatSelected = (row: string, seatNum: number): boolean => {
    return selectedSeats.some(s => s.row === row && s.number === seatNum);
  };

  const handleContinue = () => {
    if (selectedSeats.length === 0) {
      alert('Please select at least one seat');
      return;
    }

    if (selectedSeats.length !== ticketInfo.totalTickets) {
      alert(`Please select exactly ${ticketInfo.totalTickets} seat(s)`);
      return;
    }

    navigate('/checkout', {
      state: {
        event,
        selectedSeats,
        ticketInfo
      }
    });
  };

  const sectionRows = Array.from({ length: currentSection.rows }, (_, i) => getRowLabel(currentSection.rowLabelStart, i));

  return (
    <div className="seat-selection-container">
      <div className="seat-selection-header">
        <div className="seat-event-info">
          <h2 className="seat-event-title">{event.name}</h2>
          <p className="seat-event-date">
            {new Date(event.date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'numeric',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>

      <div className="seat-selection-content">
        <div className="section-header">
          <div className="section-info">
            <span className="section-label">Section:</span>
            <select
              className="section-select"
              value={currentSectionId}
              onChange={(e) => setCurrentSectionId(e.target.value)}
              style={{ padding: '5px', fontSize: '1rem' }}
            >
              {venueData.sections.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <button
            className="btn-clear-selection"
            onClick={async () => {
              if (selectedSeats.length === 0) return;
              const seatIds = selectedSeats.map(s => `${s.sectionId}-${s.row}-${s.number}`);
              setReserving(true);
              try {
                await Promise.all(seatIds.map(seatId =>
                  fetch(`${API_URL}/api/events/${id}/seats/${encodeURIComponent(seatId)}/release`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` }
                  })
                ));
                setSelectedSeats([]);
                fetchAvailability();
              } catch (err) {
                console.error(err);
              } finally {
                setReserving(false);
              }
            }}
            disabled={selectedSeats.length === 0 || reserving}
          >
            🗑️ Clear Seat Selection
          </button>
        </div>

        <div className="seat-legend">
          <div className="legend-item">
            <div className="legend-icon seat-available"></div>
            <span>Available</span>
          </div>
          <div className="legend-item">
            <div className="legend-icon seat-unavailable"></div>
            <span>Unavailable</span>
          </div>
          <div className="legend-item">
            <div className="legend-icon seat-your-seat"></div>
            <span>Your Seat</span>
          </div>
          <div className="legend-item">
            <div className="legend-icon seat-accessible"></div>
            <span>Accessible</span>
          </div>
          <div className="legend-item">
            <div className="legend-icon seat-selected"></div>
            <span>Selected Seats</span>
          </div>
          <div className="legend-item">
            <div className="legend-icon seat-aisle"></div>
            <span>Aisle Seats</span>
          </div>
        </div>

        <div className="seat-info-text">
          The closer the seat is to the top of the webpage, the closer it is to the stage.
        </div>

        <div className="seating-chart">
          <div className="stage-label">
            <span className="stage-icon">⬆️</span>
            <span className="stage-text">STAGE</span>
            <span className="stage-icon">⬆️</span>
          </div>

          <div className="seats-grid">
            {sectionRows.map((row, rowIndex) => (
              <div key={row} className="seat-row">
                <div className="row-label row-label-left">{row}</div>
                <div className="seats-container">
                  {Array.from({ length: currentSection.cols }, (_, i) => {
                    const seatNum = currentSection.colLabelStart + i;
                    const isRightGap = currentSection.aisles.includes(i + 1);
                    const isAisleSeat = i === 0 ||
                                        i === currentSection.cols - 1 ||
                                        currentSection.aisles.includes(i + 1) ||
                                        currentSection.aisles.includes(i);

                    const status = generateSeatStatus(row, seatNum);
                    const isSelected = isSeatSelected(row, seatNum);
                    const canSelect = status === 'available' || status === 'accessible';
                    const canInteract = (canSelect || isSelected) && !reserving;

                    return (
                      <React.Fragment key={seatNum}>
                        <button
                          className={`seat ${isSelected ? 'seat-selected' : `seat-${status}`} ${!canInteract ? 'seat-disabled' : ''} ${isAisleSeat ? 'seat-is-aisle' : ''}`}
                          onClick={() => canInteract && toggleSeat(row, seatNum, status)}
                          disabled={!canInteract}
                          title={`${row}-${seatNum}${isAisleSeat ? ' (Aisle)' : ''}`}
                        >
                          {seatNum}
                        </button>
                        {isRightGap && <div className="seat-spacer" style={{ width: '20px' }}></div>}
                      </React.Fragment>
                    );
                  })}
                </div>
                <div className="row-label row-label-right">{row}</div>
              </div>
            ))}
          </div>
        </div>


        <div className="seat-selection-footer">
          <button className="btn-new-section" onClick={() => navigate(`/event/${id}`)}>
            ← Back to Event Details
          </button>
          <div className="footer-info">
            {selectedSeats.length}/{ticketInfo.totalTickets} Seats Selected
          </div>
          <button
            className="btn-continue"
            onClick={handleContinue}
            disabled={selectedSeats.length === 0}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeatSelection;
