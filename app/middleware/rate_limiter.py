import time
from collections import defaultdict
from threading import Lock

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# ---------------------------------------------------------------------------
# Shared limiter — imported by routers and mounted on app.state in main.py
# SWAP: use Redis for multi-worker deployments:
# limiter = Limiter(key_func=get_remote_address, storage_uri="redis://localhost:6379")
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address)


# ---------------------------------------------------------------------------
# Adaptive IP blocking — in-memory, resets every 60 seconds per IP window
# ---------------------------------------------------------------------------

_WINDOW_SECONDS = 60
_MAX_REQUESTS = 50

# {ip: (window_start_timestamp, request_count)}
_ip_counters: dict[str, tuple[float, int]] = defaultdict(lambda: (0.0, 0))
_counter_lock = Lock()

# Permanently blocked IPs (until manually unblocked via admin route)
blocked_ips: set[str] = set()


def _check_and_track_ip(ip: str) -> bool:
    """
    Increment the request counter for `ip`.
    Returns True if the IP should be blocked (exceeded threshold this window).
    """
    now = time.monotonic()
    with _counter_lock:
        window_start, count = _ip_counters[ip]

        # Reset window if 60 s have elapsed
        if now - window_start >= _WINDOW_SECONDS:
            _ip_counters[ip] = (now, 1)
            return False

        count += 1
        _ip_counters[ip] = (window_start, count)

        if count > _MAX_REQUESTS:
            blocked_ips.add(ip)
            return True

    return False


# ---------------------------------------------------------------------------
# Role-based limit string (callable passed to @limiter.limit())
# ---------------------------------------------------------------------------

def role_limit(request: Request) -> str:
    """
    Returns "100/minute" for admins, "10/minute" for everyone else.
    Evaluated per-request by SlowAPI.
    """
    try:
        from app.utils.security import decode_token
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return "10/minute"
        payload = decode_token(auth_header.split(" ", 1)[1])
        if payload.get("role") == "admin":
            return "100/minute"
    except Exception:
        pass
    return "10/minute"


# ---------------------------------------------------------------------------
# Middleware hook — called from RequestLogger before passing to next handler
# ---------------------------------------------------------------------------

def enforce_ip_block(ip: str) -> JSONResponse | None:
    """
    Returns a 429 JSONResponse if the IP is already blocked or just crossed
    the threshold. Returns None if the request should proceed.
    """
    if ip in blocked_ips:
        return JSONResponse(
            status_code=429,
            content={"error": "Your IP has been blocked due to excessive requests", "retry_after": "60s"},
        )
    if _check_and_track_ip(ip):
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded", "retry_after": "60s"},
        )
    return None


# ---------------------------------------------------------------------------
# Custom SlowAPI 429 handler
# ---------------------------------------------------------------------------

async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"error": "Rate limit exceeded", "retry_after": "60s"},
    )
