import { describe, expect, it } from 'vitest';

const BASE = process.env.TARTAN_BASE_URL || 'http://localhost:8636';
const MAILPIT_AUTH = 'Basic ' + Buffer.from('admin:admin').toString('base64');

const ADMIN_EMAIL = process.env.TARTAN_ADMIN_EMAIL || 'admin@cmu.edu';
const ADMIN_PASSWORD = process.env.TARTAN_ADMIN_PASSWORD || 'admin';

function uniqueEmail(): string {
    return `hw2-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForMailpitMessage(
    toEmail: string,
    matches: (subject: string, text: string) => boolean,
    attempts = 20,
    delayMs = 1000,
): Promise<{ subject: string; text: string }> {
    for (let i = 0; i < attempts; i++) {
        const searchRes = await fetch(
            `${BASE}/mailpit/api/v1/search?query=${encodeURIComponent(`to:${toEmail}`)}`,
            { headers: { Authorization: MAILPIT_AUTH } },
        );
        if (searchRes.ok) {
            const body = await searchRes.json();
            const messages = body.messages || [];
            for (const summary of messages) {
                const msgRes = await fetch(
                    `${BASE}/mailpit/api/v1/message/${summary.ID}`,
                    { headers: { Authorization: MAILPIT_AUTH } },
                );
                if (msgRes.ok) {
                    const msg = await msgRes.json();
                    const subject: string = msg.Subject || '';
                    const text: string = `${msg.Text || ''}\n${msg.HTML || ''}`;
                    if (matches(subject, text)) return { subject, text };
                }
            }
        }
        await sleep(delayMs);
    }
    throw new Error(`Timed out waiting for a matching email to ${toEmail}`);
}

describe('HW2 shared purchase contract', () => {
    it('lets a fresh customer register, activate, sign in, and purchase a paid GA ticket', async () => {
        // 1. Admin login
        const adminLoginRes = await fetch(`${BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
        });
        expect(adminLoginRes.status).toBe(200);
        const { token: adminToken } = await adminLoginRes.json();
        expect(adminToken).toBeTruthy();

        // 2. Create a fresh published paid GA event via the admin API
        const eventName = `HW2 Contract Event ${Date.now()}`;
        const createEventRes = await fetch(`${BASE}/api/admin/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({
                name: eventName,
                date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                location: 'Purchase Contract Hall',
                publishNow: true,
            }),
        });
        expect(createEventRes.status).toBe(201);
        const event = await createEventRes.json();

        const priceCents = 1500;
        const quantity = 2;
        const createTicketTypeRes = await fetch(
            `${BASE}/api/admin/events/${event.id}/ticket-types`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${adminToken}`,
                },
                body: JSON.stringify({
                    name: 'General Admission',
                    availabilityModel: 'GA_POOL',
                    pricingModel: 'FIXED',
                    priceCents,
                    maxPerOrder: 10,
                    maxPerUser: 10,
                    available: 50,
                }),
            },
        );
        expect(createTicketTypeRes.status).toBe(201);
        const ticketType = await createTicketTypeRes.json();

        // 3. Register a fresh customer
        const email = uniqueEmail();
        const password = 'Hw2Passw0rd!';
        const registerRes = await fetch(`${BASE}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'HW2 Contract Tester', email, password }),
        });
        expect(registerRes.status).toBe(201);

        // 4. Follow the activation email
        const activationEmail = await waitForMailpitMessage(email, (subject) =>
            subject.toLowerCase().includes('activate'),
        );
        const tokenMatch = activationEmail.text.match(/token=([a-f0-9]{20,})/i);
        expect(tokenMatch).toBeTruthy();

        const activateRes = await fetch(`${BASE}/api/activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: tokenMatch![1] }),
        });
        expect(activateRes.status).toBe(200);

        // 5. Sign in
        const loginRes = await fetch(`${BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        expect(loginRes.status).toBe(200);
        const { token } = await loginRes.json();
        expect(token).toBeTruthy();

        // 6. Find the published event and view its details
        const eventsRes = await fetch(`${BASE}/api/events`);
        expect(eventsRes.status).toBe(200);
        const events = await eventsRes.json();
        expect(events.some((e: any) => e.id === event.id)).toBe(true);

        const eventDetailRes = await fetch(`${BASE}/api/events/${event.id}`);
        expect(eventDetailRes.status).toBe(200);
        const eventDetail = await eventDetailRes.json();
        expect(eventDetail.ticketTypes.some((tt: any) => tt.id === ticketType.id)).toBe(true);

        // 7. Purchase tickets through TartanPay
        const expectedTotal = priceCents * quantity;
        const checkoutRes = await fetch(`${BASE}/api/events/${event.id}/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                tickets: { [ticketType.id]: quantity },
                totalPriceCents: expectedTotal,
            }),
        });
        expect(checkoutRes.status).toBe(200);
        const checkout = await checkoutRes.json();
        expect(checkout.success).toBe(true);
        expect(checkout.ticketIds).toHaveLength(quantity);
        expect(checkout.totalAmountCents).toBe(expectedTotal);
        expect(checkout.recordLocator).toBeTruthy();

        // 8. Confirmation email arrives
        await waitForMailpitMessage(
            email,
            (subject, text) =>
                subject.includes('Order Confirmed') && text.includes(checkout.recordLocator),
        );

        // 9. Authenticated order history matches
        const ordersRes = await fetch(`${BASE}/api/orders`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(ordersRes.status).toBe(200);
        const orders = await ordersRes.json();
        const order = orders.find((o: any) => o.recordLocator === checkout.recordLocator);
        expect(order).toBeTruthy();
        expect(order.ticketCount).toBe(quantity);
        expect(order.totalAmountCents).toBe(expectedTotal);
    }, 60000);
});