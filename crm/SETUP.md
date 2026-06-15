# Setup Instructions

Follow these steps to get both the CRM application and the Channel Service simulator running locally on your machine.

---

## 1. Prerequisites
Ensure you have the following installed on your system:
- **Node.js** (v20 or higher recommended)
- **PostgreSQL** (running locally or a hosted instance like Supabase/Neon)

---

## 2. Install Dependencies

The repository is a monorepo. You need to install dependencies for both the CRM and the Channel Service separately.

```bash
# 1. Install CRM dependencies
cd crm
npm install

# 2. Install Channel Service dependencies
cd ../channel-service
npm install
```

---

## 3. Environment Variables

1. Copy the provided `.env.example` file in the root directory.
2. Create a `.env` file inside the `crm/` directory and populate it with the database connection strings and your AI API keys (Groq and/or Gemini).
3. Create a `.env` file inside the `channel-service/` directory and set the `PORT` (default is 3001).

*(Refer to the unified `.env.example` in the root of the repository for the exact variables required).*

---

## 4. Database Setup

Navigate to the `crm` directory and initialize the database using Prisma. This will create the required tables and seed the database with mock customer data.

```bash
cd crm

# 1. Generate the Prisma Client
npx prisma generate

# 2. Push the schema to your PostgreSQL database
npx prisma db push

# 3. Seed the database with mock customers and segments
npx ts-node prisma/seed.ts
```

---

## 5. Start the Development Servers

You will need two separate terminal windows to run both services concurrently.

**Terminal 1: Start the Channel Service**
This starts the mock delivery simulator on port 3001.
```bash
cd channel-service
npm run dev
```

**Terminal 2: Start the CRM Application**
This starts the Next.js frontend and API routes on port 3000.
```bash
cd crm
npm run dev
```

---

## 6. Verify Installation

1. Open your browser and navigate to `http://localhost:3000`. You should see the ReachNext dashboard.
2. To ensure the Channel Service is running correctly, navigate to `http://localhost:3001/api/health` (if the health route is configured) or ensure your terminal logs show `Channel Service listening on port 3001`.
