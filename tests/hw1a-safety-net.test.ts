// tests/hw1a-safety-net.test.ts
//
// HW1A safety-net tests.
//
// These tests protect three different important behaviors and are expected to
// pass against the current Checkpoint A code. They do not modify application
// state, so they remain repeatable across multiple ./scripts/check runs.
//
//   Valid path              - event search works regardless of letter case.
//   Expected error          - login with an incorrect password is rejected.
//   Authorization boundary  - order history requires authentication.

import { describe, expect, it } from 'vitest';

const BASE = process.env.TARTAN_BASE_URL || 'http://localhost:8636';

describe('HW1A safety net', () => {
  // Valid path: customers should be able to find a published event without
  // needing to match the capitalization used in the event name.
  it('finds a published event using case-insensitive search', async () => {
    const res = await fetch(`${BASE}/api/events?search=lUnAr`);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/^application\/json\b/);

    const events = await res.json();

    expect(Array.isArray(events)).toBe(true);
    expect(
      events.some((event: any) => event.name === 'Lunar Gala'),
      'search results did not contain the seeded "Lunar Gala" event',
    ).toBe(true);
  }, 15000);

  // Expected error: an incorrect password must not authenticate a user.
  it('rejects a login attempt with a wrong password', async () => {
    const res = await fetch(`${BASE}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'student@cmu.edu',
        password: 'definitely-not-the-password',
      }),
    });

    expect(res.status).toBe(401);

    const body = await res.json();

    expect(body.message).toBe('Invalid credentials');
  }, 15000);

  // Authorization boundary: order history contains customer information and
  // must not be accessible without authentication.
  it('rejects unauthenticated access to order history', async () => {
    const res = await fetch(`${BASE}/api/orders`);

    expect(res.status).toBe(401);

    const body = await res.json();

    expect(body.error).toBe('Unauthorized');
  }, 15000);
});