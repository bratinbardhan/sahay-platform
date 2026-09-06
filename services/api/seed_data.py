"""SaHāy demo data seeder.

Populates demo patient profiles, sample gameplay session logs, NER-themed
reminiscence media, geofence zones, emergency contacts and audit entries so
the full stack can be exercised immediately.

Usage (from services/api):
    pip install -r requirements.txt
    python seed_data.py
"""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings
from app.database import Base
from app.models import (
    AuditLog,
    DdaMetricsLog,
    EmergencyContact,
    GameplaySessionLog,
    GeofenceZone,
    MediaType,
    PatientProfile,
    ReminiscenceMedia,
    User,
    UserRole,
    UserTier,
)
from app.services.security import hash_password

# NER region — Shillong, Meghalaya (common demo home location)
SHILLONG_LAT = 25.5941
SHILLONG_LNG = 91.7362

GAME_MODULES = [
    "rapid_fire_sorting",
    "serial_number_scatter",
    "face_name_match",
    "environmental_sound_match",
]


def _demo_sessions(patient_id: uuid.UUID, gds_stage: int, count: int) -> list[GameplaySessionLog]:
    now = datetime.now(timezone.utc)
    sessions: list[GameplaySessionLog] = []
    for index in range(count):
        tasks_presented = 12 + (index % 4)
        guided = max(0, (index % 3) - 1) if gds_stage >= 4 else max(0, index % 2)
        clean = tasks_presented - guided
        difficulty = 1 + (index % 5)
        sessions.append(
            GameplaySessionLog(
                id=uuid.uuid4(),
                patient_id=patient_id,
                game_module_id=GAME_MODULES[index % len(GAME_MODULES)],
                gds_stage=gds_stage,
                difficulty_level=difficulty,
                tasks_presented=tasks_presented,
                tasks_completed_cleanly=clean,
                tasks_guided=guided,
                avg_latency_ms=float(850 + (index % 6) * 120),
                demitokens_earned=clean * 2 + guided,
                session_duration_ms=(300 + (index % 4) * 90) * 1000,
                sync_status="SYNCED",
                timestamp=now - timedelta(days=count - index - 1),
            )
        )
    return sessions


# Demo unified-auth accounts so the mobile switchboard and web dashboard can be
# exercised immediately. Passwords are only valid for these local demo accounts.
# (role, tier, email, password, full name)
DEMO_USERS: list[tuple[UserRole, UserTier, str, str, str]] = [
    (UserRole.ADMIN, UserTier.PREMIUM, "admin@example.com", "Admin@123", "Sahāy Admin"),
    (UserRole.CARETAKER, UserTier.PREMIUM, "caretaker@example.com", "Caretaker@123", "Rahul Saha"),
    (UserRole.PATIENT, UserTier.FREE, "patient@example.com", "Patient@123", "Jeniva Saha"),
]


async def _seed_demo_users(session: AsyncSession) -> None:
    """Idempotently provision demo unified-auth user accounts."""
    for role, tier, email, password, full_name in DEMO_USERS:
        existing = await session.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none() is not None:
            continue
        session.add(
            User(
                email=email,
                full_name=full_name,
                hashed_password=hash_password(password),
                role=role,
                tier=tier,
            )
        )
    await session.flush()


