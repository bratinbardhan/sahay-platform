const fs = require('fs');
const { execSync } = require('child_process');
const content = execSync('git show HEAD^:"apps/web/src/pages/charts/ActivityHeatmap.tsx"').toString();
fs.writeFileSync('d:/Sahay/sahay-platform/heatmap_old.txt', content);
