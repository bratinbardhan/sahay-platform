"""Delta sync endpoint — offline-first flush from mobile devices.

Executes atomically: session logs are idempotently upserted. Demitoken balances
are recomputed server-side from earned tokens. Streak data from the device is
applied (never regressed). Achaotic DDA curve points are logged per patient,
and a clinical audit entry is recorded.
"""

import uuid
from collections import defaultdict
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import DdaMetricsLog, GameplaySessionLog, PatientProfile
from app.schemas.sync import DeltaSyncRequest, DeltaSyncResponse, TokenUpdateApplied
from app.services.audit import record_clinical_audit
from app.services.dda import build_dda_curve

router = APIRouter(prefix="/api/v1/sync", tags=["sync"])


@router.post("/delta", response_model=DeltaSyncResponse)
async def sync_delta(
    payload: DeltaSyncRequest,
    db: AsyncSession = Depends(get_db),
) -> DeltaSyncResponse:
    """Process a batch of session logs + token updates atomically."""
    synced_session_log_ids: list[UUID] = []
    synced_token_update_patient_ids: list[UUID] = []
    dda_metric_ids: list[UUID] = []

    earned_by_patient: dict[UUID, int] = defaultdict(int)
    new_logs_by_patient: dict[UUID, list[GameplaySessionLog]] = defaultdict(list)
    applied_updates: list[TokenUpdateApplied] = []

    async with db.begin():
        # Strict referential check — unknown patients reject the whole batch.
        referenced_patient_ids = {log_in.patient_id for log_in in payload.session_logs}
        referenced_patient_ids.update(up.patient_id for up in payload.token_updates)
        if referenced_patient_ids:
            existing = await db.execute(
                select(PatientProfile.id).where(
                    PatientProfile.id.in_(list(referenced_patient_ids))
                )
            )
            existing_ids = {row[0] for row in existing.all()}
            missing = sorted(referenced_patient_ids - existing_ids, key=str)
            if missing:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "error": "UNKNOWN_PATIENTS",
                        "patient_ids": [str(m) for m in missing],
                    },
                )

        # 1) Idempotent session-log upsert
        for log_in in payload.session_logs:
            already = await db.get(GameplaySessionLog, log_in.id)
            if already is not None:
                synced_session_log_ids.append(log_in.id)
                continue

            session_log = GameplaySessionLog(
                id=log_in.id,
                patient_id=log_in.patient_id,
                game_module_id=log_in.game_module_id,
                gds_stage=log_in.gds_stage,
                difficulty_level=log_in.difficulty_level,
                tasks_presented=log_in.tasks_presented,
                tasks_completed_cleanly=log_in.tasks_completed_cleanly,
                tasks_guided=log_in.tasks_guided,
                avg_latency_ms=log_in.avg_latency_ms,
                demitokens_earned=log_in.demitokens_earned,
                sync_status="SYNCED",
                timestamp=log_in.timestamp,
            )
            db.add(session_log)
            synced_session_log_ids.append(log_in.id)
            earned_by_patient[log_in.patient_id] += log_in.demitokens_earned
            new_logs_by_patient[log_in.patient_id].append(session_log)

        # 2) Compute updated Demitoken balances server-side (add earned tokens).
        for patient_id, earned in earned_by_patient.items():
            patient = await db.get(PatientProfile, patient_id)
            if patient is not None:
                patient.demitoken_balance += earned

        # 3) Streak from the device is authoritative; never regress.
        for token_update in payload.token_updates:
            patient = await db.get(PatientProfile, token_update.patient_id)
            if patient is None:
                continue
            patient.streak_days = max(patient.streak_days, token_update.streak_days)
            synced_token_update_patient_ids.append(token_update.patient_id)
            applied_updates.append(
                TokenUpdateApplied(
                    patient_id=patient.id,
                    demitoken_balance=patient.demitoken_balance,
                    streak_days=patient.streak_days,
                )
            )

        # 4) Log Achaotic DDA metrics for every patient that delivered logs.
        for patient_id, new_logs in new_logs_by_patient.items():
            result = await db.execute(
                select(GameplaySessionLog)
                .where(GameplaySessionLog.patient_id == patient_id)
                .order_by(GameplaySessionLog.timestamp)
            )
            all_sessions = list(result.scalars())
            difficulties = [float(s.difficulty_level) for s in all_sessions]
            latencies = [float(s.avg_latency_ms) for s in all_sessions]
            error_rates = [
                (s.tasks_guided / s.tasks_presented) if s.tasks_presented > 0 else 0.0
                for s in all_sessions
            ]
            curve = build_dda_curve(difficulties, latencies, error_rates)

            new_log_ids = {log.id for log in new_logs}
            for session, point in zip(all_sessions, curve, strict=True):
                if session.id not in new_log_ids:
                    continue
                metric = DdaMetricsLog(
                    id=uuid.uuid4(),
                    patient_id=patient_id,
                    session_log_id=session.id,
                    latency_ms_rolling=point.latency_rolling_ms,
                    error_rate_rolling=point.error_rate_rolling,
                    raw_difficulty=point.raw_difficulty,
                    smoothed_difficulty=point.smoothed_difficulty,
                )
                db.add(metric)
                dda_metric_ids.append(metric.id)

        # 5) Clinical audit trail — every mutation is tracked.
        await record_clinical_audit(
            db,
            action="GAMEPLAY_DELTA_SYNC",
            entity_type="GameplaySessionLog",
            actor_type="patient",
            meta={
                "session_log_count": len(synced_session_log_ids),
                "token_update_count": len(synced_token_update_patient_ids),
                "dda_metric_count": len(dda_metric_ids),
            },
        )

    return DeltaSyncResponse(
        synced_session_log_ids=synced_session_log_ids,
        synced_token_update_patient_ids=synced_token_update_patient_ids,
        dda_metric_ids=dda_metric_ids,
        token_updates_applied=applied_updates,
    )
