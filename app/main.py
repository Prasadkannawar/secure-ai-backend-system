from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.middleware.logger import LOG_FILE, RequestLogger
from app.middleware.rate_limiter import limiter, rate_limit_exceeded_handler
from app.routers import ai, auth, admin

app = FastAPI(
    title="Secure AI Backend",
    description="A secure FastAPI backend with AI capabilities",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# SlowAPI — attach shared limiter and custom 429 handler
# ---------------------------------------------------------------------------
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# ---------------------------------------------------------------------------
# Global HTTP exception handler — no stack traces exposed to clients
# ---------------------------------------------------------------------------
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
    )

# ---------------------------------------------------------------------------
# Middleware (order matters: added last = runs first)
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Replace with explicit origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLogger)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])

# ---------------------------------------------------------------------------
# Startup event
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def on_startup():
    from datetime import datetime, timezone
    from app.services.ai_engine import engine

    engine.load()

    timestamp = datetime.now(timezone.utc).isoformat()
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{timestamp}] SERVER STARTED\n")


# ---------------------------------------------------------------------------
# Root & health
# ---------------------------------------------------------------------------
@app.get("/")
async def root():
    return {"message": "Secure AI Backend is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
