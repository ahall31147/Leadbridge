const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const LEADS_SOURCE = path.join(__dirname, '../../../sample-leads.json');
const LEADS_DEST = path.join(__dirname, 'leads.json');
const USERS_DEST = path.join(__dirname, 'users.json');

// Initialize Leads
try {
    const data = JSON.parse(fs.readFileSync(LEADS_SOURCE, 'utf8'));
    const leads = data.leads.map((lead, index) => ({
        id: (index + 1).toString(),
        ...lead,
        status: 'New' // New, Contacted, Qualified, Closed
    }));
    fs.writeFileSync(LEADS_DEST, JSON.stringify({ leads }, null, 2));
    console.log('Leads initialized.');
} catch (error) {
    console.error('Error initializing leads:', error);
}

// Initialize Users
async function initUsers() {
    const adminPassword = await bcrypt.hash('admin123', 10);
    const subscriberPassword = await bcrypt.hash('sub123', 10);

    const users = [
        {
            id: '1',
            email: 'admin@leadbridge.com',
            password: adminPassword,
            role: 'admin',
            name: 'Admin User'
        },
        {
            id: '2',
            email: 'sub@example.com',
            password: subscriberPassword,
            role: 'subscriber',
            name: 'Test Subscriber',
            tier: 'Pro'
        }
    ];

    fs.writeFileSync(USERS_DEST, JSON.stringify({ users }, null, 2));
    console.log('Users initialized.');
}

initUsers();
