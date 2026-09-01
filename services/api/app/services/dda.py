"""Achaotic DDA smoothing utilities shared by the sync + analytics flows.

Converts a sequence of raw session metrics into per-session DDA estimates:
a non-spiking trailing rolling average that damps abrupt difficulty jumps
so the "curve" the patient experiences never spikes between sessions.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class DdaPoint:
    raw_difficulty: float
    smoothed_difficulty: float
    latency_ms: float
    latency_rolling_ms: float
    error_rate: float
    error_rate_rolling: float


def _trailing_average(values: list[float], index: int, window: int) -> float:
    low = max(0, index - window + 1)
    chunk = values[low : index + 1]
    return sum(chunk) / len(chunk)


def build_dda_curve(
    difficulties: list[float],
    latencies_ms: list[float],
    error_rates: list[float],
    *,
    latency_window: int = 10,
    difficulty_window: int = 3,
) -> list[DdaPoint]:
    """Return a DdaPoint for each session, in input order.

    `latency_rolling_ms` and `error_rate_rolling` are trailing rolling averages
    (window `latency_window`). `smoothed_difficulty` is a trailing rolling
    average over `difficulty_window` sessions — a spike bounded to a single
    session is diluted across the window.
    """
    count = len(difficulties)
    if not (count == len(latencies_ms) == len(error_rates)):
        raise ValueError("difficulties, latencies and error_rates must align")

    points: list[DdaPoint] = []
    for i in range(count):
        smoothing = _trailing_average(difficulties, i, difficulty_window)
        latency_roll = _trailing_average(latencies_ms, i, latency_window)
        error_roll = _trailing_average(error_rates, i, latency_window)
        points.append(
            DdaPoint(
                raw_difficulty=difficulties[i],
                smoothed_difficulty=round(smoothing, 3),
                latency_ms=latencies_ms[i],
                latency_rolling_ms=round(latency_roll, 2),
                error_rate=error_rates[i],
                error_rate_rolling=round(error_roll, 5),
            )
        )
    return points