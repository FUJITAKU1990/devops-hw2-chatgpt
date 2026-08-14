import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import axios from 'axios';
import cors from 'cors';
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

const TICKET_SERVICE_URL = process.env.TICKET_SERVICE_URL || 'http://localhost:3002';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3003';

const getAuthHeader = (req: express.Request) => {
    return { headers: { Authorization: req.headers.authorization } };
};

app.get('/api/events', async (req, res) => {
    try {
        console.log("Fetching all events...");
        const params: Record<string, string> = {};
        if (req.query.search != null && String(req.query.search).trim() !== '') {
            params.search = String(req.query.search).trim();
        }
        const response = await axios.get(`${TICKET_SERVICE_URL}/events`, { params });
        const events = response.data;

        const enrichedEvents = await Promise.all(events.map(async (event: any) => {
            console.log(`Fetching details for event ${event.id}`);
            const detailResponse = await axios.get(`${TICKET_SERVICE_URL}/events/${event.id}`);
            return {
                ...event,
                ...detailResponse.data,
                enriched: true
            };
        }));

        res.json(enrichedEvents);
    } catch (err: any) {
        console.error("Gateway Error:", err.message);
        res.status(500).json({ error: 'Gateway error' });
    }
});

// Proxy Authentication
app.post('/api/login', async (req, res) => {
    console.log("Proxying login request...");
    try {
        const response = await axios.post(`${AUTH_SERVICE_URL}/login`, req.body);
        res.json(response.data);
    } catch (err: any) {
        res.status(err.response?.status || 500).json(err.response?.data || { error: 'Auth failed' });
    }
});

// Proxy Registration
app.post('/api/register', async (req, res) => {
    console.log("Proxying register request...");
    try {
        const response = await axios.post(`${AUTH_SERVICE_URL}/register`, req.body);
        res.status(response.status).json(response.data);
    } catch (err: any) {
        res.status(err.response?.status || 500).json(err.response?.data || { error: 'Registration failed' });
    }
});

app.post('/api/activate', async (req, res) => {
    console.log("Proxying activation request...");
    try {
        const response = await axios.post(`${AUTH_SERVICE_URL}/activate`, req.body);
        res.status(response.status).json(response.data);
    } catch (err: any) {
        res.status(err.response?.status || 500).json(err.response?.data || { error: 'Activation failed' });
    }
});

// Proxy for seat availability
app.get('/api/events/:id/seats', async (req, res) => {
    try {
        const response = await axios.get(`${TICKET_SERVICE_URL}/events/${req.params.id}/seats`);
        res.json(response.data);
    } catch (err) {
        console.error("Error fetching seats", err);
        res.status(500).json({ error: "Failed to fetch seats" });
    }
});

// Proxy for seat reservation (requires auth): POST /api/events/:id/seats/:seat/reserve
app.post('/api/events/:id/seats/:seat/reserve', async (req, res) => {
    try {
        const response = await axios.post(
            `${TICKET_SERVICE_URL}/events/${req.params.id}/seats/${encodeURIComponent(req.params.seat)}/reserve`,
            {},
            getAuthHeader(req)
        );
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: "Failed to reserve seat" };
        res.status(status).json(data);
    }
});

// Proxy for checkout (requires auth): POST /api/events/:id/checkout
app.post('/api/events/:id/checkout', async (req, res) => {
    try {
        const response = await axios.post(
            `${TICKET_SERVICE_URL}/events/${req.params.id}/checkout`,
            req.body,
            getAuthHeader(req)
        );
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: "Checkout failed" };
        res.status(status).json(data);
    }
});

app.post('/api/events/:id/coupons/preview', async (req, res) => {
    try {
        const response = await axios.post(
            `${TICKET_SERVICE_URL}/events/${req.params.id}/coupons/preview`,
            req.body,
            getAuthHeader(req)
        );
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to preview coupon' };
        res.status(status).json(data);
    }
});

// Proxy for seat release (requires auth): POST /api/events/:id/seats/:seat/release
app.post('/api/events/:id/seats/:seat/release', async (req, res) => {
    try {
        const response = await axios.post(
            `${TICKET_SERVICE_URL}/events/${req.params.id}/seats/${encodeURIComponent(req.params.seat)}/release`,
            {},
            getAuthHeader(req)
        );
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: "Failed to release seat" };
        res.status(status).json(data);
    }
});

// Get user orders (requires auth)
app.get('/api/orders', async (req, res) => {
    try {
        const response = await axios.get(`${TICKET_SERVICE_URL}/orders`, getAuthHeader(req));
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to fetch orders' };
        res.status(status).json(data);
    }
});

