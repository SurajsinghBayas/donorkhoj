"""
Demo-cohort seeder: extra donors/recipients with full medical workups,
plus real ML-scored matches between them. Idempotent — safe to re-run.

Usage:  cd backend && venv/bin/python seed_demo.py
"""
import asyncio
import uuid
from sqlalchemy import select
from database import engine, AsyncSessionLocal, Base
from models.models import User, UserRole, MedicalScreening, Match, MatchStatus
from auth import get_password_hash
from ml.eligibility import check_eligibility
from ml.predict import predict_match, get_shap_explanation, to_json_safe

PW = "password123"

DONORS = [
    {
        "username": "donor2", "email": "donor2@donorkhoj.in",
        "full_name": "Aarav Mehta (Donor)", "city": "Mumbai", "state": "Maharashtra",
        "screening": {
            "blood_group": "A+", "hiv_status": "negative", "hbv_status": "negative",
            "hcv_status": "negative", "cancer_history": False,
            "medical_history": [], "smoking_status": "never", "alcohol_status": "occasional",
            "creatinine": 0.85, "egfr": 98.0, "urinalysis": "normal",
            "blood_pressure_systolic": 116, "blood_pressure_diastolic": 74,
            "alt": 20.0, "ast": 19.0, "alp": 65.0, "bilirubin_total": 0.6,
            "albumin": 4.5, "ejection_fraction": 64.0,
            "fev1_percent": 96.0, "fvc_percent": 94.0,
            "hla_a": "A*11, A*24", "hla_b": "B*35, B*51", "hla_dr": "DRB1*07, DRB1*15",
            "crossmatch_result": "negative", "pra_percent": 4.0,
            "organs_offered": ["kidney"], "completed_steps": 3,
        },
    },
    {
        "username": "donor3", "email": "donor3@donorkhoj.in",
        "full_name": "Vikram Singh (Donor)", "city": "Delhi", "state": "Delhi",
        "screening": {
            "blood_group": "B+", "hiv_status": "negative", "hbv_status": "negative",
            "hcv_status": "negative", "cancer_history": False,
            "medical_history": [], "smoking_status": "former", "alcohol_status": "never",
            "creatinine": 0.95, "egfr": 92.0, "urinalysis": "normal",
            "blood_pressure_systolic": 120, "blood_pressure_diastolic": 78,
            "alt": 24.0, "ast": 22.0, "alp": 70.0, "bilirubin_total": 0.8,
            "albumin": 4.3, "ejection_fraction": 63.0,
            "fev1_percent": 93.0, "fvc_percent": 91.0,
            "hla_a": "A*02, A*33", "hla_b": "B*44, B*57", "hla_dr": "DRB1*03, DRB1*13",
            "crossmatch_result": "negative", "pra_percent": 6.0,
            "organs_offered": ["liver"], "completed_steps": 3,
        },
    },
    {
        "username": "donor4", "email": "donor4@donorkhoj.in",
        "full_name": "Kavya Nair (Donor)", "city": "Bengaluru", "state": "Karnataka",
        "screening": {
            "blood_group": "O+", "hiv_status": "negative", "hbv_status": "negative",
            "hcv_status": "negative", "cancer_history": False,
            "medical_history": [], "smoking_status": "never", "alcohol_status": "never",
            "creatinine": 0.8, "egfr": 101.0, "urinalysis": "normal",
            "blood_pressure_systolic": 112, "blood_pressure_diastolic": 70,
            "alt": 19.0, "ast": 18.0, "alp": 62.0, "bilirubin_total": 0.5,
            "albumin": 4.6, "ejection_fraction": 66.0, "nyha_class": 1,
            "fev1_percent": 99.0, "fvc_percent": 97.0,
            "hla_a": "A*01, A*02", "hla_b": "B*07, B*08", "hla_dr": "DRB1*04, DRB1*11",
            "crossmatch_result": "negative", "pra_percent": 3.0,
            "organs_offered": ["heart", "kidney"], "completed_steps": 3,
        },
    },
]

