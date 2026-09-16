from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional
from database import get_db
from models.models import User, UserRole
from auth import verify_password, get_password_hash, create_access_token, decode_token
import uuid

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    role: UserRole
    full_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: str
    username: str


@router.post("/register", response_model=TokenResponse)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    result2 = await db.execute(select(User).where(User.username == data.username))
    if result2.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")
    user = User(
        id=str(uuid.uuid4()),
        email=data.email,
        username=data.username,
        hashed_password=get_password_hash(data.password),
        role=data.role,
        full_name=data.full_name,
        phone=data.phone,
        city=data.city,
        state=data.state,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token({"sub": user.id, "role": user.role.value})
    return TokenResponse(access_token=token, token_type="bearer", role=user.role.value, user_id=user.id, username=user.username)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": user.id, "role": user.role.value})
    return TokenResponse(access_token=token, token_type="bearer", role=user.role.value, user_id=user.id, username=user.username)


@router.get("/me")
async def get_me(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user.id, "email": user.email, "username": user.username, "role": user.role.value, "full_name": user.full_name, "city": user.city, "state": user.state}


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
