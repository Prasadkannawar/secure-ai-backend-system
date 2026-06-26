import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.middleware.rate_limiter import limiter, role_limit
from app.models.user import UserOut
from app.utils.security import get_current_user
from app.services.ai_engine import engine
from app.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)

class BatchRequest(BaseModel):
    texts: list[str] = Field(..., min_items=1, max_items=10)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _guard():
    if not engine.is_ready:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Models are still loading — retry in a moment")

def _save(db, user_id: str, mode: str, text: str, result: dict):
    try:
        db.table("analyses").insert({
            "user_id":    user_id,
            "mode":       mode,
            "input_text": text[:500],
            "result":     result,
        }).execute()
    except Exception as e:
        logger.warning(f"Could not persist analysis: {e}")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/health")
async def ai_health():
    return {
        "status": "ok" if engine.is_ready else "loading",
        "models": {
            "sentiment": "distilbert-base-uncased-finetuned-sst-2-english",
            "emotion":   "j-hartmann/emotion-english-distilroberta-base",
        },
    }


@router.post("/analyze/sentiment")
@limiter.limit(role_limit)
async def analyze_sentiment(
    request: Request,
    body: AnalyzeRequest,
    current_user: UserOut = Depends(get_current_user),
    db=Depends(get_db),
):
    _guard()
    result = engine.analyze_sentiment(body.text)
    _save(db, current_user.id, "sentiment", body.text, result)
    return {**result, "user_id": current_user.id}


@router.post("/analyze/emotion")
@limiter.limit(role_limit)
async def analyze_emotion(
    request: Request,
    body: AnalyzeRequest,
    current_user: UserOut = Depends(get_current_user),
    db=Depends(get_db),
):
    _guard()
    result = engine.analyze_emotion(body.text)
    _save(db, current_user.id, "emotion", body.text, result)
    return {**result, "user_id": current_user.id}


@router.post("/analyze/full")
@limiter.limit(role_limit)
async def analyze_full(
    request: Request,
    body: AnalyzeRequest,
    current_user: UserOut = Depends(get_current_user),
    db=Depends(get_db),
):
    _guard()
    result = engine.analyze_full(body.text)
    _save(db, current_user.id, "full", body.text, result)
    return {**result, "user_id": current_user.id}


@router.post("/analyze/batch")
@limiter.limit(role_limit)
async def analyze_batch(
    request: Request,
    body: BatchRequest,
    current_user: UserOut = Depends(get_current_user),
    db=Depends(get_db),
):
    _guard()
    results = engine.analyze_batch(body.texts)
    _save(db, current_user.id, "batch",
          f"[batch of {len(body.texts)} texts]",
          {"results": results})
    return {"count": len(results), "results": results, "user_id": current_user.id}


@router.get("/history")
@limiter.limit("30/minute")
async def history(
    request: Request,
    limit: int = 20,
    current_user: UserOut = Depends(get_current_user),
    db=Depends(get_db),
):
    try:
        rows = (
            db.table("analyses")
            .select("id, mode, input_text, result, created_at")
            .eq("user_id", current_user.id)
            .order("created_at", desc=True)
            .limit(min(limit, 50))
            .execute()
        )
        return rows.data or []
    except Exception as e:
        logger.error(f"History fetch failed: {e}")
        raise HTTPException(500, "Could not fetch history")
