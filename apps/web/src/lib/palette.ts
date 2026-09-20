/** Sahāy dual-palette tokens — TypeScript mirror of tailwind.config.js + index.css. */
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SAHĀY — JAVASCRIPT TOKEN MIRROR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * SVG `fill` / `stroke`, Leaflet layer options and Recharts props cannot read
 * Tailwind classes, so they need literal colours. This module is the single
 * source of truth for those call sites and mirrors — value for value — the
 * `patient` and `caretaker` scales in `tailwind.config.js` plus the ambient
 * custom properties in `src/index.css`. Update all three together.
 *
 * Two palettes, two audiences:
 *   `SAHAY_PATIENT`   — flat, shadow-free, never alarming (patient surfaces)
 *   `SAHAY_CARETAKER` — full severity series + alerts (dashboard surfaces)
 *
 * `applyPalette()` stamps `data-palette` on <html> so the CSS custom properties
 * switch and every `sahay-*` Tailwind class follows along.
 */

export type SahayPalette = 'patient' | 'caretaker';

/** PALETTE 1 · Patient App — flat, glare-reducing, no alert red. */
export const SAHAY_PATIENT = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSunken: '#F1F5F9',
  panel: '#F1F2F4',
  ink: '#0F172A',
  muted: '#475569',
  border: '#E2E8F0',
  action: '#0D9488',
  actionStrong: '#0F766E',
  actionSoft: '#CCFBF1',
  accent: '#0D9488',
  calm: '#10B981',
  /** Deliberately amber, never red — patient UI must not alarm. */
  alert: '#EF4444',
  alertSoft: '#FEE2E2',
  /** No elevation, no gradient, no motion on this surface. */
  shadow: 'none',
  motion: '0ms',
} as const;

/** PALETTE 2 · Caretaker Dashboard — data-viz, severity series, elevation. */
export const SAHAY_CARETAKER = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceSunken: '#F1F5F9',
  panel: '#F1F2F4',
  ink: '#0F172A',
  muted: '#475569',
  border: '#E2E8F0',
  line: '#E2E8F0',
  grid: '#E2E8F0',
  axis: '#64748B',
  accent: '#0D9488',
  accentStrong: '#0F766E',
  accentSoft: '#CCFBF1',
  gold: '#8B5CF6',
  goldSoft: '#EDE9FE',
  goldInk: '#6D28D9',
  ok: '#10B981',
  okBright: '#14B8A6',
  okSoft: '#D1FAE5',
  okInk: '#047857',
  lime: '#10B981',
  warn: '#F59E0B',
  warnSoft: '#FEF3C7',
  warnInk: '#B45309',
  alert: '#EF4444',
  alertSoft: '#FEE2E2',
  alertInk: '#B91C1C',
  info: '#1E3A8A',
  infoSoft: '#DBEAFE',
  teal: '#0D9488',
  tealSoft: '#E6F5F3',
  /** 8 %-alpha teal wash — Recharts `<Tooltip cursor>` fill on the 7-day charts. */
  tealWash: 'rgba(13, 148, 136, 0.08)',
  homePin: '#14B8A6',
  zone: '#0D9488',
  mood: '#F59E0B',
  slate: '#5B6673',
  /** Categorical chart scale — index 8 (alert red) is breach/SOS series only. */
  viz: ['#0D9488', '#3B82F6', '#F59E0B', '#8B5CF6', '#64748B', '#0F766E', '#475569', '#EF4444'],
  shadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
  shadowHover: '0 12px 28px rgba(15, 23, 42, 0.12)',
  motion: '220ms',
} as const;

/** Categorical series for bar/radar/pie charts (alias of `caretaker.viz`). */
export const SAHAY_VIZ_SERIES = [...SAHAY_CARETAKER.viz] as string[];

/** Severity ramp — healthy green → watch amber (matches `lib/gdsUtils.ts`). */
export const SAHAY_SEVERITY = {
  healthy: SAHAY_CARETAKER.ok,
  healthyBright: SAHAY_CARETAKER.okBright,
  mild: SAHAY_CARETAKER.lime,
  watch: SAHAY_CARETAKER.warn,
  breach: SAHAY_CARETAKER.alert,
} as const;

/** GDS 1–7 stage colours for charts, legends and map markers (no SOS crimson). */
export const SAHAY_GDS_STAGE_COLORS: Record<number, string> = {
  1: SAHAY_CARETAKER.viz[0],
  2: SAHAY_CARETAKER.viz[1],
  3: SAHAY_CARETAKER.lime,
  4: SAHAY_CARETAKER.warn,
  5: SAHAY_CARETAKER.info,
  6: SAHAY_CARETAKER.accent,
  7: SAHAY_CARETAKER.muted,
};

/** Public 1–7 GDS colour ramp consumed by caretaker surfaces. */
export const SAHAY_GDS_STAGES = SAHAY_GDS_STAGE_COLORS;

/** Recharts `<Tooltip contentStyle>` — near-opaque card surface, ink rule. */
export const sahayTooltipStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  border: `2px solid ${SAHAY_CARETAKER.ink}`,
  borderRadius: 12,
  fontSize: 12,
  color: SAHAY_CARETAKER.ink,
} as const;

/**
 * Recharts `<Tooltip contentStyle>` for the 7-day engagement/mood charts —
 * glass panel: caretaker hairline, toast elevation, ink label.
 */
export const sahayGlassTooltipStyle = {
  background: 'rgba(255, 255, 255, 0.92)',
  backdropFilter: 'blur(8px)',
  border: `1px solid ${SAHAY_CARETAKER.line}`,
  borderRadius: 12,
  boxShadow: '0 8px 24px rgba(44, 62, 80, 0.12)',
  padding: '10px 14px',
} as const;

/** Recharts `<Tooltip labelStyle>` — bold ink heading inside the tooltip card. */
export const sahayTooltipLabelStyle = {
  fontWeight: 700,
  color: SAHAY_CARETAKER.ink,
  marginBottom: 4,
} as const;

/** Shared axis/grid styling for Recharts cartesian charts. */
export const sahayAxisProps = {
  stroke: SAHAY_CARETAKER.axis,
  fontSize: 11,
} as const;

export const sahayGridProps = {
  strokeDasharray: '3 3',
  stroke: SAHAY_CARETAKER.grid,
} as const;

/**
 * Switch the ambient palette. Stamps `data-palette` on the document element so
 * `src/index.css` custom properties — and therefore every `sahay-*` class —
 * resolve to the requested palette.
 */
export function applyPalette(palette: SahayPalette): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.dataset.palette = palette;
}

/** The palette currently stamped on the document (caretaker is the default). */
export function currentPalette(): SahayPalette {
  if (typeof document === 'undefined') {
    return 'caretaker';
  }
  return document.documentElement.dataset.palette === 'patient' ? 'patient' : 'caretaker';
}

/** Convenience lookup for palette-agnostic consumers that must pin a surface. */
export const SAHAY_PALETTES: Record<SahayPalette, typeof SAHAY_PATIENT | typeof SAHAY_CARETAKER> = {
  patient: SAHAY_PATIENT,
  caretaker: SAHAY_CARETAKER,
};