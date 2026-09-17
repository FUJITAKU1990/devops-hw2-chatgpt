import { describe, expect, it } from 'vitest';

const BASE = process.env.TARTAN_BASE_URL || 'http://localhost:8636';
const STUDENT_PASSWORD = process.env.STUDENT_FIXTURE_PASSWORD;

describe('HW2 safe exercise: GA minimum quantity', () => {
  it('allows a General Admission checkout for exactly 1 ticket', async () => {
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

    const checkoutRes = await fetch(`${BASE}/api/events/${event.id}/checkout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tickets: {
          [ticketType.id]: 1,
        },
        totalPriceCents: 0,
      }),
    });

    expect(checkoutRes.status).toBe(200);
  }, 15000);
});