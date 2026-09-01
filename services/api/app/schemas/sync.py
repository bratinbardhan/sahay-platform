from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class GameplaySessionLogIn(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_id: UUID
    game_module_id: str = Field(..., max_length=128)
    gds_stage: int = Field(..., ge=1, le=7)
    difficulty_level: int = Field(default=1, ge=0)
    tasks_presented: int = Field(default=0, ge=0)
    tasks_completed_cleanly: int = Field(default=0, ge=0)
    tasks_guided: int = Field(default=0, ge=0)
    avg_latency_ms: float = Field(default=0.0, ge=0)
    demitokens_earned: int = Field(default=0, ge=0)
    sync_status: str = Field(default="PENDING_SYNC", max_length=32)
    timestamp: datetime


class TokenBalanceUpdateIn(BaseModel):
    patient_id: UUID
    demitoken_balance: int = Field(..., ge=0)
    streak_days: int = Field(..., ge=0)


class DeltaSyncRequest(BaseModel):
    session_logs: list[GameplaySessionLogIn] = Field(default_factory=list)
    token_updates: list[TokenBalanceUpdateIn] = Field(default_factory=list)

    @field_validator("session_logs")
    @classmethod
    def validate_session_logs(cls, logs: list[GameplaySessionLogIn]) -> list[GameplaySessionLogIn]:
        if len(logs) > 500:
            raise ValueError("Maximum 500 session logs per sync batch")
        return logs


class TokenUpdateApplied(BaseModel):
    patient_id: UUID
    demitoken_balance: int = Field(..., ge=0)
    streak_days: int = Field(..., ge=0)


class DeltaSyncResponse(BaseModel):
    synced_session_log_ids: list[UUID]
    synced_token_update_patient_ids: list[UUID]
    dda_metric_ids: list[UUID] = Field(default_factory=list)
    token_updates_applied: list[TokenUpdateApplied] = Field(default_factory=list)
