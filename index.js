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

// Seed data if files don't exist
const seedData = () => {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }

    const leadsPath = path.join(dataDir, 'leads.json');
    const usersPath = path.join(dataDir, 'users.json');

    if (!fs.existsSync(leadsPath)) {
        console.log('Seeding initial leads data...');
        const initialLeads = { leads: [] };
        fs.writeFileSync(leadsPath, JSON.stringify(initialLeads, null, 2));
    }

    if (!fs.existsSync(usersPath)) {
        console.log('Seeding initial users data...');
        const initialUsers = { users: [] };
        fs.writeFileSync(usersPath, JSON.stringify(initialUsers, null, 2));
    }
};

seedData();

const LEADS_FILE = path.join(__dirname, 'data/leads.json');
const USERS_FILE = path.join(__dirname, 'data/users.json');

// Helper to read data
const readData = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    next();
};

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const { users } = readData(USERS_FILE);
    const user = users.find(u => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});

// Signup
app.post('/api/signup', async (req, res) => {
    const { email, password, name } = req.body;
    const data = readData(USERS_FILE);
    
    if (data.users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: (data.users.length + 1).toString(),
        email,
        password: hashedPassword,
        role: 'subscriber',
        name,
        tier: 'Starter'
    };

    data.users.push(newUser);
    writeData(USERS_FILE, data);

    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name } });
});

// Leads Endpoints
app.get('/api/leads', authenticateToken, (req, res) => {
    try {
        const { leads } = readData(LEADS_FILE);
        const { status } = req.query;

        let filteredLeads = leads;
        if (status) {
            filteredLeads = leads.filter(l => l.status === status);
        }

        res.json(filteredLeads);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read leads' });
    }
});

app.get('/api/leads/stats', authenticateToken, (req, res) => {
    try {
        const { leads } = readData(LEADS_FILE);
        const totalLeads = leads.length;
        const buyers = leads.filter(l => l.intent === 'Buyer').length;
        const renters = leads.filter(l => l.intent === 'Renter').length;
        const qualified = leads.filter(l => l.status === 'Qualified').length;
        const showing = leads.filter(l => l.status === 'Showing').length;

        res.json([
            { name: 'Total Leads', value: totalLeads.toString(), change: '+12%', changeType: 'positive' },
            { name: 'Buyers', value: buyers.toString(), change: '+5%', changeType: 'positive' },
            { name: 'Renters', value: renters.toString(), change: '+8%', changeType: 'positive' },
            { name: 'Qualified', value: qualified.toString(), change: '+2.1%', changeType: 'positive' },
            { name: 'Showings', value: showing.toString(), change: '+3.5%', changeType: 'positive' },
        ]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to calculate stats' });
    }
});

// Update lead status
app.patch('/api/leads/:id/status', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const data = readData(LEADS_FILE);
    const lead = data.leads.find(l => l.id === id);

    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    lead.status = status;
    writeData(LEADS_FILE, data);
    res.json(lead);
});

// Admin Panel Endpoints
app.get('/api/admin/subscribers', authenticateToken, isAdmin, (req, res) => {
    const { users } = readData(USERS_FILE);
    const subscribers = users.filter(u => u.role === 'subscriber');
    res.json(subscribers);
});

app.patch('/api/admin/subscribers/:id/tier', authenticateToken, isAdmin, (req, res) => {
    const { id } = req.params;
    const { tier } = req.body;
    const data = readData(USERS_FILE);
    const user = data.users.find(u => u.id === id);

    if (!user) return res.status(404).json({ error: 'User not found' });

    user.tier = tier;
    writeData(USERS_FILE, data);
    res.json(user);
});

app.delete('/api/admin/subscribers/:id', authenticateToken, isAdmin, (req, res) => {
    const { id } = req.params;
    const data = readData(USERS_FILE);
    const index = data.users.findIndex(u => u.id === id);

    if (index === -1) return res.status(404).json({ error: 'User not found' });

    data.users.splice(index, 1);
    writeData(USERS_FILE, data);
    res.status(204).send();
});

app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Backend listening on http://0.0.0.0:${port}`);
});
