"""Analytics aggregation endpoints.

Exposes the caregiver dashboard's live telemetry: aggregated session history,
the Achaotic DDA raw-vs-smoothed difficulty curve, per-patient DDA time-series
(cognitive load / difficulty / reaction latency), paginated gameplay session
records, and a 7-day cognitive summary with trend + recommended difficulty.

All routes require an authenticated CARETAKER or ADMIN. CARETAKERs may only
read patients assigned to them (ADMIN retains platform-wide read access).
"""

from datetime import datetime, timedelta, timezone
from math import sqrt
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import DdaMetricsLog, GameplaySessionLog, PatientProfile
from app.schemas.analytics import (
    AnalyticsResponse,
    AnalyticsSessionPoint,
    AnalyticsSummary,
    CognitiveSummaryResponse,
    CognitiveWindowAggregate,
    DdaCurvePoint,
    DdaHistoryPoint,
    DdaHistoryResponse,
    PatientProfileOut,
    SessionRecord,
    SessionsPage,
)
from app.services.dda import build_dda_curve
from app.services.security import authorize_patient_access, get_staff_user

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])

# Cognitive-load ceiling: a rolling latency at/above 2 s saturates its weight.
_COGNITIVE_LOAD_LATENCY_CEILING_MS = 2000.0

# Difficulty bounds for the recommended-difficulty suggestion (Achaotic DDA).
_MIN_RECOMMENDED_DIFFICULTY = 1
_MAX_RECOMMENDED_DIFFICULTY = 10

# Trend thresholds in accuracy-percentage points between the two 7-day windows.
_IMPROVING_THRESHOLD_PCT = 2.0
_DECLINING_THRESHOLD_PCT = -2.0


def _percents(clean: int, presented: int) -> float:
    return round((clean / presented) * 100, 2) if presented > 0 else 0.0


def cognitive_load_index(latency_rolling_ms: float, error_rate_rolling: float) -> float:
    """Composite 0-100 cognitive load index.

    Weights recent sensorimotor strain: 60% touch latency (saturating at the
    2 s ceiling) and 40% error/guidance frequency. Deterministic so tests can
    assert exact values.
    """
    latency_component = min(1.0, max(0.0, latency_rolling_ms) / _COGNITIVE_LOAD_LATENCY_CEILING_MS)
    error_component = min(1.0, max(0.0, error_rate_rolling))
    return round(100.0 * (0.6 * latency_component + 0.4 * error_component), 2)


def _as_aware(ts: datetime) -> datetime:
    """SQLite returns naive datetimes; treat stored values as UTC."""
    return ts if ts.tzinfo is not None else ts.replace(tzinfo=timezone.utc)


