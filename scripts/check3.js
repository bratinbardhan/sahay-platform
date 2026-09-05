const fs = require('fs');
const path = require('path');
const root = process.cwd();
function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return; } }

// expo exports metro subpath?
const expo = readJSON(path.join(root, 'node_modules', 'expo', 'package.json'));
console.log('expo version:', expo.version);
console.log('expo has ./metro-config subpath:', !!(expo.exports && expo.exports['./metro-config']));
const metroKeys = expo.exports ? Object.keys(expo.exports).filter(k => k.toLowerCase().includes('metro')) : [];
console.log('expo metro-ish export keys:', metroKeys);

// @sahay/types symlink
const sahayTypesLink = path.join(root, 'node_modules', '@sahay', 'types');
try { const l = fs.lstatSync(sahayTypesLink); console.log('@sahay/types is symlink:', l.isSymbolicLink(), l.isSymbolicLink() ? fs.readlinkSync(sahayTypesLink) : ''); } catch(e){ console.log('@sahay/types: not present', e.code); }

// react copies in lockfile
const lock = readJSON(path.join(root, 'package-lock.json'));
const reactLock = Object.keys(lock.packages||{}).filter(k => k === 'node_modules/react' || k === 'apps/mobile/node_modules/react' || k === 'node_modules/recharts' || (k.includes('react') && k.endsWith('node_modules/react')));
console.log('\nreact entries in lockfile packages:');
reactLock.forEach(k => console.log('  ' + k + ' => ' + lock.packages[k].version));
// find any version 18 anywhere in lockfile packages
console.log('\nlockfile entries whose version is 18.3.1 (react):');
const v18 = Object.entries(lock.packages||{}).filter(([k,v]) => v.version === '18.3.1' && /react/.test(k));
v18.forEach(([k,v]) => console.log('  ' + k + ' => ' + v.version));

// config-plugins copies
console.log('\nconfig-plugins lockfile entries:');
Object.entries(lock.packages||{}).filter(([k]) => k.includes('config-plugins') && k.endsWith('node_modules/@expo/config-plugins')).forEach(([k,v]) => console.log('  ' + k + ' => ' + v.version));

// Check react-serverdom-webpack (expo-router peer wants ~19)
const rsc = readJSON(path.join(root, 'node_modules', 'react-server-dom-webpack', 'package.json')) || readJSON(path.join(root, 'node_modules', 'expo-router', 'node_modules', 'react-server-dom-webpack', 'package.json'));
console.log('\nreact-serverdom-webpack:', rsc ? rsc.version : 'NOT FOUND');
