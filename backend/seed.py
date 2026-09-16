"""
Seed script to create demo users and sample medical screening data in Neon DB.
"""
import asyncio
import uuid
from database import engine, AsyncSessionLocal, Base
from models.models import User, UserRole, MedicalScreening, Match, MatchStatus
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Check if donor1 exists
        from sqlalchemy import select
        res = await session.execute(select(User).where(User.username == "donor1"))
        if res.scalar_one_or_none():
            print("Seed data already present.")
            return

        print("Seeding database...")

        donor = User(
            id=str(uuid.uuid4()),
            username="donor1",
            email="donor1@donorkhoj.in",
            hashed_password=hash_password("password123"),
            full_name="Rajesh Kumar (Donor)",
            role=UserRole.DONOR,
            city="Mumbai",
        )

        recipient = User(
            id=str(uuid.uuid4()),
            username="recipient1",
            email="recipient1@donorkhoj.in",
            hashed_password=hash_password("password123"),
            full_name="Priya Sharma (Recipient)",
            role=UserRole.RECIPIENT,
            city="Delhi",
        )

        doctor = User(
            id=str(uuid.uuid4()),
            username="doctor1",
            email="doctor1@donorkhoj.in",
            hashed_password=hash_password("password123"),
            full_name="Dr. Ananya Roy (AIIMS)",
            role=UserRole.DOCTOR,
            city="New Delhi",
        )

        admin = User(
            id=str(uuid.uuid4()),
            username="admin1",
            email="admin1@donorkhoj.in",
            hashed_password=hash_password("password123"),
            full_name="System Admin",
            role=UserRole.ADMIN,
            city="Mumbai",
        )

        session.add_all([donor, recipient, doctor, admin])
        await session.commit()

        # Seed Screening for Donor
        ds = MedicalScreening(
            id=str(uuid.uuid4()),
            user_id=donor.id,
            blood_group="O+",
            hiv_status="negative",
            hbv_status="negative",
            hcv_status="negative",
            cancer_history=False,
            creatinine=0.9,
            egfr=95.0,
            urinalysis="normal",
            blood_pressure_systolic=118,
            blood_pressure_diastolic=76,
            alt=22.0,
            ast=20.0,
            alp=68.0,
            bilirubin_total=0.7,
            albumin=4.4,
            ejection_fraction=65.0,
            fev1_percent=98.0,
            fvc_percent=95.0,
            hla_a="A*02, A*11",
            hla_b="B*07, B*35",
            hla_dr="DRB1*04, DRB1*15",
            crossmatch_result="negative",
            is_eligible=True,
            eligibility_reasons=["All organ parameters within normal Indian clinical reference ranges"],
            organs_offered=["kidney", "liver"],
        )

        # Seed Screening for Recipient
        rs = MedicalScreening(
            id=str(uuid.uuid4()),
            user_id=recipient.id,
            blood_group="O+",
            hiv_status="negative",
            hbv_status="negative",
            hcv_status="negative",
            cancer_history=False,
            creatinine=6.5,
            egfr=9.0,
            urinalysis="proteinuria",
            blood_pressure_systolic=145,
            blood_pressure_diastolic=92,
            alt=24.0,
            ast=21.0,
            alp=72.0,
            bilirubin_total=0.8,
            albumin=4.1,
            ejection_fraction=62.0,
            fev1_percent=92.0,
            fvc_percent=90.0,
            hla_a="A*02, A*24",
            hla_b="B*07, B*44",
            hla_dr="DRB1*04, DRB1*13",
            crossmatch_result="negative",
            is_eligible=True,
            urgency_score=9.0,
            eligibility_reasons=["End-Stage Renal Disease (eGFR < 15), high transplant priority"],
        )

        session.add_all([ds, rs])
        await session.commit()

        # Seed a sample completed match for Doctor review
        sample_match = Match(
            id=str(uuid.uuid4()),
            donor_id=donor.id,
            recipient_id=recipient.id,
            organ="kidney",
            xgb_score=0.962,
            rf_score=0.951,
            ensemble_score=0.956,
            compatibility_class="High",
            status=MatchStatus.COMPLETED,
            agent_report="""### AI Clinical Match Report (Llama 3.3 70B)
**Match Score**: 95.6% (HIGHLY COMPATIBLE)

**Key Compatibility Drivers**:
1. ABO Blood Group: Direct O+ to O+ match.
2. HLA Allele Match: 3/6 antigen match (A*02, B*07, DRB1*04).
3. Donor Kidney Quality: Excellent eGFR (95.0 mL/min/1.73m²) & normal creatinine (0.9 mg/dL).
4. Negative Donor-Recipient Crossmatch.

**Recommendation**: Proceed with transplant preparation per THO Act 2011 guidelines.""",
        )

        session.add(sample_match)
        await session.commit()
        print("✅ Database seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
