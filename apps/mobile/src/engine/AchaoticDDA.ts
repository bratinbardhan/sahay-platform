export type TaskMetric = {
  latencyMs: number;
  completedCleanly: boolean;
};

export type DdaOutput = {
  /** 0 = gentlest, 1 = most demanding. Never jumps more than MAX_STEP. */
  smoothedDifficulty: number;
  /** Integer 1–10 for session logs. */
  difficultyLevel: number;
  targetSizeDp: number;
  itemCount: number;
  distractorCount: number;
  distractorIntensity: number;
  /**
   * Soft auto-guide delay after inactivity. Not a fail / game-over timer.
   */
  guidanceDelayMs: number;
};

export type DifficultyVariables = DdaOutput;

const WINDOW = 5;
const ALPHA = 0.3;
const MAX_STEP = 0.12;
const LATENCY_FAST_MS = 650;
const LATENCY_SLOW_MS = 2400;

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Bounded exponential smoothing over a 5-task rolling window of
 * touch latency and precision. Difficulty never spikes.
 */
export class AchaoticDDA {
  private latencies: number[] = [];
  private precisions: number[] = [];
  private smoothedDifficulty = 0.32;

  getVariables(): DdaOutput {
    const d = this.smoothedDifficulty;
    return {
      smoothedDifficulty: d,
      difficultyLevel: 1 + Math.round(d * 9),
      targetSizeDp: Math.round(128 - d * 48),
      itemCount: 4 + Math.round(d * 5),
      distractorCount: Math.round(1 + d * 3),
      distractorIntensity: d * 0.65,
      guidanceDelayMs: Math.round(4200 - d * 1400),
    };
  }

  recordTask(metric: TaskMetric): DdaOutput {
    this.latencies.push(metric.latencyMs);
    this.precisions.push(metric.completedCleanly ? 1 : 0);

    if (this.latencies.length > WINDOW) {
      this.latencies.shift();
      this.precisions.shift();
    }

    const avgLatency = mean(this.latencies);
    const avgPrecision = mean(this.precisions);
    const latencyNorm =
      1 -
      clamp((avgLatency - LATENCY_FAST_MS) / (LATENCY_SLOW_MS - LATENCY_FAST_MS), 0, 1);
    const target = clamp(0.55 * latencyNorm + 0.45 * avgPrecision, 0, 1);
    const exponentiallySmoothed = ALPHA * target + (1 - ALPHA) * this.smoothedDifficulty;
    const boundedDelta = clamp(
      exponentiallySmoothed - this.smoothedDifficulty,
      -MAX_STEP,
      MAX_STEP
    );

    this.smoothedDifficulty = clamp(this.smoothedDifficulty + boundedDelta, 0, 1);
    return this.getVariables();
  }

  reset(): void {
    this.latencies = [];
    this.precisions = [];
    this.smoothedDifficulty = 0.32;
  }
}

/** @deprecated Prefer {@link AchaoticDDA}. */
export class AchaoticDDAEngine extends AchaoticDDA {}
