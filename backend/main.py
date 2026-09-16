import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from database import engine
from models.models import Base
from routers import auth, screening, matching, agents

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created")
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
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
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
    return {"status": "healthy", "db": "neon-postgresql", "ml": "xgboost+rf", "agents": "langgraph+openrouter"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
