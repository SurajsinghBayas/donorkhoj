"""
Conversational Chatbot Agent — RAG-powered assistant for donors and recipients.
"""
import os
import json
from typing import List, Dict, AsyncGenerator
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from agents.prompts import CHATBOT_PROMPT

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
CHATBOT_MODEL = os.getenv("CHATBOT_MODEL", "deepseek/deepseek-r1-distill-qwen-32b:free")


def get_chatbot_llm(streaming: bool = False):
    return ChatOpenAI(
        model=CHATBOT_MODEL,
        api_key=OPENROUTER_API_KEY,
        base_url=OPENROUTER_BASE_URL,
        default_headers={"HTTP-Referer": "https://donorkhoj.in", "X-Title": "DonorKhoj"},
        temperature=0.3,
        max_retries=3,
        streaming=streaming,
    )


def build_context(user_data: dict, screening_data: dict, match_data: dict) -> str:
    """Build personalized context string from user's actual data."""
    ctx = []
    if user_data:
        ctx.append(f"User: {user_data.get('full_name', 'Patient')} | Role: {user_data.get('role', 'unknown')} | City: {user_data.get('city', 'India')}")
    if screening_data:
        ctx.append(f"Blood Group: {screening_data.get('blood_group', 'Unknown')}")
        ctx.append(f"Eligibility: {'Eligible' if screening_data.get('is_eligible') else 'Not Eligible'}")
        ctx.append(f"eGFR: {screening_data.get('egfr', 'N/A')} | Creatinine: {screening_data.get('creatinine', 'N/A')}")
        ctx.append(f"ALT: {screening_data.get('alt', 'N/A')} | AST: {screening_data.get('ast', 'N/A')}")
        ctx.append(f"Ejection Fraction: {screening_data.get('ejection_fraction', 'N/A')}%")
        ctx.append(f"HIV: {screening_data.get('hiv_status', 'N/A')} | HBV: {screening_data.get('hbv_status', 'N/A')}")
        ctx.append(f"Urgency Score: {screening_data.get('urgency_score', 0)}/10")
        if screening_data.get('eligibility_reasons'):
            ctx.append(f"Eligibility Notes: {'; '.join(screening_data['eligibility_reasons'][:3])}")
    if match_data:
        ctx.append(f"Latest Match Score: {match_data.get('ensemble_score', 'N/A')} ({match_data.get('compatibility_class', 'N/A')})")
    return "\n".join(ctx) if ctx else "No medical data available yet."


async def chat_stream(
    message: str,
    history: List[Dict],
    user_data: dict = {},
    screening_data: dict = {},
    match_data: dict = {},
) -> AsyncGenerator[str, None]:
    """Stream chatbot response token by token."""
    llm = get_chatbot_llm(streaming=True)
    context = build_context(user_data, screening_data, match_data)

    system = f"""{CHATBOT_PROMPT}

PATIENT CONTEXT (use this to personalize responses):
{context}

Always personalize your response based on the patient's actual data above."""

    messages = [SystemMessage(content=system)]
    for msg in history[-10:]:  # Last 10 messages for context window
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        else:
            messages.append(AIMessage(content=msg["content"]))
    messages.append(HumanMessage(content=message))

    try:
        async for chunk in llm.astream(messages):
            if chunk.content:
                yield chunk.content
    except Exception as e:
        yield f"I'm having trouble connecting right now. Please try again in a moment. (Error: {str(e)[:50]})"


async def chat_once(
    message: str,
    history: List[Dict],
    user_data: dict = {},
    screening_data: dict = {},
    match_data: dict = {},
) -> str:
    """Non-streaming chat response."""
    llm = get_chatbot_llm(streaming=False)
    context = build_context(user_data, screening_data, match_data)

    system = f"""{CHATBOT_PROMPT}

PATIENT CONTEXT:
{context}"""

    messages = [SystemMessage(content=system)]
    for msg in history[-8:]:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        else:
            messages.append(AIMessage(content=msg["content"]))
    messages.append(HumanMessage(content=message))

    try:
        response = await llm.ainvoke(messages)
        return response.content
    except Exception as e:
        return f"I'm having trouble connecting. Please try again shortly."
