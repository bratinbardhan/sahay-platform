const fs = require('fs');
const path = require('path');

// 1. demoSeed.ts - Natural Curve Variance
const demoSeedPath = path.join(__dirname, 'apps/web/src/lib/demoSeed.ts');
let demoSeedContent = fs.readFileSync(demoSeedPath, 'utf8');
demoSeedContent = demoSeedContent.replace(
    /const errorPattern = \[.*?\];\s*const guided = errorPattern\[.*?\] \?\? 0;/s,
    `const variance = 0.03 + rand() * 0.14; // 3% to 17% error\n    const guided = Math.max(1, Math.round(presented * variance));`
);
fs.writeFileSync(demoSeedPath, demoSeedContent);

// 2. DdaDifficultyCurve.tsx Tooltip & name props
const ddaPath = path.join(__dirname, 'apps/web/src/pages/charts/DdaDifficultyCurve.tsx');
let ddaContent = fs.readFileSync(ddaPath, 'utf8');
// For robustness, replacing the formatter for DDA completely to match the request
ddaContent = ddaContent.replace(/formatter=\{\(value: unknown, name: unknown\) => \{.*?\n\s*\}\}/s, `formatter={(value: unknown, name: unknown) => {
            const numeric = typeof value === 'number' ? value : Number(value ?? 0);
            const key = String(name);
            if (key === 'Reaction time' || key === 'latency') return [\`\${Math.round(numeric)} ms\`, 'Reaction time'];
            if (key === 'Difficulty' || key === 'difficulty') return [numeric.toFixed(2), 'Difficulty'];
            return [\`\${numeric}\`, 'Recommended'];
          }}`);
fs.writeFileSync(ddaPath, ddaContent);

// 3. XAxis/YAxis ticks fontWeight 700 or font-bold.
const chartsDir = path.join(__dirname, 'apps/web/src/pages/charts');
const files = fs.readdirSync(chartsDir).filter(f => f.endsWith('.tsx'));
for (const file of files) {
    const filePath = path.join(chartsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/tick=\{\{\s*fontWeight:\s*(?:700|'bold'),\s*fontSize:\s*11\s*\}\}/g, `tick={{ fontWeight: 700, fontSize: 11 }}`);
    // Tooltip itemStyle
    content = content.replace(/itemStyle=\{\{\s*fontWeight:\s*700(?:,\s*fontSize:\s*'0\.8125rem')?\s*\}\}/g, `itemStyle={{ fontWeight: 700 }}`);
    fs.writeFileSync(filePath, content);
}
// Also in AnalyticsChart.tsx
const analyticsPath = path.join(__dirname, 'apps/web/src/pages/AnalyticsChart.tsx');
let analyticsContent = fs.readFileSync(analyticsPath, 'utf8');
analyticsContent = analyticsContent.replace(/tick=\{\{\s*fontWeight:\s*(?:700|'bold'),\s*fontSize:\s*11\s*\}\}/g, `tick={{ fontWeight: 700, fontSize: 11 }}`);
analyticsContent = analyticsContent.replace(/itemStyle=\{\{\s*fontWeight:\s*700(?:,\s*fontSize:\s*'0\.8125rem')?\s*\}\}/g, `itemStyle={{ fontWeight: 700 }}`);
fs.writeFileSync(analyticsPath, analyticsContent);

console.log("Done");