async def _load_patient_for_user(db: AsyncSession, patient_id: UUID, user) -> PatientProfile:
    """Fetch the patient and enforce staff role + caregiver ownership."""
    patient = await db.get(PatientProfile, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    authorize_patient_access(user, patient)
    return patient


async def _load_sessions(db: AsyncSession, patient_id: UUID) -> list[GameplaySessionLog]:
    result = await db.execute(
        select(GameplaySessionLog)
        .where(GameplaySessionLog.patient_id == patient_id)
        .order_by(GameplaySessionLog.timestamp)
    )
    return list(result.scalars())


@router.get("/me/patient", response_model=PatientProfileOut)
async def get_my_patient(
    user=Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
) -> PatientProfile:
    """Resolve the patient record assigned to the authenticated caretaker."""
    result = await db.execute(
        select(PatientProfile)
        .where(PatientProfile.caregiver_id == user.id)
        .order_by(PatientProfile.created_at)
        .limit(1)
    )
    patient = result.scalar_one_or_none()
    if patient is None:
        raise HTTPException(status_code=404, detail="No patient assigned to this caretaker")
    return patient


@router.get("/patient/{patient_id}/dda-history", response_model=DdaHistoryResponse)
async def get_dda_history(
    patient_id: UUID,
    user=Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
) -> DdaHistoryResponse:
    """Time-series cognitive performance metrics for the trend chart.

    Prefers persisted `DdaMetricsLog` rows written by the sync flow; for
    patients without persisted DDA logs the curve is derived on the fly from
    their gameplay sessions so a brand-new patient still renders.
    """
    await _load_patient_for_user(db, patient_id, user)

    result = await db.execute(
        select(DdaMetricsLog)
        .where(DdaMetricsLog.patient_id == patient_id)
        .order_by(DdaMetricsLog.created_at)
    )
    dda_rows = list(result.scalars())

    if dda_rows:
        points = [
            DdaHistoryPoint(
                timestamp=_as_aware(row.created_at),
                cognitive_load_index=cognitive_load_index(
                    row.latency_ms_rolling, row.error_rate_rolling
                ),
                difficulty_level=row.smoothed_difficulty,
                reaction_latency_ms=row.latency_ms_rolling,
            )
            for row in dda_rows
        ]
        source = "ddametrics"
    else:
        sessions = await _load_sessions(db, patient_id)
        curve = build_dda_curve(
            [float(s.difficulty_level) for s in sessions],
            [float(s.avg_latency_ms) for s in sessions],
            [
                (s.tasks_guided / s.tasks_presented) if s.tasks_presented > 0 else 0.0
                for s in sessions
            ],
        )
        points = [
            DdaHistoryPoint(
                timestamp=_as_aware(session.timestamp),
                cognitive_load_index=cognitive_load_index(
                    point.latency_rolling_ms, point.error_rate_rolling
                ),
                difficulty_level=point.smoothed_difficulty,
                reaction_latency_ms=point.latency_rolling_ms,
            )
            for session, point in zip(sessions, curve, strict=True)
        ]
        source = "derived"

    latest = points[-1] if points else None
    return DdaHistoryResponse(
        patient_id=patient_id,
        source=source,
        current_difficulty_level=latest.difficulty_level if latest else 0.0,
        latest_cognitive_load_index=latest.cognitive_load_index if latest else 0.0,
        points=points,
    )


@router.get("/patient/{patient_id}/sessions", response_model=SessionsPage)
async def get_patient_sessions(
    patient_id: UUID,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    user=Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
) -> SessionsPage:
    """Paginated gameplay session records, newest first."""
    await _load_patient_for_user(db, patient_id, user)

    total = (
        await db.execute(
            select(func.count())
            .select_from(GameplaySessionLog)
            .where(GameplaySessionLog.patient_id == patient_id)
        )
    ).scalar_one()

    result = await db.execute(
        select(GameplaySessionLog)
        .where(GameplaySessionLog.patient_id == patient_id)
        .order_by(GameplaySessionLog.timestamp.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    sessions = list(result.scalars())

    items = [
        SessionRecord(
            session_log_id=session.id,
            game_module_id=session.game_module_id,
            gds_stage=session.gds_stage,
            difficulty_level=session.difficulty_level,
            duration_seconds=round(session.session_duration_ms / 1000.0, 1),
            avg_latency_ms=session.avg_latency_ms,
            # Gameplay score: 10 pts per clean task + 2 pts per guided save.
            score=session.tasks_completed_cleanly * 10 + session.tasks_guided * 2,
            accuracy_pct=_percents(
                session.tasks_completed_cleanly, session.tasks_presented
            ),
            demitokens_earned=session.demitokens_earned,
            tasks_presented=session.tasks_presented,
            tasks_completed_cleanly=session.tasks_completed_cleanly,
            timestamp=_as_aware(session.timestamp),
        )
        for session in sessions
    ]

    return SessionsPage(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size,
    )


@router.get("/patient/{patient_id}/cognitive-summary", response_model=CognitiveSummaryResponse)
async def get_cognitive_summary(
    patient_id: UUID,
    user=Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
) -> CognitiveSummaryResponse:
    """Aggregated score comparing the last 7 days against the previous 7 days."""
    await _load_patient_for_user(db, patient_id, user)

    sessions = await _load_sessions(db, patient_id)
    now = datetime.now(timezone.utc)
    cutoff_7d = now - timedelta(days=7)
    cutoff_14d = now - timedelta(days=14)

    last_7 = [s for s in sessions if _as_aware(s.timestamp) > cutoff_7d]
    prev_7 = [s for s in sessions if cutoff_14d < _as_aware(s.timestamp) <= cutoff_7d]

    last_agg = _window_aggregate(last_7)
    prev_agg = _window_aggregate(prev_7)

    if not last_7 or not prev_7:
        trend_direction = "INSUFFICIENT_DATA"
        accuracy_delta_pct = 0.0
    else:
        accuracy_delta_pct = round(last_agg.avg_accuracy_pct - prev_agg.avg_accuracy_pct, 2)
        if accuracy_delta_pct >= _IMPROVING_THRESHOLD_PCT:
            trend_direction = "IMPROVING"
        elif accuracy_delta_pct <= _DECLINING_THRESHOLD_PCT:
            trend_direction = "DECLINING"
        else:
            trend_direction = "STABLE"

    return CognitiveSummaryResponse(
        patient_id=patient_id,
        last_7_days=last_agg,
        previous_7_days=prev_agg,
        accuracy_delta_pct=accuracy_delta_pct,
        trend_direction=trend_direction,
        stability_score=_stability_score(last_7),
        recommended_difficulty=_recommended_difficulty(sessions, last_agg),
    )


@router.get("/{patient_id}", response_model=AnalyticsResponse)
async def get_analytics(
    patient_id: UUID,
    user=Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
) -> AnalyticsResponse:
    patient = await _load_patient_for_user(db, patient_id, user)

    result = await db.execute(
        select(GameplaySessionLog)
        .where(GameplaySessionLog.patient_id == patient_id)
        .order_by(GameplaySessionLog.timestamp)
    )
    sessions = list(result.scalars())

    difficulties = [float(s.difficulty_level) for s in sessions]
    latencies = [float(s.avg_latency_ms) for s in sessions]
    error_rates = [
        (s.tasks_guided / s.tasks_presented) if s.tasks_presented > 0 else 0.0
        for s in sessions
    ]
    curve = build_dda_curve(difficulties, latencies, error_rates)

    session_points: list[AnalyticsSessionPoint] = []
    for session, point in zip(sessions, curve, strict=True):
        session_points.append(
            AnalyticsSessionPoint(
                session_log_id=session.id,
                game_module_id=session.game_module_id,
                gds_stage=session.gds_stage,
                difficulty_level=session.difficulty_level,
                tasks_presented=session.tasks_presented,
                tasks_completed_cleanly=session.tasks_completed_cleanly,
                tasks_guided=session.tasks_guided,
                avg_latency_ms=session.avg_latency_ms,
                demitokens_earned=session.demitokens_earned,
                timestamp=session.timestamp,
                accuracy_pct=_percents(
                    session.tasks_completed_cleanly, session.tasks_presented
                ),
                error_rate=point.error_rate,
                rolling_avg_latency_ms=point.latency_rolling_ms,
                rolling_error_rate=point.error_rate_rolling,
            )
        )

    dda_curve_points = [
        DdaCurvePoint(
            session_index=index,
            session_log_id=point_session.id,
            raw_difficulty=point.raw_difficulty,
            smoothed_difficulty=point.smoothed_difficulty,
            latency_ms=point.latency_ms,
            accuracy_pct=_percents(
                point_session.tasks_completed_cleanly, point_session.tasks_presented
            ),
        )
        for index, (point_session, point) in enumerate(zip(sessions, curve, strict=True))
    ]

    total_presented = sum(s.tasks_presented for s in sessions)
    total_clean = sum(s.tasks_completed_cleanly for s in sessions)
    total_tokens = sum(s.demitokens_earned for s in sessions)
    avg_latency = sum(s.avg_latency_ms for s in sessions) / len(sessions) if sessions else 0.0
    latency_rolling = curve[-1].latency_rolling_ms if curve else 0.0

    summary = AnalyticsSummary(
        total_sessions=len(sessions),
        total_tasks_presented=total_presented,
        total_tasks_clean=total_clean,
        overall_accuracy_pct=_percents(total_clean, total_presented),
        avg_latency_ms=round(avg_latency, 2),
        latency_rolling_avg_ms=latency_rolling,
        demitokens_total=total_tokens,
    )

    return AnalyticsResponse(
        patient_id=patient_id,
        sessions=session_points,
        dda_curve=dda_curve_points,
        summary=summary,
    )


# ─── Internal aggregation helpers ───────────────────────────────────────────


def _window_aggregate(rows: list[GameplaySessionLog]) -> CognitiveWindowAggregate:
    if not rows:
        return CognitiveWindowAggregate(
            sessions=0, avg_accuracy_pct=0.0, avg_latency_ms=0.0, avg_difficulty=0.0
        )
    presented = sum(s.tasks_presented for s in rows)
    clean = sum(s.tasks_completed_cleanly for s in rows)
    return CognitiveWindowAggregate(
        sessions=len(rows),
        avg_accuracy_pct=_percents(clean, presented),
        avg_latency_ms=round(sum(float(s.avg_latency_ms) for s in rows) / len(rows), 2),
        avg_difficulty=round(sum(float(s.difficulty_level) for s in rows) / len(rows), 2),
    )


def _stability_score(rows: list[GameplaySessionLog]) -> float:
    """0-100 consistency score: 100 minus twice the per-session accuracy σ."""
    if not rows:
        return 0.0
    accuracies = [_percents(s.tasks_completed_cleanly, s.tasks_presented) for s in rows]
    mean = sum(accuracies) / len(accuracies)
    variance = sum((a - mean) ** 2 for a in accuracies) / len(accuracies)
    stddev = sqrt(variance)
    return round(max(0.0, 100.0 - 2.0 * stddev), 2)


def _recommended_difficulty(
    sessions: list[GameplaySessionLog], last_agg: CognitiveWindowAggregate
) -> int:
    """Suggest the next Achaotic DDA difficulty level from recent accuracy."""
    if not sessions:
        return _MIN_RECOMMENDED_DIFFICULTY
    base = int(sessions[-1].difficulty_level)
    if last_agg.sessions == 0:
        return max(_MIN_RECOMMENDED_DIFFICULTY, min(_MAX_RECOMMENDED_DIFFICULTY, base))
    if last_agg.avg_accuracy_pct >= 85.0:
        base += 1
    elif last_agg.avg_accuracy_pct < 60.0:
        base -= 1
    return max(_MIN_RECOMMENDED_DIFFICULTY, min(_MAX_RECOMMENDED_DIFFICULTY, base))