const fs = require('fs');
const path = require('path');
const root = process.cwd();
const files = ['package.json', 'apps/web/package.json', 'apps/mobile/app.json'];
for (const f of files) {
  const p = path.join(root, f);
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
    console.log(f + ': reformatted + valid');
  } catch (e) {
    console.log(f + ': ERROR ' + e.message);
  }
}
