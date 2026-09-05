// Temporary dependency inspection script
const fs = require('fs');
const path = require('path');
const root = process.cwd();

const PACKAGES = [
  'react',
  'react-dom',
  'react-native',
  'react-native-web',
  'expo',
  'expo-router',
  'expo-status-bar',
  '@expo/config-plugins',
  'babel-preset-expo',
];

function readJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

console.log('=== Package versions found in node_modules tree ===');
for (const pkg of PACKAGES) {
  const segments = pkg.split('/');
  const name = segments.join('/');
  const nameEsc = pkg.replace('/', path.sep);
  const locs = [];
  // root
  let p = path.join(root, 'node_modules', name, 'package.json');
  if (fs.existsSync(p)) locs.push('ROOT: ' + (readJSON(p).version || '?'));
  // apps/mobile nested
  p = path.join(root, 'apps', 'mobile', 'node_modules', name, 'package.json');
  if (fs.existsSync(p)) locs.push('mobile-nested: ' + (readJSON(p).version || '?'));
  // apps/web nested
  p = path.join(root, 'apps', 'web', 'node_modules', name, 'package.json');
  if (fs.existsSync(p)) locs.push('web-nested: ' + (readJSON(p).version || '?'));
  // packages/types nested (unlikely but check)
  p = path.join(root, 'packages', 'types', 'node_modules', name, 'package.json');
  if (fs.existsSync(p)) locs.push('types-nested: ' + (readJSON(p).version || '?'));
  console.log(pkg + ' => ' + (locs.length ? locs.join(' | ') : 'NOT INSTALLED'));
}

console.log('\n=== apps/mobile/node_modules listing (top-level dirs) ===');
const mobNM = path.join(root, 'apps', 'mobile', 'node_modules');
if (fs.existsSync(mobNM)) {
  const dirs = fs.readdirSync(mobNM, { withFileTypes: true }).filter(d => d.isDirectory());
  console.log('Total top-level entries: ' + dirs.length);
  console.log(dirs.map(d => d.name).filter(n => /^react|^expo|@expo|@react-native/.test(n)).join('\n'));
} else {
  console.log('NO apps/mobile/node_modules');
}

console.log('\n=== Check for duplicate react copies ===');
function findReactDirs(base) {
  const results = [];
  function walk(dir, depth) {
    if (depth > 4) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === 'react' && e.isDirectory()) {
        const pj = path.join(dir, e.name, 'package.json');
        const v = readJSON(pj);
        if (v && v.name === 'react') results.push(path.relative(root, dir) + '/react@' + v.version);
      }
    }
    // look one level into @scope
    for (const e of entries) {
      if (e.isDirectory() && e.name.startsWith('@')) {
        const sub = path.join(dir, e.name);
        try { entries2 = fs.readdirSync(sub, { withFileTypes: true }); } catch { continue; }
        for (const e2 of entries2) {
          if (e2.name === 'react' && e2.isDirectory()) {
            const pj = path.join(sub, e2.name, 'package.json');
            const v = readJSON(pj);
            if (v && v.name === 'react') results.push(path.relative(root, path.join(dir, e.name)) + '/react@' + v.version);
          }
        }
      }
    }
  }
  walk(base, 0);
  return results;
}
const reactCopies = findReactDirs(path.join(root, 'node_modules'));
console.log('react copies under root node_modules:');
reactCopies.forEach(r => console.log('  ' + r));

console.log('\n=== React DOM use export check (expo-router storeContext) ===');
const storePath = path.join(root, 'node_modules', 'expo-router', 'build', 'global-state', 'storeContext.js');
if (fs.existsSync(storePath)) {
  const src = fs.readFileSync(storePath, 'utf8');
  console.log('storeContext.js EXISTS. Length: ' + src.length);
  // print lines mentioning use/useMemo/useSyncExternalStore
  const lines = src.split('\n').map((l, i) => ({ i, l }));
  console.log('--- relevant lines ---');
  lines.filter(x => /\buse\b|useMemo|useSyncExternalStore|useTransition|isBrowser|\.use/.test(x.l)).slice(0, 20).forEach(x => console.log((x.i + 1) + ': ' + x.l));
} else {
  console.log('storeContext.js NOT FOUND at ' + storePath);
}

console.log('\n=== expo-router package.json peerDeps / version ===');
const erPkg = readJSON(path.join(root, 'node_modules', 'expo-router', 'package.json')) || readJSON(path.join(root, 'apps', 'mobile', 'node_modules', 'expo-router', 'package.json'));
if (erPkg) {
  console.log('expo-router version: ' + erPkg.version);
  console.log('exporter main/module: ' + JSON.stringify({ main: erPkg.main, module: erPkg.module, exports: erPkg.exports ? Object.keys(erPkg.exports) : undefined }));
  console.log('peerDependencies: ' + JSON.stringify(erPkg.peerDependencies || {}));
  console.log('dependencies: ' + JSON.stringify(erPkg.dependencies || {}));
}

console.log('\n=== react package.json ===');
const reactPkg = readJSON(path.join(root, 'node_modules', 'react', 'package.json')) || readJSON(path.join(root, 'apps', 'mobile', 'node_modules', 'react', 'package.json'));
if (reactPkg) {
  console.log('react version: ' + reactPkg.version);
  console.log('react exports (has use?): ' + JSON.stringify({ hasUse: !!(reactPkg.exports && reactPkg.exports[''] && reactPkg.exports[''].use !== undefined) }));
}
console.log('\n=== react-dom package.json ===');
const rdomPkg = readJSON(path.join(root, 'node_modules', 'react-dom', 'package.json')) || readJSON(path.join(root, 'apps', 'mobile', 'node_modules', 'react-dom', 'package.json'));
if (rdomPkg) {
  console.log('react-dom version: ' + rdomPkg.version);
}
