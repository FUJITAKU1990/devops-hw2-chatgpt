import { describe, expect, it } from 'vitest';

const BASE = process.env.TARTAN_BASE_URL || 'http://localhost:8636';

describe('HW1B regression: GA maxPerOrder', () => {
  it('rejects a General Admission checkout above maxPerOrder', async () => {
    const loginRes = await fetch(`${BASE}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'student@cmu.edu',
        password: 'student',
      }),
    });

    expect(loginRes.status).toBe(200);

    const { token } = await loginRes.json();

    const eventsRes = await fetch(`${BASE}/api/events`);
    expect(eventsRes.status).toBe(200);

    const events = await eventsRes.json();
    const event = events.find(
      (candidate: any) => candidate.name === 'Buggy Freeroll Practice',
    );

    expect(event).toBeTruthy();

    const ticketType = event.ticketTypes.find(
      (candidate: any) => candidate.availabilityModel === 'GA_POOL',
    );

    expect(ticketType).toBeTruthy();
    expect(ticketType.maxPerOrder).toBe(10);

    const checkoutRes = await fetch(`${BASE}/api/events/${event.id}/checkout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tickets: {
          [ticketType.id]: ticketType.maxPerOrder + 1,
        },
        totalPriceCents: 0,
      }),
    });

    expect(checkoutRes.status).toBe(400);
  }, 15000);

  it('allows a General Admission checkout at exactly maxPerOrder', async () => {
    const loginRes = await fetch(`${BASE}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'student@cmu.edu',
        password: 'student',
      }),
    });

    expect(loginRes.status).toBe(200);

    const { token } = await loginRes.json();

    const eventsRes = await fetch(`${BASE}/api/events`);
    expect(eventsRes.status).toBe(200);

    const events = await eventsRes.json();
    const event = events.find(
      (candidate: any) => candidate.name === 'Buggy Freeroll Practice',
    );

    expect(event).toBeTruthy();

    const ticketType = event.ticketTypes.find(
      (candidate: any) => candidate.availabilityModel === 'GA_POOL',
    );

    expect(ticketType).toBeTruthy();
    expect(ticketType.maxPerOrder).toBe(10);

    const checkoutRes = await fetch(`${BASE}/api/events/${event.id}/checkout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tickets: {
          [ticketType.id]: ticketType.maxPerOrder,
        },
        totalPriceCents: 0,
      }),
    });

    expect(checkoutRes.status).toBe(200);
  }, 15000);
});