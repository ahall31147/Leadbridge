# LeadBridge Platform MVP

This is the MVP for the LeadBridge subscription platform.

## Structure
- `/frontend`: Vite + React + Tailwind (CDN)
- `/backend`: Node.js + Express

## Features
- **Public Landing Page**: Marketing copy and pricing tiers.
- **Pricing**: Starter, Pro, and Enterprise tiers.
- **Subscriber Dashboard**: Mockup of lead pipeline stats and recent leads.
- **Stripe Integration**: Stubbed checkout session creation.

## Running Locally
1. Backend: `cd backend && npm install && node index.js`
2. Frontend: `cd frontend && npm install && npm run dev`

## Environment Variables
Create a `.env` file in the `/backend` directory:
```
JWT_SECRET=your_super_secret_key
PORT=3001
```

## Authentication
- **Admin**: `admin@leadbridge.com` / `admin123`
- **Test Subscriber**: `sub@example.com` / `sub123`

## Lead Management
Leads now have a `status` field: `New`, `Contacted`, `Qualified`, `Closed`.
Subscribers can update lead status directly from their dashboard.

## Admin Panel
Accessible at `/admin` for users with the `admin` role. Allows viewing all registered subscribers and their tiers.
