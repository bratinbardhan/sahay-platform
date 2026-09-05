const fs = require('fs');
const path = require('path');
const root = process.cwd();
function validate(rel) {
  try { JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')); console.log(rel + ': VALID'); }
  catch (e) { console.log(rel + ': INVALID -> ' + e.message); }
}
validate('apps/mobile/app.json');
validate('apps/web/package.json');
validate('package.json');


// assets listing
function listAssets(dir) {
  try {
    const ents = fs.readdirSync(dir);
    console.log('\n' + dir + ' contents: ' + ents.join(', '));
  } catch (e) {
    console.log('\n' + dir + ': does not exist');
  }
}
listAssets(path.join(root, 'apps', 'mobile', 'assets'));
