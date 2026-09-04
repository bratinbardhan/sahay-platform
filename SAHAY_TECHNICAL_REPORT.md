# Sahāy Platform — Technical Architecture & Current State Report

> **Classification:** Internal Architecture Audit  
> **Generated:** 2026-09-03  
> **Scope:** `apps/mobile`, `apps/web`, `services/api`, `packages/types`  
> **Project Vision:** *"Bhulne nhi dena hai"* — An offline-first AI cognitive therapeutic and memory assistance platform for elderly dementia patients in the North Eastern Region (NER) of India.

---

## Table of Contents

1. [Current Architecture & Tech Stack](#1-current-architecture--tech-stack)
2. [API & Data Flow Analysis](#2-api--data-flow-analysis)
3. [Security & Authentication](#3-security--authentication)
4. [Future Integrations & Hackathon Roadmap](#4-future-integrations--hackathon-roadmap)

---

## 1. CURRENT ARCHITECTURE & TECH STACK

### 1.1 Monorepo Structure & Package Management

The Sahāy platform is organized as an **npm workspaces monorepo** with the following topology:

```
sahay-platform/
├── apps/
│   ├── mobile/          # React Native (Expo SDK 54) — patient interface
│   └── web/             # React + Vite + Tailwind — caregiver portal
├── packages/
│   └── types/           # Shared TypeScript interfaces (@sahay/types)
├── services/
│   └── api/             # FastAPI + SQLAlchemy + Alembic
├── package.json         # Root workspace orchestrator
└── .env.example         # Environment variable template
```

**Root `package.json` configuration:**
- **Workspaces:** `apps/*`, `packages/*`
- **Engine requirement:** Node.js >= 20.0.0
- **Key scripts:**
  - `npm run mobile` → starts `@sahay/mobile` via Expo
  - `npm run web` → starts `@sahay/web` via Vite
  - `npm run types:build` → compiles `@sahay/types`
  - `npm run lint` / `npm run typecheck` → workspace-wide
- **Root dependency:** `@expo/config-plugins ^57.0.9`

**Workspace linking:** The mobile and web apps consume `@sahay/types` via TypeScript path aliases and npm workspace resolution (`"@sahay/types": "*"`). The mobile `tsconfig.json` maps `@sahay/types` directly to `../../packages/types/src/index.ts`, while the web `vite.config.ts` resolves it via `path.resolve`.

---

### 1.2 Mobile Frontend — `apps/mobile`

#### 1.2.1 Platform & Runtime

| Attribute | Value |
|---|---|
| Framework | React Native 0.81.5 + React 19.1.0 |
| Expo SDK | ~54.0.0 (managed workflow) |
| Entry point | `expo-router/entry` |
| Architecture | New Architecture enabled (`newArchEnabled: true`) |
| TypeScript | ^5.7.3 (strict mode) |
| Orientation | Portrait only |
| Bundle ID | `com.sahay.mobile` |

**`app.json` plugin configuration:**
- `expo-router` — file-based routing with typed routes experiment enabled
- `expo-secure-store` — encrypted key storage
- `expo-av` — audio playback for therapeutic content
- `expo-sqlite` — with `useSQLCipher: true`, `enableFTS: false`
- `react-native-background-geolocation` — Transistorsoft SDK with foreground service notification and background permission rationale

#### 1.2.2 Core Native Plugins

| Plugin | Version | Purpose |
|---|---|---|
| `react-native-background-geolocation` | ^4.16.3 | Anti-wandering safe-zone monitoring with headless task support |
| `expo-av` | ~16.0.8 | Audio playback (pacifier, ambient sounds, folk melodies) |
| `expo-sqlite` | ~16.0.10 | Encrypted local SQLite database (SQLCipher) |
| `expo-secure-store` | ~15.0.8 | TEE-backed encryption key storage |
| `expo-crypto` | ~15.0.9 | Cryptographic random byte generation |
| `@react-native-community/netinfo` | 11.4.1 | Connectivity detection for sync gating |
| `react-native-reanimated` | ~4.1.1 | Smooth 60fps animations (gesture ripples, guided feedback) |
| `react-native-gesture-handler` | ~2.28.0 | Pan/touch gesture recognition |
| `react-native-worklets-core` | ^1.6.3 | Reanimated worklet runtime |

#### 1.2.3 Routing Architecture

The mobile app uses a **custom in-memory router** (`AppRouter.tsx`) rather than file-based `expo-router` screen routes. The routing logic is:

1. **Patient loads** → `PatientProvider` seeds local DB, starts `SyncManager` + `GeofenceManager`
2. **GDS Stage evaluation** → `therapyStageFromGds(assigned_gds_stage)` determines UI tier:
   - Stage 1 (GDS 1-3): Rapid-Fire Sorting, Serial Number Scatter
   - Stage 2 (GDS 4-5): Face & Name Match, Environmental Sound Match
   - Stage 3 (GDS 6-7): Ambient Ripple Screensaver (direct, no menu)
3. **Game selection** → `gamesForGds()` returns permitted modules
4. **Active game** → `ActiveGame` switch renders the selected component

**Clinical design rules enforced:**
- Zero-friction: single-tap launches, no login, no tutorials
- Touch targets >= 64x64 dp (`MIN_TOUCH_DP`)
- Glare-reducing palette: `#F8F6F0` background, `#2C3E50` text, `#E67E22` actions
- **NEVER red or alarming colors on Patient UI**

#### 1.2.4 Source Structure

```
src/
├── audio/               # Pacifier synthesis, ambient sound generation
├── components/          # ErrorlessFeedbackWrapper, HighContrastCard, LargeTouchButton
├── config/              # apiConfig.ts, constants.ts
├── db/                  # DatabaseService, schema.ts, repositories
├── engine/              # AchaoticDDA.ts (difficulty adjustment algorithm)
├── games/               # Game modules, catalog, DDA engine re-export
├── geofence/            # GeofenceManager, driver, geo math, types
├── patient/             # PatientProvider context
├── routing/             # AppRouter (root navigation)
├── screens/             # Screen-level wrappers
├── sync/                # SyncManager (delta sync orchestration)
└── theme/               # colors.ts, designSystem.ts, theme.ts
```

---

### 1.3 Backend Engine — `services/api`

#### 1.3.1 Runtime & Framework

| Attribute | Value |
|---|---|
| Python | 3.13 (confirmed via `.venv/Lib/site-packages/python3.13` includes) |
| Framework | FastAPI 0.115.6 |
| ASGI Server | Uvicorn[standard] 0.34.0 |
| ORM | SQLAlchemy[asyncio] 2.0.36 (2.0-style `Mapped`/`mapped_column`) |
| Migrations | Alembic 1.14.0 |
| Validation | Pydantic 2.10.4 + Pydantic-settings 2.7.0 |
| Linter | Ruff 0.8.4 |
| Tests | Pytest 8.3.4 + pytest-asyncio 0.25.0 + httpx 0.28.1 |

**Execution:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 1.3.2 Core Dependencies (`requirements.txt`)

| Dependency | Version | Purpose |
|---|---|---|
| `fastapi` | 0.115.6 | HTTP framework |
| `uvicorn[standard]` | 0.34.0 | ASGI server |
| `sqlalchemy[asyncio]` | 2.0.36 | Async ORM |
| `asyncpg` | 0.30.0 | Async PostgreSQL driver (runtime) |
| `psycopg2-binary` | 2.9.10 | Sync PostgreSQL driver (Alembic migrations) |
| `alembic` | 1.14.0 | Database migrations |
| `pydantic` / `pydantic-settings` | 2.10.4 / 2.7.0 | Settings + schema validation |
| `python-dotenv` | 1.0.1 | `.env` loading |
| `python-multipart` | 0.0.20 | File upload handling |
| `boto3` | 1.35.58 | AWS S3 media storage |
| `twilio` | 9.3.0 | SMS dispatch (anti-wandering alerts) |
| `aiosqlite` | 0.20.0 | Async SQLite (test suite only) |

#### 1.3.3 Middleware Stack (`app/main.py`)

1. **CORSMiddleware** (FastAPI built-in):
   - Origins: configurable via `API_CORS_ORIGINS` env var (default: `*`)
   - Methods/Headers: `*`
   - Credentials: auto-disabled when wildcard origin is used (browsers reject `*` + credentials); mobile/web clients use plain `fetch` without credentials, so this is safe.

2. **ClinicalAuditMiddleware** (custom, `app/middleware/audit.py`):
   - Assigns a unique `X-Sahay-Trace-Id` response header per request
   - Logs method, path, status code, client IP (X-Forwarded-For aware), and duration as structured JSON
   - Deliberately does **NOT** capture request bodies (PHI protection)

#### 1.3.4 Configuration (`app/config.py`)

Pydantic `Settings` loaded from `.env` with `lru_cache` singleton. Key groups:

| Group | Fields |
|---|---|
| App | `app_name`, `environment`, `api_host`, `api_port`, `api_cors_origins` |
| Database | `database_url` (asyncpg), `database_url_sync` (psycopg2) |
| Logging | `log_level` (default INFO), `log_json_enabled` (default True) |
| Storage | `use_local_storage`, `local_upload_dir`, `max_upload_bytes` (25 MB), `aws_*` |
| Twilio | `twilio_enabled` (default False), `twilio_account_id`, `twilio_auth_token`, `twilio_from_number`, `twilio_max_retries` (3) |

#### 1.3.5 Application Structure

```
app/
├── config.py            # Pydantic Settings (env-based configuration)
├── database.py          # Async engine, session factory, DeclarativeBase
├── logging_setup.py     # Structured JSON logging (JsonFormatter)
├── main.py              # FastAPI app, middleware, router registration
├── middleware/
│   └── audit.py         # ClinicalAuditMiddleware
├── models/
│   └── __init__.py      # SQLAlchemy ORM models
├── routers/
│   ├── sync.py          # POST /api/v1/sync/delta
│   ├── geofence.py      # POST /api/v1/geofence/zone, /alert
│   ├── analytics.py     # GET /api/v1/analytics/{patient_id}
│   └── reminiscence.py  # POST /api/v1/reminiscence/upload
├── schemas/             # Pydantic request/response models
└── services/
    ├── audit.py         # Clinical audit trail persistence
    ├── dda.py           # Achaotic DDA curve smoothing (server-side)
    ├── geo_utils.py     # Haversine distance calculation
    ├── storage.py       # S3 / local mock media storage
    └── twilio_dispatcher.py  # SMS dispatch with retry + mock fallback
```

Alembic migration history: `001_initial_schema` (core tables) → `002_dda_audit_emergency` (`emergency_contacts`, `dda_metrics_logs`, `audit_logs`). Migrations target `database_url_sync` (psycopg2).

---

### 1.4 Database Layer — Dual-State Architecture

Sahāy operates **three database states** that together realize its offline-first design:

#### 1.4.1 Cloud PostgreSQL (Production Backend)

| Attribute | Value |
|---|---|
| Engine | `postgresql+asyncpg://` |
| Driver | asyncpg 0.30.0 |
| Pool | `pool_pre_ping=True` |
| Session | `AsyncSession` via `async_sessionmaker(expire_on_commit=False)` |
| Migrations | Alembic (sync via `psycopg2-binary`) |
| Seed | `seed_data.py` (idempotent demo dataset: 3 NER patients, sessions, zones, contacts) |

**Table Schema (PostgreSQL):**

| Table | Purpose |
|---|---|
| `patient_profiles` | Patient identity, GDS stage (1-7 CHECK), demitoken balance, streak, primary language |
| `gameplay_session_logs` | Cognitive game session telemetry (synced from mobile) |
| `reminiscence_media` | Caregiver-uploaded photos/voice clips (media_type enum: PHOTO/VOICE) |
| `geofence_zones` | Safe-zone boundaries (radius > 0 CHECK, max 2000 m at schema level) |
| `emergency_contacts` | Priority-ordered SMS recipients |
| `dda_metrics_logs` | Persisted Achaotic DDA curve points (rolling latency/error/difficulty) |
| `audit_logs` | Immutable clinical audit trail (actor, action, entity, JSON meta) |

All child tables use `ForeignKey("patient_profiles.id", ondelete="CASCADE")`.

#### 1.4.2 Local SQLite (Mobile Client, SQLCipher-Encrypted)

| Attribute | Value |
|---|---|
| Engine | `expo-sqlite` with SQLCipher (`useSQLCipher: true`) |
| Database file | `sahay_encrypted.db` |
| Encryption | AES-256 via SQLCipher (`PRAGMA key`) |
| Key storage | `expo-secure-store` (TEE-backed) — see §3.1 |
| Schema version | 2 (idempotent `CREATE TABLE IF NOT EXISTS` + `schema_migrations` versioning) |

**Table Schema (SQLite):**

| Table | Purpose |
|---|---|
| `schema_migrations` | Tracks schema version |
| `patient_profiles` | Local patient identity cache (GDS stage drives UI routing) |
| `gameplay_session_logs` | Game telemetry with `sync_status` column (`PENDING_SYNC` / `SYNCED` / `SYNC_FAILED`) |
| `reminiscence_media` | Cached media metadata |
| `geofence_zones` | Active safe-zone boundaries |
| `pending_geofence_alerts` | **v2 addition** — offline breach queue with `attempts` counter, flushed by the background worker |

#### 1.4.3 Test SQLite (Backend Test Suite)

| Attribute | Value |
|---|---|
| Engine | `sqlite+aiosqlite:///` |
| Driver | aiosqlite 0.20.0 |
| Location | File-backed per-test temp DB (`conftest.py` `db_engine` fixture) |
| Notes | Forces local mock storage + mock Twilio mode via `isolated_settings` fixture; dependency-overrides `get_db` |

**Delta-sync contract:** only `gameplay_session_logs` rows and `patient_profiles` token/streak fields travel between the two primary states. Rows are created client-side with `sync_status = 'PENDING_SYNC'` and flip to `SYNCED` after the server acknowledges the batch.

---

## 2. API & DATA FLOW ANALYSIS

### 2.1 REST Endpoint Inventory

| Method | Endpoint | Handler | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/sync/delta` | `routers/sync.py::sync_delta` | Batch sync of offline gameplay logs + token updates |
| `POST` | `/api/v1/geofence/zone` | `routers/geofence.py::upsert_geofence_zone` | Caregiver creates/updates a safe zone |
| `POST` | `/api/v1/geofence/alert` | `routers/geofence.py::geofence_alert` | Report breach (live or offline-queued) → SMS dispatch |
| `GET` | `/api/v1/analytics/{patient_id}` | `routers/analytics.py::get_analytics` | Aggregated sessions + DDA curve + summary |
| `POST` | `/api/v1/reminiscence/upload` | `routers/reminiscence.py::upload_reminiscence` | Multipart photo/voice upload → storage → DB row |
| `GET` | `/health` | `main.py::health_check` | Service health probe |
| `GET` | `/uploads/*` | StaticFiles mount | Local mock media serving (dev/test only) |

The caregiver web portal additionally calls **OpenStreetMap Nominatim** directly for address geocoding (`web/src/lib/api.ts::searchAddress`) — keyless, fair-use.

### 2.2 Asynchronous State Sync Mechanism

The sync flow implements a **delta-sync, offline-first architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                        MOBILE CLIENT                            │
│                                                                 │
│  Game completes → useGameplaySession.persistSession()           │
│       │  (id = Crypto.randomUUID())                             │
│       ▼                                                         │
│  Local SQLite: INSERT gameplay_session_logs                     │
│    (sync_status = 'PENDING_SYNC') + addDemitokens()             │
│       │                                                         │
│       ▼  SyncManager.startBackgroundSync(60_000 ms)             │
│    1. NetInfo.fetch() — isConnected + isInternetReachable gate  │
│    2. SELECT ... WHERE sync_status = 'PENDING_SYNC' LIMIT 500   │
│    3. Load patient_profiles → build token_updates array         │
│    4. POST /api/v1/sync/delta  (single-flight guard)            │
│    5. On success: transaction → UPDATE sync_status = 'SYNCED'   │
│                                                                 │
└───────┬─────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│              FASTAPI — POST /api/v1/sync/delta                  │
│  Single atomic transaction (db.begin()):                        │
│   1. Referential check — unknown patients reject the batch      │
│      (422 UNKNOWN_PATIENTS)                                     │
│   2. Idempotent session-log upsert (existing IDs → ack + skip)  │
│   3. Server-side demitoken recompute:                           │
│      patient.demitoken_balance += Σ earned tokens               │
│   4. Streak: device authoritative, never regress                │
│      (patient.streak_days = max(server, device))                │
│   5. Achaotic DDA curve per patient via build_dda_curve()       │
│      → persist DdaMetricsLog rows                               │
│   6. record_clinical_audit("GAMEPLAY_DELTA_SYNC")               │
│                                                                 │
│  Response: { synced_session_log_ids,                            │
│              synced_token_update_patient_ids,                   │
│              dda_metric_ids, token_updates_applied }            │
└─────────────────────────────────────────────────────────────────┘
```

**Geofence offline queue (parallel mechanism):**

The geofence pipeline has its own offline path in `GeofenceManager`:

1. **Online path:** OS `GEOFENCE_EXIT` → local haversine re-verification (`evaluateBreach` — a patient inside *any* other active zone is not a breach) → `POST /api/v1/geofence/alert` → server re-checks all active zones → Twilio SMS to emergency contacts (priority order) with Google Maps live-location link.
2. **Offline path:** breach cached in `pending_geofence_alerts` (SQLite) → **soothing caregiver pacifier audio plays locally** (`playSoothingPacifier` — 3 gentle repetitions at 0.45 volume, synthesized on-device as a descending C5→A4→G4→E4 pentatonic chime) → `startFlushWorker(30_000 ms)` retries the queue once connectivity returns, incrementing `attempts` and deleting rows on success. Flushed alerts carry `is_offline_breach: true`.

**Key sync characteristics:**
- **Batch limit:** 500 session logs per request (Pydantic-validated)
- **Idempotency:** duplicate IDs are acknowledged, not rejected
- **Single-flight:** `isRunning` guard prevents overlapping sync cycles
- **Server-authoritative balances:** cloud recomputes token totals from earned amounts; client balance is advisory
- **Audit:** every mutation writes a structured JSON log line + `audit_logs` row

### 2.3 External API Integrations

#### 2.3.1 Twilio SMS Dispatcher (`services/twilio_dispatcher.py`)

The `TwilioAlertDispatcher` provides resilient SMS dispatch for anti-wandering alerts:

- **Retry:** exponential backoff (0.5 s → 4 s cap), `twilio_max_retries` (default 3); raises `RuntimeError` after the final attempt
- **Mock fallback:** when disabled or the SDK is missing → logs warning, returns a synthetic SID (`SM-mock-…`) so the flow works end-to-end in dev/tests
- **SMS body** (`build_breach_sms_body`): patient name, lat/lng (6-decimal), `google.com/maps/search` live link, ISO timestamp, nearest zone name
- **Enabled condition:** `twilio_enabled` AND account ID AND auth token AND from number all present

#### 2.3.2 AWS S3 Object Storage (`services/storage.py`)

- **Dual mode:** local mock (`uploads/` dir, served at `/uploads/...`) → S3 in production
- **S3 URL:** `https://{bucket}.s3.{region}.amazonaws.com/{key}` (default region `ap-south-1`)
- **Key structure:** `{patient_uuid}/{uuid_hex}{suffix}` — caller assembles for uniqueness/safety
- **Suffix allowlist:** `.jpg .jpeg .png .webp .gif .mp3 .wav .m4a .ogg` (path-traversal guard)
- **Graceful degradation:** ImportError/S3 failure falls back to local storage with a logged warning

#### 2.3.3 OpenStreetMap Nominatim (web caregiver portal)

- **Purpose:** address search for placing the geofence home anchor pin (Leaflet map)
- **Endpoint:** `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=…`

#### 2.3.4 Geofence Driver Abstraction (mobile)

`geofence/driver.ts` defines a pluggable `GeofenceDriver` interface with two implementations:

| Driver | When used | Behavior |
|---|---|---|
| `TransistorsoftDriver` | `react-native-background-geolocation` linked | `ready()` headless config (`stopOnTerminate: false`, `startOnBoot: true`, 25 m distance filter, 60 s heartbeat) → `addGeofences` (EXIT-only transitions) → `start()` |
| `InertDriver` | Expo Go / module not linked | Logs warning; offline breach queue remains fully functional |

---

## 3. SECURITY & AUTHENTICATION

### 3.1 TEE (Trusted Execution Environment) Implementation

The SQLCipher encryption key is stored in the platform secure-hardware-backed store via `expo-secure-store` (`db/DatabaseService.ts`):

**Key generation / retrieval flow:**

1. Check `SecureStore` for an existing key under alias `sahay_sqlcipher_key`
2. If absent → generate 32 random bytes via `Crypto.getRandomBytesAsync(32)` (expo-crypto)
3. Hex-encode to a 64-character string
4. Persist with protection level `SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY`
   - iOS → `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` (key never leaves the device, excluded from unencrypted backups)
   - Android → Keystore-backed; the value cannot be restored onto a different device

**Key application:**

```typescript
const encryptionKey = await getOrCreateEncryptionKey();
dbInstance = await SQLite.openDatabaseAsync(DB_NAME);        // sahay_encrypted.db
await dbInstance.execAsync(`PRAGMA key = '${escapePragmaKey(encryptionKey)}';`);
await dbInstance.execAsync(CREATE_TABLES_SQL);               // idempotent v2 schema
```

**Security properties:**
- Key material is never exposed in application code or logs
- Single quotes are escaped in the PRAGMA literal (`escapePragmaKey`) to prevent injection into the pragma string
- The database file is cryptographically opaque without the TEE-held key
- The key is device-bound: theft of the `.db` file alone yields nothing

### 3.2 Data-at-Rest Encryption (SQLCipher)

| Attribute | Implementation |
|---|---|
| Library | SQLCipher, via `expo-sqlite` config plugin `useSQLCipher: true` |
| Cipher | AES-256-CBC (SQLCipher default) |
| Key size | 256 bits (32 random bytes) |
| Key derivation | PBKDF2 (SQLCipher 4 default parameters) |
| Database file | `sahay_encrypted.db` |
| FTS | Disabled (`enableFTS: false`) — no plaintext search index artifacts |

**Configuration (`app.json`):**

```json
["expo-sqlite", { "enableFTS": false, "useSQLCipher": true }]
```

### 3.3 Additional Security Measures

| Measure | Where | Detail |
|---|---|---|
| Parameterized queries | All mobile repos + SQLAlchemy | `?` placeholders on SQLite; bound parameters via SQLAlchemy — no string interpolation |
| Schema-level constraints | Both databases | `CHECK (gds_stage BETWEEN 1 AND 7)`, `CHECK (radius_meters > 0)`, `CHECK (sync_status IN (...))` |
| Pydantic validation | `app/schemas/*` | Bounded fields (lat/lng ranges, radius ≤ 2000 m, batch ≤ 500), strict UUID/datetime parsing |
| Referential integrity | `sync.py` | Unknown patient IDs reject the entire batch (422 `UNKNOWN_PATIENTS`) |
| Clinical audit trail | `audit_logs` + JSON logs | Actor type/ID, action, entity, JSON meta, UTC timestamp on every mutation |
| No PHI in logs | `middleware/audit.py` | Request bodies deliberately excluded from HTTP access logs |
| Upload hardening | `storage.py` | Suffix allowlist, SHA-256 checksum, 25 MB size cap, patient-scoped object keys |
| Path traversal guard | `sanitize_suffix` | Rejects unknown/unlisted file extensions |
| CORS discipline | `main.py` | Wildcard origin forces credentials off (documented in code) |

**Authentication note (current limitation):** there is **no user-authentication layer** today — no JWT/OAuth, no per-request identity. `actor_type` on audit entries is a coarse label (`"patient"`, `"caregiver"`, `"system"`), and CORS is open (`*`) in development. This is acceptable for the offline-first patient device (the patient never logs in, per the zero-friction rule) but is the single largest production-hardening gap for the caregiver portal and API surface. See §4.4 for the premium-analytics auth recommendation.

---

## 4. FUTURE INTEGRATIONS & HACKATHON ROADMAP

Assessment against the project vision (*"Bhulne nhi dena hai"*): the offline core loop (games → DDA → demitokens → delta sync) and the anti-wandering spine (geofence → SMS → offline queue) are **fully wired end-to-end**. The gaps are the SOS *bystander* layer, on-device *predictive* DDA, the *voice/localization* layer, and *premium* caregiver analytics. Each subsection below names the exact file-level injection points in the existing codebase.

### 4.1 Tier 1 & Tier 2 Geofencing SOS

**What exists today:** `GeofenceManager.handleZoneExit()` (re-verified haversine breach) → online: `POST /api/v1/geofence/alert` → Twilio SMS; offline: SQLite queue + soothing pacifier + 30 s flush worker. The escalation currently reaches only *remote* caregivers via SMS — bystanders near the patient are unaddressed.

#### 4.1.1 Tier 1 — Bystander "Flash Screen" Device Takeover

| Item | Target |
|---|---|
| New file | `apps/mobile/src/screens/EmergencyFlashScreen.tsx` |
| Service | `apps/mobile/src/sos/BystanderSosService.ts` (owns flash + buzzer + keep-awake orchestration) |
| Injection point | `GeofenceManager.handleZoneExit()` — immediately after breach confirmation, alongside `postAlert()`; also invoke from the headless-task path so it works after app termination |

**Implementation plan:**
- Full-screen takeover overlay (rendered above the game shell, not via navigation) showing patient **name**, **age**, dementia status ("This person may be lost — please stay with them"), and emergency contact number as a single large `LargeTouchButton` (`tel:` link).
- Flash animation at 3–5 Hz using `react-native-reanimated` (`withRepeat(withSequence(...))`), amber/white only — respecting the "no red" patient-UI rule while remaining highly visible to bystanders.
- `expo-brightness` (new dep) to force maximum brightness; `react-native-keep-awake` (or `expo-keep-awake`, already in the Expo SDK) to hold the screen on.
- **Offline behavior:** the flash is purely local — it must fire identically whether or not `postAlert()` succeeds, i.e., trigger *before* the `if (online && ...)` branch in `handleZoneExit()`.
- Android full-screen intent: add `"android.permission.SYSTEM_ALERT_WINDOW"` + foreground-activity config to `app.json` plugins so the takeover can appear over the lock screen.

#### 4.1.2 Tier 2 — Loud Buzzer Logic

| Item | Target |
|---|---|
| New file | `apps/mobile/src/audio/EmergencyAlarm.ts` |
| Injection point | Same call site as §4.1.1 — `BystanderSosService.trigger()` runs flash + buzzer in parallel |

**Implementation plan:**
- Reuse the established `expo-av` + on-device WAV synthesis pattern from `audio/synthesize.ts` (add `synthesizeEmergencySiren()` producing an 800–1200 Hz attention sweep — distinct from, and never replacing, the calming pacifier).
- `Audio.setAudioModeAsync({ staysActiveInBackground: true, interruptionMode: 'doNotMix', volume: 0.9 })`; loop ~30 s or until a bystander taps "Call family".
- Two-channel intent, mirroring the clinical rules: **pacifier = for the patient** (calm, 0.45 volume, existing `pacifier.ts`), **buzzer = for bystanders** (attention). Both may run simultaneously; keep files separate so they never share an audio session incorrectly.
- Configurable on/off from the caregiver portal: add `sos_buzzer_enabled` (bool) to `patient_profiles` (Alembic `003_...` migration + SQLite v3) so families can disable Tier 2 per patient.

#### 4.1.3 Live Location Broadcasting

| Item | Target |
|---|---|
| New file | `apps/mobile/src/geofence/LiveLocationBroadcaster.ts` |
| New endpoint | `POST /api/v1/geofence/{patient_id}/location` (append in `routers/geofence.py`) |
| Poll endpoint | `GET /api/v1/geofence/{patient_id}/location` for `apps/web/src/pages/GeofenceMap.tsx` |
| Storage | In-memory TTL cache (dict + timestamp, 120 s expiry) on the API process; no schema change needed for the hackathon build |

**Implementation plan:**
- On confirmed breach (not merely on any exit), start a `Location.watchPositionAsync` loop (5 s interval, `LocationAccuracy.High`) — piggyback on the already-granted `ACCESS_BACKGROUND_LOCATION` / `UIBackgroundModes: ["location"]` permissions.
- Each fix POSTs `{ lat, lng, device_timestamp }`; every successful POST also serves as a heartbeat that can replace the SMS link with a *truly live* URL.
- Web map polls every 5 s while a breach is active, drawing the live dot + trailing path via Leaflet; reuse `GeofenceZoneUpsertPayload`/`GeofenceAlertPayload` types — add a `LiveLocationUpdate` interface to `packages/types/src/index.ts` (single source of truth, then `npm run types:build`).
- Battery safety: stop the loop when the patient re-enters any active zone (reuse `evaluateBreach` inverted) or when the caregiver acknowledges the alert.

### 4.2 GDS-Stage Cognitive Games & Demitokens

**What exists today:** six game modules mapped across three GDS tiers (`games/gdsRouting.ts`); `AchaoticDDA` provides bounded-smoothing DDA (`MAX_STEP = 0.12`, 5-task window, α = 0.3) feeding `targetSizeDp`, `itemCount`, `distractorCount`, `guidanceDelayMs`; demitokens (2 clean / 1 guided) persist locally and sync server-side. The DDA is **reactive** (rolling averages), not predictive — this is the TensorFlow Lite opportunity.

#### 4.2.1 On-Device AI Engine (TensorFlow Lite) — Predictive DDA

| Item | Target |
|---|---|
| New directory | `apps/mobile/src/engine/tflite/` |
| New dependency | `react-native-fast-tflite` (GPU/CoreDelegate/Metal accelerated; JSI-based, New-Architecture compatible — the project already runs `newArchEnabled: true`) |
| Injection point | `games/useGameplaySession.ts::completeTask()` — wrap `engineRef.current.recordTask()` |

**Proposed structure:**

```
src/engine/tflite/
├── ModelLoader.ts          # Load bundled .tflite via require(), lazy singleton
├── DifficultyPredictor.ts  # Feature vector assembly + inference + output clamp
├── FeatureExtractor.ts     # Rolling features from session history (reuse SQLite logs)
└── models/
    └── dda_model.tflite    # Pre-trained model (see training spec below)
```

**Model I/O contract:**
- **Input (float32[8]):** `[normalized_latency (650–2400 ms band), error_rate_5task, smoothed_difficulty_current, session_duration_min, time_of_day_sin, time_of_day_cos, gds_stage/7, streak_days/30]`
- **Output (float32[2]):** `[predicted_optimal_difficulty (0–1), fatigue_risk (0–1)]`
- **Training data source:** `dda_metrics_logs` on the backend (already persisted per sync by `build_dda_curve`) + `gameplay_session_logs` — the data pipeline for training already exists.

**Integration (drop-in, failure-safe):**

```typescript
// useGameplaySession.ts
const predicted = await DifficultyPredictor.predict(featureVector)
  .catch(() => null);                       // TFLite unavailable → null
const difficulty = engineRef.current.recordTask(metric, predicted);
```

- Modify `AchaoticDDA.recordTask(metric, prediction?)` to blend the prediction as the `target` before exponential smoothing, **preserving `MAX_STEP` bounding** — the non-spiking clinical guarantee must survive the ML upgrade.
- The TFLite output never exceeds [0, 1] and passes through the same `clamp()`; on any inference failure the current pure-TS path remains authoritative (errorless fallback, matching the platform's degradation philosophy seen in `driver.ts`'s InertDriver).
- Fatigue risk > 0.7 → force a "rest suggestion" (auto-launch `AmbientRippleScreensaver`), converting the model output into an action the GDS-3 patients already know.

#### 4.2.2 Demitoken Economy → Local Database Mapping

**Current state:** `demitoken_balance` is a single mutable integer in `patient_profiles` (both SQLite and PostgreSQL), updated by `addDemitokens()`; the server recomputes balances from `demitokens_earned` during sync. There is **no transaction ledger** — balances are not auditable.

**Proposed ledger schema (SQLite v3 + Alembic `003_demitoken_ledger`):**

```sql
CREATE TABLE IF NOT EXISTS demitoken_ledger (
  id TEXT PRIMARY KEY NOT NULL,
  patient_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount != 0),
  reason TEXT NOT NULL CHECK (reason IN (
    'GAMEPLAY_CLEAN', 'GAMEPLAY_GUIDED', 'STREAK_BONUS',
    'SCREENSAVER_ENGAGEMENT', 'REDEMPTION', 'SYNC_ADJUSTMENT')),
  reference_id TEXT,            -- session log id / redemption id
  sync_status TEXT NOT NULL DEFAULT 'PENDING_SYNC'
    CHECK (sync_status IN ('PENDING_SYNC', 'SYNCED', 'SYNC_FAILED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patient_profiles (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_demitoken_ledger_patient_id
  ON demitoken_ledger (patient_id);
```

**Mapping plan:**
- New repository `db/demitokenLedgerRepository.ts`; `addDemitokens()` in `patientRepository.ts` becomes a transaction: insert ledger row + update balance (single source of movement history).
- Extend `DeltaSyncPayload` (in `packages/types`) with `token_ledger: DemitokenLedgerEntry[]`; backend upserts ledger rows idempotently (same pattern as `sync.py` session-log upsert) and derives `demitoken_balance` as `SUM(amount)` — making the cloud balance **provably correct** instead of accumulated.
- Redemption catalog (token sink — currently the economy has no spending): a new `demitoken_rewards` table + a caregiver-portal page; patient-facing redemption stays single-tap ("You earned a song!").
- **Blockchain future-proofing:** the ledger's append-only, hash-chained design (`prev_hash` + `SHA-256(id|amount|reference_id|prev_hash)` via existing `expo-crypto`) maps 1:1 onto a later on-chain anchor without any consumer changes.

### 4.3 Multilingual Voice UI

**What exists today:** `patient_profiles.primary_language` (default `'en'`; the demo patient is seeded with `'as'` — Assamese); all game copy is hard-coded English strings; audio is fully synthesized on-device (`audio/synthesize.ts`) but has no speech. There is **no voice I/O and no i18n layer** — this is greenfield, but the type-level hook (`primary_language`) already flows everywhere.

#### 4.3.1 Bhashini NLP API Integration

| Item | Target |
|---|---|
| New file | `apps/mobile/src/voice/BhashiniService.ts` |
| New directory | `apps/mobile/src/i18n/` (string catalogs per language) |
| Backend proxy (recommended) | `services/api/app/routers/voice.py` → new `POST /api/v1/voice/{stt|tts|translate}` |

**Service design:**

```
src/voice/
├── BhashiniService.ts      # STT / TTS / translation against Bhashini APIs
├── VoiceCommandRouter.ts   # Maps transcript → app intents ("open games", "play music")
├── NERProcessor.ts          # Extracts relation/name/event from caregiver voice notes
└── offlineFallback.ts       # Cached TTS phrases for zero-connectivity operation
```

- **STT:** record via `expo-av` (`Audio.Recording`, mic permission already declared: `android.permission.RECORD_AUDIO`) → upload to Bhashini → transcript. Target NER languages: Assamese (`as`), Bengali (`bn`), Bodo (`brx`), Manipuri (`mni`), Mizo (`lus`), Khasi (`kha`), Garo (`grt`), Nepali (`ne`), Hindi (`hi`).
- **TTS:** fetch audio for guided prompts ("This way…", "Tap the next number") and pre-cache via `expo-file-system` so the **errorless guidance voice works offline** — Bhashini TTS output cached per `(language, phrase_key)` in the cache directory (same write pattern as `synthesize.ts::writeWavFile`).
- **Backend proxy over direct-from-mobile:** mobile → FastAPI → Bhashini. Rationale: Bhashini API keys must never ship inside the Expo binary (any `EXPO_PUBLIC_*` var is extractable); the proxy reuses the existing settings/audit middleware and keeps a compliance trail on voice usage.
- **Voice Command Router:** intent grammar limited to the zero-friction surface — launch game by name, play/pause music, "call my daughter". Every command path must remain reachable by touch (voice is an addition, never the only channel — GDS-6/7 patients may not produce reliable speech).

#### 4.3.2 Cultural Localization Engine (NER Themes / Art)

| Item | Target |
|---|---|
| New directory | `apps/mobile/src/localization/` |
| Injection point | `AppRouter.tsx` (theme selection) + `games/catalog.ts` (content theming) |

```
src/localization/
├── CulturalTheme.ts        # per-language theme resolution
├── themes/
│   ├── assamese.ts         # Gamosa red-white motifs, Bihu patterns
│   ├── bengali.ts          # Alpana line art, Durga palette accents
│   ├── khasi.ts            # Jainsem stripe motifs
│   └── default.ts          # current clinical palette (unchanged)
└── art/
    └── NERArtProvider.ts   # region-specific card art / background hills
```

- **Theme contract:** extend the existing `theme.ts` shape (`colors`, `touch`, `typography`, `radius`) with a `motifs` key (card background pattern, hill shapes in `AmbientRippleScreensaver`, game-card glyphs). The clinical base palette (`#F8F6F0` / `#2C3E50` / `#E67E22`, no red) is **invariant across all themes** — localization changes motifs and imagery, never the accessibility-safe colors.
- **Content localization:** `games/catalog.ts` already carries NER cultural content (`NER_SORT_ITEMS`: sohshang, bamboo chunga…; `FOLK_TUNES`: bihugeet, khasi lullaby…). Restructure it per-language: `catalog[language].sortItems` so item labels render in the patient's language while staying culturally native.
- **Reminiscence NER:** caregiver voice descriptions ("This is my grandson Rahul at Bihu") → Bhashini STT → `NERProcessor` extracts `{ relation, name, event }` → auto-fills `reminiscence_media.label_text`, `relation_tag`, `event_year` — removing the typing burden from elderly caregivers and feeding `FaceNameMatch` question generation.
- **Type updates:** add `SUPPORTED_LANGUAGES` (union of BCP-47 codes) and `LocalizedGameTitle` to `packages/types`; `primary_language` gains a DB CHECK constraint in the same `003` migration as §4.2.2.

### 4.4 Caregiver Premium Analytics (D3.js Dashboard)

**What exists today:** `apps/web` (React 18 + Vite 6 + Tailwind 3) has a Dashboard, an AnalyticsChart page (Recharts, fed by `lib/mockData.ts` — **not** the live API), a Leaflet `GeofenceMap`, and a `MediaManager`. The live data source already exists: `GET /api/v1/analytics/{patient_id}` returns `sessions[]`, `dda_curve[]` (raw vs. smoothed difficulty, rolling latency/error), and a `summary` block. `victory-vendor` (vendored D3 modules) is already present in `node_modules` via Recharts.

#### 4.4.1 Data Wiring (prerequisite — highest value, lowest effort)

| Item | Target |
|---|---|
| Replace mocks | `apps/web/src/lib/mockData.ts` → new `lib/api.ts` functions: `getAnalytics(patientId)` calling `GET /api/v1/analytics/{patient_id}` |
| CORS | Add the Vite dev origin (`http://localhost:5173` — already listed in root `.env.example`) to `API_CORS_ORIGINS` |

The API response is already dashboard-ready: per-session `accuracy_pct`, `rolling_avg_latency_ms`, `rolling_error_rate`, and the `DdaCurvePoint` series. No new backend endpoint is strictly required for the core charts.

#### 4.4.2 D3.js Charting Layer

| Item | Target |
|---|---|
| New directory | `apps/web/src/charts/` |
| New dependency | `d3` (+ `@types/d3`) — explicit; do not rely on Recharts' vendored internals |

```
src/charts/
├── DdaCurveChart.tsx       # Raw vs. smoothed difficulty — dual line + confidence band
├── LatencyHeatmap.tsx      # Session × time-of-day heatmap (d3-scale + rect grid)
├── AccuracyRadar.tsx       # Per-game-module radar (d3-shape radialLine)
├── GdsProgressTimeline.tsx # Longitudinal GDS/score ribbon
└── useD3.ts                # Shared hook: d3 selection lifecycle bound to React refs
```

**Implementation approach:**
- Standard React-D3 hybrid: React owns the SVG element via `ref`; D3 owns scales/axes/shapes inside `useEffect` (`useD3.ts` hook pattern). Recharts stays for simple bars; D3 is used where it wins — the confidence band (`d3-shape area` between raw and smoothed curves), heatmaps, and radar.
- Theme the charts with the caregiver palette already in use (`#F8F6F0` bg, `#2C3E50` strokes, `#E67E22` accents — mirroring `theme.ts` so both apps share visual identity).
- Data mapping: `dda_curve[]` → `DdaCurveChart` (x: `session_index`, y1: `raw_difficulty`, y2: `smoothed_difficulty`); `sessions[].rolling_avg_latency_ms` → heatmap intensity; `game_module_id` groupby → radar spokes.

#### 4.4.3 "Premium" Backend Additions

| New endpoint | Location | Purpose |
|---|---|---|
| `GET /api/v1/analytics/{patient_id}/weekly` | `routers/analytics.py` | 7-day-bucketed aggregates (session counts, accuracy trend, streak) |
| `GET /api/v1/analytics/{patient_id}/report?format=pdf\|csv` | new `services/report_generator.py` | Shareable clinician report |
| `GET /api/v1/analytics/{patient_id}/alerts` | `routers/geofence.py` | Breach history from `audit_logs` (`GEOFENCE_BREACH_ALERT` actions — the audit trail is already the data source) |

**Premium gating & security:**
- Add JWT auth (`python-jose` + `passlib`, FastAPI `OAuth2PasswordBearer` dependency) protecting the caregiver surface; the patient-facing mobile endpoints (`/sync/delta`, `/geofence/alert`) remain device-token based or open per the offline-first constraint.
- New `caregiver_users` table (Alembic `004_...`): `id`, `email`, `hashed_password`, `patient_links` (M:N) — closes the §3.3 authentication gap.
- Subscription tier flag (`plan: FREE | PREMIUM`) on the caregiver account; premium endpoints raise 402/403 for FREE. Weekly aggregates + PDF reports are the premium features; the basic analytics view remains free.
- Query performance: `dda_metrics_logs` and `gameplay_session_logs` grow unbounded — add composite indexes `(patient_id, timestamp)` in the `004` migration; the tables are already indexed on `patient_id` alone.

#### 4.4.5 Suggested Delivery Sequence (Hackathon)

1. **Wire live data** (§4.4.1) — one afternoon, immediately makes the demo real.
2. **SOS flash + buzzer** (§4.1.1–4.1.2) — the highest-drama demo moment; purely additive to `GeofenceManager`.
3. **D3 DDA curve** (§4.4.2) — visually proves the "Achaotic" engine using already-persisted `dda_metrics_logs`.
4. **Bhashini TTS prompts** (§4.3.1, TTS first) — Assamese greeting "Namaste" + cached guidance phrases demo well and are cache-friendly offline.
5. **Demitoken ledger** (§4.2.2) — correctness upgrade; visible as "provably fair" balance history.
6. **TFLite predictor** (§4.2.1) — stretch goal; the `MAX_STEP`-preserving blend guarantees clinical safety even with a weak model.

---

## Appendix A: Database Schema Version History

| Version | Migration | Changes |
|---|---|---|
| v1 | `001_initial_schema` | `patient_profiles`, `gameplay_session_logs`, `reminiscence_media`, `geofence_zones` (+ `media_type_enum`) |
| v2 | `002_dda_audit_emergency` | `emergency_contacts`, `dda_metrics_logs`, `audit_logs` |
| v3 (planned) | `003_demitoken_ledger` | `demitoken_ledger`, `demitoken_rewards`, `primary_language` CHECK, SQLite `pending_geofence_alerts` parity + `sos_buzzer_enabled` |
| v4 (planned) | `004_caregiver_auth` | `caregiver_users`, composite `(patient_id, timestamp)` indexes |

## Appendix B: Key Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://sahay:sahay@localhost:5432/sahay` | Async PostgreSQL (runtime) |
| `DATABASE_URL_SYNC` | `postgresql+psycopg2://sahay:sahay@localhost:5432/sahay` | Sync driver (Alembic) |
| `API_HOST` / `API_PORT` | `0.0.0.0` / `8000` | Uvicorn bind |
| `API_CORS_ORIGINS` | `*` (dev) | Comma-separated origin allowlist |
| `EXPO_PUBLIC_API_URL` | `http://localhost:8000` | Mobile → API base URL (baked at build time; must be LAN IP on physical devices) |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Web → API base URL |
| `TWILIO_ENABLED` / `TWILIO_ACCOUNT_ID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | `False` / `None` | SMS dispatch (mock mode when incomplete) |
| `USE_LOCAL_STORAGE` / `AWS_*` | `True` / `None` | S3 vs. local media storage |
| `LOG_LEVEL` / `LOG_JSON_ENABLED` | `INFO` / `True` | Structured JSON logging |

## Appendix C: Clinical Rules Enforced in Code

| Rule | Enforcement point |
|---|---|
| Zero-friction design (single-tap, no login/tutorials) | `routing/AppRouter.tsx`, `patient/PatientProvider.tsx` |
| Touch targets ≥ 64×64 dp | `theme/theme.ts` (`minDp: 64`), `LargeTouchButton`, `HighContrastCard` |
| Glare-reducing palette, never red | `theme/theme.ts` (`#F8F6F0` / `#2C3E50` / `#E67E22`) |
| Errorless learning (no failure states, gentle auto-guidance) | `components/ErrorlessFeedbackWrapper.tsx`, every game's `setGuiding` flow |
| Achaotic DDA — non-spiking smooth curves | `engine/AchaoticDDA.ts` (`MAX_STEP=0.12`, 5-task window, α=0.3), `services/dda.py` (trailing averages), mirrored in `AnalyticsChart.tsx` |
| GDS stage filter (Stage 1: GDS 1-3, Stage 2: GDS 4-5, Stage 3: GDS 6-7) | `games/gdsRouting.ts::therapyStageFromGds()` |
| Anti-wandering (background monitoring, SMS on breach, offline pacifier) | `geofence/GeofenceManager.ts`, `geofence/driver.ts`, `services/twilio_dispatcher.py` |
| Auditability of every clinical mutation | `middleware/audit.py`, `services/audit.py`, `audit_logs` table |
| Encrypted data at rest | `db/DatabaseService.ts` (SQLCipher + TEE-held key) |

## Appendix D: Test Coverage Map (`services/api/tests`)

| Test file | Covers |
|---|---|
| `test_sync.py` | Delta-sync batch: idempotent upsert, token recompute, streak non-regression, unknown-patient rejection |
| `test_geofence.py` | Zone upsert, breach evaluation, SMS dispatch (mock mode) |
| `test_analytics.py` | Aggregation shape, DDA curve correctness |
| `test_reminiscence.py` | Upload → checksum → storage → DB row (local mock storage) |

Fixtures (`conftest.py`): per-test async SQLite engine, temp upload dir, forced mock Twilio, dependency-overridden `get_db`, `seed_patient` factory. `pytest.ini` sets `asyncio_mode = auto`.

---

*End of Report — generated from a full read of the repository source; all file paths, versions, and behaviors cited above were verified against the actual codebase on 2026-09-03.*