"""
Agent API routes: Lab report upload, matching pipeline, chatbot WebSocket.
"""
import os
import json
import uuid
import asyncio
import tempfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from database import get_db, AsyncSessionLocal
from models.models import User, MedicalScreening, Match, AgentJob, ChatMessage, MatchStatus
from routers.auth import get_current_user
from agents.medical_agent import analyze_lab_report
from agents.chatbot_agent import chat_stream, chat_once
from agents.graph import get_matching_graph
import PyPDF2

router = APIRouter(prefix="/agents", tags=["agents"])

# ─── Active WebSocket connections ─────────────────────────────────────────────
active_connections: dict[str, WebSocket] = {}


def _role(user: User) -> str:
    return user.role.value if hasattr(user.role, "value") else str(user.role)


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = []


# ─── Lab Report Analysis ───────────────────────────────────────────────────────
@router.post("/screening/analyze")
async def analyze_report(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a lab report PDF or image, run Medical Agent to extract values."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    content = await file.read()
    extracted_text = ""

    # Extract text based on file type
    if file.filename.lower().endswith(".pdf"):
        try:
            import io
            reader = PyPDF2.PdfReader(io.BytesIO(content))
            for page in reader.pages:
                extracted_text += page.extract_text() + "\n"
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Could not read PDF: {e}")
    else:
        # Treat as text (plain text lab reports)
        try:
            extracted_text = content.decode("utf-8", errors="ignore")
        except Exception:
            raise HTTPException(status_code=422, detail="Unsupported file format. Please upload PDF or text file.")

    if len(extracted_text.strip()) < 20:
        raise HTTPException(status_code=422, detail="Could not extract text from file. Please ensure it's a readable document.")

    result = await analyze_lab_report(extracted_text)
    return result


# ─── Matching Pipeline ─────────────────────────────────────────────────────────
@router.post("/matching/run")
async def run_matching(
    donor_id: str,
    recipient_id: str,
    organ: str = "kidney",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger the full LangGraph matching pipeline for a donor-recipient pair."""
    # Fetch screening data
    d_result = await db.execute(select(MedicalScreening).where(MedicalScreening.user_id == donor_id))
    r_result = await db.execute(select(MedicalScreening).where(MedicalScreening.user_id == recipient_id))
    donor_screening = d_result.scalar_one_or_none()
    recipient_screening = r_result.scalar_one_or_none()

    if not donor_screening or not recipient_screening:
        raise HTTPException(status_code=404, detail="Screening data not found for both users")

    # Create job record
    job_id = str(uuid.uuid4())
    job = AgentJob(
        id=job_id,
        user_id=current_user.id,
        job_type="matching",
        status="running",
        steps=[],
    )
    db.add(job)
    await db.commit()

    # Convert screening ORM to dict
    def screening_to_dict(s):
        return {c.name: getattr(s, c.name) for c in s.__table__.columns}

    donor_data = screening_to_dict(donor_screening)
    recipient_data = screening_to_dict(recipient_screening)

    # Run graph in background
    async def run_graph():
        from ml.predict import to_json_safe, get_lime_explanation
        lime_task = None
        try:
            graph = get_matching_graph()
            state = {
                "donor_data": donor_data,
                "recipient_data": recipient_data,
                "organ": organ,
                "eligibility_result": None,
                "ml_result": None,
                "shap_result": None,
                "final_report": None,
                "steps": [],
                "error": None,
                "stream_callback": None,
            }

            # LIME is independent of the graph — run it concurrently, not after.
            lime_task = asyncio.create_task(
                asyncio.to_thread(get_lime_explanation, donor_data, recipient_data))

            # Stream steps to WebSocket if connected AND persist progress to the
            # job row, so late-connecting clients catch up via polling.
            progress: list = []

            async def persist_steps():
                try:
                    async with AsyncSessionLocal() as s:
                        j = await s.get(AgentJob, job_id)
                        if j and j.status == "running":
                            j.steps = to_json_safe(list(progress))
                            await s.commit()
                except Exception:
                    pass

            async def stream_cb(step_data):
                if step_data.get("step") != "completed":
                    progress.append(step_data)
                    await persist_steps()
                ws = active_connections.get(job_id)
                if ws:
                    try:
                        await ws.send_text(json.dumps(step_data))
                    except Exception:
                        pass

            state["stream_callback"] = stream_cb
            final_state = await graph.ainvoke(state)

            # Save match result
            ml = final_state.get("ml_result") or {}
            shap_state = to_json_safe(final_state.get("shap_result") or {})
            try:
                lime_result = to_json_safe(await lime_task)
                lime_task = None
            except Exception:
                lime_result = None
            match_obj = Match(
                id=str(uuid.uuid4()),
                donor_id=donor_id,
                recipient_id=recipient_id,
                organ=organ,
                xgb_score=ml.get("xgb_score"),
                rf_score=ml.get("rf_score"),
                ensemble_score=ml.get("ensemble_score"),
                compatibility_class=ml.get("compatibility_class"),
                shap_values=shap_state,
                lime_values=lime_result,
                agent_report=final_state.get("final_report"),
                status=MatchStatus.COMPLETED,
            )
            async with AsyncSessionLocal() as new_session:
                new_session.add(match_obj)
                j = await new_session.get(AgentJob, job_id)
                if j:
                    j.status = "completed"
                    j.result = to_json_safe({
                        "match_id": match_obj.id,
                        "ensemble_score": ml.get("ensemble_score"),
                        "compatibility_class": ml.get("compatibility_class"),
                        "report": final_state.get("final_report"),
                        "steps": final_state.get("steps", []),
                    })
                    j.steps = to_json_safe(final_state.get("steps", []))
                await new_session.commit()

            # Notify WebSocket of completion
            ws = active_connections.get(job_id)
            if ws:
                try:
                    await ws.send_text(json.dumps({
                        "step": "completed",
                        "status": "completed",
                        "data": {
                            "match_id": match_obj.id,
                            "ensemble_score": ml.get("ensemble_score"),
                            "compatibility_class": ml.get("compatibility_class"),
                            "report": final_state.get("final_report"),
                        }
                    }))
                except Exception:
                    pass
        except Exception as e:
            if lime_task is not None and not lime_task.done():
                lime_task.cancel()
            async with AsyncSessionLocal() as new_session:
                j = await new_session.get(AgentJob, job_id)
                if j:
                    j.status = "failed"
                    j.error = str(e)
                await new_session.commit()

    asyncio.create_task(run_graph())
    return {"job_id": job_id, "status": "running", "message": "Matching pipeline started"}


@router.get("/matching/{job_id}")
async def get_job_status(job_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    job = await db.get(AgentJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job_id": job_id, "status": job.status, "steps": job.steps, "result": job.result, "error": job.error}


# ─── WebSocket for live agent streaming ───────────────────────────────────────
@router.websocket("/ws/{job_id}")
async def websocket_agent(websocket: WebSocket, job_id: str):
    await websocket.accept()
    active_connections[job_id] = websocket
    try:
        while True:
            await websocket.receive_text()  # Keep alive
    except WebSocketDisconnect:
        active_connections.pop(job_id, None)


# ─── Chatbot ───────────────────────────────────────────────────────────────────
@router.post("/chat")
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get chatbot response (streaming via SSE)."""
    # Fetch user context
    s_result = await db.execute(select(MedicalScreening).where(MedicalScreening.user_id == current_user.id))
    screening = s_result.scalar_one_or_none()
    
    # Latest match
    m_result = await db.execute(
        select(Match).where(Match.recipient_id == current_user.id).order_by(Match.created_at.desc())
    )
    match = m_result.scalars().first()

    user_data = {"full_name": current_user.full_name, "role": _role(current_user), "city": current_user.city}
    screening_data = {c.name: getattr(screening, c.name) for c in screening.__table__.columns} if screening else {}
    match_data = {"ensemble_score": match.ensemble_score, "compatibility_class": match.compatibility_class} if match else {}

    async def generate():
        full_response: list[str] = []
        async for token in chat_stream(request.message, request.history or [], user_data, screening_data, match_data):
            full_response.append(token)
            yield f"data: {json.dumps({'token': token})}\n\n"
        yield "data: [DONE]\n\n"

        # Save full conversation turn to history
        try:
            async with AsyncSessionLocal() as s:
                s.add(ChatMessage(id=str(uuid.uuid4()), user_id=current_user.id, role="user", content=request.message))
                s.add(ChatMessage(id=str(uuid.uuid4()), user_id=current_user.id, role="assistant", content="".join(full_response)))
                await s.commit()
        except Exception:
            pass

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/chat/history")
async def get_chat_history(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChatMessage).where(ChatMessage.user_id == current_user.id).order_by(ChatMessage.created_at).limit(50)
    )
    messages = result.scalars().all()
    return [{"role": m.role, "content": m.content, "created_at": m.created_at.isoformat()} for m in messages]
