"""
test_ai.py — tests for /ai/predict and /ai/health
"""

import pytest
from fastapi.testclient import TestClient

VALID_INPUT = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0]


# ---------------------------------------------------------------------------
# /ai/health
# ---------------------------------------------------------------------------

def test_health_public(client: TestClient):
    resp = client.get("/ai/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


# ---------------------------------------------------------------------------
# /ai/predict
# ---------------------------------------------------------------------------

def test_predict_success(client: TestClient, auth_headers: dict):
    resp = client.post("/ai/predict", json={"input_data": VALID_INPUT}, headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "prediction" in body
    assert isinstance(body["prediction"], list)
    assert len(body["prediction"]) > 0
    assert "user_id" in body


def test_predict_no_auth(client: TestClient):
    resp = client.post("/ai/predict", json={"input_data": VALID_INPUT})
    assert resp.status_code == 401


def test_predict_invalid_input_string(client: TestClient, auth_headers: dict):
    resp = client.post("/ai/predict", json={"input_data": ["a", "b"]}, headers=auth_headers)
    assert resp.status_code == 422


def test_predict_input_too_long(client: TestClient, auth_headers: dict):
    long_input = [1.0] * 513
    resp = client.post("/ai/predict", json={"input_data": long_input}, headers=auth_headers)
    assert resp.status_code == 422


def test_predict_empty_input(client: TestClient, auth_headers: dict):
    resp = client.post("/ai/predict", json={"input_data": []}, headers=auth_headers)
    assert resp.status_code == 422


def test_rate_limit(client: TestClient, auth_headers: dict):
    """
    The user tier is limited to 10/minute. Send 11 requests and assert
    the 11th is rejected with 429.

    Note: SlowAPI tracks by IP. TestClient uses 127.0.0.1 as the client
    address, so rate limit state carries over across test calls in the same
    session. We isolate by checking that *at some point* a 429 is returned.
    """
    responses = [
        client.post("/ai/predict", json={"input_data": VALID_INPUT}, headers=auth_headers)
        for _ in range(11)
    ]
    status_codes = [r.status_code for r in responses]
    assert 429 in status_codes, f"Expected a 429 among: {status_codes}"
