/**
 * Shared GDS helpers — severity colours resolve from the caretaker palette in
 * `lib/palette.ts`, the single source of truth for chart/SVG/Leaflet colours.
 */
import { SAHAY_CARETAKER, SAHAY_GDS_STAGE_COLORS } from './palette';

export const GDS_STAGE_LABELS: Record<number, string> = {
  1: 'No Dementia',
  2: 'Very Mild',
  3: 'Mild',
  4: 'Moderate',
  5: 'Moderately Severe',
  6: 'Severe',
  7: 'Very Severe',
};

/**
 * GDS severity ramp, sourced from the Caretaker Dashboard palette:
 * healthy green → mild lime → watch amber. Deliberately no alert red here —
 * `GDS_STAGE_COLORS` marks a clinical *stage*, not an emergency.
 */
export const GDS_STAGE_COLORS: Record<number, string> = SAHAY_GDS_STAGE_COLORS;

/**
 * The same ramp as a positional array (index 0 → GDS stage 1), for charts such
 * as `StageBarChart` that take an ordered `string[]` of series colours.
 */
export const GDS_STAGE_COLOR_RAMP: string[] = [1, 2, 3, 4, 5, 6, 7].map(
  (stage) => GDS_STAGE_COLORS[stage],
);

export function getGdsStageColor(stage: number): string {
  return GDS_STAGE_COLORS[stage] ?? SAHAY_CARETAKER.ink;
}

export function getGdsStageLabel(stage: number): string {
  return GDS_STAGE_LABELS[stage] ?? 'Unknown';
}

export function therapyStageFromGds(gdsStage: number): 1 | 2 | 3 {
  if (gdsStage <= 3) return 1;
  if (gdsStage <= 5) return 2;
  return 3;
}