async def _seed_all(
    session: AsyncSession,
    patients_data: list[dict[str, Any]],
) -> dict[str, uuid.UUID]:
    """Idempotently seed patients, logs, media, zones, contacts and audits."""
    patient_ids: dict[str, uuid.UUID] = {}
    for data in patients_data:
        existing = await session.execute(
            select(PatientProfile).where(PatientProfile.name == data["name"])
        )
        patient = existing.scalar_one_or_none()
        if patient is None:
            patient = PatientProfile(
                id=uuid.uuid4(),
                caregiver_id=uuid.uuid4(),
                name=data["name"],
                age=int(data["age"]),
                assigned_gds_stage=int(data["gds"]),
                primary_language=str(data["primary_language"]),
                demitoken_balance=50 + int(data["gds"]) * 25,
                streak_days=3 + int(data["gds"]),
                created_at=data["created_at"],
            )
            session.add(patient)
            await session.flush()
        patient_ids[data["name"]] = patient.id

    existing_logs = await session.execute(select(GameplaySessionLog).limit(1))
    if existing_logs.scalars().first() is None:
        for data in patients_data:
            pid = patient_ids[data["name"]]
            gds = int(data["gds"])
            logs = _demo_sessions(pid, gds, count=10)
            session.add_all(logs)
            
            # Flush the session logs to the DB so their UUIDs are available for foreign keys
            await session.flush()
            
            for log in logs[:5]:
                session.add(
                    DdaMetricsLog(
                        id=uuid.uuid4(),
                        patient_id=pid,
                        session_log_id=log.id,
                        latency_ms_rolling=log.avg_latency_ms,
                        error_rate_rolling=0.05,
                        raw_difficulty=log.difficulty_level,
                        smoothed_difficulty=max(1.0, log.difficulty_level - 0.4),
                    )
                )
    else:
        print("Demo session logs already present — skipping.")

    meera_id = patient_ids["Meera Devi"]
    existing_media = await session.execute(
        select(ReminiscenceMedia).where(ReminiscenceMedia.patient_id == meera_id)
    )
    if existing_media.scalars().first() is None:
        session.add_all(
            [
                ReminiscenceMedia(
                    id=uuid.uuid4(),
                    patient_id=meera_id,
                    media_type=MediaType.PHOTO,
                    file_url=(
                        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d"
                        "?w=400&h=400&fit=crop"
                    ),
                    label_text="Grandson Rahul at school",
                    relation_tag="Grandson Rahul",
                    event_year=2023,
                    checksum_sha256="a" * 64,
                ),
                ReminiscenceMedia(
                    id=uuid.uuid4(),
                    patient_id=meera_id,
                    media_type=MediaType.VOICE,
                    file_url="https://example.com/media/voice-note-001.mp3",
                    label_text="Rahul singing a rhyme",
                    relation_tag="Grandson Rahul",
                    event_year=2023,
                    checksum_sha256="b" * 64,
                ),
                ReminiscenceMedia(
                    id=uuid.uuid4(),
                    patient_id=meera_id,
                    media_type=MediaType.PHOTO,
                    file_url=(
                        "https://images.unsplash.com/photo-1522204523234-8729aa6e3d5f"
                        "?w=400&h=400&fit=crop"
                    ),
                    label_text="Family picnic at Ward's Lake, Shillong",
                    relation_tag="Family",
                    event_year=2021,
                    checksum_sha256="c" * 64,
                ),
            ]
        )
    existing_zones = await session.execute(
            select(GeofenceZone).where(GeofenceZone.patient_id == meera_id)
        )
    if existing_zones.scalars().first() is None:
            session.add_all(
                [
                    GeofenceZone(
                        id=uuid.uuid4(),
                        patient_id=meera_id,
                        zone_name="Home Perimeter",
                        center_lat=SHILLONG_LAT,
                        center_lng=SHILLONG_LNG,
                        radius_meters=200.0,
                        is_active=True,
                    ),
                    GeofenceZone(
                        id=uuid.uuid4(),
                        patient_id=meera_id,
                        zone_name="Ward's Lake Park",
                        center_lat=25.5665,
                        center_lng=91.8960,
                        radius_meters=350.0,
                        is_active=True,
                    ),
                ]
            )
            session.add_all(
                [
                    EmergencyContact(
                        id=uuid.uuid4(),
                        patient_id=meera_id,
                        name="Rohan (son)",
                        phone_number="+919876543210",
                        priority=1,
                    ),
                    EmergencyContact(
                        id=uuid.uuid4(),
                        patient_id=meera_id,
                        name="Dr. Nongrum",
                        phone_number="+919765432101",
                        priority=2,
                    ),
                ]
            )

    existing_audit = await session.execute(select(AuditLog).limit(1))
    if existing_audit.scalars().first() is None:
        session.add(
            AuditLog(
                id=uuid.uuid4(),
                actor_type="system",
                action="SEED_DATA",
                entity_type="PatientProfile",
                entity_id=meera_id,
                meta={"note": "demo dataset initialized"},
            )
        )

    await session.commit()
    print(
        "SaHāy demo data ready!\n"
        "  Patients: Meera Devi (GDS 4), Banalata Das (GDS 6), Puran Singh (GDS 2)\n"
        "  Includes gameplay sessions, NER-themed reminiscence media, geofence zones,\n"
        "  emergency contacts and audit entries.\n"
        "  Unified auth accounts: admin@example.com / Admin@123 (ADMIN · PREMIUM),\n"
        "    caretaker@example.com / Caretaker@123 (CARETAKER · PREMIUM),\n"
        "    patient@example.com / Patient@123 (PATIENT · FREE)\n\n"
        "Start the API with:  uvicorn app.main:app --reload"
    )
    return patient_ids


async def main() -> None:
    settings = get_settings()
    engine = create_async_engine(settings.database_url, echo=False, pool_pre_ping=True)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        await _seed_demo_users(session)

        patients_data: list[dict[str, Any]] = [
            {
                "name": "Meera Devi",
                "age": 72,
                "primary_language": "en",
                "gds": 4,
                "created_at": datetime.now(timezone.utc) - timedelta(days=60),
            },
            {
                "name": "Banalata Das",
                "age": 81,
                "primary_language": "bn",
                "gds": 6,
                "created_at": datetime.now(timezone.utc) - timedelta(days=45),
            },
            {
                "name": "Puran Singh",
                "age": 68,
                "primary_language": "hi",
                "gds": 2,
                "created_at": datetime.now(timezone.utc) - timedelta(days=90),
            },
        ]

        await _seed_all(session, patients_data)


if __name__ == "__main__":
    asyncio.run(main())