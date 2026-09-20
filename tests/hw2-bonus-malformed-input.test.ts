import { describe, expect, it } from 'vitest';

const BASE = process.env.TARTAN_BASE_URL || 'http://localhost:8636';
const ADMIN_EMAIL = process.env.TARTAN_ADMIN_EMAIL || 'admin@cmu.edu';
const ADMIN_PASSWORD = process.env.TARTAN_ADMIN_PASSWORD || 'admin';

describe('HW2 bonus: malformed input handling', () => {
    it('rejects a non-numeric event id with 400, not a crash', async () => {
        const loginRes = await fetch(`${BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
        });
        expect(loginRes.status).toBe(200);
        const { token } = await loginRes.json();
        expect(token).toBeTruthy();

        const res = await fetch(`${BASE}/api/events/not-a-number/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ tickets: { '1': 1 } }),
        });
        expect(res.status).toBe(400);
    });

    it('rejects a non-numeric ticket type key with 400, not a crash', async () => {
        const loginRes = await fetch(`${BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
        });
        expect(loginRes.status).toBe(200);
        const { token } = await loginRes.json();
        expect(token).toBeTruthy();

        const eventName = `HW2 Bonus Malformed Input Event ${Date.now()}`;
        const createEventRes = await fetch(`${BASE}/api/admin/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                name: eventName,
                date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                location: 'Bonus Test Hall',
                publishNow: true,
            }),
        });
        expect(createEventRes.status).toBe(201);
        const event = await createEventRes.json();

        const res = await fetch(`${BASE}/api/events/${event.id}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ tickets: { 'not-a-number': 1 }, totalPriceCents: 0 }),
        });
        expect(res.status).toBe(400);
    }, 30000);
});
