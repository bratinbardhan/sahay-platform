export const GDS_STAGE_LABELS: Record<number, string> = {
  1: 'No Dementia',
  2: 'Very Mild',
  3: 'Mild',
  4: 'Moderate',
  5: 'Moderately Severe',
  6: 'Severe',
  7: 'Very Severe',
};

export const GDS_STAGE_COLORS: Record<number, string> = {
  1: '#27AE60',
  2: '#2ECC71',
  3: '#5DA600',
  4: '#E67E22',
  5: '#E67E22',
  6: '#E67E22',
  7: '#E67E22',
};

export function getGdsStageColor(stage: number): string {
  return GDS_STAGE_COLORS[stage] ?? '#2C3E50';
}

export function getGdsStageLabel(stage: number): string {
  return GDS_STAGE_LABELS[stage] ?? 'Unknown';
}

export function therapyStageFromGds(gdsStage: number): 1 | 2 | 3 {
  if (gdsStage <= 3) return 1;
  if (gdsStage <= 5) return 2;
  return 3;
}
