from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.database import get_db
from app.middleware.rate_limiter import blocked_ips
from app.models.user import UserOut
from app.utils.security import require_admin

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class StatsResponse(BaseModel):
    total_requests: int
    requests_last_hour: int
    top_endpoints: List[dict]
    error_rate: float


class AdminUserOut(BaseModel):
    id: str
    email: str
    role: str
    is_active: bool


# ---------------------------------------------------------------------------
# GET /admin/stats
# ---------------------------------------------------------------------------

@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    db=Depends(get_db),
    _: UserOut = Depends(require_admin),
):
    # Total requests
    total_resp = db.table("api_logs").select("id", count="exact").execute()
    total_requests: int = total_resp.count or 0

    # Requests in the last hour
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    last_hour_resp = (
        db.table("api_logs")
        .select("id", count="exact")
        .gte("timestamp", one_hour_ago)
        .execute()
    )
    requests_last_hour: int = last_hour_resp.count or 0

    # Top 5 endpoints by hit count
    all_logs = db.table("api_logs").select("endpoint, status_code").execute()
    endpoint_counts: dict[str, int] = {}
    error_count = 0

    for row in (all_logs.data or []):
        ep = row["endpoint"]
        endpoint_counts[ep] = endpoint_counts.get(ep, 0) + 1
        if row["status_code"] >= 400:
            error_count += 1

    top_endpoints = [
        {"endpoint": ep, "count": cnt}
        for ep, cnt in sorted(endpoint_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    error_rate = round(error_count / total_requests, 4) if total_requests > 0 else 0.0

    return StatsResponse(
        total_requests=total_requests,
        requests_last_hour=requests_last_hour,
        top_endpoints=top_endpoints,
        error_rate=error_rate,
    )


# ---------------------------------------------------------------------------
# GET /admin/users
# ---------------------------------------------------------------------------

@router.get("/users", response_model=List[AdminUserOut])
async def list_users(
    db=Depends(get_db),
    _: UserOut = Depends(require_admin),
):
    result = db.table("users").select("id, email, role, is_active").execute()
    return [AdminUserOut(**row) for row in (result.data or [])]


# ---------------------------------------------------------------------------
# PATCH /admin/users/{user_id}/block
# ---------------------------------------------------------------------------

@router.patch("/users/{user_id}/block", response_model=AdminUserOut)
async def block_user(
    user_id: str,
    db=Depends(get_db),
    _: UserOut = Depends(require_admin),
):
    # Verify user exists
    check = db.table("users").select("id").eq("id", user_id).single().execute()
    if not check.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    result = (
        db.table("users")
        .update({"is_active": False})
        .eq("id", user_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to block user",
        )

    return AdminUserOut(**result.data[0])


# ---------------------------------------------------------------------------
# GET /admin/blocked-ips
# ---------------------------------------------------------------------------

@router.get("/blocked-ips")
async def get_blocked_ips(_: UserOut = Depends(require_admin)):
    return {"blocked_ips": sorted(blocked_ips)}


# ---------------------------------------------------------------------------
# POST /admin/unblock/{ip}
# ---------------------------------------------------------------------------

@router.post("/unblock/{ip}")
async def unblock_ip(ip: str, _: UserOut = Depends(require_admin)):
    if ip not in blocked_ips:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"IP {ip} is not in the blocked list",
        )
    blocked_ips.discard(ip)
    return {"message": f"IP {ip} has been unblocked"}
