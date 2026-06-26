# Secure AI Backend System

**Production-grade FastAPI backend — JWT auth, RBAC, adaptive rate limiting, DistilBERT sentiment AI, and a full admin dashboard.**

![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.11-3776AB?logo=python&logoColor=white)
![React](https://img.shields.io/badge/React_18-61DAFB?logo=react&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?logo=railway&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel)
![JWT](https://img.shields.io/badge/JWT-000000?logo=jsonwebtokens&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

> A secure, production-ready backend demonstrating real-world patterns: JWT authentication with RBAC, per-role rate limiting, IP-based adaptive blocking, full request audit logging, and a live DistilBERT sentiment classifier — all running on open-source models with zero external AI API cost.

---

## Live Demo

| Service | URL |
|---|---|
| **Frontend** | https://secure-ai-backend-system.vercel.app |
| **Backend API** | https://secure-ai-backend-system.up.railway.app |
| **API Docs** | https://secure-ai-backend-system.up.railway.app/docs |

---

## Architecture

```
                      ┌──────────────────────────────────────────┐
                      │           Docker Container (Railway)      │
                      │                                          │
Client (React/Vite)   │  ┌───────────────────────────────────┐  │
       │              │  │        FastAPI  (uvicorn)          │  │
       │  HTTPS ──────►  │                                   │  │
       │              │  │  ┌──────────┐   Middleware stack: │  │
       │              │  │  │ /auth/*  │   ✓ CORSMiddleware  │  │
       │              │  │  │ /ai/*    │   ✓ RequestLogger   │  │
       │              │  │  │ /admin/* │   ✓ SlowAPI limits  │  │
       │              │  │  └────┬─────┘   ✓ IP auto-block   │  │
       │              │  └───────┼─────────────────────────--┘  │
       │              └──────────┼────────────────────────────────┘
       │                         │
       │              ┌──────────▼──────────────────────┐
       │              │        Supabase (cloud)          │
       │              │  ┌──────────┐  ┌─────────────┐  │
       │              │  │  users   │  │  api_logs   │  │
       │              │  └──────────┘  └─────────────┘  │
       │              └─────────────────────────────────-┘
       │
       ▼
  React frontend (Vercel)
  Login → Register → Dashboard (Sentiment AI) → Admin panel
```

---

## Features

### Security
- **JWT authentication** — HS256 signed tokens, configurable expiry
- **Role-Based Access Control (RBAC)** — `user` vs `admin` roles enforced on every protected route
- **Per-role rate limiting** — 10 req/min (user) · 100 req/min (admin) via SlowAPI
- **Adaptive IP blocking** — auto-blocks IPs exceeding 50 req/min; admin can unblock via API
- **Password hashing** — bcrypt with salt rounds; raw passwords never stored
- **No stack traces exposed** — all 4xx/5xx responses return `{"error": "..."}` only

### AI Inference
- **DistilBERT sentiment classifier** — fine-tuned on SST-2; 97% accuracy on GLUE benchmark
- **Runs on-server** — zero external API calls, zero cost per inference
- **Rate-limited per role** — prevents abuse of the inference endpoint
- **JWT-gated** — only authenticated users can access `/ai/analyze`

### Observability
- **Dual request logging** — every request logged to local file + Supabase `api_logs` table
- **Admin stats endpoint** — total requests, error rate, top endpoints, recent logs
- **Admin user management** — list users, block/unblock accounts, view blocked IPs

### Frontend
- **React 18 + Vite + Tailwind CSS** — responsive dark-mode UI
- **Auth flows** — register, login, JWT refresh, protected routes
- **Sentiment dashboard** — live text input, confidence bar, quick examples
- **Admin panel** — usage stats, user table, blocked IP management

---

## API Reference

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | None | Register new user |
| `POST` | `/auth/login` | None | Login — returns JWT |
| `GET` | `/auth/me` | Bearer JWT | Current user profile |

### AI

| Method | Path | Auth | Rate limit | Description |
|--------|------|------|---|-------------|
| `POST` | `/ai/analyze` | Bearer JWT | 10/min (user) · 100/min (admin) | Sentiment analysis via DistilBERT |
| `GET` | `/ai/health` | None | — | Model load status |

**Request:**
```json
POST /ai/analyze
{ "text": "The product exceeded all my expectations!" }
```

**Response:**
```json
{
  "label": "POSITIVE",
  "score": 0.9998,
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Admin (`role=admin` only)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/stats` | Usage stats — totals, error rate, top endpoints |
| `GET` | `/admin/users` | List all users |
| `PATCH` | `/admin/users/{id}/block` | Deactivate a user account |
| `GET` | `/admin/blocked-ips` | List currently blocked IPs |
| `POST` | `/admin/unblock/{ip}` | Remove IP from block list |

### System

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Liveness check |
| `GET` | `/health` | Health check |

---

## Rate Limiting

| Role | `/ai/analyze` | Adaptive block trigger |
|------|---------------|------------------------|
| `user` | 10 req / min | Auto-blocked at 50 req/min from same IP |
| `admin` | 100 req / min | Same adaptive block applies |

Blocked IPs receive `HTTP 429` with `{"error": "...", "retry_after": "60s"}` until manually unblocked.

---

## Quick Start (Local)

```bash
# 1. Clone
git clone https://github.com/Prasadkannawar/secure-ai-backend-system.git
cd secure-ai-backend-system

# 2. Configure environment
cp .env.example .env
# Edit .env — add SUPABASE_URL, SUPABASE_KEY, SECRET_KEY

# 3. Run Supabase migration
# Go to Supabase Dashboard → SQL Editor → paste migrations/001_initial_schema.sql → Run

# 4. Start backend
docker compose up --build
# API live at http://localhost:8000
# Swagger docs at http://localhost:8000/docs

# 5. Start frontend (separate terminal)
cd frontend
npm install
npm run dev
# UI live at http://localhost:3000
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Supabase service role key (bypasses RLS) |
| `SECRET_KEY` | JWT signing secret (min 32 chars) |
| `ALGORITHM` | JWT algorithm — default `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime — default `60` |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API framework | FastAPI 0.115 + Pydantic v2 |
| AI model | `distilbert-base-uncased-finetuned-sst-2-english` via HuggingFace |
| Auth | python-jose (JWT) + passlib + bcrypt |
| Rate limiting | SlowAPI (wraps limits-library) |
| Database | Supabase (PostgreSQL) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Containerisation | Docker + docker-compose |
| Backend deploy | Railway |
| Frontend deploy | Vercel |

---

## Promote a User to Admin

```sql
-- Run in Supabase SQL Editor
UPDATE public.users SET role = 'admin' WHERE email = 'your@email.com';
```

---

## Project Structure

```
secure-ai-backend-system/
├── app/
│   ├── main.py              # FastAPI app, middleware wiring, startup
│   ├── config.py            # Pydantic settings (env vars)
│   ├── database.py          # Supabase client singleton
│   ├── models/user.py       # Pydantic schemas — UserCreate, UserOut, Token
│   ├── routers/
│   │   ├── auth.py          # Register, login, /me
│   │   ├── ai.py            # DistilBERT sentiment endpoint
│   │   └── admin.py         # Stats, user management, IP control
│   ├── middleware/
│   │   ├── logger.py        # Request logging middleware
│   │   └── rate_limiter.py  # SlowAPI setup + adaptive IP blocker
│   └── utils/security.py    # JWT creation/verification, password hashing
├── frontend/                # React + Vite + Tailwind
├── migrations/              # SQL schema migrations
├── tests/                   # pytest test suite
├── Dockerfile
├── docker-compose.yml
└── .env.example
```
