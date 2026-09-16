"""
Rule-based Medical Eligibility Engine
Based on Indian transplant guidelines (NOTTO/THO Act 2011)
"""
from typing import Dict, Any, List


INDIAN_REFERENCE_RANGES = {
    "alt_upper": 56,       # U/L
    "ast_upper": 40,       # U/L
    "alp_upper": 147,      # U/L
    "bilirubin_upper": 1.2, # mg/dL
    "albumin_lower": 3.5,  # g/dL
    "creatinine_upper_male": 1.2,   # mg/dL
    "creatinine_upper_female": 1.0, # mg/dL
    "egfr_normal": 90,     # mL/min/1.73m²
    "egfr_esrd": 15,       # End-stage renal disease
    "ejection_fraction_lower": 55,  # % normal
    "ejection_fraction_severe": 40, # % below which no donation
    "fev1_percent_lower": 70,      # % predicted
    "fev1_percent_ineligible": 50, # % below which no lung donation
}


def check_eligibility(data: Dict[str, Any], role: str) -> Dict[str, Any]:
    """
    Evaluate medical eligibility and urgency for donors and recipients.
    Returns: { eligible: bool, reasons: [str], urgency_score: float (0-10) }
    """
    reasons: List[str] = []
    eligible = True
    urgency_score = 0.0

    # ─── Universal disqualifiers (both donor and recipient) ───────────────────
    if data.get("hiv_status") == "positive":
        eligible = False
        reasons.append("HIV positive — absolute contraindication for solid organ transplant")

    if data.get("hbv_status") == "positive":
        eligible = False
        reasons.append("HBV (Hepatitis B) positive — requires specialist review")

    if data.get("hcv_status") == "positive":
        eligible = False
        reasons.append("HCV (Hepatitis C) positive — requires treatment and reassessment")

    if data.get("cancer_history") and role == "donor":
        eligible = False
        reasons.append(f"Active or recent cancer history ({data.get('cancer_type', 'unspecified')}) — ineligible for donation")

    # ─── Donor-specific checks ────────────────────────────────────────────────
    if role == "donor":
        organs = data.get("organs_offered", []) or []

        if "kidney" in organs:
            egfr = data.get("egfr")
            creatinine = data.get("creatinine")
            if egfr is not None and egfr < 60:
                eligible = False
                reasons.append(f"eGFR {egfr:.1f} mL/min/1.73m² < 60 — ineligible for kidney donation (CKD Stage 3+)")
            if creatinine is not None and creatinine > INDIAN_REFERENCE_RANGES["creatinine_upper_male"]:
                reasons.append(f"Elevated creatinine ({creatinine} mg/dL) — kidney function review required")

        if "liver" in organs:
            alt = data.get("alt")
            ast = data.get("ast")
            bilirubin = data.get("bilirubin_total")
            if alt is not None and alt > INDIAN_REFERENCE_RANGES["alt_upper"] * 3:
                eligible = False
                reasons.append(f"ALT {alt} U/L (>3x upper limit) — ineligible for liver donation")
            if ast is not None and ast > INDIAN_REFERENCE_RANGES["ast_upper"] * 3:
                eligible = False
                reasons.append(f"AST {ast} U/L (>3x upper limit) — ineligible for liver donation")

        if "heart" in organs:
            ef = data.get("ejection_fraction")
            if ef is not None and ef < INDIAN_REFERENCE_RANGES["ejection_fraction_severe"]:
                eligible = False
                reasons.append(f"Ejection fraction {ef}% < 40% — ineligible for heart donation")

        if "lung" in organs:
            fev1 = data.get("fev1_percent")
            if fev1 is not None and fev1 < INDIAN_REFERENCE_RANGES["fev1_percent_ineligible"]:
                eligible = False
                reasons.append(f"FEV1 {fev1}% predicted < 50% — ineligible for lung donation")

        if data.get("smoking_status") == "current":
            reasons.append("Current smoker — lung donation evaluation required; other organs proceed with caution")

        if not reasons and eligible:
            reasons.append("Meets basic eligibility criteria for donation")

    # ─── Recipient urgency scoring (MELD/UNOS-inspired, India context) ────────
    if role == "recipient":
        egfr = data.get("egfr")
        bilirubin = data.get("bilirubin_total")
        ef = data.get("ejection_fraction")
        nyha = data.get("nyha_class")
        fev1 = data.get("fev1_percent")

        # Kidney urgency (based on CKD stage)
        if egfr is not None:
            if egfr < 15:
                urgency_score = max(urgency_score, 9.5)
                reasons.append("ESRD (eGFR < 15): Highest urgency for kidney transplant")
            elif egfr < 30:
                urgency_score = max(urgency_score, 7.0)
                reasons.append("CKD Stage 4 (eGFR 15-30): High urgency for kidney transplant")
            elif egfr < 60:
                urgency_score = max(urgency_score, 4.0)
                reasons.append("CKD Stage 3 (eGFR 30-60): Moderate urgency")

        # Liver urgency (simplified MELD)
        if bilirubin is not None and bilirubin > 10:
            urgency_score = max(urgency_score, 8.5)
            reasons.append(f"Severe hyperbilirubinemia ({bilirubin} mg/dL): High urgency for liver transplant")
        elif bilirubin is not None and bilirubin > 5:
            urgency_score = max(urgency_score, 5.0)
            reasons.append(f"Elevated bilirubin ({bilirubin} mg/dL): Moderate liver urgency")

        # Heart urgency
        if ef is not None and ef < 25 and nyha == 4:
            urgency_score = max(urgency_score, 9.0)
            reasons.append(f"EF {ef}% + NYHA Class IV: Critical urgency for heart transplant")
        elif ef is not None and ef < 35:
            urgency_score = max(urgency_score, 6.5)
            reasons.append(f"EF {ef}%: Significant heart failure — high urgency")

        # Lung urgency
        if fev1 is not None and fev1 < 40:
            urgency_score = max(urgency_score, 8.0)
            reasons.append(f"FEV1 {fev1}% predicted: Severe lung disease — high urgency")

        if not reasons:
            reasons.append("Moderate urgency — awaiting further clinical assessment")

        if not eligible and role == "recipient":
            eligible = True  # Recipients are not "disqualified" from receiving, just treated differently

    return {
        "eligible": eligible,
        "reasons": reasons,
        "urgency_score": round(urgency_score, 2),
    }
