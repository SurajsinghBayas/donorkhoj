from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from models.models import MedicalScreening, User, Match
from routers.auth import get_current_user
from ml.eligibility import check_eligibility
import os
import uuid

router = APIRouter(prefix="/screening", tags=["screening"])

REPORT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "lab_reports")


def _role(user: User) -> str:
    return user.role.value if hasattr(user.role, "value") else str(user.role)


class ScreeningData(BaseModel):
    # Step 1 - Basic
    blood_group: Optional[str] = None
    hiv_status: Optional[str] = "unknown"
    hbv_status: Optional[str] = "unknown"
    hcv_status: Optional[str] = "unknown"
    cancer_history: Optional[bool] = False
    cancer_type: Optional[str] = None
    medical_history: Optional[List[str]] = []
    smoking_status: Optional[str] = "never"
    smoking_pack_years: Optional[float] = 0
    alcohol_status: Optional[str] = "never"
    alcohol_units_per_week: Optional[float] = 0
    organs_offered: Optional[List[str]] = []
    # Step 2 - Organ tests
    creatinine: Optional[float] = None
    egfr: Optional[float] = None
    urinalysis: Optional[str] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    kidney_imaging: Optional[str] = None
    alt: Optional[float] = None
    ast: Optional[float] = None
    alp: Optional[float] = None
    bilirubin_total: Optional[float] = None
    albumin: Optional[float] = None
    total_protein: Optional[float] = None
    ecg_result: Optional[str] = None
    ejection_fraction: Optional[float] = None
    nyha_class: Optional[int] = None
    fev1_percent: Optional[float] = None
    fvc_percent: Optional[float] = None
    fev1_fvc_ratio: Optional[float] = None
    chest_xray: Optional[str] = None
    # Step 3 - Compatibility
    hla_a: Optional[str] = None
    hla_b: Optional[str] = None
    hla_dr: Optional[str] = None
    crossmatch_result: Optional[str] = "pending"
    pra_percent: Optional[float] = None
    completed_steps: Optional[int] = 0


@router.post("/submit")
async def submit_screening(data: ScreeningData, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MedicalScreening).where(MedicalScreening.user_id == current_user.id))
    existing = result.scalar_one_or_none()

    eligibility = check_eligibility(data.model_dump(), _role(current_user))

    values = {
        **data.model_dump(),
        "user_id": current_user.id,
        "is_eligible": eligibility["eligible"],
        "eligibility_reasons": eligibility["reasons"],
        "urgency_score": eligibility.get("urgency_score", 0.0),
    }

    if existing:
        for k, v in values.items():
            if v is not None:
                setattr(existing, k, v)
        await db.commit()
        await db.refresh(existing)
        return {"message": "Screening updated", "screening_id": existing.id, "eligibility": eligibility}
    else:
        screening = MedicalScreening(id=str(uuid.uuid4()), **values)
        db.add(screening)
        await db.commit()
        await db.refresh(screening)
        return {"message": "Screening submitted", "screening_id": screening.id, "eligibility": eligibility}


@router.get("/me")
async def get_my_screening(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MedicalScreening).where(MedicalScreening.user_id == current_user.id))
    screening = result.scalar_one_or_none()
    if not screening:
        return {"screening": None}
    return {"screening": {c.name: getattr(screening, c.name) for c in screening.__table__.columns}}


@router.get("/{user_id}")
async def get_screening(user_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if _role(current_user) not in ["doctor", "admin"] and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.execute(select(MedicalScreening).where(MedicalScreening.user_id == user_id))
    screening = result.scalar_one_or_none()
    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")
    return {c.name: getattr(screening, c.name) for c in screening.__table__.columns}


def _report_path(username: str) -> Optional[str]:
    # Guard against path traversal — username comes from the DB, but be strict anyway
    safe = "".join(c for c in username if c.isalnum() or c in ("-", "_"))
    if not safe or safe != username:
        return None
    path = os.path.join(REPORT_DIR, f"{safe}_lab_report.pdf")
    return path if os.path.isfile(path) else None


async def _can_view_report(viewer: User, target_id: str, db: AsyncSession) -> bool:
    """Owner, doctor/admin, or either side of a Match with the target."""
    if viewer.id == target_id or _role(viewer) in ("doctor", "admin"):
        return True
    link = await db.execute(
        select(Match.id).where(
            or_(
                and_(Match.donor_id == viewer.id, Match.recipient_id == target_id),
                and_(Match.donor_id == target_id, Match.recipient_id == viewer.id),
            )
        ).limit(1)
    )
    return link.scalar_one_or_none() is not None


def _serve_report(username: str) -> FileResponse:
    path = _report_path(username)
    if not path:
        raise HTTPException(status_code=404, detail="No lab report on file for this user")
    return FileResponse(path, media_type="application/pdf",
                        filename=f"{username}_lab_report.pdf")


@router.get("/report/me")
async def get_my_report(current_user: User = Depends(get_current_user)):
    """Download/view your own lab report PDF."""
    return _serve_report(current_user.username)


@router.get("/report/{user_id}")
async def get_user_report(user_id: str, current_user: User = Depends(get_current_user),
                          db: AsyncSession = Depends(get_db)):
    """View another user's lab report — doctors/admins, or match counterparties (human-in-the-loop)."""
    if not await _can_view_report(current_user, user_id, db):
        raise HTTPException(status_code=403, detail="Not authorized to view this report")
    target = await db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    return _serve_report(target.username)
