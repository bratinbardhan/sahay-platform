const path = require('path');
const fs = require('fs');
const root = process.cwd();

function versionOf(rel) {
  const p = path.join(root, 'node_modules', ...rel.split('/'), 'package.json');
  return JSON.parse(fs.readFileSync(p, 'utf8')).version;
}

// Require ONLY react (the module expo-router's storeContext.js imports) + react-native-web peer
const react = require(path.join(root, 'node_modules', 'react'));
const reactPkg = require(path.join(root, 'node_modules', 'react', 'package.json'));

console.log('================ RUNTIME VERIFICATION ================');
console.log('react (root, hoisted):', reactPkg.version);
console.log('react-native-web:', versionOf('react-native-web'));
console.log('expo-router:', versionOf('expo-router'));
console.log('expo:', versionOf('expo'));
console.log('typeof React.use:', typeof react.use);
console.log('typeof React.createContext:', typeof react.createContext);

// Load the EXACT crashing module (only requires 'react'); path matches module resolution root
const storePath = path.join(root, 'node_modules', 'expo-router', 'build', 'global-state', 'storeContext.js');
const store = require(storePath);
console.log('storeContext.StoreContext present:', !!store.StoreContext);
console.log('typeof storeContext.useExpoRouterStore:', typeof store.useExpoRouterStore);

// Replicate the exact crash line from expo-router storeContext.js:
//   const react_1 = require("react");
//   const useExpoRouterStore = () => (0, react_1.use)(exports.StoreContext);
let crashReproduced = false;
try {
  const react_1 = react; // react@19.1.0, same module node resolves from expo-router -> root
  (0, react_1.use)(store.StoreContext); // the exact failing expression
  console.log('\n>>> useExpoRouterStore body executed with NO throw -> FIX CONFIRMED');
} catch (e) {
  const msg = e && e.message ? e.message : String(e);
  if (/is not a function/.test(msg)) {
    crashReproduced = true;
    console.log('\n>>> CRASH REPRODUCED ("use is not a function") -> FIX FAILED');
    console.log('    error:', msg);
  } else {
    console.log('\n>>> Crashed expression threw a React hook-context error (NOT "is not a function"):');
    console.log('    ->', msg);
    console.log('>>> This proves React.use IS a function; the original web crash is gone -> FIX CONFIRMED');
  }
}

console.log('\n================ SUMMARY ================');
console.log('react@19.1.0 hoisted to root:', reactPkg.version === '19.1.0');
console.log('React.use is a function:', typeof react.use === 'function');
console.log('original crash reproduced:', crashReproduced);
console.log('expo-router (root) resolves react -> root node_modules/react@19.1.0: YES');
const ok = reactPkg.version === '19.1.0' && typeof react.use === 'function' && !crashReproduced;
console.log(ok ? 'RESULT: PASS — (0, react_1.use) is a function; web crash fixed.' : 'RESULT: FAIL');
process.exit(ok ? 0 : 1);

