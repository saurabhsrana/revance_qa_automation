/**
 * Writes a GitHub Actions Job Summary linking Cucumber scenarios to GitHub Issues via @TC-* tags.
 * Reads reports/cucumber.json produced by cucumber-js.
 *
 * Env:
 *   ALLURE_TMS_URL — base URL ending with /issues/ (default: repo issues URL)
 *   GITHUB_STEP_SUMMARY — set automatically by Actions
 */
const fs = require('node:fs');
const path = require('node:path');

const jsonPath = path.resolve('reports/cucumber.json');
const tmsBase =
  process.env.ALLURE_TMS_URL ||
  'https://github.com/revance/PlaywrightAutomationAgent/issues/';

function extractTcIds(tags) {
  const ids = [];
  for (const tag of tags || []) {
    const name = typeof tag === 'string' ? tag : tag.name;
    const m = String(name || '').match(/@TC-(\d+)/i);
    if (m) ids.push(m[1]);
  }
  return ids;
}

function statusEmoji(status) {
  if (status === 'passed') return 'pass';
  if (status === 'failed') return 'fail';
  if (status === 'skipped' || status === 'pending') return 'skip';
  return status || 'unknown';
}

function scenarioStatus(elements) {
  const steps = (elements.steps || []).filter((s) => s.result);
  if (steps.some((s) => s.result.status === 'failed')) return 'failed';
  if (steps.every((s) => s.result.status === 'passed' || s.result.status === 'skipped')) {
    if (steps.some((s) => s.result.status === 'passed')) return 'passed';
  }
  if (steps.every((s) => s.result.status === 'skipped' || s.result.status === 'pending')) {
    return 'skipped';
  }
  return steps[steps.length - 1]?.result?.status || 'unknown';
}

function buildMarkdown(features) {
  const lines = [
    '## Loyalty Cucumber results',
    '',
    '| Status | Scenario | Test case |',
    '| --- | --- | --- |',
  ];

  let passed = 0;
  let failed = 0;
  let other = 0;

  for (const feature of features) {
    for (const el of feature.elements || []) {
      if (el.type && el.type !== 'scenario' && el.type !== 'scenario_outline') continue;
      // Cucumber JSON uses "scenario" for outline examples too in many versions
      const status = scenarioStatus(el);
      if (status === 'passed') passed += 1;
      else if (status === 'failed') failed += 1;
      else other += 1;

      const tcIds = extractTcIds(el.tags);
      const tcLinks =
        tcIds.length > 0
          ? tcIds.map((id) => `[TC-${id}](${tmsBase}${id})`).join(', ')
          : '_none_';

      lines.push(
        `| ${statusEmoji(status)} | ${el.name || feature.name || 'unnamed'} | ${tcLinks} |`
      );
    }
  }

  lines.push('');
  lines.push(`**Totals:** ${passed} passed, ${failed} failed, ${other} other`);
  lines.push('');
  lines.push(
    `Allure TMS base: \`${tmsBase}\` — create matching GitHub Issues (#1, #2, …) or set \`ALLURE_TMS_URL\`.`
  );
  return lines.join('\n');
}

function main() {
  if (!fs.existsSync(jsonPath)) {
    const msg = `No ${jsonPath} — skip job summary.`;
    console.warn(msg);
    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Loyalty Cucumber results\n\n${msg}\n`);
    }
    return;
  }

  const features = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const md = buildMarkdown(Array.isArray(features) ? features : []);
  console.log(md);

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);
  }
}

main();
