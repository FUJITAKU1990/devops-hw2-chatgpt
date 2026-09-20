import { describe, expect, it } from 'vitest';

const BASE = process.env.TARTAN_BASE_URL || 'http://localhost:8636';
const ADMIN_EMAIL = process.env.TARTAN_ADMIN_EMAIL || 'admin@cmu.edu';
const ADMIN_PASSWORD = process.env.TARTAN_ADMIN_PASSWORD || 'admin';

describe('HW2 bonus: non-positive ticket quantity', () => {
    it('rejects checkout with a zero or negative ticket quantity', async () => {
        const loginRes = await fetch(`${BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
        });
        expect(loginRes.status).toBe(200);
        const { token } = await loginRes.json();
        expect(token).toBeTruthy();

        const eventName = `HW2 Bonus Qty Event ${Date.now()}`;
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

        const createTicketTypeRes = await fetch(
            `${BASE}/api/admin/events/${event.id}/ticket-types`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    name: 'General Admission',
                    availabilityModel: 'GA_POOL',
                    pricingModel: 'FIXED',
                    priceCents: 1000,
                    maxPerOrder: 10,
                    maxPerUser: 10,
                    available: 50,
                }),
            },
        );
        expect(createTicketTypeRes.status).toBe(201);
        const ticketType = await createTicketTypeRes.json();

        const zeroRes = await fetch(`${BASE}/api/events/${event.id}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ tickets: { [ticketType.id]: 0 }, totalPriceCents: 0 }),
        });
        expect(zeroRes.status).toBe(400);

        const negativeRes = await fetch(`${BASE}/api/events/${event.id}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ tickets: { [ticketType.id]: -1 }, totalPriceCents: 0 }),
        });
        expect(negativeRes.status).toBe(400);
    }, 30000);
});
