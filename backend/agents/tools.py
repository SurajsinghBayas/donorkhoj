"""
LangChain Tools shared across all agents.
Each tool wraps a backend function that agents can call autonomously.
"""
import os
import json
from langchain.tools import tool
from typing import Optional

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")


@tool
def check_eligibility_tool(donor_user_id: str, recipient_user_id: str) -> str:
    """Check medical eligibility for a donor-recipient pair. Returns eligibility status and reasons."""
    # Will be injected with DB session at runtime
    return json.dumps({"status": "pending", "message": "Tool will be called with DB context"})


@tool
def run_ml_match_tool(donor_screening_json: str, recipient_screening_json: str) -> str:
    """Run XGBoost + Random Forest ensemble matching on donor and recipient screening data. Returns match score and compatibility class."""
    try:
        from ml.predict import predict_match
        donor_data = json.loads(donor_screening_json)
        recipient_data = json.loads(recipient_screening_json)
        result = predict_match(donor_data, recipient_data)
        return json.dumps(result)
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
def get_shap_explanation_tool(donor_screening_json: str, recipient_screening_json: str) -> str:
    """Get SHAP feature importance explanation for a match prediction. Returns feature contributions."""
    try:
        from ml.predict import get_shap_explanation
        donor_data = json.loads(donor_screening_json)
        recipient_data = json.loads(recipient_screening_json)
        result = get_shap_explanation(donor_data, recipient_data)
        # Return top 8 features for brevity
        shap_vals = result["shap_values"]
        top = sorted(shap_vals.items(), key=lambda x: abs(x[1]), reverse=True)[:8]
        return json.dumps({"top_features": top, "base_value": result["base_value"]})
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
def validate_lab_values_tool(lab_values_json: str) -> str:
    """Validate extracted lab values against Indian normal reference ranges. Returns flagged abnormalities."""
    try:
        data = json.loads(lab_values_json)
        flags = []
        ranges = {
            "creatinine": (0.5, 1.2, "mg/dL"),
            "egfr": (60, 120, "mL/min/1.73m²"),
            "alt": (7, 56, "U/L"),
            "ast": (10, 40, "U/L"),
            "alp": (44, 147, "U/L"),
            "bilirubin_total": (0.1, 1.2, "mg/dL"),
            "albumin": (3.5, 5.5, "g/dL"),
            "ejection_fraction": (55, 75, "%"),
            "fev1_percent": (80, 120, "% predicted"),
        }
        for key, (low, high, unit) in ranges.items():
            val = data.get(key)
            if val is not None:
                if val < low:
                    flags.append({"field": key, "value": val, "unit": unit, "status": "LOW", "normal": f"{low}-{high}"})
                elif val > high:
                    flags.append({"field": key, "value": val, "unit": unit, "status": "HIGH", "normal": f"{low}-{high}"})
        return json.dumps({"flags": flags, "total_flags": len(flags)})
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
def extract_pdf_text_tool(file_path: str) -> str:
    """Extract text from a PDF lab report file. Returns extracted text content."""
    try:
        import PyPDF2
        text = ""
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text += page.extract_text() + "\n"
        return text[:4000]  # Limit to 4K chars
    except Exception as e:
        return f"Error extracting PDF: {e}"


MEDICAL_TOOLS = [validate_lab_values_tool, extract_pdf_text_tool]
MATCHING_TOOLS = [run_ml_match_tool, get_shap_explanation_tool]
