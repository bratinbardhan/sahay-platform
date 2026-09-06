"""Pydantic request/response schemas for the demitoken ledger."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models import TransactionType


class LedgerTransactionRequest(BaseModel):
    """Request body for recording a new demitoken transaction."""

    amount: int = Field(..., description="Positive for credits, negative for debits. Must be nonzero.")
    transaction_type: TransactionType
    reference_id: str | None = Field(default=None, max_length=128)
    metadata_: dict = Field(default_factory=dict, alias="metadata")


class LedgerTransactionResponse(BaseModel):
    """Response model for a single ledger transaction."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    amount: int
    transaction_type: TransactionType
    balance_after: int
    reference_id: str | None = None
    metadata_: dict = Field(default_factory=dict, alias="metadata")
    created_at: datetime

    @field_validator("metadata_", mode="before")
    @classmethod
    def coerce_metadata(cls, value: object) -> dict:
        """Coerce SQLAlchemy MetaData / list / None to a plain dict."""
        if isinstance(value, dict):
            return value
        if value is None:
            return {}
        # SQLAlchemy JSON may return nested lists/dicts after refresh
        return dict(value) if hasattr(value, "__iter__") else {}


class LedgerBalanceResponse(BaseModel):
    """Response model for the current verified balance."""

    user_id: UUID
    balance: int
    transaction_count: int


class LedgerHistoryResponse(BaseModel):
    """Paginated response for ledger history."""

    user_id: UUID
    total: int
    page: int
    page_size: int
    transactions: list[LedgerTransactionResponse]