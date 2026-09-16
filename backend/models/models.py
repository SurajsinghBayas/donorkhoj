from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from database import Base
import uuid
import enum
from datetime import datetime, timezone


def utcnow():
    return datetime.now(timezone.utc)


def new_uuid():
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    DONOR = "donor"
    RECIPIENT = "recipient"
    DOCTOR = "doctor"
    ADMIN = "admin"


class MatchStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    APPROVED = "approved"
    REJECTED = "rejected"


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=new_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SAEnum(UserRole), nullable=False)
    full_name = Column(String)
    phone = Column(String)
    country = Column(String, default="India")
    city = Column(String)
    state = Column(String)
    hospital_name = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    screening = relationship("MedicalScreening", back_populates="user", uselist=False)
    sent_matches = relationship("Match", foreign_keys="Match.donor_id", back_populates="donor")
    received_matches = relationship("Match", foreign_keys="Match.recipient_id", back_populates="recipient")
    chat_messages = relationship("ChatMessage", back_populates="user")


class MedicalScreening(Base):
    __tablename__ = "medical_screenings"
    id = Column(String, primary_key=True, default=new_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    # Basic screening
    blood_group = Column(String)  # A+, A-, B+, B-, O+, O-, AB+, AB-
    hiv_status = Column(String)   # negative, positive, unknown
    hbv_status = Column(String)
    hcv_status = Column(String)
    cancer_history = Column(Boolean, default=False)
    cancer_type = Column(String)
    medical_history = Column(JSONB)  # list of conditions
    smoking_status = Column(String)  # never, former, current
    smoking_pack_years = Column(Float)
    alcohol_status = Column(String)  # never, occasional, regular
    alcohol_units_per_week = Column(Float)
    # Kidney
    creatinine = Column(Float)    # mg/dL
    egfr = Column(Float)          # mL/min/1.73m²
    urinalysis = Column(String)
    blood_pressure_systolic = Column(Integer)
    blood_pressure_diastolic = Column(Integer)
    kidney_imaging = Column(String)
    # Liver
    alt = Column(Float)           # U/L
    ast = Column(Float)           # U/L
    alp = Column(Float)           # U/L
    bilirubin_total = Column(Float)  # mg/dL
    albumin = Column(Float)       # g/dL
    total_protein = Column(Float) # g/dL
    # Heart
    ecg_result = Column(String)
    ejection_fraction = Column(Float)  # %
    nyha_class = Column(Integer)
    # Lung
    fev1_percent = Column(Float)
    fvc_percent = Column(Float)
    fev1_fvc_ratio = Column(Float)
    chest_xray = Column(String)
    # HLA Typing
    hla_a = Column(String)
    hla_b = Column(String)
    hla_dr = Column(String)
    crossmatch_result = Column(String)  # negative, positive, pending
    pra_percent = Column(Float)
    # Eligibility
    is_eligible = Column(Boolean)
    eligibility_reasons = Column(JSONB)
    urgency_score = Column(Float)
    # Organs willing to donate (for donors)
    organs_offered = Column(JSONB)  # ["kidney", "liver", "heart", "lung"]
    completed_steps = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    user = relationship("User", back_populates="screening")


class Match(Base):
    __tablename__ = "matches"
    id = Column(String, primary_key=True, default=new_uuid)
    donor_id = Column(String, ForeignKey("users.id"), nullable=False)
    recipient_id = Column(String, ForeignKey("users.id"), nullable=False)
    organ = Column(String, nullable=False)
    xgb_score = Column(Float)
    rf_score = Column(Float)
    ensemble_score = Column(Float)
    compatibility_class = Column(String)  # High, Medium, Low, Incompatible
    shap_values = Column(JSONB)
    lime_values = Column(JSONB)
    agent_report = Column(Text)
    status = Column(SAEnum(MatchStatus), default=MatchStatus.PENDING)
    doctor_notes = Column(Text)
    doctor_id = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    donor = relationship("User", foreign_keys=[donor_id], back_populates="sent_matches")
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="received_matches")


class AgentJob(Base):
    __tablename__ = "agent_jobs"
    id = Column(String, primary_key=True, default=new_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    job_type = Column(String)  # "screening", "matching"
    status = Column(String, default="pending")  # pending, running, completed, failed
    steps = Column(JSONB, default=list)
    result = Column(JSONB)
    error = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(String, primary_key=True, default=new_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    role = Column(String)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    user = relationship("User", back_populates="chat_messages")
