export type SortCategory = 'fruit' | 'bamboo';

export type SortItem = {
  id: string;
  label: string;
  category: SortCategory;
  glyph: string;
};

export const NER_SORT_ITEMS: SortItem[] = [
  { id: 'sohshang', label: 'Sohshang', category: 'fruit', glyph: '🫐' },
  { id: 'pineapple', label: 'Pineapple', category: 'fruit', glyph: '🍍' },
  { id: 'orange', label: 'Khasi orange', category: 'fruit', glyph: '🍊' },
  { id: 'jackfruit', label: 'Jackfruit', category: 'fruit', glyph: '🟡' },
  { id: 'starfruit', label: 'Starfruit', category: 'fruit', glyph: '⭐' },
  { id: 'passion', label: 'Passion fruit', category: 'fruit', glyph: '🟣' },
  { id: 'chunga', label: 'Bamboo chunga', category: 'bamboo', glyph: '🎋' },
  { id: 'basket', label: 'Bamboo basket', category: 'bamboo', glyph: '🧺' },
  { id: 'flute', label: 'Bamboo flute', category: 'bamboo', glyph: '🎶' },
  { id: 'mat', label: 'Bamboo mat', category: 'bamboo', glyph: '🪵' },
  { id: 'trap', label: 'Fish trap', category: 'bamboo', glyph: '⭕' },
  { id: 'mug', label: 'Bamboo mug', category: 'bamboo', glyph: '🥤' },
];

export type AmbientSoundId = 'rain' | 'temple_bell' | 'livestock';

export type AmbientSound = {
  id: AmbientSoundId;
  label: string;
  glyph: string;
};

export const AMBIENT_SOUNDS: AmbientSound[] = [
  { id: 'rain', label: 'Rain on leaves', glyph: '🌧️' },
  { id: 'temple_bell', label: 'Temple bell', glyph: '🔔' },
  { id: 'livestock', label: 'Village livestock', glyph: '🐃' },
];

export type FolkTuneId = 'bihugeet' | 'naga_hill' | 'khasi_lullaby';

export type FolkTune = {
  id: FolkTuneId;
  label: string;
  notes: number[];
};

/** Simple pentatonic phrases used as offline folk-style tones. */
export const FOLK_TUNES: FolkTune[] = [
  { id: 'bihugeet', label: 'Bihu melody', notes: [392, 440, 494, 440, 392, 330, 392] },
  { id: 'naga_hill', label: 'Hill song', notes: [330, 392, 330, 262, 330, 392, 523] },
  { id: 'khasi_lullaby', label: 'Khasi lullaby', notes: [262, 294, 330, 294, 262, 220, 262] },
];
