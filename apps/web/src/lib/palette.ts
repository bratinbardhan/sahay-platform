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
  bg: '#F8F6F0',
  surface: '#FFFCF6',
  surfaceSunken: '#EDEAE3',
  panel: '#F1F2F4',
  ink: '#2C3E50',
  muted: '#5B6673',
  border: '#C9CFD6',
  action: '#E67E22',
  actionStrong: '#D35400',
  actionSoft: '#FFF1E0',
  accent: '#C4A35A',
  calm: '#0D9488',
  /** Deliberately amber, never red — patient UI must not alarm. */
  alert: '#E67E22',
  alertSoft: '#FFF1E0',
  /** No elevation, no gradient, no motion on this surface. */
  shadow: 'none',
  motion: '0ms',
} as const;

/** PALETTE 2 · Caretaker Dashboard — data-viz, severity series, elevation. */
export const SAHAY_CARETAKER = {
  bg: '#85706A',
  surface: '#F8F6F0',
  surfaceRaised: '#FFFCF6',
  surfaceSunken: '#EDEAE3',
  panel: '#F1F2F4',
  ink: '#2C3E50',
  muted: '#60747E',
  border: '#60747E',
  line: '#C9CFD6',
  grid: '#E2E8F0',
  axis: '#64748B',
  accent: '#E99D79',
  accentStrong: '#D66144',
  accentSoft: '#FFF5C5',
  gold: '#F6BDE2',
  goldSoft: '#BDE0AF',
  goldInk: '#7A9F96',
  ok: '#788DC4',
  okBright: '#9B6DD6',
  okSoft: '#E8F6EE',
  okInk: '#1E7A45',
  lime: '#5DA600',
  warn: '#E67E22',
  warnSoft: '#FFF1E0',
  warnInk: '#A85B12',
  alert: '#D66144',
  alertSoft: '#FDECEA',
  alertInk: '#B3452C',
  info: '#3E6E93',
  infoSoft: '#EAF1F7',
  teal: '#0D9488',
  tealSoft: '#E6F5F3',
  /** 8 %-alpha teal wash — Recharts `<Tooltip cursor>` fill on the 7-day charts. */
  tealWash: 'rgba(13, 148, 136, 0.08)',
  homePin: '#00B0B0',
  zone: '#60747E',
  mood: '#F59E0B',
  slate: '#5B6673',
  /** Categorical chart scale — index 8 (alert red) is breach/SOS series only. */
  viz: ['#7A9F96', '#788DC4', '#9B6DD6', '#BDE0AF', '#FFF5C5', '#E99D79', '#F6BDE2', '#D66144'],
  shadow: '0 4px 12px rgba(44, 62, 80, 0.08)',
  shadowHover: '0 12px 28px rgba(44, 62, 80, 0.14)',
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
  backgroundColor: 'rgba(255, 252, 246, 0.96)',
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
  background: 'rgba(255, 252, 246, 0.92)',
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