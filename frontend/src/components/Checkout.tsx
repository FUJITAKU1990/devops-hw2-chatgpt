import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_URL } from '../utils/apiBase';

interface Seat {
    sectionId: string;
    row: string;
    number: number;
    status?: string;
}

interface CheckoutProps {
    token: string | null;
}

const Checkout: React.FC<CheckoutProps> = ({ token }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { event, selectedSeats: initialSeats, ticketInfo } = location.state || {};
    const [cart, setCart] = useState<Seat[]>(initialSeats || []);
    const [placing, setPlacing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const cartRef = useRef<Seat[]>(cart);
    cartRef.current = cart;

    // Timer logic - 10 minutes
    const [timeLeft, setTimeLeft] = useState(600);

    const releaseAllSeats = async (seats: Seat[]) => {
        if (!token || !event?.id || seats.length === 0) return;
        const seatIds = seats.map(s => `${s.sectionId}-${s.row}-${s.number}`);
        await Promise.all(seatIds.map(seatId =>
            fetch(`${API_URL}/api/events/${event.id}/seats/${encodeURIComponent(seatId)}/release`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            })
        ));
    };

    useEffect(() => {
        if (!location.state || !event) {
            navigate('/');
            return;
        }
        setCart(initialSeats || []);
    }, [location.state, event, initialSeats, navigate]);

    useEffect(() => {
        if (!event || cart.length === 0) return;
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    releaseAllSeats(cartRef.current);
                    alert('Time expired! Seats released.');
                    navigate('/');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [event?.id, cart.length]);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const rem = seconds % 60;
        return `${minutes}:${rem.toString().padStart(2, '0')}`;
    };

    const [couponOpen, setCouponOpen] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
    const [discountCents, setDiscountCents] = useState(0);
    const [couponError, setCouponError] = useState<string | null>(null);
    const [couponMessage, setCouponMessage] = useState<string | null>(null);
    const [applyingCoupon, setApplyingCoupon] = useState(false);
    const [saveCard, setSaveCard] = useState(false);
    const cardNumberRef = useRef<HTMLInputElement>(null);
    const cardExpiryRef = useRef<HTMLInputElement>(null);
    const cardCvcRef = useRef<HTMLInputElement>(null);

    const handleApplyCoupon = async () => {
        if (!event?.id) return;

        const nextCouponCode = couponCode.trim();
        if (!nextCouponCode) {
            setCouponError('Enter a promo code to apply it.');
            setCouponMessage(null);
            return;
        }

        setApplyingCoupon(true);
        setCouponError(null);
        setCouponMessage(null);

        try {
            const res = await fetch(`${API_URL}/api/events/${event.id}/coupons/preview`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    couponCode: nextCouponCode,
                    tickets: ticketInfo?.tickets,
                })
            });

            const data = await res.json();
            if (!res.ok) {
                setCouponError(data.error || 'Unable to apply promo code.');
                return;
            }

            const normalizedCode = data.code || nextCouponCode.toUpperCase();
            setAppliedCouponCode(normalizedCode);
            setCouponCode(normalizedCode);
            setDiscountCents(Math.max(0, data.discountAmountCents || 0));
            setCouponMessage(`${normalizedCode} applied.`);
        } catch (err) {
            console.error(err);
            setCouponError('Unable to apply promo code right now.');
        } finally {
            setApplyingCoupon(false);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCouponCode(null);
        setCouponCode('');
        setDiscountCents(0);
        setCouponError(null);
        setCouponMessage(null);
        setCouponOpen(false);
    };

    const handlePlaceOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !event) return;
        const isGA = cart.length === 0;
        setError(null);
        setPlacing(true);
        try {
            const seatIds = cart.map(s => `${s.sectionId}-${s.row}-${s.number}`);
            const totalPriceCents = isGA
                ? (ticketInfo?.totalPrice || 0)
                : Math.round((ticketInfo?.totalPrice || 0) * (cart.length / (ticketInfo?.totalTickets || cart.length)));
            const cardNumber = cardNumberRef.current?.value?.replace(/\D/g, '') ?? '4242424242424242';
            const expiryVal = cardExpiryRef.current?.value ?? '12/30';
            const [expMonthStr, expYearStr] = expiryVal.split('/').map(s => s.trim());
            const cardExpMonth = parseInt(expMonthStr) || 12;
            const cardExpYear = parseInt(expYearStr) || 30;
            const cardCvc = cardCvcRef.current?.value ?? '123';
            const res = await fetch(`${API_URL}/api/events/${event.id}/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    seatIds,
                    totalPriceCents,
                    couponCode: appliedCouponCode,
                    discountAmountCents: discountCents,
                    cardNumber,
                    cardExpMonth,
                    cardExpYear: cardExpYear < 100 ? 2000 + cardExpYear : cardExpYear,
                    cardCvc,
                    saveCard,
                    tickets: ticketInfo?.tickets,
                })
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Checkout failed');
                return;
            }
            const seatCount = ticketInfo?.totalTickets || Math.max(cart.length, 1);
            const subtotalCents = isGA
                ? (ticketInfo?.totalPrice || 0)
                : Math.round((ticketInfo?.totalPrice || 0) * (cart.length / seatCount));
            const feesCents = 0;
            const taxCents = 0;
            const totalCents = Math.max(0, subtotalCents + feesCents + taxCents - discountCents);
            const ticketTypeName = (() => {
                const tickets = ticketInfo?.tickets as Record<string, number> | undefined;
                const ids = tickets ? Object.keys(tickets).filter(id => tickets[id] > 0) : [];
                const tt = event?.ticketTypes?.find((t: { id: number }) => String(t.id) === ids[0]);
                return tt?.name || 'Full Price';
            })();
            const sections = (event?.seatMap?.config || (event as any)?.seatMap)?.sections || [];
            const sectionLabels = sections.reduce((acc: Record<string, string>, s: { id: string; label: string }) => {
                acc[s.id] = s.label;
                return acc;
            }, {});

            navigate('/confirmation', {
                state: {
                    event,
                    selectedSeats: cart,
                    total: totalCents / 100,
                    orderId: data.orderId,
                    recordLocator: data.recordLocator,
                    ticketTypeName,
                    sectionLabels,
                    couponCode: appliedCouponCode,
                    discountCents,
                    ticketInfo
                }
            });
        } catch (err) {
            console.error(err);
            setError('Checkout failed. Please try again.');
        } finally {
            setPlacing(false);
        }
    };

    const handleRemoveSeat = async (seat: Seat) => {
        if (!token || !event || !confirm('Remove this seat?')) return;
        const seatId = `${seat.sectionId}-${seat.row}-${seat.number}`;
        try {
            const res = await fetch(`${API_URL}/api/events/${event.id}/seats/${encodeURIComponent(seatId)}/release`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setCart(prev => prev.filter(s => !(s.sectionId === seat.sectionId && s.row === seat.row && s.number === seat.number)));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleEmptyCart = async () => {
        if (!confirm('Empty cart and release all seats?')) return;
        await releaseAllSeats(cart);
        setCart([]);
        navigate(`/event/${event?.id}`);
    };

    if (!event) return null;
    if (!token) {
        navigate('/');
        return null;
    }
    if (cart.length === 0 && !ticketInfo?.totalTickets) {
        return (
            <div className="checkout-page">
                <h2 className="page-title-checkout">Checkout</h2>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p>Your cart is empty.</p>
                    <button className="btn" onClick={() => navigate(`/event/${event.id}/seats`, { state: { ticketInfo } })}>
                        Back to Seat Selection
                    </button>
                </div>
            </div>
        );
    }

    const isGA = cart.length === 0 && (ticketInfo?.totalTickets || 0) > 0;
    const seatCount = ticketInfo?.totalTickets || Math.max(cart.length, 1);
    const subtotal = isGA
        ? (ticketInfo?.totalPrice || 0)
        : Math.round((ticketInfo?.totalPrice || 0) * (cart.length / seatCount));
    const fees = 0;
    const tax = 0;
    const discount = Math.min(subtotal, discountCents);
    const total = Math.max(0, subtotal + fees + tax - discount);

    const fmtMoney = (cents: number) => (cents / 100).toFixed(2);

    const ticketTypeName = (() => {
        const tickets = ticketInfo?.tickets as Record<string, number> | undefined;
        const ids = tickets ? Object.keys(tickets).filter(id => tickets[id] > 0) : [];
        const tt = event?.ticketTypes?.find((t: { id: number }) => String(t.id) === ids[0]);
        return tt?.name || 'Full Price';
    })();

    const sections = (event?.seatMap?.config || (event as any)?.seatMap)?.sections || [];
    const getSectionLabel = (id: string) => sections.find((s: { id: string }) => s.id === id)?.label || id;

    return (
        <div className="checkout-page">
            <h2 className="page-title-checkout">Checkout</h2>
            
            <div className="checkout-layout">
                {/* Left Column */}
                <div className="checkout-main">
                    
                     <div className="cart-container">
                        <div className="cart-header-bar">
                            <h3 className="cart-title">Your Cart</h3>
                            <button className="btn-empty-cart" onClick={handleEmptyCart}>
                                Empty Cart
                            </button>
                        </div>
                        
                        <div className="cart-event-info">
                             <div className="event-name-large">{event.name}</div>
                             <div className="event-date-sub">{new Date(event.date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                             <div className="event-venue-sub">{event.location || event.venue}</div> 
                        </div>

                        {error && <div className="error">{error}</div>}

                         <table className="cart-table-refined">
                            <thead>
                                <tr>
                                    <th>Ticket</th>
                                    <th>{isGA ? 'Type' : 'Location'}</th>
                                    <th>Price</th>
                                    {!isGA && <th style={{ width: '40px' }}></th>}
                                </tr>
                            </thead>
                            <tbody>
                                {isGA ? (
                                    // GA: one row per ticket quantity entry
                                    Object.entries((ticketInfo?.tickets as Record<string, number>) || {})
                                        .filter(([, qty]) => qty > 0)
                                        .map(([ttId, qty]) => {
                                            const tt = event?.ticketTypes?.find((t: { id: number }) => String(t.id) === ttId);
                                            const priceEach = tt?.priceCents ?? 0;
                                            return (
                                                <tr key={ttId}>
                                                    <td><div className="ticket-type-primary">{tt?.name ?? 'Ticket'} × {qty}</div></td>
                                                    <td><span className="seat-chip">General Admission</span></td>
                                                    <td>{priceEach === 0 ? 'FREE' : `$${fmtMoney(priceEach * qty)}`}</td>
                                                </tr>
                                            );
                                        })
                                ) : (
                                    cart.map((seat) => (
                                        <tr key={`${seat.sectionId}-${seat.row}-${seat.number}`}>
                                            <td>
                                                <div className="ticket-type-primary">{ticketTypeName}</div>
                                            </td>
                                            <td>
                                                <span className="seat-chip">{getSectionLabel(seat.sectionId)} · Row {seat.row} · Seat {seat.number}</span>
                                            </td>
                                            <td>${fmtMoney(cart.length > 0 ? subtotal / cart.length : 0)}</td>
                                            <td className="col-remove">
                                                <button className="btn-icon-remove" title="Remove" onClick={() => handleRemoveSeat(seat)} type="button">×</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="coupon-section">
                        {!couponOpen ? (
                            <div>
                                <button className="btn-link-action" type="button" onClick={() => setCouponOpen(true)}>
                                    {appliedCouponCode ? `Promo ${appliedCouponCode} applied` : 'Have a promo code?'}
                                </button>
                                {couponMessage && <div className="coupon-label-sm">{couponMessage}</div>}
                            </div>
                        ) : (
                            <div className="coupon-form-expanded">
                                <label className="coupon-label-sm">Promo Code</label>
                                <div className="coupon-input-group">
                                    <input
                                        type="text"
                                        placeholder="Enter code"
                                        className="input-coupon"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                    />
                                    <button className="btn-secondary-small" type="button" onClick={handleApplyCoupon} disabled={applyingCoupon}>
                                        {applyingCoupon ? 'Applying...' : 'Apply'}
                                    </button>
                                </div>
                                {couponError && <div className="error">{couponError}</div>}
                                {appliedCouponCode && discount > 0 && (
                                    <div className="coupon-label-sm">Discount: -${fmtMoney(discount)}</div>
                                )}
                                <button className="btn-link-cancel" type="button" onClick={() => setCouponOpen(false)}>Close</button>
                                {appliedCouponCode && (
                                    <button className="btn-link-cancel" type="button" onClick={handleRemoveCoupon}>Remove code</button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column (Sticky) */}
                <div className="checkout-sidebar">
                    {!isGA && (
                        <div className="timer-banner">
                            <div className="timer-text">Seats on hold for: <strong>{formatTime(timeLeft)}</strong></div>
                            <div className="timer-sub">If time expires, seats will be released.</div>
                        </div>
                    )}

                    <div className="order-summary-card">
                        <h3>Order Summary</h3>
                        <div className="summary-row">
                            <span>Subtotal</span>
                            <span>${fmtMoney(subtotal)}</span>
                        </div>
                        <div className="summary-row muted">
                            <span>Service Fees</span>
                            <span>${fmtMoney(fees)}</span>
                        </div>
                         <div className="summary-row muted">
                            <span>Tax</span>
                            <span>${fmtMoney(tax)}</span>
                        </div>
                        {discount > 0 && (
                            <div className="summary-row">
                                <span>Promo {appliedCouponCode || couponCode}</span>
                                <span>-${fmtMoney(discount)}</span>
                            </div>
                        )}
                        <div className="summary-divider"></div>
                        <div className="summary-row total">
                            <span>Total</span>
                            <span>${fmtMoney(total)}</span>
                        </div>
                    </div>

                    <div className="payment-card">
                        <h3>Payment Details</h3>
                        <div className="secure-badge">🔒 Secure payment</div>
                        <div className="test-mode-notice">Test payment only—do not enter real card details.</div>
                        
                        <form id="payment-form" onSubmit={handlePlaceOrder}>
                            <div className="form-group">
                                <label>Name on Card</label>
                                <input className="input-std" required />
                            </div>
                            <div className="form-group">
                                <label>Card Number</label>
                                <input ref={cardNumberRef} className="input-std" placeholder="4242 4242 4242 4242" required />
                            </div>
                             <div className="form-row">
                                <div className="form-group">
                                    <label>Expiry</label>
                                    <input ref={cardExpiryRef} className="input-std" placeholder="MM / YY" required />
                                </div>
                                <div className="form-group">
                                    <label>CVV</label>
                                    <input ref={cardCvcRef} className="input-std" placeholder="123" maxLength={4} required />
                                    <small className="field-hint">3 digits on back</small>
                                </div>
                            </div>
                            <div className="form-group" style={{ marginTop: '0.75rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                                    <input type="checkbox" checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} />
                                    Save card for future purchases
                                </label>
                            </div>
                        </form>
                    </div>

                    <button type="submit" form="payment-form" className="btn-place-order" disabled={placing || (!isGA && cart.length === 0)}>
                        {placing ? 'Processing...' : `Place Order ($${fmtMoney(total)})`}
                    </button>
                    <p className="microcopy-center">You will receive a confirmation email.</p>
                    
                    <div className="legal-text">
                        <p>All sales final. Tickets are non-transferable.</p>
                        <p>By placing your order, you agree to our Terms of Service.</p>
                    </div>

                </div>
            </div>
        </div>
    );
};
export default Checkout;
