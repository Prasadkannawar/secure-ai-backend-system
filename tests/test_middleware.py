"""
test_middleware.py — tests for RequestLogger and adaptive IP blocking
"""

import time
import pytest
from fastapi.testclient import TestClient

from app.middleware.rate_limiter import (
    _ip_counters,
    _counter_lock,
    _MAX_REQUESTS,
    blocked_ips,
    enforce_ip_block,
)
from app.database import get_db
from app.middleware.logger import LOG_FILE


# ---------------------------------------------------------------------------
# Supabase api_logs persistence
# ---------------------------------------------------------------------------

def test_request_logged_to_supabase(client: TestClient):
    """Any request should produce a new row in api_logs."""
    db = get_db()

    # Count rows before
    before = db.table("api_logs").select("id", count="exact").execute()
    count_before = before.count or 0

    client.get("/health")

    # Count rows after — allow a moment for the async write
    after = db.table("api_logs").select("id", count="exact").execute()
    count_after = after.count or 0

    assert count_after > count_before, "Expected a new api_log row after the request"


def test_request_logged_to_file(client: TestClient):
    """A request to a known path should appear in the last lines of requests.log."""
    target_path = "/health"
    client.get(target_path)

    assert LOG_FILE.exists(), "requests.log was not created"
    lines = LOG_FILE.read_text(encoding="utf-8").splitlines()
    recent = "\n".join(lines[-20:])  # check last 20 lines
    assert target_path in recent, f"Expected '{target_path}' in log tail:\n{recent}"


# ---------------------------------------------------------------------------
# Adaptive IP blocking
# ---------------------------------------------------------------------------

def _reset_ip(ip: str):
    """Helper: clear counter and blocked state for a test IP."""
    with _counter_lock:
        _ip_counters.pop(ip, None)
    blocked_ips.discard(ip)


def test_adaptive_block_triggers(client: TestClient, auth_headers: dict):
    """
    Directly manipulate the counter to simulate 51 requests from a test IP,
    then assert enforce_ip_block blocks the 52nd.
    """
    test_ip = "10.0.0.1"
    _reset_ip(test_ip)

    # Prime the counter to one below the threshold
    with _counter_lock:
        _ip_counters[test_ip] = (time.monotonic(), _MAX_REQUESTS)

    # This call should tip it over the limit and block the IP
    result = enforce_ip_block(test_ip)
    assert result is not None, "Expected a 429 response when threshold exceeded"
    assert result.status_code == 429

    # Subsequent calls should also be blocked
    result2 = enforce_ip_block(test_ip)
    assert result2 is not None
    assert result2.status_code == 429

    _reset_ip(test_ip)


def test_blocked_ip_gets_429(client: TestClient):
    """Manually add an IP to blocked_ips and verify enforce_ip_block returns 429."""
    test_ip = "192.168.99.99"
    _reset_ip(test_ip)

    blocked_ips.add(test_ip)
    result = enforce_ip_block(test_ip)

    assert result is not None
    assert result.status_code == 429
    body_bytes = b"".join(result.body_iterator if hasattr(result, "body_iterator") else [result.body])
    assert b"blocked" in body_bytes.lower() or b"rate limit" in body_bytes.lower()

    _reset_ip(test_ip)
