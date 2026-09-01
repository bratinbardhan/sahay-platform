export type TherapyStage = 1 | 2 | 3;

export type GameModuleId =
  | 'rapid_fire_sorting'
  | 'serial_number_scatter'
  | 'face_name_match'
  | 'environmental_sound_match'
  | 'ambient_ripple'
  | 'sensory_music';

export type GameCatalogEntry = {
  id: GameModuleId;
  title: string;
  href: `/games/${string}`;
};

export function therapyStageFromGds(assignedGdsStage: number): TherapyStage {
  if (assignedGdsStage <= 3) {
    return 1;
  }
  if (assignedGdsStage <= 5) {
    return 2;
  }
  return 3;
}

export const GAMES_BY_STAGE: Record<TherapyStage, GameCatalogEntry[]> = {
  1: [
    {
      id: 'rapid_fire_sorting',
      title: 'Rapid-Fire Sorting',
      href: '/games/rapid-fire-sorting',
    },
    {
      id: 'serial_number_scatter',
      title: 'Serial Number Scatter',
      href: '/games/serial-number-scatter',
    },
  ],
  2: [
    {
      id: 'face_name_match',
      title: 'Face & Name Match',
      href: '/games/face-name-match',
    },
    {
      id: 'environmental_sound_match',
      title: 'Environmental Sound Match',
      href: '/games/environmental-sound-match',
    },
  ],
  3: [
    {
      id: 'ambient_ripple',
      title: 'Ambient Ripple',
      href: '/games/ambient-ripple',
    },
    {
      id: 'sensory_music',
      title: 'Sensory Music',
      href: '/games/sensory-music',
    },
  ],
};

export function gamesForGds(assignedGdsStage: number): GameCatalogEntry[] {
  return GAMES_BY_STAGE[therapyStageFromGds(assignedGdsStage)];
}
