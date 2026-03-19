"""
test_auth.py — tests for /auth/register, /auth/login, /auth/me
"""

import uuid
import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# /auth/register
# ---------------------------------------------------------------------------

def test_register_success(client: TestClient):
    email = f"reg_{uuid.uuid4().hex[:6]}@example.com"
    resp = client.post("/auth/register", json={"email": email, "password": "ValidPass1!"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == email
    assert body["role"] == "user"


def test_register_duplicate_email(client: TestClient):
    email = f"dup_{uuid.uuid4().hex[:6]}@example.com"
    client.post("/auth/register", json={"email": email, "password": "ValidPass1!"})
    resp = client.post("/auth/register", json={"email": email, "password": "ValidPass1!"})
    assert resp.status_code == 409


def test_register_invalid_email(client: TestClient):
    resp = client.post("/auth/register", json={"email": "notanemail", "password": "ValidPass1!"})
    assert resp.status_code == 422


def test_register_short_password(client: TestClient):
    email = f"short_{uuid.uuid4().hex[:6]}@example.com"
    resp = client.post("/auth/register", json={"email": email, "password": "abc"})
    # Pydantic min_length=6 enforced on UserCreate
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# /auth/login
# ---------------------------------------------------------------------------

def test_login_success(client: TestClient, user_token: str):
    # user_token fixture already logs in successfully; verify the token shape here
    from tests.conftest import TEST_USER_EMAIL, TEST_USER_PASSWORD
    resp = client.post(
        "/auth/login",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_login_wrong_password(client: TestClient):
    from tests.conftest import TEST_USER_EMAIL
    resp = client.post(
        "/auth/login",
        json={"email": TEST_USER_EMAIL, "password": "WrongPassword!"},
    )
    assert resp.status_code == 401


def test_login_nonexistent_user(client: TestClient):
    resp = client.post(
        "/auth/login",
        json={"email": "nobody_exists@example.com", "password": "whatever"},
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# /auth/me
# ---------------------------------------------------------------------------

def test_get_me_authenticated(client: TestClient, auth_headers: dict):
    from tests.conftest import TEST_USER_EMAIL
    resp = client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == TEST_USER_EMAIL


def test_get_me_no_token(client: TestClient):
    resp = client.get("/auth/me")
    assert resp.status_code == 401


def test_get_me_invalid_token(client: TestClient):
    resp = client.get("/auth/me", headers={"Authorization": "Bearer faketoken"})
    assert resp.status_code == 401
