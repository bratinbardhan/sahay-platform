"""Contract tests for the demitoken ledger endpoints.

Verifies transaction consistency, balance calculation, and the atomic
nature of POST /api/v1/ledger/transaction.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models import AuditLog, DemitokenLedger, TransactionType


@pytest.mark.asyncio
async def test_ledger_balance_starts_at_zero(
    async_client: AsyncClient,
    make_user,
) -> None:
    """A new user with no transactions should have a zero balance."""
    user_ctx = await make_user(email="ledger-tester@example.com")
    headers = user_ctx["headers"]

    response = await async_client.get("/api/v1/ledger/balance", headers=headers)
    assert response.status_code == 200

    data = response.json()
    assert data["balance"] == 0
    assert data["transaction_count"] == 0


@pytest.mark.asyncio
async def test_ledger_transaction_credits_balance(
    async_client: AsyncClient,
    make_user,
) -> None:
    """A GAMEPLAY_REWARD transaction should increase the balance."""
    user_ctx = await make_user(email="ledger-credit@example.com")
    headers = user_ctx["headers"]

    response = await async_client.post(
        "/api/v1/ledger/transaction",
        headers=headers,
        json={
            "amount": 10,
            "transaction_type": "GAMEPLAY_REWARD",
            "reference_id": "session-123",
            "metadata": {"game": "rapid_fire_sorting"},
        },
    )
    assert response.status_code == 201

    data = response.json()
    assert data["amount"] == 10
    assert data["balance_after"] == 10
    assert data["transaction_type"] == "GAMEPLAY_REWARD"

    balance_response = await async_client.get(
        "/api/v1/ledger/balance", headers=headers
    )
    assert balance_response.status_code == 200
    balance_data = balance_response.json()
    assert balance_data["balance"] == 10
    assert balance_data["transaction_count"] == 1


@pytest.mark.asyncio
async def test_ledger_transaction_debits_balance(
    async_client: AsyncClient,
    make_user,
) -> None:
    """A REDEMPTION transaction should decrease the balance."""
    user_ctx = await make_user(email="ledger-debit@example.com")
    headers = user_ctx["headers"]

    await async_client.post(
        "/api/v1/ledger/transaction",
        headers=headers,
        json={"amount": 50, "transaction_type": "GAMEPLAY_REWARD"},
    )

    response = await async_client.post(
        "/api/v1/ledger/transaction",
        headers=headers,
        json={
            "amount": -20,
            "transaction_type": "REDEMPTION",
            "reference_id": "reward-456",
        },
    )
    assert response.status_code == 201

    data = response.json()
    assert data["amount"] == -20
    assert data["balance_after"] == 30

    balance_response = await async_client.get(
        "/api/v1/ledger/balance", headers=headers
    )
    balance_data = balance_response.json()
    assert balance_data["balance"] == 30


@pytest.mark.asyncio
async def test_ledger_rejects_zero_amount(
    async_client: AsyncClient,
    make_user,
) -> None:
    """A transaction with amount=0 should be rejected."""
    user_ctx = await make_user(email="ledger-zero@example.com")
    headers = user_ctx["headers"]

    response = await async_client.post(
        "/api/v1/ledger/transaction",
        headers=headers,
        json={"amount": 0, "transaction_type": "GAMEPLAY_REWARD"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_ledger_rejects_mismatched_sign(
    async_client: AsyncClient,
    make_user,
) -> None:
    """A REDEMPTION with a positive amount should be rejected."""
    user_ctx = await make_user(email="ledger-sign@example.com")
    headers = user_ctx["headers"]

    response = await async_client.post(
        "/api/v1/ledger/transaction",
        headers=headers,
        json={"amount": 10, "transaction_type": "REDEMPTION"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_ledger_history_pagination(
    async_client: AsyncClient,
    make_user,
) -> None:
    """History should be paginated with correct total and page size."""
    user_ctx = await make_user(email="ledger-history@example.com")
    headers = user_ctx["headers"]

    created_amounts = []
    for i in range(5):
        amount = (i + 1) * 10
        created_amounts.append(amount)
        await async_client.post(
            "/api/v1/ledger/transaction",
            headers=headers,
            json={
                "amount": amount,
                "transaction_type": "GAMEPLAY_REWARD",
            },
        )

    response = await async_client.get(
        "/api/v1/ledger/history?page=1&page_size=2", headers=headers
    )
    assert response.status_code == 200

    data = response.json()
    assert data["total"] == 5
    assert len(data["transactions"]) == 2
    # All created amounts should appear across pages
    page_1_amounts = {t["amount"] for t in data["transactions"]}
    assert page_1_amounts.issubset(set(created_amounts))

    # Second page should have 2 more
    response2 = await async_client.get(
        "/api/v1/ledger/history?page=2&page_size=2", headers=headers
    )
    data2 = response2.json()
    assert len(data2["transactions"]) == 2

    # Third page should have 1
    response3 = await async_client.get(
        "/api/v1/ledger/history?page=3&page_size=2", headers=headers
    )
    data3 = response3.json()
    assert len(data3["transactions"]) == 1


@pytest.mark.asyncio
async def test_ledger_balance_is_sum_of_amounts(
    async_client: AsyncClient,
    make_user,
    session_factory: async_sessionmaker,
) -> None:
    """The balance must always equal SUM(amount) over all ledger rows."""
    user_ctx = await make_user(email="ledger-sum@example.com")
    headers = user_ctx["headers"]
    user = user_ctx["user"]

    transactions = [
        (100, "GAMEPLAY_REWARD"),
        (50, "STREAK_BONUS"),
        (-30, "REDEMPTION"),
        (20, "DAILY_CHECKIN"),
    ]
    for amount, tx_type in transactions:
        await async_client.post(
            "/api/v1/ledger/transaction",
            headers=headers,
            json={"amount": amount, "transaction_type": tx_type},
        )

    balance_response = await async_client.get(
        "/api/v1/ledger/balance", headers=headers
    )
    api_balance = balance_response.json()["balance"]

    async with session_factory() as session:
        db_sum = await session.scalar(
            select(func.coalesce(func.sum(DemitokenLedger.amount), 0)).where(
                DemitokenLedger.user_id == user.id
            )
        )

    assert api_balance == db_sum == 140


@pytest.mark.asyncio
async def test_ledger_creates_audit_trail(
    async_client: AsyncClient,
    make_user,
    session_factory: async_sessionmaker,
) -> None:
    """Each ledger transaction should create an audit log entry."""
    user_ctx = await make_user(email="ledger-audit@example.com")
    headers = user_ctx["headers"]

    await async_client.post(
        "/api/v1/ledger/transaction",
        headers=headers,
        json={"amount": 25, "transaction_type": "GAMEPLAY_REWARD"},
    )

    async with session_factory() as session:
        audit_count = await session.scalar(
            select(func.count(AuditLog.id)).where(
                AuditLog.action == "LEDGER_TRANSACTION"
            )
        )
        assert audit_count == 1


@pytest.mark.asyncio
async def test_ledger_requires_authentication(
    async_client: AsyncClient,
) -> None:
    """Endpoints should require a valid bearer token."""
    response = await async_client.get("/api/v1/ledger/balance")
    assert response.status_code == 401

    response = await async_client.post(
        "/api/v1/ledger/transaction",
        json={"amount": 10, "transaction_type": "GAMEPLAY_REWARD"},
    )
    assert response.status_code == 401