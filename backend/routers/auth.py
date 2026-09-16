from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from database import get_db
from models.models import User, UserRole
from auth import verify_password, get_password_hash, create_access_token, decode_token
import uuid

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


class UserOut(BaseModel):
    id: str
    email: str
    username: str
    role: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    hospital_name: Optional[str] = None


def _to_user_out(user: User) -> UserOut:
    role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
    return UserOut(
        id=user.id, email=user.email, username=user.username, role=role_str,
        full_name=user.full_name, phone=user.phone, country=user.country,
        city=user.city, state=user.state, hospital_name=user.hospital_name,
    )


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str = Field(min_length=6, max_length=128)
    role: UserRole
    full_name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = "India"
    city: Optional[str] = None
    state: Optional[str] = None
    hospital_name: Optional[str] = None


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    hospital_name: Optional[str] = None


class LoginRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: str
    username: str
    user: UserOut


async def _authenticate_user(db: AsyncSession, identifier: str, password: str) -> User:
    if not identifier or not password:
        raise HTTPException(status_code=400, detail="Username or email and password are required")

    stmt = select(User).where((User.username == identifier) | (User.email == identifier))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username/email or password")

    return user


def _build_token_response(user: User) -> TokenResponse:
    role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
    token = create_access_token({"sub": user.id, "role": role_str})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=role_str,
        user_id=user.id,
        username=user.username,
        user=_to_user_out(user),
    )


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
        country=data.country or "India",
        city=data.city,
        state=data.state,
        hospital_name=data.hospital_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _build_token_response(user)


@router.post("/token", response_model=TokenResponse)
async def token_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    user = await _authenticate_user(db, form_data.username, form_data.password)
    return _build_token_response(user)


@router.post("/login", response_model=TokenResponse)
async def json_login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    identifier = data.username or data.email
    if not identifier:
        raise HTTPException(status_code=400, detail="Username or email is required")
    user = await _authenticate_user(db, identifier, data.password)
    return _build_token_response(user)


@router.get("/me")
async def get_me(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    payload = decode_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid token")
    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _to_user_out(user)


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    payload = decode_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid token")
    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/profile", response_model=UserOut)
async def update_profile(data: ProfileUpdate, current_user: User = Depends(get_current_user),
                         db: AsyncSession = Depends(get_db)):
    """Update your own profile: contact, location, and treating hospital."""
    for field in ("full_name", "phone", "country", "city", "state", "hospital_name"):
        val = getattr(data, field)
        if val is not None:
            setattr(current_user, field, val.strip() if isinstance(val, str) else val)
    await db.commit()
    await db.refresh(current_user)
    return _to_user_out(current_user)

