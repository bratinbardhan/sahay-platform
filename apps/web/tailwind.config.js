/** @type {import('tailwindcss').Config} */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SAHĀY WEB — DUAL PALETTE DESIGN SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The web app renders two visually distinct surfaces from one component tree.
 * Pick the palette that matches the *audience* of the screen, never the file:
 *
 *  1. PATIENT APP palette  (`patient-*`, `data-palette="patient"`)
 *     Flat and shadow-free. Glare-reducing soft cream, deep charcoal text and
 *     warm amber actions. Decorative gradients, elevation and micro-motion are
 *     suppressed, and alert tones are *neutralised to amber* so an alarming red
 *     can never reach a patient-facing surface (.clinerules rule #2).
 *
 *  2. CARETAKER DASHBOARD palette  (`caretaker-*`, `data-palette="caretaker"`)
 *     Optimised for data visualisation: a full GDS/severity series scale, glass
 *     tooltips, card elevation, hover lift and 220 ms state transitions. Here —
 *     and only here — medical alert tones (red/amber/green) are permitted.
 *
 * AMBIENT TOKENS (`sahay-*`)
 *     `sahay-*` colours resolve from CSS custom properties declared in
 *     `src/index.css`, so a single class (e.g. `bg-sahay-surface`) renders the
 *     patient treatment or the caretaker treatment depending on the nearest
 *     `[data-palette]` ancestor. Prefer `sahay-*` in shared components; reach
 *     for `patient-*` / `caretaker-*` when a surface must stay pinned.
 *
 * The JavaScript mirror of every token below lives in `src/lib/palette.ts`
 * for SVG / Leaflet / Recharts consumers that cannot read Tailwind classes.
 * Keep the two files in sync.
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Legacy aliases (pre-palette code kept compiling) ────────────────
        cream: '#F8FAFC',
        charcoal: '#0F172A',

        /**
         * ── Ambient palette-aware tokens ───────────────────────────────────
         * Values are CSS custom properties (space-separated RGB channels) so
         * `data-palette` switching and the `/opacity` modifier both work.
         */
        sahay: {
          bg: 'rgb(var(--sahay-bg) / <alpha-value>)',
          surface: 'rgb(var(--sahay-surface) / <alpha-value>)',
          'surface-raised': 'rgb(var(--sahay-surface-raised) / <alpha-value>)',
          'surface-sunken': 'rgb(var(--sahay-surface-sunken) / <alpha-value>)',
          panel: 'rgb(var(--sahay-panel) / <alpha-value>)',
          ink: 'rgb(var(--sahay-ink) / <alpha-value>)',
          muted: 'rgb(var(--sahay-muted) / <alpha-value>)',
          border: 'rgb(var(--sahay-border) / <alpha-value>)',
          line: 'rgb(var(--sahay-line) / <alpha-value>)',
          axis: 'rgb(var(--sahay-axis) / <alpha-value>)',
          accent: 'rgb(var(--sahay-accent) / <alpha-value>)',
          'accent-strong': 'rgb(var(--sahay-accent-strong) / <alpha-value>)',
          'accent-soft': 'rgb(var(--sahay-accent-soft) / <alpha-value>)',
          gold: 'rgb(var(--sahay-gold) / <alpha-value>)',
          'gold-soft': 'rgb(var(--sahay-gold-soft) / <alpha-value>)',
          'gold-ink': 'rgb(var(--sahay-gold-ink) / <alpha-value>)',
          ok: 'rgb(var(--sahay-ok) / <alpha-value>)',
          'ok-bright': 'rgb(var(--sahay-ok-bright) / <alpha-value>)',
          'ok-soft': 'rgb(var(--sahay-ok-soft) / <alpha-value>)',
          'ok-ink': 'rgb(var(--sahay-ok-ink) / <alpha-value>)',
          lime: 'rgb(var(--sahay-lime) / <alpha-value>)',
          warn: 'rgb(var(--sahay-warn) / <alpha-value>)',
          'warn-soft': 'rgb(var(--sahay-warn-soft) / <alpha-value>)',
          'warn-ink': 'rgb(var(--sahay-warn-ink) / <alpha-value>)',
          alert: 'rgb(var(--sahay-alert) / <alpha-value>)',
          'alert-soft': 'rgb(var(--sahay-alert-soft) / <alpha-value>)',
          'alert-ink': 'rgb(var(--sahay-alert-ink) / <alpha-value>)',
          info: 'rgb(var(--sahay-info) / <alpha-value>)',
          'info-soft': 'rgb(var(--sahay-info-soft) / <alpha-value>)',
          teal: 'rgb(var(--sahay-teal) / <alpha-value>)',
          'teal-soft': 'rgb(var(--sahay-teal-soft) / <alpha-value>)',
          mood: 'rgb(var(--sahay-mood) / <alpha-value>)',
        },

        /**
         * ── PALETTE 1 · Patient App ────────────────────────────────────────
         * Flat, shadow-free, glare-reducing. There is no alert red anywhere in
         * this scale — `patient.alert` is aliased to the amber action colour so
         * a shared component can never surface an alarming tone to a patient.
         */
        patient: {
          bg: '#F8FAFC',
          surface: '#FFFFFF',
          'surface-sunken': '#F1F5F9',
          panel: '#F1F2F4',
          ink: '#0F172A',
          muted: '#475569',
          border: '#E2E8F0',
          action: '#0D9488',
          'action-strong': '#0F766E',
          'action-soft': '#CCFBF1',
          accent: '#0D9488',
          calm: '#10B981',
          alert: '#EF4444',
          'alert-soft': '#FEE2E2',
        },

        /**
         * ── PALETTE 2 · Caretaker Dashboard ───────────────────────────────
         * Data-visualisation surface: severity series, alert semantics and
         * elevated cards with transitions.
         */
        caretaker: {
          bg: '#F8FAFC',
          surface: '#FFFFFF',
          'surface-sunken': '#F1F5F9',
          panel: '#F1F2F4',
          ink: '#0F172A',
          muted: '#475569',
          border: '#E2E8F0',
          line: '#E2E8F0',
          grid: '#E2E8F0',
          axis: '#64748B',
          accent: '#0D9488',
          'accent-strong': '#0F766E',
          'accent-soft': '#CCFBF1',
          gold: '#8B5CF6',
          'gold-soft': '#EDE9FE',
          'gold-ink': '#6D28D9',
          ok: '#10B981',
          'ok-bright': '#14B8A6',
          'ok-soft': '#D1FAE5',
          'ok-ink': '#047857',
          lime: '#10B981',
          warn: '#F59E0B',
          'warn-soft': '#FEF3C7',
          'warn-ink': '#B45309',
          alert: '#EF4444',
          'alert-soft': '#FEE2E2',
          'alert-ink': '#B91C1C',
          info: '#1E3A8A',
          'info-soft': '#DBEAFE',
          teal: '#0D9488',
          'teal-soft': '#E6F5F3',
          mood: '#F59E0B',
          slate: '#5B6673',
          /**
           * Ordered categorical scale for charts & legends. Index 8 (alert red)
           * is reserved for breach / SOS series only.
           */
          viz: {
            1: '#7A9F96',
            2: '#788DC4',
            3: '#9B6DD6',
            4: '#BDE0AF',
            5: '#FFF5C5',
            6: '#E99D79',
            7: '#F6BDE2',
            8: '#D66144',
          },
        },
      },

      /**
       * Elevation vocabulary. `patient` is literally no shadow — the flat
       * treatment. Caretaker surfaces get a soft card shadow, a hover "raise",
       * plus alert/focus rings that a patient surface can never produce.
       *
       * These live inside `extend` on purpose: the stock Tailwind shadow scale
       * (`shadow-sm` … `shadow-2xl`) is still used across the dashboard, so the
       * tokens below are *additions*, not a replacement scale.
       */
      boxShadow: {
        patient: 'none',
        'caretaker-card': '0 4px 12px rgba(44, 62, 80, 0.08)',
        'caretaker-raised': '0 12px 28px rgba(44, 62, 80, 0.14)',
        'caretaker-toast': '0 8px 24px rgba(15, 23, 42, 0.12)',
        'caretaker-alert': '0 0 0 4px rgba(231, 76, 60, 0.18)',
        'caretaker-focus': '0 0 0 4px rgba(230, 126, 34, 0.22)',
        'caretaker-sunken': 'inset 0 1px 2px rgba(44, 62, 80, 0.06)',
      },

      /**
       * Motion vocabulary. Patient surfaces are intentionally motionless — their
       * feedback is instantaneous; caretaker surfaces animate to draw the eye to
       * changing telemetry (220 ms `ease-care` is the house curve). Additive for
       * the same reason as the shadows above, so `transition-colors`,
       * `duration-200`, `ease-in-out`, … remain available.
       */
      transitionTimingFunction: {
        care: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      transitionDuration: {
        care: '220ms',
        'care-slow': '320ms',
      },
      transitionProperty: {
        care: 'color, background-color, border-color, box-shadow, transform, opacity',
      },

      /**
       * Motion set. `patient-fade-in` is the only animation a patient surface
       * may use; the caretaker set draws attention to changing telemetry.
       */
      keyframes: {
        'patient-fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'caretaker-rise': {
          from: { opacity: '0', transform: 'translateY(16px) scale(0.99)' },
          to: { opacity: '1', transform: 'none' },
        },
        'caretaker-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.55', transform: 'scale(0.94)' },
        },
        'caretaker-alert-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(231, 76, 60, 0.45)' },
          '100%': { boxShadow: '0 0 0 12px rgba(231, 76, 60, 0)' },
        },
      },
      animation: {
        'patient-fade-in': 'patient-fade-in 200ms ease-out both',
        'caretaker-rise': 'caretaker-rise 420ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'caretaker-pulse': 'caretaker-pulse 1.8s ease-in-out infinite',
        'caretaker-alert-ring': 'caretaker-alert-ring 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
};
