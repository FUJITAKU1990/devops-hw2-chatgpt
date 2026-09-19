import './loadEnv';
import 'reflect-metadata';
import express from 'express';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import { AppDataSource, User, Order } from '@tartan/db';
import { sendActivationEmail } from '@tartan/mail';

const app = express();
app.use(express.json());
app.use(cors());

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set');
}
const SECRET_KEY = process.env.JWT_SECRET;
const ACTIVATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24;

function getAppUrl(): string {
    return process.env.APP_URL || 'http://localhost:5173';
}

function buildActivationUrl(token: string): string {
    const appUrl = getAppUrl();
    const url = new URL('/activate', appUrl.endsWith('/') ? appUrl : `${appUrl}/`);
    url.searchParams.set('token', token);
    return url.toString();
}

function createActivationToken(): string {
    return randomBytes(32).toString('hex');
}

const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded: any = jwt.verify(token, SECRET_KEY);
        if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
        (req as any).adminUser = decoded;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Initialize database connection
AppDataSource.initialize()
    .then(() => {
        console.log('Auth Service: Database connected via TypeORM');
    })
    .catch((err) => {
        console.error('Auth Service: Error connecting to database', err);
    });

app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!name || !normalizedEmail || !password) {
        return res.status(400).json({ message: 'name, email, and password are required' });
    }

    try {
        const userRepo = AppDataSource.getRepository(User);

        const existing = await userRepo.findOne({ where: { email: normalizedEmail } });
        if (existing) {
            return res.status(409).json({ message: 'A user with that email already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const activationToken = createActivationToken();
        const activationTokenExpiresAt = new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS);
        const user = userRepo.create({
            name,
            email: normalizedEmail,
            passwordHash,
            isActive: false,
            activationToken,
            activationTokenExpiresAt,
        });
        await userRepo.save(user);

        const emailSent = await sendActivationEmail(user.email, {
            name: user.name,
            activationUrl: buildActivationUrl(activationToken),
        });

        if (!emailSent) {
            await userRepo.delete(user.id);
            return res.status(500).json({ message: 'Failed to send activation email. Please try registering again.' });
        }

        res.status(201).json({
            message: 'Account created. Check your email for the activation link before signing in.',
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.post('/activate', async (req, res) => {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';

    if (!token) {
        return res.status(400).json({ message: 'Activation token is required' });
    }

    try {
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { activationToken: token } });

        if (!user) {
            return res.status(400).json({ message: 'Activation link is invalid or has already been used.' });
        }

        if (user.isActive) {
            return res.json({ message: 'Account is already active. You can sign in now.' });
        }

        if (!user.activationTokenExpiresAt || user.activationTokenExpiresAt.getTime() < Date.now()) {
            user.activationToken = null;
            user.activationTokenExpiresAt = null;
            await userRepo.save(user);
            return res.status(400).json({ message: 'Activation link has expired. Please register again.' });
        }

        user.isActive = true;
        user.activationToken = null;
        user.activationTokenExpiresAt = null;
        await userRepo.save(user);

        res.json({ message: 'Your account has been activated. You can sign in now.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    try {
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { email: normalizedEmail } });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: 'Please activate your account from the email we sent before signing in.' });
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email, name: user.name },
            SECRET_KEY,
            { expiresIn: '1h' }
        );
        res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.post('/validate', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        res.json({ valid: true, user: decoded });
    } catch (err) {
        res.status(401).json({ valid: false, message: 'Invalid token' });
    }
});

app.get('/admin/users', requireAdmin, async (req, res) => {
    try {
        const userRepo = AppDataSource.getRepository(User);
        const search = req.query.search as string | undefined;
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const sortBy = (req.query.sortBy as string) || 'createdAt';
        const sortOrder: 'ASC' | 'DESC' =
            ((req.query.sortOrder as string) || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const allowedSortFields: Record<string, string> = {
            name: 'user.name',
            email: 'user.email',
            role: 'user.role',
            createdAt: 'user.createdAt',
        };
        const sortField = allowedSortFields[sortBy] || 'user.createdAt';

        const buildQb = () => {
            const qb = userRepo.createQueryBuilder('user')
                .select(['user.id', 'user.name', 'user.email', 'user.role', 'user.createdAt']);
            if (search && search.trim()) {
                qb.where('LOWER(user.name) LIKE :s OR LOWER(user.email) LIKE :s', {
                    s: `%${search.trim().toLowerCase()}%`,
                });
            }
            return qb;
        };

        const total = await buildQb().getCount();
        const users = await buildQb()
            .orderBy(sortField, sortOrder)
            .skip((page - 1) * limit)
            .take(limit)
            .getMany();

        res.json({ data: users, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.patch('/admin/users/:id/role', requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { role } = req.body;
    if (!['admin', 'student'].includes(role)) {
        return res.status(400).json({ error: 'Role must be "admin" or "student"' });
    }
    try {
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { id } });
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.role === 'admin') {
            return res.status(403).json({ error: 'Admin role cannot be changed' });
        }
        user.role = role;
        await userRepo.save(user);
        res.json({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/admin/users/:id/orders', requireAdmin, async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    try {
        const orderRepo = AppDataSource.getRepository(Order);
        const orders = await orderRepo.find({
            where: { userId },
            relations: ['event'],
            order: { createdAt: 'DESC' },
        });
        res.json(orders.map(o => ({
            id: o.id,
            recordLocator: o.recordLocator,
            eventId: o.eventId,
            eventName: o.event?.name ?? null,
            totalAmountCents: o.totalAmountCents,
            status: o.status,
            createdAt: o.createdAt,
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'auth-service' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
});
