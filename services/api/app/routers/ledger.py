"""Auditable demitoken ledger endpoints.

Provides balance verification, transaction history, and atomic transaction
recording. The verified balance is always SUM(amount) over the user's ledger
rows — never a cached integer.
"""

import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import DemitokenLedger, TransactionType, User
from app.schemas.ledger import (
    LedgerBalanceResponse,
    LedgerHistoryResponse,
    LedgerTransactionRequest,
    LedgerTransactionResponse,
)
from app.services.audit import record_clinical_audit
from app.services.security import get_current_user

router = APIRouter(prefix="/api/v1/ledger", tags=["ledger"])


@router.get("/balance", response_model=LedgerBalanceResponse)
async def get_balance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LedgerBalanceResponse:
    """Return the current verified balance computed from the ledger."""
    result = await db.execute(
        select(
            func.count(DemitokenLedger.id),
            func.coalesce(func.sum(DemitokenLedger.amount), 0),
        ).where(DemitokenLedger.user_id == current_user.id)
    )
    row = result.one()
    return LedgerBalanceResponse(
        user_id=current_user.id,
        balance=int(row[1]),
        transaction_count=int(row[0]),
    )


@router.get("/history", response_model=LedgerHistoryResponse)
async def get_history(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LedgerHistoryResponse:
    """Return a paginated list of transactions, newest first."""
    count_result = await db.execute(
        select(func.count(DemitokenLedger.id)).where(
            DemitokenLedger.user_id == current_user.id
        )
    )
    total = int(count_result.scalar_one())

    offset = (page - 1) * page_size
    result = await db.execute(
        select(DemitokenLedger)
        .where(DemitokenLedger.user_id == current_user.id)
        .order_by(DemitokenLedger.balance_after.desc())
        .offset(offset)
        .limit(page_size)
    )
    transactions = list(result.scalars())

    return LedgerHistoryResponse(
        user_id=current_user.id,
        total=total,
        page=page,
        page_size=page_size,
        transactions=[
            LedgerTransactionResponse.model_validate(t) for t in transactions
        ],
    )


@router.post(
    "/transaction",
    response_model=LedgerTransactionResponse,
    status_code=201,
)
async def record_transaction(
    payload: LedgerTransactionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LedgerTransactionResponse:
    """Atomically record a ledger transaction and recalculate the balance.

    The balance is derived from SUM(amount) over all ledger rows for the user,
    making the ledger the single source of truth for the token economy.
    """
    if payload.amount == 0:
        raise HTTPException(
            status_code=422,
            detail="Transaction amount must be nonzero",
        )

    # Validate transaction type / amount sign consistency
    debit_types = {TransactionType.REDEMPTION, TransactionType.ASSESSMENT_PENALTY}
    if payload.transaction_type in debit_types and payload.amount > 0:
        raise HTTPException(
            status_code=422,
            detail=f"{payload.transaction_type.value} must have a negative amount",
        )
    credit_types = {
        TransactionType.GAMEPLAY_REWARD,
        TransactionType.DAILY_CHECKIN,
        TransactionType.STREAK_BONUS,
        TransactionType.SYNC_ADJUSTMENT,
    }
    if payload.transaction_type in credit_types and payload.amount < 0:
        raise HTTPException(
            status_code=422,
            detail=f"{payload.transaction_type.value} must have a positive amount",
        )

    # Compute the new balance from the ledger sum
    balance_result = await db.execute(
        select(func.coalesce(func.sum(DemitokenLedger.amount), 0)).where(
            DemitokenLedger.user_id == current_user.id
        )
    )
    current_balance = int(balance_result.scalar_one())
    new_balance = current_balance + payload.amount

    ledger_entry = DemitokenLedger(
        id=uuid.uuid4(),
        user_id=current_user.id,
        amount=payload.amount,
        transaction_type=payload.transaction_type,
        balance_after=new_balance,
        reference_id=payload.reference_id,
        metadata_=payload.metadata_ or {},
    )
    db.add(ledger_entry)

    await record_clinical_audit(
        db,
        action="LEDGER_TRANSACTION",
        entity_type="DemitokenLedger",
        entity_id=ledger_entry.id,
        actor_type="user",
        actor_id=current_user.id,
        meta={
            "amount": payload.amount,
            "transaction_type": payload.transaction_type.value,
            "balance_after": new_balance,
            "reference_id": payload.reference_id,
        },
    )

    await db.commit()
    return LedgerTransactionResponse(
        id=ledger_entry.id,
        user_id=ledger_entry.user_id,
        amount=ledger_entry.amount,
        transaction_type=ledger_entry.transaction_type,
        balance_after=ledger_entry.balance_after,
        reference_id=ledger_entry.reference_id,
        metadata_=ledger_entry.metadata_ or {},
        created_at=ledger_entry.created_at,
    )