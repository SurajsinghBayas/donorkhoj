"""
Generate 10,000 synthetic India-representative donor-recipient pairs
Based on:
- Blood group distribution: O(37%), B(32%), A(23%), AB(8%) [Indian population]
- HLA frequencies from Indian population studies (AIIMS/SGPGI published data)
- Clinical reference ranges from Indian hospital standards
"""
import numpy as np
import pandas as pd
import random
import os

np.random.seed(42)
random.seed(42)

N = 10000

# Indian blood group distribution
BLOOD_GROUPS = ["O+", "O-", "B+", "B-", "A+", "A-", "AB+", "AB-"]
BG_PROBS = [0.36, 0.01, 0.31, 0.01, 0.22, 0.01, 0.07, 0.01]

# ABO compatibility matrix (donor -> recipient)
ABO_COMPAT = {
    "O": ["O", "A", "B", "AB"],
    "A": ["A", "AB"],
    "B": ["B", "AB"],
    "AB": ["AB"],
}

# Indian HLA-A allele frequencies (simplified, based on published Indian data)
HLA_A_ALLELES = ["A*02", "A*24", "A*11", "A*03", "A*01", "A*26", "A*33", "A*68"]
HLA_A_PROBS =   [0.22,   0.18,   0.15,   0.10,   0.09,   0.08,   0.08,   0.10]
HLA_B_ALLELES = ["B*40", "B*15", "B*51", "B*35", "B*44", "B*07", "B*08", "B*57"]
HLA_B_PROBS =   [0.18,   0.16,   0.14,   0.13,   0.11,   0.10,   0.09,   0.09]
HLA_DR_ALLELES = ["DR*15", "DR*07", "DR*13", "DR*03", "DR*04", "DR*11", "DR*01", "DR*14"]
HLA_DR_PROBS =   [0.20,    0.16,   0.14,   0.13,   0.12,   0.10,   0.09,   0.06]


def get_abo(bg: str) -> str:
    return bg.replace("+", "").replace("-", "")


def get_rh(bg: str) -> int:
    return 1 if "+" in bg else 0


def abo_compatible(donor_bg: str, recipient_bg: str) -> bool:
    donor_abo = get_abo(donor_bg)
    recipient_abo = get_abo(recipient_bg)
    return recipient_abo in ABO_COMPAT.get(donor_abo, [])


def rh_compatible(donor_bg: str, recipient_bg: str) -> bool:
    donor_rh = get_rh(donor_bg)
    recipient_rh = get_rh(recipient_bg)
    # Rh- donor can give to Rh+ or Rh- recipient; Rh+ can only give to Rh+
    return donor_rh == 0 or recipient_rh == 1


def hla_mismatch_score(donor_hla: dict, recipient_hla: dict) -> int:
    mismatches = 0
    for locus in ["A", "B", "DR"]:
        if donor_hla.get(locus) != recipient_hla.get(locus):
            mismatches += 1
    return mismatches  # 0-3, lower is better


records = []

for i in range(N):
    donor_bg = np.random.choice(BLOOD_GROUPS, p=BG_PROBS)
    recipient_bg = np.random.choice(BLOOD_GROUPS, p=BG_PROBS)

    donor_hla = {
        "A": np.random.choice(HLA_A_ALLELES, p=HLA_A_PROBS),
        "B": np.random.choice(HLA_B_ALLELES, p=HLA_B_PROBS),
        "DR": np.random.choice(HLA_DR_ALLELES, p=HLA_DR_PROBS),
    }
    recipient_hla = {
        "A": np.random.choice(HLA_A_ALLELES, p=HLA_A_PROBS),
        "B": np.random.choice(HLA_B_ALLELES, p=HLA_B_PROBS),
        "DR": np.random.choice(HLA_DR_ALLELES, p=HLA_DR_PROBS),
    }

    abo_ok = abo_compatible(donor_bg, recipient_bg)
    rh_ok = rh_compatible(donor_bg, recipient_bg)
    hla_mm = hla_mismatch_score(donor_hla, recipient_hla)
    age_diff = abs(np.random.normal(5, 10))

    # Donor clinical
    donor_egfr = np.random.normal(85, 15)
    donor_creatinine = np.random.normal(0.9, 0.2)
    donor_alt = np.random.normal(25, 10)
    donor_ast = np.random.normal(22, 8)
    donor_ef = np.random.normal(62, 8)
    donor_fev1 = np.random.normal(85, 12)
    donor_pra = np.random.uniform(0, 20)

    # Recipient clinical  
    recipient_egfr = np.random.normal(30, 20)
    recipient_urgency = np.random.uniform(1, 10)
    recipient_pra = np.random.uniform(0, 80)
    crossmatch_negative = int(recipient_pra < 30 and random.random() > 0.1)

    # Compute label: 1 = compatible match, 0 = incompatible
    # Based on: ABO, Rh, HLA mismatch, crossmatch, age, clinical factors
    score = 0.0
    if abo_ok:
        score += 0.35
    if rh_ok:
        score += 0.10
    score += (3 - hla_mm) * 0.10  # 0 mismatch = +0.30, 3 mismatch = 0
    if crossmatch_negative:
        score += 0.20
    score += max(0, (donor_egfr - 60)) / 200  # better donor egfr = better
    score += max(0, (donor_ef - 40)) / 300
    score -= age_diff / 200
    score -= recipient_pra / 500

    # Add noise
    score += np.random.normal(0, 0.05)
    score = max(0.0, min(1.0, score))

    label = 1 if score >= 0.5 else 0

    records.append({
        "donor_blood_group": donor_bg,
        "recipient_blood_group": recipient_bg,
        "abo_compatible": int(abo_ok),
        "rh_compatible": int(rh_ok),
        "hla_a_donor": donor_hla["A"],
        "hla_b_donor": donor_hla["B"],
        "hla_dr_donor": donor_hla["DR"],
        "hla_a_recipient": recipient_hla["A"],
        "hla_b_recipient": recipient_hla["B"],
        "hla_dr_recipient": recipient_hla["DR"],
        "hla_mismatch_score": hla_mm,
        "age_difference": round(age_diff, 1),
        "donor_egfr": round(max(15, donor_egfr), 1),
        "donor_creatinine": round(max(0.4, donor_creatinine), 2),
        "donor_alt": round(max(5, donor_alt), 1),
        "donor_ast": round(max(5, donor_ast), 1),
        "donor_ejection_fraction": round(max(20, min(80, donor_ef)), 1),
        "donor_fev1_percent": round(max(20, min(120, donor_fev1)), 1),
        "donor_pra_percent": round(donor_pra, 1),
        "recipient_egfr": round(max(5, min(90, recipient_egfr)), 1),
        "recipient_urgency_score": round(recipient_urgency, 2),
        "recipient_pra_percent": round(recipient_pra, 1),
        "crossmatch_negative": crossmatch_negative,
        "match_score": round(score, 4),
        "compatible": label,
    })

df = pd.DataFrame(records)
os.makedirs(os.path.dirname(__file__) if os.path.dirname(__file__) else ".", exist_ok=True)
output_path = os.path.join(os.path.dirname(__file__), "india_organ_match_data.csv")
df.to_csv(output_path, index=False)
print(f"Generated {len(df)} records. Compatible: {df['compatible'].sum()} ({df['compatible'].mean()*100:.1f}%)")
print(f"Saved to {output_path}")
print(df.describe())
