from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models.models import User, MedicalScreening, Match, MatchStatus
from routers.auth import get_current_user
from ml.predict import predict_match
import uuid

router = APIRouter(prefix="/matching", tags=["matching"])


@router.get("/donors")
async def list_eligible_donors(
    organ: str = "kidney",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List eligible donors for a given organ."""
    result = await db.execute(
        select(User, MedicalScreening)
        .join(MedicalScreening, User.id == MedicalScreening.user_id)
        .where(User.role == "donor")
        .where(MedicalScreening.is_eligible == True)
    )
    donors = result.all()
    return [
        {
            "user_id": u.id,
            "username": u.username,
            "blood_group": s.blood_group,
            "city": u.city,
            "organs_offered": s.organs_offered or [],
            "egfr": s.egfr,
            "ejection_fraction": s.ejection_fraction,
        }
        for u, s in donors
        if organ in (s.organs_offered or [])
    ]


@router.get("/matches/mine")
async def get_my_matches(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all matches for the current user."""
    if current_user.role.value == "donor":
        result = await db.execute(select(Match).where(Match.donor_id == current_user.id).order_by(Match.created_at.desc()))
    else:
        result = await db.execute(select(Match).where(Match.recipient_id == current_user.id).order_by(Match.created_at.desc()))
    matches = result.scalars().all()
    return [
        {
            "id": m.id,
            "organ": m.organ,
            "ensemble_score": m.ensemble_score,
            "compatibility_class": m.compatibility_class,
            "status": m.status.value if m.status else "pending",
            "agent_report": m.agent_report,
            "shap_values": m.shap_values,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in matches
    ]


@router.get("/matches/pending")
async def get_pending_matches(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Doctor: Get all matches pending approval."""
    if current_user.role.value not in ["doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Doctors only")
    result = await db.execute(
        select(Match).where(Match.status == MatchStatus.COMPLETED).order_by(Match.created_at.desc()).limit(50)
    )
    matches = result.scalars().all()
    out = []
    for m in matches:
        donor = await db.get(User, m.donor_id)
        recipient = await db.get(User, m.recipient_id)
        out.append({
            "id": m.id,
            "organ": m.organ,
            "ensemble_score": m.ensemble_score,
            "compatibility_class": m.compatibility_class,
            "status": m.status.value,
            "donor_name": donor.full_name if donor else "Unknown",
            "recipient_name": recipient.full_name if recipient else "Unknown",
            "agent_report": m.agent_report,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })
    return out


@router.post("/matches/{match_id}/approve")
async def approve_match(
    match_id: str,
    notes: str = "",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role.value not in ["doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Doctors only")
    match = await db.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    match.status = MatchStatus.APPROVED
    match.doctor_id = current_user.id
    match.doctor_notes = notes
    await db.commit()
    return {"message": "Match approved", "match_id": match_id}


@router.post("/matches/{match_id}/reject")
async def reject_match(
    match_id: str,
    notes: str = "",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role.value not in ["doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Doctors only")
    match = await db.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    match.status = MatchStatus.REJECTED
    match.doctor_id = current_user.id
    match.doctor_notes = notes
    await db.commit()
    return {"message": "Match rejected", "match_id": match_id}


@router.get("/stats")
async def get_stats(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    total_users = (await db.execute(select(func.count(User.id)))).scalar()
    total_donors = (await db.execute(select(func.count(User.id)).where(User.role == "donor"))).scalar()
    total_recipients = (await db.execute(select(func.count(User.id)).where(User.role == "recipient"))).scalar()
    total_matches = (await db.execute(select(func.count(Match.id)))).scalar()
    approved = (await db.execute(select(func.count(Match.id)).where(Match.status == MatchStatus.APPROVED))).scalar()
    return {
        "total_users": total_users,
        "total_donors": total_donors,
        "total_recipients": total_recipients,
        "total_matches": total_matches,
        "approved_matches": approved,
    }
