// Metro configuration for the Sahāy mobile app.
//
// Expo SDK 54's default Metro config (@expo/metro-config@54.0.17) does not register
// '.wasm' as either a source or asset extension. expo-sqlite's web driver (wa-sqlite)
// imports its bundled WebAssembly binary as a default module import:
//
//     import wasmModule from './wa-sqlite/wa-sqlite.wasm';   // node_modules/expo-sqlite/web/worker.ts
//
// and passes it to wa-sqlite's factory via `locateFile: () => wasmModule`. wa-sqlite then
// FETCHES that value as a URL string at runtime (fetch/xhr -> arrayBuffer). Therefore the
// imported value must resolve to a runtime URL string, which means '.wasm' must be treated
// as an ASSET (not parsed as a JavaScript source module).
//
// Adding 'wasm' to assetExts lets Metro resolve the import and serve the .wasm file as a
// normal web asset whose default export is its public URL string.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// Guard against any future default that mistakenly treats .wasm as a JS source module,
// which would cause Metro to try to parse binary wasm as JavaScript.
if (config.resolver.sourceExts.includes('wasm')) {
  config.resolver.sourceExts = config.resolver.sourceExts.filter((ext) => ext !== 'wasm');
}

module.exports = config;
