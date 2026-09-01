"""Analytics aggregation endpoint.

Returns aggregated session history, rolling-average touch latency, accuracy
metrics, and the Achaotic DDA raw-vs-smoothed difficulty curve comparison.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import GameplaySessionLog, PatientProfile
from app.schemas.analytics import (
    AnalyticsResponse,
    AnalyticsSessionPoint,
    AnalyticsSummary,
    DdaCurvePoint,
)
from app.services.dda import build_dda_curve

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


def _percents(clean: int, presented: int) -> float:
    return round((clean / presented) * 100, 2) if presented > 0 else 0.0


@router.get("/{patient_id}", response_model=AnalyticsResponse)
async def get_analytics(
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> AnalyticsResponse:
    patient = await db.get(PatientProfile, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")

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