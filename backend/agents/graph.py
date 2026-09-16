"""
LangGraph State Machine — Central orchestrator for all DonorKhoj agents.
Defines the graph structure, state schema, and node transitions.
"""
import os
import json
import asyncio
from typing import TypedDict, Annotated, List, Optional, Any, Callable
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from agents.prompts import MATCHING_AGENT_PROMPT
from agents.tools import run_ml_match_tool, get_shap_explanation_tool, validate_lab_values_tool

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
MATCHING_MODEL = os.getenv("MATCHING_AGENT_MODEL", "meta-llama/llama-3.3-70b-instruct:free")


def get_llm(model: str, streaming: bool = False):
    return ChatOpenAI(
        model=model,
        api_key=OPENROUTER_API_KEY,
        base_url=OPENROUTER_BASE_URL,
        streaming=streaming,
        default_headers={
            "HTTP-Referer": "https://donorkhoj.in",
            "X-Title": "DonorKhoj",
        },
        temperature=0.1,
        max_retries=3,
    )


# ─── Matching Pipeline State ───────────────────────────────────────────────────

class MatchingState(TypedDict):
    donor_data: dict
    recipient_data: dict
    organ: str
    eligibility_result: Optional[dict]
    ml_result: Optional[dict]
    shap_result: Optional[dict]
    final_report: Optional[str]
    steps: List[dict]
    error: Optional[str]
    stream_callback: Optional[Any]  # WebSocket callback


def add_step(state: MatchingState, step_name: str, status: str, data: Any = None) -> List[dict]:
    steps = list(state.get("steps", []))
    steps.append({"step": step_name, "status": status, "data": data})
    cb = state.get("stream_callback")
    if cb:
        asyncio.create_task(cb({"step": step_name, "status": status, "data": data}))
    return steps


async def node_check_eligibility(state: MatchingState) -> MatchingState:
    from ml.eligibility import check_eligibility
    steps = add_step(state, "eligibility", "running")
    try:
        donor_result = check_eligibility(state["donor_data"], "donor")
        recipient_result = check_eligibility(state["recipient_data"], "recipient")
        result = {"donor": donor_result, "recipient": recipient_result}
        steps = add_step({**state, "steps": steps}, "eligibility", "completed", result)
        return {**state, "eligibility_result": result, "steps": steps}
    except Exception as e:
        steps = add_step({**state, "steps": steps}, "eligibility", "failed", str(e))
        return {**state, "error": str(e), "steps": steps}


async def node_organ_quality(state: MatchingState) -> MatchingState:
    steps = add_step(state, "organ_quality", "running")
    donor = state["donor_data"]
    organ = state.get("organ", "kidney")
    quality_flags = []

    checks = {
        "kidney": [("egfr", 60, "eGFR < 60 — suboptimal kidney quality"), ("creatinine", None, None)],
        "liver": [("alt", 56, "ALT elevated"), ("ast", 40, "AST elevated"), ("bilirubin_total", 1.2, "Bilirubin elevated")],
        "heart": [("ejection_fraction", 55, "EF below normal range")],
        "lung": [("fev1_percent", 80, "FEV1 below normal range")],
    }
    for field, threshold, msg in checks.get(organ, []):
        val = donor.get(field)
        if val and threshold and val < threshold:
            quality_flags.append(msg)

    result = {"organ": organ, "quality_flags": quality_flags, "organ_ok": len(quality_flags) == 0}
    steps = add_step({**state, "steps": steps}, "organ_quality", "completed", result)
    return {**state, "steps": steps}


async def node_ml_matching(state: MatchingState) -> MatchingState:
    from ml.predict import predict_match
    steps = add_step(state, "ml_matching", "running")
    try:
        result = predict_match(state["donor_data"], state["recipient_data"])
        steps = add_step({**state, "steps": steps}, "ml_matching", "completed", result)
        return {**state, "ml_result": result, "steps": steps}
    except Exception as e:
        steps = add_step({**state, "steps": steps}, "ml_matching", "failed", str(e))
        return {**state, "error": str(e), "steps": steps}


async def node_shap_lime(state: MatchingState) -> MatchingState:
    from ml.predict import get_shap_explanation
    steps = add_step(state, "explainability", "running")
    try:
        shap_result = get_shap_explanation(state["donor_data"], state["recipient_data"])
        top = sorted(shap_result["shap_values"].items(), key=lambda x: abs(x[1]), reverse=True)[:8]
        result = {"top_features": top, "base_value": shap_result["base_value"]}
        steps = add_step({**state, "steps": steps}, "explainability", "completed", result)
        return {**state, "shap_result": result, "steps": steps}
    except Exception as e:
        # Non-fatal — continue without SHAP
        steps = add_step({**state, "steps": steps}, "explainability", "skipped", str(e))
        return {**state, "shap_result": None, "steps": steps}


async def node_generate_report(state: MatchingState) -> MatchingState:
    steps = add_step(state, "report", "running")
    try:
        llm = get_llm(MATCHING_MODEL)
        ml = state.get("ml_result") or {}
        elig = state.get("eligibility_result") or {}
        shap = state.get("shap_result") or {}

        prompt = f"""Generate a clinical organ transplant match report for the following:

ORGAN: {state.get('organ', 'kidney').upper()}
ML MATCH SCORE: {ml.get('ensemble_score', 'N/A')} ({ml.get('compatibility_class', 'N/A')})
XGBoost Score: {ml.get('xgb_score', 'N/A')} | Random Forest Score: {ml.get('rf_score', 'N/A')}

DONOR ELIGIBILITY: {json.dumps(elig.get('donor', {}), indent=2)}
RECIPIENT ELIGIBILITY: {json.dumps(elig.get('recipient', {}), indent=2)}

TOP SHAP FEATURES (most influential factors):
{json.dumps(shap.get('top_features', [])[:5], indent=2)}

Write a structured clinical report with: Executive Summary, Compatibility Analysis, Risk Factors, Recommendations.
Keep it concise (200-250 words). Use Indian transplant guidelines context."""

        response = await llm.ainvoke([SystemMessage(content=MATCHING_AGENT_PROMPT), HumanMessage(content=prompt)])
        report = response.content
        steps = add_step({**state, "steps": steps}, "report", "completed")
        return {**state, "final_report": report, "steps": steps}
    except Exception as e:
        fallback = f"Match Score: {state.get('ml_result', {}).get('ensemble_score', 'N/A')} | Class: {state.get('ml_result', {}).get('compatibility_class', 'N/A')}"
        steps = add_step({**state, "steps": steps}, "report", "completed", "fallback")
        return {**state, "final_report": fallback, "steps": steps}


def build_matching_graph():
    graph = StateGraph(MatchingState)
    graph.add_node("eligibility", node_check_eligibility)
    graph.add_node("organ_quality", node_organ_quality)
    graph.add_node("ml_matching", node_ml_matching)
    graph.add_node("explainability", node_shap_lime)
    graph.add_node("generate_report", node_generate_report)

    graph.set_entry_point("eligibility")
    graph.add_edge("eligibility", "organ_quality")
    graph.add_edge("organ_quality", "ml_matching")
    graph.add_edge("ml_matching", "explainability")
    graph.add_edge("explainability", "generate_report")
    graph.add_edge("generate_report", END)

    return graph.compile()


_matching_graph = None

def get_matching_graph():
    global _matching_graph
    if _matching_graph is None:
        _matching_graph = build_matching_graph()
    return _matching_graph
