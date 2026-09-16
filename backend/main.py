import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from sqlalchemy import text
from database import engine
from models.models import Base
from routers import auth, screening, matching, agents

load_dotenv()

ENV = os.getenv("ENV", "development").lower()
IS_PROD = ENV == "production"

# Fail fast in production with an unsafe JWT secret
_secret = os.getenv("SECRET_KEY", "")
if IS_PROD and (not _secret or _secret in ("fallback-secret-key", "change-me-to-a-long-random-secret-in-production")
                or len(_secret) < 32):
    raise RuntimeError(
        "Refusing to start with an unsafe SECRET_KEY in production. "
        "Set a random value of at least 32 characters."
    )

FRONTEND_URL = os.getenv("FRONTEND_URL", "")
_allowed_origins = ["http://localhost:5173", "http://localhost:3000"]
if FRONTEND_URL:
    _allowed_origins += [o.strip() for o in FRONTEND_URL.split(",") if o.strip()]
if IS_PROD:
    # In production only serve explicitly configured origins (plus localhost for SSH-tunnel checks)
    _allowed_origins = [o for o in _allowed_origins if not o.startswith("http://localhost")] or _allowed_origins


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        raise
    yield
    await engine.dispose()


app = FastAPI(
    title="DonorKhoj API",
    description="India's AI-powered organ donor-recipient matching platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(screening.router)
app.include_router(matching.router)
app.include_router(agents.router)


@app.get("/")
async def root():
    return {
        "name": "DonorKhoj API",
        "version": "1.0.0",
        "status": "online",
        "message": "India's AI-powered organ matching platform 🫀",
    }


@app.get("/health")
async def health():
    """Liveness + dependency check. Returns 503 when the database is unreachable."""
    try:
        async with engine.connect() as conn:
            await asyncio.wait_for(conn.execute(text("SELECT 1")), timeout=5)
        db_status = "up"
    except Exception:
        db_status = "down"
    body = {"status": "healthy" if db_status == "up" else "degraded",
            "db": "neon-postgresql", "database": db_status,
            "ml": "xgboost+rf", "agents": "langgraph+openrouter", "env": ENV}
    return JSONResponse(status_code=200 if db_status == "up" else 503, content=body)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app",
                host=os.getenv("HOST", "0.0.0.0"),
                port=int(os.getenv("PORT", "8000")),
                reload=not IS_PROD)
