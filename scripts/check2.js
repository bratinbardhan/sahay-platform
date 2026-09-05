const fs = require('fs');
const path = require('path');
const root = process.cwd();
function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function show(rel) {
  const parts = rel.split('/');
  let r = readJSON(path.join(root, 'node_modules', ...parts, 'package.json')) ||
          readJSON(path.join(root, 'apps', 'web', 'node_modules', ...parts, 'package.json')) ||
          readJSON(path.join(root, 'apps', 'mobile', 'node_modules', ...parts, 'package.json'));
  console.log(rel + ': ' + (r ? r.version : 'NOT FOUND'));
  if (r && r.peerDependencies) console.log('   peerDeps: ' + JSON.stringify(r.peerDependencies));
}
['recharts','@vitejs/plugin-react','vite','@expo/metro-config','expo/metro-config','@expo/metro-runtime','@expo/config-plugins','react','react-dom','react-native-web','expo-router'].forEach(show);
console.log('\n--- expo/metro-config entry check ---');
for (const d of ['node_modules/expo/metro-config','node_modules/@expo/metro-config']) {
  const r = readJSON(path.join(root, d, 'package.json'));
  console.log(d + ': ' + (r ? r.version : 'NOT FOUND') + (r ? ' exports:'+JSON.stringify(Object.keys(r.exports||{})) : ''));
}
