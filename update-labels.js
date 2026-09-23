const fs = require('fs');
const path = require('path');

const chartsDir = path.join(__dirname, 'apps/web/src/pages/charts');
const files = fs.readdirSync(chartsDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
    const filePath = path.join(chartsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Legend
    content = content.replace(
        /<Legend formatter=\{\(value\) => <span style=\{\{ fontWeight: 700, fontSize: '0.8125rem' \}\}>\{value\}<\/span>\} \/>/g,
        `<Legend formatter={(value) => <span className="font-bold text-xs">{value}</span>} />`
    );

    // Tooltip itemStyle
    content = content.replace(
        /itemStyle=\{\{ fontWeight: 700, fontSize: '0.8125rem' \}\}/g,
        `itemStyle={{ fontWeight: 700 }}`
    );

    fs.writeFileSync(filePath, content);
}

// Also handle AnalyticsChart.tsx
const analyticsPath = path.join(__dirname, 'apps/web/src/pages/AnalyticsChart.tsx');
let analyticsContent = fs.readFileSync(analyticsPath, 'utf8');
analyticsContent = analyticsContent.replace(
    /itemStyle=\{\{ fontWeight: 700, fontSize: '0.8125rem' \}\}/g,
    `itemStyle={{ fontWeight: 700 }}`
);
fs.writeFileSync(analyticsPath, analyticsContent);
