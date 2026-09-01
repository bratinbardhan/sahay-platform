# Sahāy Platform

AI Dementia Therapeutic Platform monorepo.

## Structure

```
sahay-platform/
├── apps/
│   ├── mobile/     # React Native (Expo SDK) — patient interface
│   └── web/        # React + Vite + Tailwind — caregiver portal
├── packages/
│   └── types/      # Shared TypeScript interfaces
└── services/
    └── api/        # FastAPI + SQLAlchemy + Alembic
```

## Prerequisites

- Node.js 20+
- Python 3.11
- PostgreSQL 15+

## Setup

### 1. Install JS dependencies

```bash
npm install
npm run types:build
```

### 2. Backend

```bash
cd services/api
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cp ../../.env.example .env

# Run migrations
alembic upgrade head

# Start API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Web (caregiver portal)

```bash
npm run web
```

### 4. Mobile (patient app)

```bash
npm run mobile
```

## Delta Sync

Mobile `SyncManager` batches local `gameplay_session_logs` with `sync_status = 'PENDING_SYNC'` and posts them to `POST /api/v1/sync/delta`. On success, records are marked `SYNCED` locally.

## Database Schema

| Table | Purpose |
|---|---|
| `patient_profiles` | Patient identity, GDS stage, demitoken balance |
| `gameplay_session_logs` | Cognitive game session telemetry |
| `reminiscence_media` | Caregiver-uploaded photos/voice clips |
| `geofence_zones` | Safe-zone geofencing for wander detection |
