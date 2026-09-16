# DonorKhoj (डोनर खोज) 🫀

> India's AI-powered organ donor–recipient matching platform — rule-based medical screening, ML compatibility scoring with explainability, agentic clinical pipelines, and a conversational assistant, all aligned with NOTTO / THO Act 2011 guidelines.

[![Backend](https://img.shields.io/badge/backend-FastAPI-009688)](./backend)
[![Frontend](https://img.shields.io/badge/frontend-React%2019-61DAFB)](./frontend)
[![Database](https://img.shields.io/badge/database-PostgreSQL%20(Neon)-336791)](./backend/database.py)
[![ML](https://img.shields.io/badge/ML-XGBoost%20%2B%20RandomForest-orange)](./backend/ml)
[![Agents](https://img.shields.io/badge/agents-LangGraph%20%2B%20OpenRouter-blueviolet)](./backend/agents)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

---

## Table of Contents

- [About](#about)
- [Features](#features)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Seed Demo Data](#seed-demo-data)
- [Environment Variables](#environment-variables)
- [User Roles & Demo Accounts](#user-roles--demo-accounts)
- [API Reference](#api-reference)
- [Machine Learning](#machine-learning)
- [AI Agents](#ai-agents)
- [Testing](#testing)
- [Deployment Notes](#deployment-notes)
- [Medical Disclaimer](#medical-disclaimer)
- [Contributing](#contributing)
- [License](#license)

---

## About

Every year, thousands of patients in India await life-saving organ transplants while compatible donors remain hard to find and slow to verify. **DonorKhoj** closes that gap with a single platform that:

1. **Screens** donors and recipients through a guided, multi-step medical workup (with automatic lab-report extraction).
2. **Scores** donor–recipient compatibility with an XGBoost + Random Forest ensemble trained on India-representative data.
3. **Explains** every score with SHAP and LIME attributions clinicians can inspect.
4. **Orchestrates** the whole journey as a LangGraph agent pipeline ending in an AI-written clinical report queued for physician approval.
5. **Supports** patients throughout with DonorBot, a context-aware assistant that knows their actual screening data and match history.

---

## Features

### Donor Portal
- Guided 3-step medical screening wizard (basic → organ function → HLA/compatibility).
- Lab report upload (PDF/text) with automatic value extraction and abnormality flags.
- Organ preferences (kidney, liver, heart, lung) and eligibility verdict with reasons.
- Match history and status tracking.

### Recipient Portal
- Recipient workup with urgency scoring (ESRD/CKD staging, MELD-inspired liver signals, cardiac and lung urgency).
- Eligible-donor discovery filtered by organ.
- One-click full matching pipeline with live stage-by-stage progress (WebSocket + polling fallback).
- Match reports with ensemble scores and compatibility classes.

### Doctor Portal
- Review queue of AI-scored matches awaiting decision.
- Approve / reject with clinical notes (recorded with doctor identity).
- Full match context: scores, SHAP drivers, AI report, both screening profiles.

### Admin Portal
- Registry statistics (users, donors, recipients, matches, approval rate).

### Platform-wide
- JWT authentication (register, JSON login, OAuth2 password flow, `/me`).
- DonorBot chat drawer: streaming (SSE) assistant personalized with the user's screening, eligibility, and latest match.
- Role-based access control on every endpoint.

---

## How It Works

```
Donor & Recipient sign up
        │
        ▼
Medical Screening Wizard ──► Rule Engine (NOTTO criteria) ──► eligible / urgency score
        │  ▲
        │  └── Lab report upload ──► Medical Agent (extract values + summary)
        ▼
Recipient picks donor + organ ──► LangGraph Matching Pipeline
        │                              1. eligibility check
        │                              2. organ quality gates
        │                              3. XGBoost + RF ensemble score
        │                              4. SHAP explainability (+ LIME)
        │                              5. AI clinical report
        ▼
Match (COMPLETED) ──► Doctor Review Queue ──► APPROVED / REJECTED
```

---

## Architecture

```
donorkhoj/
├── backend/                 # FastAPI + SQLAlchemy (async) + Neon PostgreSQL
│   ├── main.py              # App, CORS, lifespan (table creation), routers
│   ├── auth.py              # PBKDF2 hashing, JWT create/verify
│   ├── database.py          # Async engine + session factory
│   ├── models/models.py     # User, MedicalScreening, Match, AgentJob, ChatMessage
│   ├── routers/             # auth, screening, matching, agents
│   ├── ml/                  # eligibility engine, train, predict (XGB+RF+SHAP+LIME)
│   ├── agents/              # medical, matching graph, chatbot, shared LLM client
│   └── seed.py              # Demo users + screenings + sample match
└── frontend/                # React 19 + Vite + Tailwind 4 + Zustand + Axios
    └── src/
        ├── pages/           # Landing, auth, donor, recipient, doctor, admin, shared
        ├── components/      # screening wizard, pipeline modal, chat drawer, ui
        └── lib/             # api client, store, constants, formatting
```

---

## Tech Stack

| Layer      | Technology |
|------------|------------|
| API        | FastAPI, Uvicorn, Pydantic v2 |
| ORM / DB   | SQLAlchemy 2 (async), asyncpg, PostgreSQL (Neon) |
| Auth       | python-jose (JWT HS256), Passlib PBKDF2 |
| ML         | XGBoost, scikit-learn RandomForest, SHAP, LIME, pandas, joblib |
| Agents     | LangGraph, LangChain-OpenAI via OpenRouter, PyPDF2 |
| Frontend   | React 19, Vite, Tailwind CSS 4, Zustand, Axios, React Router 7, Recharts, Framer Motion |
| Validation | email-validator, Pydantic EmailStr |

---

## Getting Started

### Prerequisites

- Python **3.11+**
- Node.js **18+** and npm
- A PostgreSQL database (Neon recommended — the default `DATABASE_URL` scheme is `postgresql+asyncpg://…?ssl=require`)
- An [OpenRouter](https://openrouter.ai/) API key (free-tier models work)

### Backend Setup

```bash
cd backend

# 1. Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# 2. Install dependencies (pinned — httpx is capped for openai-sdk compatibility)
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env              # then fill in DATABASE_URL + OPENROUTER_API_KEY

# 4. (Optional) load demo users and clinical data
python seed.py

# 5. Run the API (auto-reload for development)
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

- API base: `http://localhost:8000`
- Interactive docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Point at the API (defaults to http://localhost:8000)
#    edit .env if needed:
#    VITE_API_URL=http://localhost:8000

# 3. Run the dev server
npm run dev                        # http://localhost:5173

# Production build
npm run build                      # outputs to dist/
```

### Seed Demo Data

`backend/seed.py` creates four users (donor, recipient, doctor, admin), clinical screenings for the donor/recipient pair, and one completed sample match for the doctor queue. It is idempotent — safe to re-run.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | ✅ | — | Async Postgres URL, e.g. `postgresql+asyncpg://user:pass@host/db?ssl=require` |
| `SYNC_DATABASE_URL` | ❌ | — | Sync URL for tools/scripts |
| `SECRET_KEY` | ✅ | — | JWT signing secret (change in production!) |
| `ALGORITHM` | ❌ | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | ❌ | `1440` | Token lifetime (24 h) |
| `OPENROUTER_API_KEY` | ✅ | — | Key for all AI agents |
| `OPENROUTER_BASE_URL` | ❌ | `https://openrouter.ai/api/v1` | LLM endpoint |
| `MEDICAL_AGENT_MODEL` | ❌ | `google/gemma-4-31b-it:free,nex-agi/nex-n2.5-pro:free` | Comma-separated fallback chain |
| `MATCHING_AGENT_MODEL` | ❌ | `nex-agi/nex-n2.5-pro:free,google/gemma-4-31b-it:free` | Comma-separated fallback chain |
| `CHATBOT_MODEL` | ❌ | `google/gemma-4-31b-it:free,nex-agi/nex-n2.5-pro:free` | Comma-separated fallback chain |
| `FRONTEND_URL` | ❌ | — | Extra allowed CORS origin(s), comma-separated |

> Model variables accept **comma-separated fallback chains** — if the primary model is throttled, the agent fails over to the next provider automatically, with backoff retries.

### Frontend (`frontend/.env`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | `http://localhost:8000` | Backend REST base URL |
| `VITE_WS_URL` | `ws://localhost:8000` | Backend WebSocket base URL |

---

## User Roles & Demo Accounts

| Role | Capabilities | Demo login |
|------|--------------|------------|
| Donor | Screening wizard, lab upload, match history | `donor1 / password123` |
| Recipient | Workup, donor discovery, run pipeline, matches | `recipient1 / password123` |
| Doctor | Review queue, approve/reject with notes | `doctor1 / password123` |
| Admin | Registry statistics | `admin1 / password123` |

All demo accounts are created by `backend/seed.py`.

---

## API Reference

### System

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | — | Service info |
| GET | `/health` | — | Liveness + subsystem tags |

### Auth (`/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | — | Register (email, username, password ≥ 6 chars, role) → token + user |
| POST | `/auth/login` | — | JSON login with username or email → token + user |
| POST | `/auth/token` | — | OAuth2 password flow (form) → token + user |
| GET | `/auth/me` | ✅ | Current user profile |

Token response shape: `{ access_token, token_type, role, user_id, username, user }`. Pass as `Authorization: Bearer <token>`.

### Screening (`/screening`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/screening/submit` | ✅ | Create/update own screening → eligibility verdict |
| GET | `/screening/me` | ✅ | Own screening record |
| GET | `/screening/{user_id}` | ✅ (owner / doctor / admin) | Any user's screening |

Submit body: blood group, infection statuses, cancer history, lifestyle, per-organ labs (creatinine, eGFR, ALT/AST/ALP, bilirubin, albumin, EF, FEV1/FVC…), HLA-A/B/DR, crossmatch, PRA, `organs_offered`, `completed_steps`.

### Matching (`/matching`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/matching/donors?organ=kidney` | ✅ | Eligible donors offering the organ |
| GET | `/matching/matches/mine` | ✅ | Own matches (doctors/admins see recent all) |
| GET | `/matching/matches/pending` | ✅ doctor/admin | Matches awaiting review |
| POST | `/matching/matches/{id}/approve?notes=` | ✅ doctor/admin | Approve with notes |
| POST | `/matching/matches/{id}/reject?notes=` | ✅ doctor/admin | Reject with notes |
| GET | `/matching/stats` | ✅ | Registry counts |

### Agents (`/agents`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/agents/screening/analyze` | ✅ | Upload lab report (multipart `file`) → `{ extracted_values, flags, summary, fields_found }` |
| POST | `/agents/matching/run?donor_id=&recipient_id=&organ=` | ✅ | Start LangGraph pipeline → `{ job_id, status }` |
| GET | `/agents/matching/{job_id}` | ✅ | Job status, steps, result, error |
| WS | `/agents/ws/{job_id}` | — | Live pipeline step streaming |
| POST | `/agents/chat` | ✅ | DonorBot reply as **SSE** (`data: {"token": …}` … `data: [DONE]`) |
| GET | `/agents/chat/history` | ✅ | Last 50 chat messages |

---

## Machine Learning

### Training data
`backend/ml/data/` — 10,000 synthetic donor–recipient pairs sampled from India-representative distributions:

- Blood groups O 37% / B 32% / A 23% / AB 8%
- HLA-A/B/DR allele frequencies from published Indian population studies
- Indian clinical reference ranges; compatibility labels derived from ABO/Rh rules, HLA mismatch, crossmatch, and organ function

Regenerate with `backend/ml/data/generate_india_data.py` (seeded, reproducible).

### Models (`backend/ml/`)
- **Eligibility engine** (`eligibility.py`) — deterministic NOTTO-inspired rules: absolute contraindications (HIV/HBV/HCV, cancer history for donors), per-organ gates (eGFR, LFTs, EF, FEV1), plus recipient urgency scoring (0–10).
- **Ensemble matcher** (`predict.py`) — XGBoost (60%) + Random Forest (40%) over 23 features (ABO/Rh compatibility, HLA mismatch, age difference, donor/recipient labs, PRA, crossmatch, encoded blood groups/HLA). Output classes: `High / Medium / Low / Incompatible`.
- **Explainability** — SHAP TreeExplainer attributions + LIME local explanations, persisted per match.

### Retraining
```bash
cd backend
python ml/train.py        # saves to ml/models/ (xgb_model.pkl, rf_model.pkl, encoders.pkl, feature_cols.pkl)
```
Last verified run: **XGBoost AUC 0.97+, ensemble AUC ≈ 0.978**.

---

## AI Agents

All agents share `backend/agents/llm.py`: a single OpenRouter client factory with **fail-fast cross-provider fallback chains** and backoff retries, so transient free-tier throttling degrades gracefully instead of failing requests.

| Agent | File | Model chain | What it does |
|-------|------|-------------|--------------|
| Medical | `agents/medical_agent.py` | Gemma → Nex | One LLM call extracts lab values **and** writes the patient summary; abnormalities flagged locally against Indian ranges |
| Matching | `agents/graph.py` | Nex → Gemma | 5-stage LangGraph pipeline: eligibility → organ quality → ML score → SHAP → clinical report |
| Chatbot | `agents/chatbot_agent.py` | Gemma → Nex | Streaming assistant grounded in the user's real screening, eligibility, and latest match |

Pipeline progress streams over WebSocket with HTTP polling fallback (`PipelineModal`). Every match stores scores, SHAP/LIME payloads (strict-JSON sanitized), the AI report, and a doctor decision trail.

---

## Testing

Three suites live outside the repo in `/tmp/dk_test/` (run against a dev server + database):

| Suite | Scope | Result |
|-------|-------|--------|
| `phase_a.py` | Offline units: auth crypto/JWT, eligibility rules, ML/SHAP/LIME, graph nodes, liver-flag direction, report fallback, static code checks | **26/26** |
| `phase_b.py` | Live API on Neon: register/login/validation, screening auth matrix, donor discovery, stats, lab analysis, full pipeline to completion, approve/reject flow, error paths | **31/31** |
| `phase_c.py` | Live chat SSE with real model tokens, history persistence, WebSocket handshake | **6/6** |

```bash
# 1. Start the backend (port 8001 keeps :8000 free)
cd backend && python -m uvicorn main:app --host 127.0.0.1 --port 8001

# 2. Run the suites
PYTHONPATH=backend venv/bin/python /tmp/dk_test/phase_a.py
venv/bin/python /tmp/dk_test/phase_b.py   # edit BASE inside for a different port
venv/bin/python /tmp/dk_test/phase_c.py
```

Retraining is verified in an isolated copy of `ml/` so production model artifacts are never touched by tests.

---

## Deployment Notes

### Backend → AWS EC2

Two supported paths. Both assume an Ubuntu 22.04/24.04 instance with an Elastic IP and a domain (e.g. `api.donorkhoj.in`) pointing at it.

**Option A — native (systemd + nginx), recommended**

```bash
# 1. Clone and configure
sudo mkdir -p /opt/donorkhoj && sudo chown $USER:$USER /opt/donorkhoj
git clone https://github.com/SurajsinghBayas/donorkhoj.git /opt/donorkhoj
cp /opt/donorkhoj/backend/.env.example /opt/donorkhoj/backend/.env
nano /opt/donorkhoj/backend/.env   # DATABASE_URL, SECRET_KEY (≥32 random chars),
                                   # OPENROUTER_API_KEY, ENV=production,
                                   # FRONTEND_URL=https://<your-app>.vercel.app

# 2. Run the provisioner (Python, nginx, certbot, venv, systemd service)
sudo bash /opt/donorkhoj/deploy/ec2-setup.sh

# 3. Wire up nginx + TLS (edit server_name in deploy/nginx-donorkhoj.conf first)
sudo cp deploy/nginx-donorkhoj.conf /etc/nginx/sites-available/donorkhoj
sudo ln -sf /etc/nginx/sites-available/donorkhoj /etc/nginx/sites-enabled/donorkhoj
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.donorkhoj.in
```

The API runs as `donorkhoj.service` (gunicorn + 3 uvicorn workers, auto-restart, non-root hardening). Logs: `/var/log/donorkhoj/`. Operate with `sudo systemctl {status,restart} donorkhoj`.

**Option B — Docker**

```bash
cd backend
docker build -t donorkhoj-api .
docker run -d --name donorkhoj-api --restart unless-stopped \
  -p 127.0.0.1:8000:8000 --env-file .env donorkhoj-api
```

Use the same nginx config in front for TLS, rate limiting, and WebSocket proxying.

### Frontend → Vercel

1. Import the repo in Vercel, set **Root Directory** to `frontend` (the included `vercel.json` handles SPA rewrites, asset caching, and security headers — no extra config needed).
2. Add the Environment Variable: `VITE_API_URL=https://api.donorkhoj.in` (your EC2 domain).
3. Deploy. Afterward, add the Vercel URL to the backend's `FRONTEND_URL` and restart the API.

### Production checklist

- [ ] Strong `SECRET_KEY` (≥ 32 random chars) — the server refuses to boot in production without one.
- [ ] `ENV=production` on the backend (tightens CORS to configured origins only).
- [ ] Real `DATABASE_URL` with restricted DB credentials; backups enabled on the database.
- [ ] `FRONTEND_URL` set to the exact Vercel URL.
- [ ] TLS via certbot; HTTP → HTTPS redirect active (in the provided nginx config).
- [ ] `/health` returns 200 with `"database": "up"` (it returns 503 if Postgres is unreachable — point EC2 health checks / Docker `HEALTHCHECK` at it).
- [ ] `client_max_body_size` and proxy timeouts sized for lab-report uploads and long agent runs (already in the nginx config).
- [ ] Never commit `.env` — only `.env.example` files are tracked.

---

## Medical Disclaimer

DonorKhoj is a **decision-support and education tool**, not a medical device. Scores, reports, and chat responses are AI-generated and must always be reviewed by a qualified transplant team under NOTTO and THO Act 2011 procedures. Never act on platform output without clinician confirmation.

---

## Contributing

1. Fork the repo and create a feature branch.
2. Keep backend changes covered by the Phase A/B/C suites above.
3. Follow existing code style (absolute imports from `backend/`, Pydantic v2 APIs).
4. Open a pull request describing the clinical/technical rationale.

---

## License

This project is licensed under the [MIT License](LICENSE).
