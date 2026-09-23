const cp = require('child_process');
const fs = require('fs');
try {
    const result = cp.execSync('git ls-tree -r --name-only 7404a53', { encoding: 'utf-8' });
    const matches = result.split('\n').filter(line => /analytics/i.test(line));
    fs.writeFileSync('commit_msg.txt', matches.join('\n'));
} catch (e) {
    fs.writeFileSync('commit_msg.txt', 'Err: ' + e.message);
}
