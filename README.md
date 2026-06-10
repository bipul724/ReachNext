# Xeno Mini CRM

A mini CRM application built for the Xeno SDE Internship Assignment.

## Architecture

- **CRM** (`crm/`) — Next.js 15 App Router + Prisma + Supabase (PostgreSQL)
- **Channel Service** (`channel-service/`) — Express.js message delivery simulator with async webhook callbacks

## Quick Start

```bash
# 1. Clone the repo
git clone <repo-url>
cd xeno-mini-crm

# 2. Setup CRM
cd crm
cp .env.example .env  # fill in DATABASE_URL, GEMINI_API_KEY
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev  # → http://localhost:3000

# 3. Setup Channel Service (new terminal)
cd channel-service
cp .env.example .env
npm install
npm run dev  # → http://localhost:3001
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS, ShadCN UI |
| Backend | Next.js API Routes, Prisma ORM |
| Database | PostgreSQL (Supabase) |
| AI | Google Gemini |
| Channel Service | Express.js |
| Deployment | Vercel (CRM) + Railway (Channel Service) |

> Full documentation coming soon.
