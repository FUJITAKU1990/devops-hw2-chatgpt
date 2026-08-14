import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const OrderConfirmation: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { event, selectedSeats, total, orderId, recordLocator, ticketTypeName, sectionLabels: stateSectionLabels, ticketInfo } = location.state || {};
    const sections = (event?.seatMap?.config || event?.seatMap)?.sections || [];
    const sectionLabels: Record<string, string> = stateSectionLabels ?? Object.fromEntries(
        sections.map((s: { id: string; label: string }) => [s.id, s.label])
    );

    const isGA = !selectedSeats || selectedSeats.length === 0;

    if (!event) {
        return (
            <div className="layout">
                <main className="main-content" style={{ textAlign: 'center', padding: '4rem' }}>
                    <h2>No order details found.</h2>
                    <button className="btn" onClick={() => navigate('/')}>Return Home</button>
                </main>
            </div>
        );
    }

    const fmtMoney = (amount: number) => amount.toFixed(2);
    const confirmationNumber = recordLocator || orderId || `ORD-${Math.floor(Math.random() * 1000000)}`;

    return (
        <div className="checkout-page"> {/* Reuse checkout page layout wrapper for consistent spacing */}
            <div className="checkout-layout" style={{ maxWidth: '800px', margin: '0 auto', display: 'block' }}>
                
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <div style={{ 
                        width: '80px', 
                        height: '80px', 
                        background: '#d4edda', 
                        color: '#155724', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '40px',
                        margin: '0 auto 1.5rem'
                    }}>
                        ✓
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Order Confirmed!</h1>
                    <p style={{ color: '#666', fontSize: '1.1rem' }}>Thank you for your purchase. A confirmation email has been sent.</p>
                </div>

                <div className="cart-container" style={{ padding: '2rem' }}>
                    <div style={{ borderBottom: '1px solid #eee', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.9rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Reference</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>#{confirmationNumber}</div>
                    </div>

                    <div className="cart-event-info" style={{ marginBottom: '2rem' }}>
                         <div className="event-name-large">{event.name}</div>
                         <div className="event-date-sub">
                            {new Date(event.date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                         </div>
                         <div className="event-venue-sub">{event.location || event.venue}</div> 
                    </div>

                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Tickets</h3>
                    <table className="cart-table-refined" style={{ marginBottom: '1.5rem' }}>
                        <tbody>
                            {isGA ? (
                                Object.entries((ticketInfo?.tickets as Record<string, number>) || {})
                                    .filter(([, qty]) => (qty as number) > 0)
                                    .map(([ttId, qty]) => {
                                        const tt = event?.ticketTypes?.find((t: { id: number }) => String(t.id) === ttId);
                                        const priceEach = tt?.priceCents ?? 0;
                                        const lineTotal = priceEach * (qty as number);
                                        return (
                                            <tr key={ttId} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                                <td style={{ padding: '12px 0' }}>
                                                    <div className="ticket-type-primary">{tt?.name ?? 'Ticket'} × {qty as number}</div>
                                                </td>
                                                <td style={{ padding: '12px 0' }}>
                                                    <span className="seat-chip">General Admission</span>
                                                </td>
                                                <td style={{ padding: '12px 0', textAlign: 'right' }}>
                                                    {lineTotal === 0 ? 'FREE' : `$${fmtMoney(lineTotal / 100)}`}
                                                </td>
                                            </tr>
                                        );
                                    })
                            ) : (
                                selectedSeats.map((seat: any, i: number) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                        <td style={{ padding: '12px 0' }}>
                                            <div className="ticket-type-primary">{ticketTypeName || 'Standard Admission'}</div>
                                        </td>
                                        <td style={{ padding: '12px 0' }}>
                                            <span className="seat-chip">{sectionLabels[seat.sectionId] || seat.sectionId || 'A'} · Row {seat.row} · Seat {seat.number}</span>
                                        </td>
                                        <td style={{ padding: '12px 0', textAlign: 'right' }}>
                                            ${fmtMoney(total / selectedSeats.length)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={2} style={{ paddingTop: '1.5rem', fontWeight: 600, textAlign: 'right' }}>Total Paid</td>
                                <td style={{ paddingTop: '1.5rem', fontWeight: 700, fontSize: '1.2rem', textAlign: 'right', color: '#b30000' }}>
                                    ${fmtMoney(total)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                        <button className="btn" onClick={() => navigate('/')} style={{ flex: 1 }}>Return to Home</button>
                        <button className="btn-outline" onClick={() => navigate('/orders')} style={{ flex: 1 }}>View My Orders</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderConfirmation;
