const cp = require('child_process');
const fs = require('fs');
try {
    const result = cp.execSync('git ls-tree -r --name-only 7404a53', { encoding: 'utf-8' });
    const lines = result.split('\n');
    for (let line of lines) {
        if (line.toLowerCase().includes('analytics')) {
            fs.writeFileSync('C:\\analytics_match.txt', line);
            fs.writeFileSync('analytics_match.txt', line);
        }
    }
} catch (e) {
}
