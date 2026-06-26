import logging

from transformers import pipeline, Pipeline
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.middleware.rate_limiter import limiter, role_limit
from app.models.user import UserOut
from app.utils.security import get_current_user

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model — DistilBERT fine-tuned on SST-2 (binary sentiment classification)
# ---------------------------------------------------------------------------

_model: Pipeline | None = None


def load_model() -> Pipeline:
    logger.info("Loading DistilBERT sentiment model...")
    model = pipeline(
        "text-classification",
        model="distilbert-base-uncased-finetuned-sst-2-english",
        device=-1,  # CPU inference
    )
    logger.info("Sentiment model ready.")
    return model


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class SentimentRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000, description="Text to classify")


class SentimentResponse(BaseModel):
    label: str          # "POSITIVE" or "NEGATIVE"
    score: float        # confidence 0–1
    user_id: str


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter()


@router.get("/health")
async def ai_health():
    return {
        "status": "ok" if _model is not None else "loading",
        "model": "distilbert-base-uncased-finetuned-sst-2-english",
    }


@router.post("/analyze", response_model=SentimentResponse)
@limiter.limit(role_limit)
async def analyze(
    request: Request,
    body: SentimentRequest,
    current_user: UserOut = Depends(get_current_user),
):
    if _model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is still loading — retry in a moment",
        )
    try:
        result = _model(body.text[:512])[0]   # DistilBERT max context = 512 tokens
        return SentimentResponse(
            label=result["label"],
            score=round(float(result["score"]), 4),
            user_id=current_user.id,
        )
    except Exception as e:
        logger.error(f"Inference failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Inference failed",
        )
