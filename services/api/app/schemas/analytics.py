from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


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