// Public support report endpoint
app.post('/api/support/reports', async (req, res) => {
    try {
        const response = await axios.post(
            `${TICKET_SERVICE_URL}/support/reports`,
            req.body,
            getAuthHeader(req)
        );
        res.status(response.status).json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to submit support report' };
        res.status(status).json(data);
    }
});

app.get('/api/events/:id', async (req, res) => {
    try {
        const response = await axios.get(`${TICKET_SERVICE_URL}/events/${req.params.id}`);
        res.json(response.data);
    } catch (err) {
        console.error("Error fetching event details", err);
        res.status(500).json({ error: "Failed to fetch event details" });
    }
});

// Admin: list users
app.get('/api/admin/users', async (req, res) => {
    try {
        const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        const response = await axios.get(`${AUTH_SERVICE_URL}/admin/users${query}`, getAuthHeader(req));
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to fetch users' };
        res.status(status).json(data);
    }
});

// Admin: change a user's role
app.patch('/api/admin/users/:id/role', async (req, res) => {
    try {
        const response = await axios.patch(
            `${AUTH_SERVICE_URL}/admin/users/${req.params.id}/role`,
            req.body,
            getAuthHeader(req)
        );
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to update user role' };
        res.status(status).json(data);
    }
});

// Admin: get a user's orders
app.get('/api/admin/users/:id/orders', async (req, res) => {
    try {
        const response = await axios.get(
            `${AUTH_SERVICE_URL}/admin/users/${req.params.id}/orders`,
            getAuthHeader(req)
        );
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to fetch user orders' };
        res.status(status).json(data);
    }
});

// Admin: list all events
app.get('/api/admin/events', async (req, res) => {
    try {
        const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        const response = await axios.get(`${TICKET_SERVICE_URL}/admin/events${query}`, getAuthHeader(req));
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to fetch admin events' };
        res.status(status).json(data);
    }
});

// Admin: list coupons
app.get('/api/admin/coupons', async (req, res) => {
    try {
        const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        const response = await axios.get(`${TICKET_SERVICE_URL}/admin/coupons${query}`, getAuthHeader(req));
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to fetch coupons' };
        res.status(status).json(data);
    }
});

// Admin: get one coupon
app.get('/api/admin/coupons/:id', async (req, res) => {
    try {
        const response = await axios.get(`${TICKET_SERVICE_URL}/admin/coupons/${req.params.id}`, getAuthHeader(req));
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to fetch coupon' };
        res.status(status).json(data);
    }
});

// Admin: create coupon
app.post('/api/admin/coupons', async (req, res) => {
    try {
        const response = await axios.post(`${TICKET_SERVICE_URL}/admin/coupons`, req.body, getAuthHeader(req));
        res.status(response.status).json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to create coupon' };
        res.status(status).json(data);
    }
});

// Admin: update coupon
app.patch('/api/admin/coupons/:id', async (req, res) => {
    try {
        const response = await axios.patch(`${TICKET_SERVICE_URL}/admin/coupons/${req.params.id}`, req.body, getAuthHeader(req));
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to update coupon' };
        res.status(status).json(data);
    }
});

// Admin: list support reports
app.get('/api/admin/support/reports', async (req, res) => {
    try {
        const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        const response = await axios.get(`${TICKET_SERVICE_URL}/admin/support/reports${query}`, getAuthHeader(req));
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to fetch support reports' };
        res.status(status).json(data);
    }
});

// Admin: get one support report
app.get('/api/admin/support/reports/:id', async (req, res) => {
    try {
        const response = await axios.get(
            `${TICKET_SERVICE_URL}/admin/support/reports/${req.params.id}`,
            getAuthHeader(req)
        );
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to fetch support report' };
        res.status(status).json(data);
    }
});

// Admin: batch upsert events — role enforcement delegated to ticket-service
app.post('/api/admin/events/batch', async (req, res) => {
    try {
        const response = await axios.post(
            `${TICKET_SERVICE_URL}/admin/events/batch`,
            req.body,
            { ...getAuthHeader(req), maxContentLength: 10 * 1024 * 1024 }
        );
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to process batch upload' };
        res.status(status).json(data);
    }
});

// Admin: create a new event
app.post('/api/admin/events', async (req, res) => {
    try {
        const response = await axios.post(`${TICKET_SERVICE_URL}/admin/events`, req.body, getAuthHeader(req));
        res.status(response.status).json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to create event' };
        res.status(status).json(data);
    }
});

