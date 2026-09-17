import { describe, expect, it } from 'vitest';

const BASE = process.env.TARTAN_BASE_URL || 'http://localhost:8636';
const STUDENT_PASSWORD = process.env.STUDENT_FIXTURE_PASSWORD;

describe('HW1B authoritative checkout pricing', () => {
  it('does not trust a client-supplied total below the reserved ticket price', async () => {
    // 1. Login
    const loginRes = await fetch(`${BASE}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'student@cmu.edu',
        password: STUDENT_PASSWORD,
      }),
    });

    expect(loginRes.status).toBe(200);

    const loginBody = await loginRes.json();
    const token = loginBody.token;

    expect(token).toBeTruthy();

    // 2. Find the seeded event and authoritative reserved-seat price
    const eventsRes = await fetch(`${BASE}/api/events`);
    expect(eventsRes.status).toBe(200);

    const events = await eventsRes.json();

    const event = events.find(
      (item: any) => item.name === 'Buggy Freeroll Practice',
    );

    expect(event).toBeTruthy();

    const reservedTicketType = event.ticketTypes.find(
      (ticketType: any) =>
        ticketType.availabilityModel === 'RESERVED_SEATS',
    );

    expect(reservedTicketType).toBeTruthy();

    const authoritativePrice = reservedTicketType.priceCents;

    expect(authoritativePrice).toBeGreaterThan(1);

    // 3. Find an available seat
    const seatsRes = await fetch(`${BASE}/api/events/${event.id}/seats`);
    expect(seatsRes.status).toBe(200);

    const seatsBody = await seatsRes.json();
    const unavailableSeats = seatsBody.availability || {};

    // The seeded seat map uses seat IDs like A1, A2, ...
    let seatId: string | null = null;

    for (const row of ['A', 'B', 'C', 'D', 'E']) {
      for (let number = 1; number <= 20; number++) {
        const candidate = `${row}${number}`;

        if (!unavailableSeats[candidate]) {
          seatId = candidate;
          break;
        }
      }

      if (seatId) {
        break;
      }
    }

    expect(seatId).toBeTruthy();

    // 4. Reserve the seat
    const reserveRes = await fetch(
      `${BASE}/api/events/${event.id}/seats/${encodeURIComponent(seatId!)}/reserve`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    expect(reserveRes.status).toBe(200);

    // 5. Attempt checkout while lying about the total
    const checkoutRes = await fetch(
      `${BASE}/api/events/${event.id}/checkout`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seatIds: [seatId],
          totalPriceCents: 1,
        }),
      },
    );

    expect(checkoutRes.status).toBe(200);

    const checkoutBody = await checkoutRes.json();

    // The server must use its own authoritative ticket price.
    expect(checkoutBody.totalAmountCents).toBe(authoritativePrice);
    expect(checkoutBody.totalAmountCents).not.toBe(1);
  }, 30000);
});