"""
Medical Screening Agent — Extracts lab values from uploaded reports
and auto-fills the medical screening form.
"""
import os
import json
import re
from typing import Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from agents.prompts import MEDICAL_AGENT_PROMPT
from agents.llm import get_llm_client, ainvoke_with_fallback, parse_model_chain

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
MEDICAL_MODELS = parse_model_chain(os.getenv(
    "MEDICAL_AGENT_MODEL", "google/gemma-4-31b-it:free,nex-agi/nex-n2.5-pro:free"))
MEDICAL_MODEL = MEDICAL_MODELS[0] if MEDICAL_MODELS else "google/gemma-4-31b-it:free"


def get_medical_llm():
    return get_llm_client(MEDICAL_MODEL, temperature=0.05)


EXTRACTION_PROMPT = """Extract medical lab values from this report text and summarize them — all in ONE response.

Extract ONLY these fields (skip if not found):
- blood_group (e.g. "B+", "O-", "AB+")
- creatinine (number, mg/dL)
- egfr (number, mL/min/1.73m²)
- alt (number, U/L — also called SGPT)
- ast (number, U/L — also called SGOT)
- alp (number, U/L)
- bilirubin_total (number, mg/dL)
- albumin (number, g/dL)
- ejection_fraction (number, %)
- fev1_percent (number, %)
- fvc_percent (number, %)
- blood_pressure_systolic (number, mmHg)
- blood_pressure_diastolic (number, mmHg)
- hiv_status ("negative" or "positive")
- hbv_status ("negative" or "positive")
- hcv_status ("negative" or "positive")

Report text:
{text}

Return ONLY a valid JSON object with exactly two keys, no markdown, no explanation:
{{"values": {{"creatinine": 1.1, "egfr": 72, "alt": 28, "blood_group": "B+"}},
 "summary": "2-3 sentence patient-friendly summary of these results in simple language. Mention if any values look concerning for organ donation. Be empathetic."}}"""


async def analyze_lab_report(text: str) -> Dict[str, Any]:
    """
    Analyze raw lab report text and extract structured screening data.
    Single LLM call returning values + summary. Flags computed locally.
    """
    build = lambda m: get_llm_client(m, temperature=0.05)

    try:
        response, _ = await ainvoke_with_fallback(build, MEDICAL_MODELS, [
            SystemMessage(content=MEDICAL_AGENT_PROMPT),
            HumanMessage(content=EXTRACTION_PROMPT.format(text=text[:3000]))
        ])

        content = response.content.strip()
        # Clean up common LLM formatting issues
        content = re.sub(r"```json\s*", "", content)
        content = re.sub(r"```\s*", "", content)
        content = content.strip()

        parsed = json.loads(content)
        # Support both new {"values","summary"} and legacy bare-values shape
        if isinstance(parsed, dict) and "values" in parsed:
            extracted = parsed.get("values") or {}
            summary = parsed.get("summary") or ""
        else:
            extracted = parsed if isinstance(parsed, dict) else {}
            summary = ""

        if not isinstance(extracted, dict):
            extracted = {}

        # Validate extracted values
        flags = []
        ranges = {
            "creatinine": (0.5, 1.2, "mg/dL"),
            "egfr": (60, 120, "mL/min"),
            "alt": (7, 56, "U/L"),
            "ast": (10, 40, "U/L"),
            "bilirubin_total": (0.1, 1.2, "mg/dL"),
            "albumin": (3.5, 5.5, "g/dL"),
            "ejection_fraction": (55, 75, "%"),
        }
        for key, (low, high, unit) in ranges.items():
            val = extracted.get(key)
            if isinstance(val, bool) or val is None:
                continue
            try:
                val = float(val)
            except (TypeError, ValueError):
                continue
            status = "NORMAL"
            if val < low:
                status = "LOW"
            elif val > high:
                status = "HIGH"
            if status != "NORMAL":
                flags.append({"field": key, "value": val, "status": status, "unit": unit, "normal_range": f"{low}–{high}"})

        if not summary:
            summary = ("I extracted your lab values — review them in the form below. "
                       "Ask DonorBot if anything looks unclear.")

        return {
            "extracted_values": extracted,
            "flags": flags,
            "summary": summary,
            "fields_found": len(extracted),
        }

    except json.JSONDecodeError:
        return {
            "extracted_values": {},
            "flags": [],
            "summary": "I couldn't automatically extract values from this report. Please fill in the form manually.",
            "fields_found": 0,
            "error": "JSON parsing failed"
        }
    except Exception as e:
        return {
            "extracted_values": {},
            "flags": [],
            "summary": "An error occurred while analyzing the report. Please fill in the form manually.",
            "fields_found": 0,
            "error": str(e)
        }
