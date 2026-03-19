import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# ---------------------------------------------------------------------------
# File logger — writes to logs/requests.log next to the project root
# ---------------------------------------------------------------------------

LOG_DIR = Path(__file__).resolve().parents[2] / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / "requests.log"

file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
file_handler.setFormatter(logging.Formatter("%(message)s"))

file_logger = logging.getLogger("request_file_logger")
file_logger.setLevel(logging.INFO)
file_logger.addHandler(file_handler)
file_logger.propagate = False  # Don't double-print to console

# Console logger (keeps existing behaviour)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
console_logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helper: extract user_id from Bearer token without raising
# ---------------------------------------------------------------------------

def _extract_user_id(request: Request) -> str | None:
    try:
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return None
        from app.utils.security import decode_token
        payload = decode_token(auth.split(" ", 1)[1])
        # Token carries 'sub' (email); fetch id from DB would be expensive here,
        # so we store the email as the user identifier in the log.
        return payload.get("sub")
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

class RequestLogger(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Check adaptive IP block before forwarding the request
        from app.middleware.rate_limiter import enforce_ip_block
        client_ip = request.client.host if request.client else "unknown"
        blocked_response = enforce_ip_block(client_ip)
        if blocked_response is not None:
            return blocked_response

        response = await call_next(request)

        timestamp = datetime.now(timezone.utc).isoformat()
        user_id = _extract_user_id(request)
        endpoint = request.url.path
        method = request.method
        status_code = response.status_code

        # 1. Write to local log file
        file_logger.info(
            f"[{timestamp}] {method} {endpoint} {status_code} {user_id or 'anonymous'}"
        )

        # 2. Persist to Supabase api_logs (fire-and-forget; errors are non-fatal)
        try:
            from app.database import get_db
            db = get_db()
            db.table("api_logs").insert({
                "user_id": None,          # uuid FK — null for anonymous / non-uuid email
                "endpoint": endpoint,
                "status_code": status_code,
                "timestamp": timestamp,
            }).execute()
        except Exception as exc:
            console_logger.warning(f"Failed to write api_log to Supabase: {exc}")

        return response


# Keep old name as alias so existing import in main.py still works
LoggingMiddleware = RequestLogger
