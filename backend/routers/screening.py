from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from models.models import MedicalScreening, User
from routers.auth import get_current_user
from ml.eligibility import check_eligibility
import uuid

router = APIRouter(prefix="/screening", tags=["screening"])


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

    eligibility = check_eligibility(data.dict(), current_user.role.value)

    values = {
        **data.dict(),
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
    if current_user.role.value not in ["doctor", "admin"] and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.execute(select(MedicalScreening).where(MedicalScreening.user_id == user_id))
    screening = result.scalar_one_or_none()
    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")
    return {c.name: getattr(screening, c.name) for c in screening.__table__.columns}
