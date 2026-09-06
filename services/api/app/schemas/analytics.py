from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AnalyticsSessionPoint(BaseModel):
    session_log_id: UUID
    game_module_id: str
    gds_stage: int = Field(..., ge=1, le=7)
    difficulty_level: int = Field(..., ge=0)
    tasks_presented: int = Field(..., ge=0)
    tasks_completed_cleanly: int = Field(..., ge=0)
    tasks_guided: int = Field(..., ge=0)
    avg_latency_ms: float = Field(..., ge=0)
    demitokens_earned: int = Field(..., ge=0)
    timestamp: datetime
    accuracy_pct: float = Field(..., ge=0, le=100)
    error_rate: float = Field(..., ge=0)
    rolling_avg_latency_ms: float = Field(..., ge=0)
    rolling_error_rate: float = Field(..., ge=0)


class DdaCurvePoint(BaseModel):
    session_index: int = Field(..., ge=0)
    session_log_id: UUID
    raw_difficulty: float = Field(..., ge=0)
    smoothed_difficulty: float = Field(..., ge=0)
    latency_ms: float = Field(..., ge=0)
    accuracy_pct: float = Field(..., ge=0, le=100)


class AnalyticsSummary(BaseModel):
    total_sessions: int = Field(..., ge=0)
    total_tasks_presented: int = Field(..., ge=0)
    total_tasks_clean: int = Field(..., ge=0)
    overall_accuracy_pct: float = Field(..., ge=0, le=100)
    avg_latency_ms: float = Field(..., ge=0)
    latency_rolling_avg_ms: float = Field(..., ge=0)
    demitokens_total: int = Field(..., ge=0)


class AnalyticsResponse(BaseModel):
    patient_id: UUID
    sessions: list[AnalyticsSessionPoint]
    dda_curve: list[DdaCurvePoint]
    summary: AnalyticsSummary


# ─── Phase 4: live dashboard telemetry ─────────────────────────────────────


class PatientProfileOut(BaseModel):
    """Patient profile for the caretaker dashboard (mirror of the ORM row)."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    caregiver_id: UUID
    name: str
    age: int
    assigned_gds_stage: int = Field(..., ge=1, le=7)
    primary_language: str
    demitoken_balance: int = Field(..., ge=0)
    streak_days: int = Field(..., ge=0)
    created_at: datetime


class DdaHistoryPoint(BaseModel):
    """One point on the patient's cognitive trajectory time-series."""

    timestamp: datetime
    cognitive_load_index: float = Field(..., ge=0, le=100)
    difficulty_level: float = Field(..., ge=0, description="Dynamic difficulty level (smoothed)")
    reaction_latency_ms: float = Field(..., ge=0)


class DdaHistoryResponse(BaseModel):
    patient_id: UUID
    source: str = Field(
        ..., description="'ddametrics' for persisted DDA logs, 'derived' when rebuilt from sessions"
    )
    current_difficulty_level: float = Field(..., ge=0)
    latest_cognitive_load_index: float = Field(..., ge=0, le=100)
    points: list[DdaHistoryPoint]


class SessionRecord(BaseModel):
    """One paginated gameplay session row for the caregiver dashboard."""

    session_log_id: UUID
    game_module_id: str
    gds_stage: int = Field(..., ge=1, le=7)
    difficulty_level: int = Field(..., ge=0)
    duration_seconds: float = Field(..., ge=0)
    avg_latency_ms: float = Field(..., ge=0)
    score: int = Field(..., ge=0)
    accuracy_pct: float = Field(..., ge=0, le=100)
    demitokens_earned: int = Field(..., ge=0)
    tasks_presented: int = Field(..., ge=0)
    tasks_completed_cleanly: int = Field(..., ge=0)
    timestamp: datetime


class SessionsPage(BaseModel):
    items: list[SessionRecord]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    size: int = Field(..., ge=1)
    pages: int = Field(..., ge=0)


class CognitiveWindowAggregate(BaseModel):
    sessions: int = Field(..., ge=0)
    avg_accuracy_pct: float = Field(..., ge=0, le=100)
    avg_latency_ms: float = Field(..., ge=0)
    avg_difficulty: float = Field(..., ge=0)


class CognitiveSummaryResponse(BaseModel):
    patient_id: UUID
    last_7_days: CognitiveWindowAggregate
    previous_7_days: CognitiveWindowAggregate
    accuracy_delta_pct: float
    trend_direction: str = Field(
        ..., description="'IMPROVING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT_DATA'"
    )
    stability_score: float = Field(..., ge=0, le=100)
    recommended_difficulty: int = Field(..., ge=1, le=10)