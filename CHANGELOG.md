# Changelog

## [Unreleased] — React 19.1.0 parity (Expo SDK 54)

### Fixed
- **Fixed** `Uncaught Error: (0, react_1.use) is not a function` when running
  `expo start -c` → `w` (web).
  - Root cause: npm hoisted `react@18.3.1` (declared by `apps/web` `^18.3.1`) to the
    monorepo root, so the hoisted `expo-router@6.0.24` bound **React 18**, which has no
    exports `.use`. At runtime `expo-router`'s `storeContext.js` called `use()` → crash.
  - Fix: added root `overrides` `{ "react": "19.1.0", "react-dom": "19.1.0" }` to force a
    single `react@19.1.0` at the root (so hoisted `expo-router` binds the React that
    exports `use`); aligned `apps/web` `react`/`react-dom`/`@types/*` to `19.1.0`; pinned
    `@expo/config-plugins` to `~54.0.5` to resolve its conflict with `expo@54`.
- **Fixed** `apps/mobile/.env` — removed markdown-link corruption around
  `EXPO_PUBLIC_API_URL`; value is now `https://sahay-api-rdm7.onrender.com`.
- **Fixed web bundling failure at ~94%** (`Unable to resolve module ./wa-sqlite/wa-sqlite.wasm`)
  for the `w` / `expo export --platform web` target.
  - Root cause: Expo SDK 54's default Metro config (`@expo/metro-config@54.0.17`) does not
    register `.wasm` as either a source or asset extension, so Metro could not resolve
    `expo-sqlite`'s web driver import `import wasmModule from './wa-sqlite/wa-sqlite.wasm'`.
    `expo-sqlite/web/worker.ts` passes that value to wa-sqlite via
    `locateFile: () => wasmModule`, and wa-sqlite **fetches it as a URL string** at runtime
    (`fetch(url).arrayBuffer()`), so the imported value must be a runtime URL — meaning
    `.wasm` must be treated as an **asset**, not parsed as a JS source module.
  - Fix: created `apps/mobile/metro.config.js` extending
    `getDefaultConfig(__dirname)` from `expo/metro-config`, adding `'wasm'` to
    `resolver.assetExts` (and guarding it out of `sourceExts`). This lets Metro resolve the
    import and emit the `.wasm` as a normal web asset whose default export is its public URL.
  - Verified: `expo export --platform web` now reaches **100%** (`EXPORT3_EXITCODE=0`);
    the `.wasm` is emitted under `assets/__node_modules/expo-sqlite/web/wa-sqlite/` and the
    worker bundle references its hashed URL. (Build artifact retained at `apps/mobile/dist3/`.)

### Verified
- `React.use` is a function at runtime (`typeof React.use === 'function'`; react
  `exports.use` present); single `react@19.1.0` repo-wide, **no `react@18.*` anywhere**.
- `scripts/verify_runtime.js`: the **exact** crash expression
  `(0, react_1.use)(store.StoreContext)` no longer throws *"is not a function"*
  (throws React's normal invalid-hook-context error, proving the hook exists).
- `expo export --platform web`: web bundle compiles `expo-router/entry.js` through
  **1298 modules (94.2%)** including `storeContext.js` — **no** `react.use` error,
  no "Unable to resolve module 'react'".
- `expo start -c`: loads `.env`, emits `env: export EXPO_PUBLIC_API_URL`; resolves modules
  and reaches "Starting project" with no React-module resolution error.
- `src/config/apiConfig.ts` reads `process.env.EXPO_PUBLIC_API_URL` (consumed by
  `constants.ts` → `API_BASE_URL`/`SYNC_ENDPOINT`/`GEOFENCE_ALERT_ENDPOINT`).
- `npm install` → `added 918 packages`, exit 0. Versions:
  `expo@54.0.37`, `expo-router@6.0.24`, `expo-sqlite@16.0.10`, `react@19.1.0`,
  `react-dom@19.1.0`, `react-native@0.81.5`, `react-native-web@0.21.2`,
  `@expo/metro-runtime@6.1.2`, `@expo/config-plugins@54.0.5`.

### Known / Separate (intentionally left untouched)
- `expo start`'s interactive dev server does not fully run inside this non-TTY sandbox
  ("Input redirection is not supported"); the web bundling code path was instead exercised
  via the non-interactive `expo export --platform web`.
