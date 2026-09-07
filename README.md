# Sahāy Platform

**AI Dementia Therapeutic Platform** — a monorepo for cognitive therapy, remote
caregiver monitoring, and anti-wandering safety for elderly dementia patients in
the North Eastern Region (NER) of India.

Built **offline-first**: patient-facing interactions always work on-device and
synchronize to the cloud when connectivity returns, so therapy is never
interrupted by network loss.

---

## 1. Core Architecture & Strict Role Separation

The platform enforces a **strict separation of concerns** between the two client
front-ends and the backend. Each surface is built for exactly one role — there is
**no cross-login or role toggle** between them.

| Layer | Stack | Deployed on | Exclusive role | Responsibilities |
|---|---|---|---|---|
| **Web App** `apps/web` | React 19 + Vite + Tailwind CSS | **Vercel** | **Caretaker** (Dashboard) | Monitoring, analytics, care-plan & media management, geofence zones, admin console |
| **Mobile App** `apps/mobile` | React Native (Expo SDK) + SQLite | App stores / self-host | **Patient** (App) | Therapeutic games, daily tracking, demitoken rewards, emergency SOS |
| **Backend** `services/api` | Python 3.11 · FastAPI · SQLAlchemy (async) · Postgres | Render / self-host | System / service | Idempotent sync, clinical audits, telemetry & analytics APIs |

> **“Exclusive” means exactly what it says:** the Web dashboard hard-codes the
> Caretaker role on login and no longer offers a patient toggle, while the Mobile
> app is the patient's primary therapeutic interface. A Caretaker on the web can
> never be mistaken for a Patient on mobile, and vice-versa.

### Web App — the Caretaker Dashboard (`apps/web`, Vercel)

- **Login is Caretaker-only** — the role is fixed on the form (`role: 'CARETAKER'`),
  and the patient toggle was removed.
- Surfaces live patient analytics (cognitive summary, DDA difficulty curve,
  session history), reminiscence media management, geofence zone configuration,
  and an admin console for user/telemetry oversight.
- Deployed to Vercel with SPA routing (`vercel.json` rewrites all paths to
  `index.html`).

### Mobile App — the Patient Interface (`apps/mobile`)

- Single-tap game launches, GDS-stage-filtered game selection, demitoken reward
  ledger, and a high-contrast emergency SOS with audible siren + multilingual
  voice fallback.
- Writes **locally first** to an embedded SQLite database, then flushes upstream
  through the offline-first sync engine (below).

### Backend — FastAPI (`services/api`)

- Handles **idempotent delta syncs** from mobile devices, persists **clinical
  audit trails** for every mutation, and serves the analytics/monitoring APIs
  consumed by the Caretaker Dashboard.

---

## 2. Offline-First Resilience

The platform is designed for unreliable networks (rural NER deployments,
intermittent cellular data). All patient usage is captured locally and reconciled
with the backend — never lost.

### The `SyncQueue` mechanism

Telemetry and app-usage mutations are written to an on-device queue and only
flushed when network connectivity is confirmed:

1. **Write locally.** Gameplay sessions are stored in SQLite with
   `sync_status = 'PENDING_SYNC'`. App usage / telemetry events are enqueued and
   persisted to `AsyncStorage` under the `@sahay_sync_queue` key via
   `SyncQueue` (`apps/mobile/src/services/sync/SyncQueue.ts`).
2. **Detect connectivity.** The background `SyncManager`
   (`apps/mobile/src/sync/SyncManager.ts`) checks network reachability via
   `NetInfo` before attempting any upload.
3. **Delta push.** Pending records are batched (up to 500 session logs plus token
   updates) and posted as a **delta push/pull** to
   `POST /api/v1/sync/delta`. On success, locally queued records are marked
   `SYNCED` (or cleared from the queue).
4. **Demitoken ledger.** Unsynced transactions (`synced = 0`) are flushed
   separately to `POST /api/v1/ledger/transaction`.
