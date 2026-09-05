// Check web-side + expo peer compatibility for React 19 migration
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function pj(rel) { return path.join(root, rel); }
function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function v(relPkg) { const r = readJSON(pj('node_modules/' + relPkg + '/package.json')); return r ? r.version : 'NOT INSTALLED'; }
function peer(relPkg, name) { const r = readJSON(pj('node_modules/' + relPkg + '/package.json')); return r ? (r.peerDependencies && r.peerDependencies[name] || 'n/a') : 'NOT INSTALLED'; }

const pkgs = ['recharts', '@vitejs/plugin-react', 'vite', '@types/react', '@types/react-dom', '@expo/metro-runtime', 'react-native-web', 'expo', 'react', 'react-dom'];
console.log('Version check (root node_modules):');
for (const p of pkgs) console.log('  ' + p + ': ' + v(p));

console.log('\nPeer deps requiring react/react-dom:');
console.log('  recharts peer react: ' + peer('recharts', 'react'));
console.log('  recharts peer react-dom: ' + peer('recharts', 'react-dom'));
console.log('  @vitejs/plugin-react peer react: ' + peer('@vitejs/plugin-react', 'react'));
console.log('  @vitejs/plugin-react peer vite: ' + peer('@vitejs/plugin-react', 'vite'));
console.log('  react-native-web peer react: ' + peer('react-native-web', 'react'));
console.log('  react-native-web peer react-native: ' + peer('react-native-web', 'react-native'));
console.log('  expo peer react: ' + peer('expo', 'react'));
console.log('  expo peer react-native: ' + peer('expo', 'react-native'));
console.log('  @expo/metro-runtime peer expo: ' + peer('@expo/metro-runtime', 'expo'));

// Check react-native-web exports for 'use'-like / verify it re-exports react's use
const rnw = readJSON(pj('node_modules/react-native-web/package.json'));
console.log('\nreact-native-web version: ' + (rnw && rnw.version));
console.log('react-native-web react peer: ' + JSON.stringify((rnw && rnw.peerDependencies)));
const reactExports = readJSON(pj('node_modules/react/package.json'));
console.log('\nreact (ROOT) exports field: ' + JSON.stringify(reactExports && reactExports.exports ? Object.keys(reactExports.exports) : 'none'));
console.log('react (ROOT) has use in exports[\".\"]: ' + JSON.stringify(reactExports && reactExports.exports && reactExports.exports['.']));

// Find react copies more thoroughly
function findPkgCopies(name, dir, depth, found) {
  if (depth > 3) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name === name && e.isDirectory()) {
      const r = readJSON(path.join(dir, e.name, 'package.json'));
      if (r && r.name === name) found.push(path.relative(root, path.join(dir, e.name)) + '@' + r.version);
    }
    if (e.isDirectory() && e.name === 'node_modules' && depth === 0) {
      // skip nested node_modules at root level to avoid recursion blowup beyond depth
    }
  }
  // recurse into nested node_modules dirs at depth 0 and 1
  if (depth <= 1) {
    for (const e of entries) {
      if (e.isDirectory()) {
        const nm = path.join(dir, e.name, 'node_modules');
        if (fs.existsSync(nm)) findPkgCopies(name, nm, depth + 1, found);
      }
    }
  }
}
const found = [];
findPkgCopies('react', pj('node_modules'), 0, found);
console.log('\nAll react copies anywhere: ' + found.join(' | ') || 'none found beyond script');

// expo config-plugins required by expo@54
const expoPkg = readJSON(pj('node_modules/expo/package.json'));
console.log('\nexpo@' + (expoPkg && expoPkg.version));
console.log('expo deps @expo/config-plugins: ' + JSON.stringify((expoPkg && expoPkg.dependencies && expoPkg.dependencies['@expo/config-plugins'])));
console.log('expo deps react: ' + JSON.stringify(expoPkg && expoPkg.dependencies && expoPkg.dependencies['react']));
console.log('expo deps react-dom: ' + JSON.stringify(expoPkg && expoPkg.dependencies && expoPkg.dependencies['react-dom']));
console.log('expo deps react-native: ' + JSON.stringify(expoPkg && expoPkg.dependencies && expoPkg.dependencies['react-native']));
