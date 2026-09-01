/**
 * Remove Allure raw results and generated HTML so the next run is fresh.
 * Old JSON files are NOT removed by Cucumber or allure:generate — they accumulate
 * and make allure:open show deleted features (Example page, API enrollment, etc.).
 */
const fs = require('node:fs');
const path = require('node:path');

const dirs = [
  path.resolve('reports/allure-results'),
  path.resolve('reports/allure-report'),
];

for (const dir of dirs) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`Removed ${dir}`);
  }
}

fs.mkdirSync(path.resolve('reports/allure-results'), { recursive: true });
console.log('Allure folders reset. Run tests, then npm run allure:generate');
