"""
conftest.py — shared fixtures for the entire test suite.

Environment:
  Copy .env.example → .env.test and fill in test Supabase credentials.
  pytest-dotenv loads .env.test automatically (configured in pytest.ini).
  Using the same Supabase project is fine; all test users are email-prefixed
  with "testuser_" and are deleted in the session-scoped teardown.
"""

import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db

# ---------------------------------------------------------------------------
# Unique suffix so parallel runs don't collide
# ---------------------------------------------------------------------------
_RUN_ID = uuid.uuid4().hex[:8]
TEST_USER_EMAIL = f"testuser_{_RUN_ID}@example.com"
TEST_USER_PASSWORD = "TestPass123!"
TEST_ADMIN_EMAIL = f"testadmin_{_RUN_ID}@example.com"
TEST_ADMIN_PASSWORD = "AdminPass123!"


# ---------------------------------------------------------------------------
# Session-wide TestClient
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def client() -> TestClient:
    """Single TestClient reused across the whole test session."""
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


# ---------------------------------------------------------------------------
# Token fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def user_token(client: TestClient) -> str:
    """Register a regular user and return their JWT."""
    client.post(
        "/auth/register",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
    )
    resp = client.post(
        "/auth/login",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
    )
    assert resp.status_code == 200, f"user_token fixture login failed: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture(scope="session")
def admin_token(client: TestClient) -> str:
    """
    Register a user, promote them to admin in Supabase, then log in and
    return their JWT.
    """
    client.post(
        "/auth/register",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD},
    )
    # Promote to admin directly via the Supabase client (bypasses API)
    db = get_db()
    db.table("users").update({"role": "admin"}).eq("email", TEST_ADMIN_EMAIL).execute()

    resp = client.post(
        "/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD},
    )
    assert resp.status_code == 200, f"admin_token fixture login failed: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture
def auth_headers(user_token: str) -> dict:
    """Authorization headers for the regular test user."""
    return {"Authorization": f"Bearer {user_token}"}


@pytest.fixture
def admin_headers(admin_token: str) -> dict:
    """Authorization headers for the admin test user."""
    return {"Authorization": f"Bearer {admin_token}"}


# ---------------------------------------------------------------------------
# Session teardown — remove all test users from Supabase
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session", autouse=True)
def cleanup_test_users():
    """Delete test users created during this session after all tests finish."""
    yield
    db = get_db()
    db.table("users").delete().like("email", "testuser_%@example.com").execute()
    db.table("users").delete().like("email", "testadmin_%@example.com").execute()