RECIPIENTS = [
    {
        "username": "recipient2", "email": "recipient2@donorkhoj.in",
        "full_name": "Sunita Rao (Recipient)", "city": "Pune", "state": "Maharashtra",
        "screening": {
            "blood_group": "A+", "hiv_status": "negative", "hbv_status": "negative",
            "hcv_status": "negative", "cancer_history": False,
            "creatinine": 5.8, "egfr": 11.0, "urinalysis": "proteinuria",
            "blood_pressure_systolic": 142, "blood_pressure_diastolic": 90,
            "alt": 23.0, "ast": 20.0, "bilirubin_total": 0.9, "albumin": 3.9,
            "ejection_fraction": 60.0, "fev1_percent": 90.0,
            "hla_a": "A*11, A*03", "hla_b": "B*35, B*40", "hla_dr": "DRB1*07, DRB1*04",
            "crossmatch_result": "negative", "pra_percent": 12.0,
            "completed_steps": 3,
        },
    },
    {
        "username": "recipient3", "email": "recipient3@donorkhoj.in",
        "full_name": "Mohammed Khan (Recipient)", "city": "Hyderabad", "state": "Telangana",
        "screening": {
            "blood_group": "B+", "hiv_status": "negative", "hbv_status": "negative",
            "hcv_status": "negative", "cancer_history": False,
            "creatinine": 1.1, "egfr": 72.0,
            "blood_pressure_systolic": 128, "blood_pressure_diastolic": 84,
            "alt": 68.0, "ast": 74.0, "alp": 210.0, "bilirubin_total": 8.5,
            "albumin": 2.9, "total_protein": 5.8,
            "ejection_fraction": 58.0, "fev1_percent": 88.0,
            "hla_a": "A*02, A*26", "hla_b": "B*44, B*15", "hla_dr": "DRB1*03, DRB1*07",
            "crossmatch_result": "negative", "pra_percent": 18.0,
            "completed_steps": 3,
        },
    },
    {
        "username": "recipient4", "email": "recipient4@donorkhoj.in",
        "full_name": "Lakshmi Iyer (Recipient)", "city": "Chennai", "state": "Tamil Nadu",
        "screening": {
            "blood_group": "O+", "hiv_status": "negative", "hbv_status": "negative",
            "hcv_status": "negative", "cancer_history": False,
            "creatinine": 1.0, "egfr": 78.0,
            "blood_pressure_systolic": 110, "blood_pressure_diastolic": 68,
            "alt": 21.0, "ast": 19.0, "bilirubin_total": 0.7, "albumin": 4.2,
            "ejection_fraction": 28.0, "nyha_class": 4, "ecg_result": "abnormal",
            "fev1_percent": 86.0,
            "hla_a": "A*01, A*24", "hla_b": "B*07, B*51", "hla_dr": "DRB1*04, DRB1*15",
            "crossmatch_result": "negative", "pra_percent": 22.0,
            "completed_steps": 3,
        },
    },
]

# (donor_username, recipient_username, organ, status, doctor_notes)
MATCHES = [
    ("donor2", "recipient2", "kidney", MatchStatus.COMPLETED, ""),
    ("donor3", "recipient3", "liver", MatchStatus.APPROVED,
     "Excellent ABO-identical liver match. LFTs reviewed — cleared for transplant workup per THO Act."),
    ("donor4", "recipient4", "heart", MatchStatus.COMPLETED, ""),
    ("donor1", "recipient2", "kidney", MatchStatus.COMPLETED, ""),
]


def screening_to_dict(s: MedicalScreening) -> dict:
    return {c.name: getattr(s, c.name) for c in s.__table__.columns}


def build_report(donor_name, recipient_name, organ, ml, shap_top) -> str:
    drivers = "\n".join(f"- {name}: {val:+.3f}" for name, val in (shap_top or [])[:5])
    return f"""## AI Clinical Match Report — {organ.upper()} ({ml['compatibility_class']} compatibility)

**Donor:** {donor_name}  |  **Recipient:** {recipient_name}
**Ensemble score:** {ml['ensemble_score']:.1%} (XGBoost {ml['xgb_score']:.1%} · Random Forest {ml['rf_score']:.1%})

### Compatibility analysis
ABO/Rh and HLA features were evaluated by the ensemble against India-representative
training data. The strongest drivers of this score (SHAP) were:
{drivers or "- (see SHAP payload)"}

### Recommendation
Scores above 75% indicate high compatibility — proceed to crossmatch confirmation
and the standard NOTTO/THO Act 2011 workup. Final clearance rests with the
transplant team, not this report."""


async def ensure_user(session, spec, role: UserRole) -> User:
    res = await session.execute(select(User).where(User.username == spec["username"]))
    user = res.scalar_one_or_none()
    if user:
        print(f"  user {spec['username']} exists")
        return user
    user = User(id=str(uuid.uuid4()), username=spec["username"], email=spec["email"],
                hashed_password=get_password_hash(PW), full_name=spec["full_name"],
                role=role, city=spec.get("city"), state=spec.get("state"))
    session.add(user)
    await session.commit()
    await session.refresh(user)
    print(f"  user {spec['username']} created")
    return user


async def ensure_screening(session, user: User, data: dict):
    res = await session.execute(select(MedicalScreening).where(MedicalScreening.user_id == user.id))
    existing = res.scalar_one_or_none()
    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    elig = check_eligibility(data, role)
    values = {**data, "user_id": user.id, "is_eligible": elig["eligible"],
              "eligibility_reasons": elig["reasons"],
              "urgency_score": elig.get("urgency_score", 0.0)}
    if existing:
        for k, v in values.items():
            setattr(existing, k, v)
        await session.commit()
        print(f"  screening for {user.username}: eligible={elig['eligible']}")
        return existing
    s = MedicalScreening(id=str(uuid.uuid4()), **values)
    session.add(s)
    await session.commit()
    print(f"  screening for {user.username}: eligible={elig['eligible']}")
    return s


