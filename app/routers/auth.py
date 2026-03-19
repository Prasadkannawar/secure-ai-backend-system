from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.models.user import Token, UserCreate, UserLogin, UserOut
from app.utils.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, user: UserCreate, db=Depends(get_db)):
    # 1. Reject duplicate emails
    existing = db.table("users").select("id").eq("email", user.email).execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    # 2. Hash password and persist new user
    hashed = hash_password(user.password)
    result = (
        db.table("users")
        .insert({"email": user.email, "hashed_password": hashed})
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user",
        )

    return UserOut(**result.data[0])


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, credentials: UserLogin, db=Depends(get_db)):
    # 1. Fetch user by email
    result = (
        db.table("users")
        .select("id, email, hashed_password, role, is_active")
        .eq("email", credentials.email)
        .single()
        .execute()
    )

    user = result.data
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Guard inactive accounts
    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    # 3. Verify password
    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 4. Issue JWT — `sub` holds the email; add `role` for downstream RBAC
    token = create_access_token({"sub": user["email"], "role": user["role"]})
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
async def me(current_user: UserOut = Depends(get_current_user)):
    # current_user is already fetched and validated inside get_current_user
    return current_user
