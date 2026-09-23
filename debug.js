const cp = require('child_process');
const fs = require('fs');
try {
    const result = cp.execSync('git ls-tree -r --name-only 7404a53', { encoding: 'utf-8', stdio: 'pipe' });
    fs.writeFileSync('result.txt', result);
} catch (e) {
    fs.writeFileSync('result.txt', e.message + "\n" + (e.stdout ? e.stdout.toString() : "") + "\n" + (e.stderr ? e.stderr.toString() : ""));
}
