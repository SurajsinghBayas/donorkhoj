"""
Generate realistic lab-report PDFs for the demo cohort, rendered from the
actual screening rows in the database so values always match the app.

Usage:  cd backend && venv/bin/python lab_reports/generate_reports.py
Output: backend/lab_reports/<username>_lab_report.pdf
"""
import asyncio
import os
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (SimpleDocTemplate, Table, TableStyle,
                                Paragraph, Spacer)

from database import AsyncSessionLocal
from models.models import User, MedicalScreening
from sqlalchemy import select

OUT_DIR = os.path.join(os.path.dirname(__file__))
os.makedirs(OUT_DIR, exist_ok=True)

USERS = ["donor1", "donor2", "donor3", "donor4",
         "recipient1", "recipient2", "recipient3", "recipient4"]

# (label, screening attr, unit, low, high)
PANELS = [
    ("KIDNEY FUNCTION", [
        ("Creatinine", "creatinine", "mg/dL", 0.5, 1.2),
        ("eGFR", "egfr", "mL/min/1.73m²", 60, 120),
        ("Urinalysis", "urinalysis", "", None, None),
        ("BP Systolic", "blood_pressure_systolic", "mmHg", 90, 120),
        ("BP Diastolic", "blood_pressure_diastolic", "mmHg", 60, 80),
    ]),
    ("LIVER FUNCTION", [
        ("ALT (SGPT)", "alt", "U/L", 7, 56),
        ("AST (SGOT)", "ast", "U/L", 10, 40),
        ("ALP", "alp", "U/L", 44, 147),
        ("Bilirubin (Total)", "bilirubin_total", "mg/dL", 0.1, 1.2),
        ("Albumin", "albumin", "g/dL", 3.5, 5.5),
    ]),
    ("CARDIAC / PULMONARY", [
        ("Ejection Fraction", "ejection_fraction", "%", 55, 75),
        ("FEV1", "fev1_percent", "% predicted", 80, 120),
        ("FVC", "fvc_percent", "% predicted", 80, 120),
        ("ECG", "ecg_result", "", None, None),
    ]),
    ("IMMUNOLOGY", [
        ("Blood Group", "blood_group", "", None, None),
        ("HLA-A", "hla_a", "", None, None),
        ("HLA-B", "hla_b", "", None, None),
        ("HLA-DR", "hla_dr", "", None, None),
        ("Crossmatch", "crossmatch_result", "", None, None),
        ("PRA", "pra_percent", "%", 0, 10),
    ]),
    ("INFECTION SCREEN", [
        ("HIV", "hiv_status", "", None, None),
        ("Hepatitis B", "hbv_status", "", None, None),
        ("Hepatitis C", "hcv_status", "", None, None),
    ]),
]


def flag(val, low, high):
    if val is None or low is None:
        return ""
    try:
        v = float(val)
    except (TypeError, ValueError):
        return ""
    if v < low:
        return "L"
    if v > high:
        return "H"
    return ""


def build_pdf(path: str, user: User, s: MedicalScreening):
    doc = SimpleDocTemplate(path, pagesize=A4,
                            leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=15 * mm, bottomMargin=15 * mm)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("<b><font size=16>DonorKhoj Diagnostics</font></b>", styles["Normal"]))
    story.append(Paragraph("NABL-accredited transplant workup laboratory · New Delhi", styles["Normal"]))
    story.append(Spacer(1, 4 * mm))

    role = (user.role.value if hasattr(user.role, "value") else str(user.role)).upper()
    story.append(Paragraph(f"<b>TRANSPLANT WORKUP — {role}</b>", styles["Normal"]))
    story.append(Spacer(1, 2 * mm))

    meta = [
        ["Patient", user.full_name or user.username, "Report date",
         datetime.now(timezone.utc).strftime("%d %b %Y")],
        ["Patient ID", user.username, "City", user.city or "—"],
        ["Blood Group", s.blood_group or "—", "Physician", "Transplant Team"],
    ]
    t = Table(meta, colWidths=[28 * mm, 62 * mm, 28 * mm, 52 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f5f5f4")),
        ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#f5f5f4")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d6d3d1")),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(t)
    story.append(Spacer(1, 5 * mm))

    for panel, rows in PANELS:
        story.append(Paragraph(f"<b>{panel}</b>", styles["Normal"]))
        data = [["Test", "Result", "Unit", "Reference", "Flag"]]
        for label, attr, unit, low, high in rows:
            val = getattr(s, attr, None)
            ref = f"{low} – {high}" if low is not None else "—"
            data.append([label,
                         "—" if val is None else str(val),
                         unit or "—", ref, flag(val, low, high)])
        pt = Table(data, colWidths=[52 * mm, 48 * mm, 30 * mm, 28 * mm, 12 * mm])
        pt.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1c1917")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d6d3d1")),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fafaf9")]),
        ]))
        story.append(pt)
        story.append(Spacer(1, 4 * mm))

    story.append(Paragraph(
        "<i>Flags: H = above reference, L = below reference. This report supports the "
        "DonorKhoj screening workup and must be reviewed by the transplant team. "
        "Not a standalone diagnosis.</i>", styles["Normal"]))

    doc.build(story)


async def main():
    async with AsyncSessionLocal() as session:
        for username in USERS:
            r = await session.execute(select(User).where(User.username == username))
            user = r.scalar_one_or_none()
            if not user:
                print(f"  {username}: user missing, skipped")
                continue
            sc = (await session.execute(
                select(MedicalScreening).where(MedicalScreening.user_id == user.id))
            ).scalar_one_or_none()
            if not sc:
                print(f"  {username}: no screening, skipped")
                continue
            path = os.path.join(OUT_DIR, f"{username}_lab_report.pdf")
            build_pdf(path, user, sc)
            print(f"  {path} ({os.path.getsize(path)//1024} KB)")


if __name__ == "__main__":
    asyncio.run(main())
    print("✅ Lab reports generated")
