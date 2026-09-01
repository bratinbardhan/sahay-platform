# Sahāy API — FastAPI backend service

Production-grade FastAPI backend for the Sahāy dementia platform: delta sync,
reminiscence media uploads, anti-wandering geofence alerts and analytics.

## Stack
- Python 3.11+ · FastAPI · SQLAlchemy 2 (async) · Alembic · Pydantic v2
- PostgreSQL via `asyncpg` (SQLite `aiosqlite` fallback for local dev/tests)
- AWS S3 object storage (with local mock fallback) · Twilio SMS (with mock fallback)
- Structured JSON logging + clinical audit-trail middleware

## Setup
```bash
cd services/api
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt

cp .env.example .env          # then edit values
alembic upgrade head          # migrate the schema
python seed_data.py           # demo patients / NER media / geofence zones
uvicorn app.main:app --reload --port 8000
```

Local SQLite fallback: set `DATABASE_URL=sqlite+aiosqlite:///./sahay.db` in `.env`.

## Endpoints
| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v1/sync/delta` | Batch session logs + token updates (atomic, demitoken + DDA metrics) |
| POST | `/api/v1/reminiscence/upload` | Multipart photo/voice upload -> SHA-256 -> S3/mock storage |
| POST | `/api/v1/geofence/alert` | Breach coords -> active-zone check -> Twilio SMS w/ Google Maps live-link |
| GET | `/api/v1/analytics/{patient_id}` | Session history, rolling latency, accuracy, DDA curve |
| GET | `/health` | Liveness |

## Tests
```bash
cd services/api
pytest -v
```
Runs against file-backed SQLite, local mock storage and mocked Twilio.