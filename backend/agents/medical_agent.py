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

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
MEDICAL_MODEL = os.getenv("MEDICAL_AGENT_MODEL", "google/gemma-3-27b-it:free")


def get_medical_llm():
    return ChatOpenAI(
        model=MEDICAL_MODEL,
        api_key=OPENROUTER_API_KEY,
        base_url=OPENROUTER_BASE_URL,
        default_headers={"HTTP-Referer": "https://donorkhoj.in", "X-Title": "DonorKhoj"},
        temperature=0.05,
        max_retries=3,
    )


EXTRACTION_PROMPT = """Extract medical lab values from this report text and return a JSON object.

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

Return ONLY a valid JSON object with found values. No explanation, no markdown.
Example: {{"creatinine": 1.1, "egfr": 72, "alt": 28, "blood_group": "B+"}}"""


async def analyze_lab_report(text: str) -> Dict[str, Any]:
    """
    Analyze raw lab report text and extract structured screening data.
    Returns extracted values and validation flags.
    """
    llm = get_medical_llm()
    
    try:
        response = await llm.ainvoke([
            SystemMessage(content=MEDICAL_AGENT_PROMPT),
            HumanMessage(content=EXTRACTION_PROMPT.format(text=text[:3000]))
        ])
        
        content = response.content.strip()
        # Clean up common LLM formatting issues
        content = re.sub(r"```json\s*", "", content)
        content = re.sub(r"```\s*", "", content)
        content = content.strip()
        
        extracted = json.loads(content)
        
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
            if val is not None:
                status = "NORMAL"
                if val < low:
                    status = "LOW"
                elif val > high:
                    status = "HIGH"
                if status != "NORMAL":
                    flags.append({"field": key, "value": val, "status": status, "unit": unit, "normal_range": f"{low}–{high}"})
        
        # Generate summary message
        summary_prompt = f"""Based on these extracted lab values: {json.dumps(extracted)}
And these abnormal flags: {json.dumps(flags)}

Write a brief 2-3 sentence summary for the patient explaining their results in simple language. 
Mention if any values are concerning for organ donation. Be empathetic."""
        
        summary_response = await llm.ainvoke([
            SystemMessage(content=MEDICAL_AGENT_PROMPT),
            HumanMessage(content=summary_prompt)
        ])
        
        return {
            "extracted_values": extracted,
            "flags": flags,
            "summary": summary_response.content,
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
