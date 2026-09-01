# Sponzy Backend API

A scalable, high-performance REST and WebSocket API built with **Node.js**, **Express**, **TypeScript**, **Prisma ORM**, and **Supabase (PostgreSQL)**.

---

## 🚀 Features

* **Authentication & RBAC:** JWT authentication and Supabase Auth session validation supporting `USER`, `CREATOR`, and `ADMIN` roles.
* **Database & ORM:** PostgreSQL managed through **Prisma ORM** with type-safe client generation.
* **Posts & Monetization:**
  * Public (Free), Subscribers-Only, and Pay-Per-View (PPV) unlockable posts.
  * Internal wallet system for digital transactions and tipping.
* **Real-time WebSockets:** Socket.io server for direct 1-to-1 chat, live stream comments, and live heart reactions.
* **Creator Memberships:** Custom monthly, 3-month, and annual subscription packages.
* **Digital Goods Marketplace:** Product creation and purchase verification.
* **Stories & Reels:** 24h ephemeral stories and vertical short video reels.
* **Admin Controls:** Platform analytics, revenue commission, and creator identity verification queue.

---

## 📁 Directory Layout

```
backend/
├── prisma/
│   ├── schema.prisma       # Full PostgreSQL database schema
│   └── seed.ts             # Initial demo database seeder
├── src/
│   ├── config/             # Prisma & Supabase client singletons
│   ├── controllers/        # Express request handlers for all domain entities
│   ├── middleware/         # Auth verification & Error handling middleware
│   ├── routes/             # REST route definitions
│   ├── sockets/            # Socket.io real-time event handlers
│   └── server.ts           # Express & HTTP server entry point
├── Dockerfile              # Production multi-stage Docker build
├── .env.example            # Environment variables template
├── package.json
└── tsconfig.json
```

---

## ⚙️ Environment Variables (`.env`)

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Supabase PostgreSQL Connection Strings
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Supabase API Keys
SUPABASE_URL="https://[REF].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_ANON_KEY="your-anon-key"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-min-32-characters"
JWT_EXPIRES_IN="7d"
```

---

## 🛠️ Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Database
```bash
# Push schema to Supabase PostgreSQL
npx prisma db push

# (Optional) Seed initial demo accounts and posts
npx prisma db seed
```

### 3. Run Development Server
```bash
npm run dev
```
Server runs on **`http://localhost:5000`**.

### 4. Prisma Studio
```bash
npx prisma studio
```
Visual database browser runs on **`http://localhost:5555`**.

---

## 📡 API Endpoints Summary

| Module | Route | Method | Description |
| :--- | :--- | :---: | :--- |
| **Auth** | `/api/auth/register` | `POST` | Register user or creator |
| **Auth** | `/api/auth/login` | `POST` | Login and get JWT token |
| **Auth** | `/api/auth/me` | `GET` | Get authenticated user info |
| **Posts** | `/api/posts/feed` | `GET` | Paginated feed with lock status |
| **Posts** | `/api/posts` | `POST` | Create a new post |
| **Posts** | `/api/posts/:id/like` | `POST` | Toggle post like |
| **Posts** | `/api/posts/:id/unlock` | `POST` | Unlock PPV post |
| **Users** | `/api/users/explore` | `GET` | Discover creators |
| **Users** | `/api/users/:username` | `GET` | Creator profile and plans |
| **Subs** | `/api/subscriptions/subscribe` | `POST` | Subscribe to creator |
| **Subs** | `/api/subscriptions/tip` | `POST` | Send tip to creator |
| **Chat** | `/api/messages/conversations` | `GET` | List chat conversations |
| **Chat** | `/api/messages/send` | `POST` | Send direct message |
| **Reels** | `/api/reels/feed` | `GET` | Shorts/Reels video feed |
| **Stories** | `/api/stories/feed` | `GET` | 24h stories tray |
| **Shop** | `/api/shop/products` | `GET` | Digital products catalog |
| **Admin** | `/api/admin/stats` | `GET` | Platform revenue & metrics |

---

## 🐳 Docker Deployment

Build and run using Docker:
```bash
docker build -t sponzy-api .
docker run -p 5000:5000 --env-file .env sponzy-api
```