async def seed_demo():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        print("Upserting demo users + screenings...")
        ids = {}
        for spec in DONORS:
            u = await ensure_user(session, spec, UserRole.DONOR)
            await ensure_screening(session, u, spec["screening"])
            ids[spec["username"]] = u.id
        for spec in RECIPIENTS:
            u = await ensure_user(session, spec, UserRole.RECIPIENT)
            await ensure_screening(session, u, spec["screening"])
            ids[spec["username"]] = u.id

        # doctor for approvals
        res = await session.execute(select(User).where(User.username == "doctor1"))
        doctor = res.scalar_one_or_none()
        res = await session.execute(select(User).where(User.username == "recipient1"))
        rec1 = res.scalar_one_or_none()
        if rec1:
            r1 = await session.execute(select(MedicalScreening).where(MedicalScreening.user_id == rec1.id))
            if not r1.scalar_one_or_none():
                await ensure_screening(session, rec1, {
                    "blood_group": "O+", "hiv_status": "negative", "hbv_status": "negative",
                    "hcv_status": "negative", "cancer_history": False,
                    "creatinine": 6.5, "egfr": 9.0, "urinalysis": "proteinuria",
                    "blood_pressure_systolic": 145, "blood_pressure_diastolic": 92,
                    "alt": 24.0, "ast": 21.0, "alp": 72.0, "bilirubin_total": 0.8,
                    "albumin": 4.1, "ejection_fraction": 62.0,
                    "fev1_percent": 92.0, "fvc_percent": 90.0,
                    "hla_a": "A*02, A*24", "hla_b": "B*07, B*44",
                    "hla_dr": "DRB1*04, DRB1*13",
                    "crossmatch_result": "negative", "pra_percent": 8.0,
                    "completed_steps": 3,
                })
        res = await session.execute(select(User).where(User.username == "donor1"))
        d1 = res.scalar_one_or_none()
        if d1:
            ids["donor1"] = d1.id
            r1 = await session.execute(select(MedicalScreening).where(MedicalScreening.user_id == d1.id))
            if not r1.scalar_one_or_none():
                await ensure_screening(session, d1, {
                    "blood_group": "O+", "hiv_status": "negative", "hbv_status": "negative",
                    "hcv_status": "negative", "cancer_history": False,
                    "creatinine": 0.9, "egfr": 95.0, "urinalysis": "normal",
                    "blood_pressure_systolic": 118, "blood_pressure_diastolic": 76,
                    "alt": 22.0, "ast": 20.0, "alp": 68.0, "bilirubin_total": 0.7,
                    "albumin": 4.4, "ejection_fraction": 65.0,
                    "fev1_percent": 98.0, "fvc_percent": 95.0,
                    "hla_a": "A*02, A*11", "hla_b": "B*07, B*35",
                    "hla_dr": "DRB1*04, DRB1*15",
                    "crossmatch_result": "negative", "pra_percent": 5.0,
                    "organs_offered": ["kidney", "liver"], "completed_steps": 3,
                })

        print("Scoring demo matches with the ML ensemble...")
        for donor_u, recip_u, organ, status, notes in MATCHES:
            if donor_u not in ids:
                print(f"  skip {donor_u}->{recip_u}: donor missing")
                continue
            # recipient may be seeded by seed.py (recipient1) or above
            r = await session.execute(select(User).where(User.username == recip_u))
            recip = r.scalar_one_or_none()
            if not recip:
                print(f"  skip {donor_u}->{recip_u}: recipient missing")
                continue
            dup = await session.execute(
                select(Match).where(Match.donor_id == ids[donor_u],
                                    Match.recipient_id == recip.id,
                                    Match.organ == organ))
            if dup.scalar_one_or_none():
                print(f"  match {donor_u}->{recip_u} ({organ}) exists")
                continue
            ds = (await session.execute(
                select(MedicalScreening).where(MedicalScreening.user_id == ids[donor_u]))).scalar_one()
            rs = (await session.execute(
                select(MedicalScreening).where(MedicalScreening.user_id == recip.id))).scalar_one()
            dd, rd = screening_to_dict(ds), screening_to_dict(rs)
            ml = predict_match(dd, rd)
            try:
                shap = to_json_safe(get_shap_explanation(dd, rd))
                top = shap.get("shap_values", {})
                top = sorted(top.items(), key=lambda x: abs(x[1]), reverse=True)[:5]
            except Exception:
                shap, top = None, []
            d_name = (await session.get(User, ids[donor_u])).full_name
            match = Match(
                id=str(uuid.uuid4()), donor_id=ids[donor_u], recipient_id=recip.id,
                organ=organ, xgb_score=ml["xgb_score"], rf_score=ml["rf_score"],
                ensemble_score=ml["ensemble_score"],
                compatibility_class=ml["compatibility_class"],
                shap_values=shap, agent_report=build_report(d_name, recip.full_name, organ, ml, top),
                status=status,
                doctor_id=doctor.id if (status == MatchStatus.APPROVED and doctor) else None,
                doctor_notes=notes or None,
            )
            session.add(match)
            await session.commit()
            print(f"  match {donor_u}->{recip_u} ({organ}): {ml['ensemble_score']:.1%} "
                  f"{ml['compatibility_class']} [{status.value}]")

    print("✅ Demo cohort ready")


if __name__ == "__main__":
    asyncio.run(seed_demo())
