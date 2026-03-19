from contextlib import asynccontextmanager
from typing import List

import torch
import torch.nn as nn
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.middleware.rate_limiter import limiter, role_limit
from app.models.user import UserOut
from app.utils.security import get_current_user

# ---------------------------------------------------------------------------
# Model definition & global state
# ---------------------------------------------------------------------------

class _DummyLinear(nn.Module):
    """
    Placeholder 8→4 linear model used for development.
    SWAP: replace with torch.load("path/to/your_model.pt") below.
    """
    def __init__(self):
        super().__init__()
        self.fc = nn.Linear(8, 4)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.fc(x)


# Global model reference — populated during startup
_model: nn.Module | None = None


def load_model() -> nn.Module:
    # SWAP: replace the two lines below with your real model loading logic
    # e.g.: model = torch.load("models/my_model.pt", map_location="cpu")
    model = _DummyLinear()
    model.eval()
    return model


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class PredictRequest(BaseModel):
    input_data: List[float]


class PredictResponse(BaseModel):
    prediction: List[float]
    user_id: str


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter()


@router.get("/health")
async def ai_health():
    """Public endpoint — confirms the model is loaded."""
    return {"status": "ok", "model": "loaded" if _model is not None else "not loaded"}


@router.post("/predict", response_model=PredictResponse)
@limiter.limit(role_limit)          # "10/minute" for user, "100/minute" for admin
async def predict(
    request: Request,
    body: PredictRequest,
    current_user: UserOut = Depends(get_current_user),
):
    # --- Input sanitization ---
    if len(body.input_data) == 0 or len(body.input_data) > 512:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="input_data must contain between 1 and 512 float values",
        )
    for i, v in enumerate(body.input_data):
        if not isinstance(v, (int, float)) or v != v:  # NaN check
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Non-float value at index {i}: {v}",
            )

    if _model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not loaded",
        )

    # --- Inference ---
    try:
        with torch.no_grad():
            tensor = torch.tensor(body.input_data, dtype=torch.float32).unsqueeze(0)
            output: torch.Tensor = _model(tensor)
            prediction = output.squeeze(0).tolist()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Inference failed",
        )

    return PredictResponse(prediction=prediction, user_id=current_user.id)
