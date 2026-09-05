const fs = require('fs');
const path = require('path');
const root = process.cwd();
function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }

console.log('=== ROOT react/react-dom ===');
let r = readJSON(path.join(root, 'node_modules', 'react', 'package.json'));
console.log('react:', r && r.version);
console.log('react-dom:', (readJSON(path.join(root, 'node_modules', 'react-dom', 'package.json')) || {}).version);

console.log('\n=== Does react@19.1.0 export `use`? ===');
const idx = path.join(root, 'node_modules', 'react', 'index.js');
try {
  const src = fs.readFileSync(idx, 'utf8');
  const hasUse = /exports\.use\s*=/.test(src) || /export\s+\{[^}]*use[,\s]/.test(src);
  console.log('react/index.js exports.use =', src.includes('exports.use ='), '| has "use" token:', /exports\.use\b/.test(src));
  // Also confirm via object at runtime
  const React = require(path.join(root, 'node_modules', 'react'));
  console.log('typeof React.use:', typeof React.use, '| typeof React.useMemo:', typeof React.useMemo);
} catch (e) { console.log('ERR', e.message); }

console.log('\n=== All react copies in tree (dedup) ===');
const found = [];
function scan(dir, depth) {
  if (depth > 4) return;
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    if (e.isDirectory() && e.name === 'react') {
      const pj = path.join(dir, e.name, 'package.json');
      const v = readJSON(pj);
      if (v && v.name === 'react') found.push(path.relative(root, path.join(dir, e.name)) + '@' + v.version);
    }
  }
  if (depth < 2) {
    for (const e of ents) {
      if (e.isDirectory()) {
        const nm = path.join(dir, e.name, 'node_modules');
        if (fs.existsSync(nm)) scan(nm, depth + 1);
      }
    }
  }
}
scan(path.join(root, 'node_modules'), 0);
console.log(found.length ? found : 'none');
const has18 = found.some(s => s.includes('@18.3.1'));
console.log('react@18.3.1 present?', has18);

console.log('\n=== Other canon versions ===');
console.log('expo:', (readJSON(path.join(root,'node_modules','expo','package.json'))||{}).version);
console.log('expo-router:', (readJSON(path.join(root,'node_modules','expo-router','package.json'))||{}).version);
console.log('react-native:', (readJSON(path.join(root,'node_modules','react-native','package.json'))||{}).version);
console.log('react-native-web:', (readJSON(path.join(root,'node_modules','react-native-web','package.json'))||{}).version);
console.log('@expo/metro-runtime:', (readJSON(path.join(root,'node_modules','@expo/metro-runtime','package.json'))||{}).version);
console.log('@expo/config-plugins:', (readJSON(path.join(root,'node_modules','@expo/config-plugins','package.json'))||{}).version);
console.log('@types/react:', (readJSON(path.join(root,'node_modules','@types','react','package.json'))||{}).version);

console.log('\n=== Nested react in apps/mobile (should be absent) ===');
const mobReact = readJSON(path.join(root,'apps','mobile','node_modules','react','package.json'));
console.log('apps/mobile/node_modules/react:', mobReact ? mobReact.version : 'ABSENT (hoisted to root) ✓');

console.log('\n=== Lockfile root react entry ===');
const lock = readJSON(path.join(root,'package-lock.json'));
if (lock) {
  console.log('lockfile node_modules/react:', lock.packages && lock.packages['node_modules/react'] && lock.packages['node_modules/react'].version);
  console.log('lockfile node_modules/react-dom:', lock.packages && lock.packages['node_modules/react-dom'] && lock.packages['node_modules/react-dom'].version);
}
