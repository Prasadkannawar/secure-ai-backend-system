# secure-ai-backend

A production-ready FastAPI backend with JWT authentication, Supabase persistence, PyTorch AI inference, adaptive rate limiting, and an admin dashboard.

---

## Architecture

```
                        ┌─────────────────────────────────────────┐
                        │            Docker Container              │
                        │                                         │
 Client (HTTP)          │  ┌──────────────────────────────────┐   │
    │                   │  │        FastAPI (uvicorn x2)       │   │
    │  HTTPS request    │  │                                   │   │
    └──────────────────►│  │  ┌────────────┐  Middleware:      │   │
                        │  │  │  /auth/*   │  - RequestLogger  │   │
                        │  │  │  /ai/*     │  - CORS           │   │
                        │  │  │  /admin/*  │  - IP blocker     │   │
                        │  │  └─────┬──────┘  - SlowAPI        │   │
                        │  └────────┼─────────────────────────-┘   │
                        │           │                               │
                        └───────────┼───────────────────────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │         Supabase (cloud)       │
                    │  ┌──────────┐  ┌───────────┐  │
                    │  │  users   │  │ api_logs  │  │
                    │  └──────────┘  └───────────┘  │
                    └────────────────────────────────┘
```

---

## Setup

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd secure-ai-backend

# 2. Copy environment template and fill in real values
cp .env.example .env
# Edit .env — set SUPABASE_URL, SUPABASE_KEY (service_role), and SECRET_KEY

# 3. Run the SQL migration in Supabase
# Dashboard → SQL Editor → paste contents of migrations/001_initial_schema.sql → Run

# 4. Build and start the container
docker compose up --build

# Server is live at http://localhost:8000
# Interactive API docs: http://localhost:8000/docs
```

---

## API Endpoints

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | None | Register a new user |
| POST | `/auth/login` | None | Login, returns JWT token |
| GET | `/auth/me` | Bearer JWT | Get current user profile |

### AI

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/ai/predict` | Bearer JWT | Run model inference on input floats |
| GET | `/ai/health` | None | Check if model is loaded |

### Admin (role=admin only)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/stats` | Bearer JWT (admin) | API usage stats — totals, top endpoints, error rate |
| GET | `/admin/users` | Bearer JWT (admin) | List all users |
| PATCH | `/admin/users/{user_id}/block` | Bearer JWT (admin) | Deactivate a user account |
| GET | `/admin/blocked-ips` | Bearer JWT (admin) | List currently blocked IPs |
| POST | `/admin/unblock/{ip}` | Bearer JWT (admin) | Remove an IP from the block list |

### System

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | None | Service liveness check |
| GET | `/health` | None | Health check |

---

## Rate Limiting

| Role | Limit on `/ai/predict` | Adaptive block |
|------|------------------------|----------------|
| user | 10 requests / minute | Auto-blocked after 50 req/min from same IP |
| admin | 100 requests / minute | Same adaptive block applies |

Blocked IPs receive `HTTP 429` with `{"error": "...", "retry_after": "60s"}` on every request until manually unblocked via `/admin/unblock/{ip}`.

---

## Request Logging

Every request is logged to two places:

- **`logs/requests.log`** — local file: `[TIMESTAMP] METHOD /path STATUS user_or_anonymous`
- **Supabase `api_logs` table** — queryable from the admin stats endpoint

---

## Swapping in a Real AI Model

In [app/routers/ai.py](app/routers/ai.py), find the `# SWAP` comment in `load_model()` and replace the dummy model:

```python
# Replace this:
model = _DummyLinear()

# With this:
model = torch.load("models/your_model.pt", map_location="cpu")
```

Then mount your model file into the container via `docker-compose.yml`:

```yaml
volumes:
  - ./models:/home/appuser/app/models
```

---

## Promoting a User to Admin

Run this in the Supabase SQL Editor:

```sql
UPDATE public.users SET role = 'admin' WHERE email = 'your@email.com';
```