// Admin: manually publish a DRAFT event
app.patch('/api/admin/events/:id/publish', async (req, res) => {
    try {
        const response = await axios.patch(
            `${TICKET_SERVICE_URL}/admin/events/${req.params.id}/publish`,
            {},
            getAuthHeader(req)
        );
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to publish event' };
        res.status(status).json(data);
    }
});

// Admin: update an existing event
app.patch('/api/admin/events/:id', async (req, res) => {
    try {
        const response = await axios.patch(
            `${TICKET_SERVICE_URL}/admin/events/${req.params.id}`,
            req.body,
            getAuthHeader(req)
        );
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to update event' };
        res.status(status).json(data);
    }
});

// Admin: list all orders
app.get('/api/admin/orders', async (req, res) => {
    try {
        const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        const response = await axios.get(`${TICKET_SERVICE_URL}/admin/orders${query}`, getAuthHeader(req));
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to fetch orders' };
        res.status(status).json(data);
    }
});

// Admin: get a single order
app.get('/api/admin/orders/:id', async (req, res) => {
    try {
        const response = await axios.get(`${TICKET_SERVICE_URL}/admin/orders/${req.params.id}`, getAuthHeader(req));
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to fetch order' };
        res.status(status).json(data);
    }
});

// Admin: cancel an order
app.post('/api/admin/orders/:id/cancel', async (req, res) => {
    try {
        const response = await axios.post(
            `${TICKET_SERVICE_URL}/admin/orders/${req.params.id}/cancel`,
            req.body,
            getAuthHeader(req)
        );
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to cancel order' };
        res.status(status).json(data);
    }
});

// Admin: create a ticket type for an event
app.post('/api/admin/events/:id/ticket-types', async (req, res) => {
    try {
        const response = await axios.post(
            `${TICKET_SERVICE_URL}/admin/events/${req.params.id}/ticket-types`,
            req.body,
            getAuthHeader(req)
        );
        res.status(response.status).json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to create ticket type' };
        res.status(status).json(data);
    }
});

// Admin: update a ticket type
app.patch('/api/admin/events/:id/ticket-types/:typeId', async (req, res) => {
    try {
        const response = await axios.patch(
            `${TICKET_SERVICE_URL}/admin/events/${req.params.id}/ticket-types/${req.params.typeId}`,
            req.body,
            getAuthHeader(req)
        );
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to update ticket type' };
        res.status(status).json(data);
    }
});

// Admin: delete a ticket type
app.delete('/api/admin/events/:id/ticket-types/:typeId', async (req, res) => {
    try {
        const response = await axios.delete(
            `${TICKET_SERVICE_URL}/admin/events/${req.params.id}/ticket-types/${req.params.typeId}`,
            getAuthHeader(req)
        );
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to delete ticket type' };
        res.status(status).json(data);
    }
});

// Admin: list all seat maps
app.get('/api/admin/seat-maps', async (req, res) => {
    try {
        const response = await axios.get(`${TICKET_SERVICE_URL}/admin/seat-maps`, getAuthHeader(req));
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to fetch seat maps' };
        res.status(status).json(data);
    }
});

// Admin: get a single seat map
app.get('/api/admin/seat-maps/:id', async (req, res) => {
    try {
        const response = await axios.get(`${TICKET_SERVICE_URL}/admin/seat-maps/${req.params.id}`, getAuthHeader(req));
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to fetch seat map' };
        res.status(status).json(data);
    }
});

// Admin: create a new seat map
app.post('/api/admin/seat-maps', async (req, res) => {
    try {
        const response = await axios.post(`${TICKET_SERVICE_URL}/admin/seat-maps`, req.body, getAuthHeader(req));
        res.status(response.status).json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to create seat map' };
        res.status(status).json(data);
    }
});

// Admin: batch upsert seat maps
app.post('/api/admin/seat-maps/batch', async (req, res) => {
    try {
        const response = await axios.post(`${TICKET_SERVICE_URL}/admin/seat-maps/batch`, req.body, getAuthHeader(req));
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to process batch seat map upload' };
        res.status(status).json(data);
    }
});

// Admin: delete a seat map
app.delete('/api/admin/seat-maps/:id', async (req, res) => {
    try {
        const response = await axios.delete(`${TICKET_SERVICE_URL}/admin/seat-maps/${req.params.id}`, getAuthHeader(req));
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: 'Failed to delete seat map' };
        res.status(status).json(data);
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'api-gateway' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
