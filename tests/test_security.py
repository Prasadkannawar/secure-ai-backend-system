"""
test_security.py — unit tests for utils/security.py (no HTTP, no DB)
"""

from datetime import timedelta

import pytest
from fastapi import HTTPException
from jose import jwt

from app.config import settings
from app.utils.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

def test_hash_password_not_plaintext():
    assert hash_password("secret") != "secret"


def test_verify_password_correct():
    hashed = hash_password("secret")
    assert verify_password("secret", hashed) is True


def test_verify_password_wrong():
    hashed = hash_password("secret")
    assert verify_password("wrong", hashed) is False


# ---------------------------------------------------------------------------
# JWT creation
# ---------------------------------------------------------------------------

def test_create_token_returns_string():
    token = create_access_token({"sub": "test@test.com"})
    assert isinstance(token, str)
    assert len(token) > 0


# ---------------------------------------------------------------------------
# JWT decoding
# ---------------------------------------------------------------------------

def test_decode_valid_token():
    token = create_access_token({"sub": "x@x.com"})
    payload = decode_token(token)
    assert payload["sub"] == "x@x.com"


def test_decode_invalid_token():
    with pytest.raises(HTTPException) as exc_info:
        decode_token("this.is.not.a.valid.jwt")
    assert exc_info.value.status_code == 401


def test_decode_expired_token():
    """Craft a token whose expiry is in the past."""
    from datetime import datetime
    to_encode = {"sub": "expired@test.com"}
    expire = datetime.utcnow() + timedelta(seconds=-1)
    to_encode["exp"] = expire
    expired_token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    with pytest.raises(HTTPException) as exc_info:
        decode_token(expired_token)
    assert exc_info.value.status_code == 401
