const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

const DATA_DIR = path.join(__dirname, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'data/leads.json');
const USERS_FILE = path.join(DATA_DIR, 'data/users.json');

// Seed data
const seed = () => {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    [LEADS_FILE, USERS_FILE].forEach(f => { if (!fs.existsSync(f)) fs.writeFileSync(f, JSON.stringify({ leads: [], users: [] })); });
};
seed();

const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const write = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2));

const auth = (req, res, next) => {
    const t = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];
    if (!t) return res.sendStatus(401);
    jwt.verify(t, JWT_SECRET, (e, u) => { if (e) return res.sendStatus(403); req.user = u; next(); });
};

const admin = (req, res, next) => { if (req.user.role !== 'admin') return res.sendStatus(403); next(); };

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const { users } = read(USERS_FILE);
    const u = users.find(x => x.email === email);
    if (!u || !(await bcrypt.compare(password, u.password))) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ token: jwt.sign({ id: u.id, email: u.email, role: u.role, name: u.name }, JWT_SECRET, { expiresIn: '1h' }), user: { id: u.id, email: u.email, role: u.role, name: u.name } });
});

app.post('/api/signup', async (req, res) => {
    const { email, password, name } = req.body;
    const d = read(USERS_FILE);
    if (d.users.find(x => x.email === email)) return res.status(400).json({ error: 'User already exists' });
    const u = { id: (d.users.length + 1).toString(), email, password: await bcrypt.hash(password, 10), role: 'subscriber', name, tier: 'Starter' };
    d.users.push(u); write(USERS_FILE, d);
    res.json({ token: jwt.sign({ id: u.id, email: u.email, role: u.role, name: u.name }, JWT_SECRET, { expiresIn: '1h' }), user: { id: u.id, email: u.email, role: u.role, name: u.name } });
});

app.get('/api/leads', auth, (req, res) => {
    const { leads } = read(LEADS_FILE);
    const { status } = req.query;
    res.json(status ? leads.filter(l => l.status === status) : leads);
});

app.get('/api/leads/stats', auth, (req, res) => {
    const { leads } = read(LEADS_FILE);
    res.json([
        { name: 'Total Leads', value: leads.length.toString(), change: '+12%', changeType: 'positive' },
        { name: 'Buyers', value: leads.filter(l => l.intent === 'Buyer').length.toString(), change: '+5%', changeType: 'positive' },
        { name: 'Renters', value: leads.filter(l => l.intent === 'Renter').length.toString(), change: '+8%', changeType: 'positive' },
        { name: 'Qualified', value: leads.filter(l => l.status === 'Qualified').length.toString(), change: '+2.1%', changeType: 'positive' },
    ]);
});

app.patch('/api/leads/:id/status', auth, (req, res) => {
    const d = read(LEADS_FILE);
    const l = d.leads.find(x => x.id === req.params.id);
    if (!l) return res.status(404).json({ error: 'Lead not found' });
    l.status = req.body.status; write(LEADS_FILE, d); res.json(l);
});

app.get('/api/admin/subscribers', auth, admin, (req, res) => {
    const { users } = read(USERS_FILE);
    res.json(users.filter(u => u.role === 'subscriber'));
});

app.patch('/api/admin/subscribers/:id/tier', auth, admin, (req, res) => {
    const d = read(USERS_FILE);
    const u = d.users.find(x => x.id === req.params.id);
    if (!u) return res.status(404).json({ error: 'User not found' });
    u.tier = req.body.tier; write(USERS_FILE, d); res.json(u);
});

app.delete('/api/admin/subscribers/:id', auth, admin, (req, res) => {
    const d = read(USERS_FILE);
    const i = d.users.findIndex(x => x.id === req.params.id);
    if (i === -1) return res.status(404).json({ error: 'User not found' });
    d.users.splice(i, 1); write(USERS_FILE, d); res.status(204).send();
});

// Stripe routes
const PRICES = { starter: process.env.STRIPE_PRICE_STARTER, pro: process.env.STRIPE_PRICE_PRO, enterprise: process.env.STRIPE_PRICE_ENTERPRISE };

app.post('/api/create-checkout-session', auth, async (req, res) => {
    if (!stripe) return res.json({ url: '/dashboard', message: 'Stripe not configured' });
    const priceId = PRICES[req.body.priceId?.replace('price_', '')];
    if (!priceId) return res.status(400).json({ error: 'Invalid price' });
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription', payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${req.headers.origin || 'https://leadbridge.up.railway.app'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin || 'https://leadbridge.up.railway.app'}/`,
        metadata: { userId: req.user.id },
    });
    res.json({ url: session.url });
});

app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!stripe) return res.status(200).send();
    let event; const sig = req.headers['stripe-signature'];
    try { event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET); } catch { return res.status(400).send(); }
    const d = read(USERS_FILE);
    if (event.type === 'checkout.session.completed') {
        const uid = event.data.object.metadata.userId;
        const u = d.users.find(x => x.id === uid);
        if (u) { u.tier = 'Pro'; u.status = 'active'; write(USERS_FILE, d); }
    }
    res.json({ received: true });
});

app.get('/api/subscription-status', auth, (req, res) => {
    const { users } = read(USERS_FILE);
    const u = users.find(x => x.id === req.user.id);
    res.json({ tier: u?.tier || 'None', status: u?.status || 'inactive' });
});

// Catch-all: serve frontend
app.use((req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(port, '0.0.0.0', () => console.log(`Listening on ${port}`));