5. **Server-side reconciliation.** The backend executes each batch **atomically**
   — session logs are **idempotently upserted** (re-sends are harmless), token
   balances are recomputed from earned tokens, DDA curve points are appended, and
   a **clinical audit entry** is recorded for the whole batch.

### Cloud Preview Fallback (demo mode)

When the backend is unreachable — for example the `404`/`405` edge errors that
Vercel can return for missing API routes — both clients **gracefully fall back to
a deterministic demo state** so UI testing and review are never blocked:

- **Auth fallback.** If `POST /api/v1/auth/login` fails for any reason (offline,
  `404`/`405`/`5xx`, network error), the app verifies the demo credentials
  locally and enters “Demo Mode” with a synthetic signed-in user.
- **Analytics fallback.** The Caretaker Dashboard renders seeded, chart-ready data
  from a deterministic generator (`apps/web/src/lib/demoSeed.ts`). It uses a
  seeded PRNG (no `Math.random()`), mirrors the backend aggregation math exactly,
  and is used for brand-new patients (zero records) **or** any network failure —
  flagged with `isDemo` so the UI can indicate it.
- **API client resilience.** The web API layer treats `404` / `text/html`
  responses as “Backend unreachable,” so Vercel's SPA/edge responses are not
  mistaken for real API failures.

The result: reviewers can explore the full dashboard and patient flow without a
live backend connection (see the demo credentials below).

---

## 3. Demo Credentials

Testing the platform without a live backend connection is supported out of the
box. Both apps fall back to a deterministic demo session using these credentials:

| Surface | Role | Username / Email | Password |
|---|---|---|---|
| **Web Caretaker (Dashboard)** | CARETAKER | `ram` | `12345678` |
| **Mobile Patient (App)** | PATIENT | `aditya` | `12345678` |

The two demo identities are linked — `ram` (caretaker) is mapped to `aditya`
(patient: `demo-patient-aditya`), so the same seeded telemetry surfaces on both
platforms.

---

## Repository Structure

```
sahay-platform/
├── apps/
│   ├── mobile/     # React Native (Expo SDK) + SQLite — patient interface (offline-first)
│   └── web/        # React + Vite + Tailwind — caretaker dashboard (Vercel)
├── packages/
│   └── types/      # Shared TypeScript interfaces
└── services/
    └── api/        # FastAPI + SQLAlchemy + Alembic (idempotent sync & clinical audits)
```

## Prerequisites

- Node.js 20+
- Python 3.11
- PostgreSQL 15+ (SQLite `aiosqlite` fallback supported for local dev/tests)

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

# Seed demo patients / NER media / geofence zones
python seed_data.py

# Start API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Web (caretaker portal)

```bash
npm run web
```

### 4. Mobile (patient app)

```bash
npm run mobile
```

For a physical device, point `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` at your
dev machine's LAN IP (see the file header for full instructions).

## Delta Sync

The mobile `SyncManager` batches local `gameplay_session_logs` with
`sync_status = 'PENDING_SYNC'` and posts them to `POST /api/v1/sync/delta`. On
success, records are marked `SYNCED` locally. The backend applies each batch
atomically, idempotently upserting session logs and recording a clinical audit
entry (see [Offline-First Resilience](#2-offline-first-resilience)).

## Database Schema

| Table | Purpose |
|---|---|
| `users` | Unified auth accounts (role + premium tier) |
| `patient_profiles` | Patient identity, GDS stage, demitoken balance |
| `gameplay_session_logs` | Cognitive game session telemetry (synced offline-first) |
| `reminiscence_media` | Caregiver-uploaded photos/voice clips |
| `geofence_zones` | Safe-zone geofencing for wander detection |
| `emergency_contacts` | Caregiver/emergency contact list |
| `emergency_alert_logs` | Persisted SOS / high-impact alert history |
| `dda_metrics_logs` | Achaotic DDA curve points written during sync |
| `telemetry_records` | Device telemetry / presence records |
| `demitoken_ledger` | Append-only, auditable demitoken transaction ledger |
| `audit_logs` | Immutable clinical audit trail for every mutation |