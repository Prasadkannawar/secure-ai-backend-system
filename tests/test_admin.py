"""
test_admin.py — tests for /admin/* endpoints
"""

import pytest
from fastapi.testclient import TestClient

from app.database import get_db
from app.middleware.rate_limiter import blocked_ips


# ---------------------------------------------------------------------------
# /admin/stats
# ---------------------------------------------------------------------------

def test_stats_as_admin(client: TestClient, admin_headers: dict):
    resp = client.get("/admin/stats", headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body["total_requests"], int)
    assert isinstance(body["requests_last_hour"], int)
    assert isinstance(body["top_endpoints"], list)
    assert isinstance(body["error_rate"], float)


def test_stats_as_user(client: TestClient, auth_headers: dict):
    resp = client.get("/admin/stats", headers=auth_headers)
    assert resp.status_code == 403


def test_stats_no_auth(client: TestClient):
    resp = client.get("/admin/stats")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# /admin/users
# ---------------------------------------------------------------------------

def test_get_users_as_admin(client: TestClient, admin_headers: dict):
    resp = client.get("/admin/users", headers=admin_headers)
    assert resp.status_code == 200
    users = resp.json()
    assert isinstance(users, list)
    assert len(users) >= 1
    for u in users:
        assert "id" in u
        assert "email" in u
        assert "role" in u


# ---------------------------------------------------------------------------
# /admin/users/{user_id}/block + blocked user login
# ---------------------------------------------------------------------------

def test_block_user(client: TestClient, admin_headers: dict):
    """Create a fresh user, block them, verify is_active=False in Supabase."""
    import uuid
    email = f"toblock_{uuid.uuid4().hex[:6]}@example.com"
    reg = client.post("/auth/register", json={"email": email, "password": "BlockMe123!"})
    assert reg.status_code == 201
    user_id = reg.json()["id"]

    resp = client.patch(f"/admin/users/{user_id}/block", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False

    # Confirm directly in Supabase
    db = get_db()
    row = db.table("users").select("is_active").eq("id", user_id).single().execute()
    assert row.data["is_active"] is False


def test_blocked_user_cannot_login(client: TestClient, admin_headers: dict):
    """Block a user then confirm their login is rejected."""
    import uuid
    email = f"blockedlogin_{uuid.uuid4().hex[:6]}@example.com"
    password = "BlockedPass1!"

    reg = client.post("/auth/register", json={"email": email, "password": password})
    assert reg.status_code == 201
    user_id = reg.json()["id"]

    client.patch(f"/admin/users/{user_id}/block", headers=admin_headers)

    login_resp = client.post("/auth/login", json={"email": email, "password": password})
    assert login_resp.status_code == 403


# ---------------------------------------------------------------------------
# /admin/blocked-ips + /admin/unblock/{ip}
# ---------------------------------------------------------------------------

def test_blocked_ips_list(client: TestClient, admin_headers: dict):
    resp = client.get("/admin/blocked-ips", headers=admin_headers)
    assert resp.status_code == 200
    assert "blocked_ips" in resp.json()
    assert isinstance(resp.json()["blocked_ips"], list)


def test_unblock_ip(client: TestClient, admin_headers: dict):
    test_ip = "1.2.3.4"
    blocked_ips.add(test_ip)

    resp = client.post(f"/admin/unblock/{test_ip}", headers=admin_headers)
    assert resp.status_code == 200
    assert test_ip not in blocked_ips
