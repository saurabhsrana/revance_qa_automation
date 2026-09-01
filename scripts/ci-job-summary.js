/**
 * Writes a GitHub Actions Job Summary with pass/fail, failure details,
 * inline screenshots, and links to artifacts / Allure on GitHub Pages.
 *
 * Env:
 *   ALLURE_TMS_URL — base URL ending with /issues/
 *   BROWSER — matrix browser label (optional)
 *   GITHUB_REPOSITORY, GITHUB_RUN_ID — set by Actions
 *   GITHUB_STEP_SUMMARY — set automatically by Actions
 */
const fs = require('node:fs');
const path = require('node:path');

const jsonPath = path.resolve('reports/cucumber.json');
const screenshotsDir = path.resolve('reports/screenshots');
const tracesDir = path.resolve('reports/traces');
const allureReportDir = path.resolve('reports/allure-report');
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

function failedSteps(el) {
  return (el.steps || [])
    .filter((s) => s.result?.status === 'failed')
    .map((s) => ({
      name: s.name || 'unknown step',
      error: String(s.result?.error_message || s.result?.message || 'No error message').trim(),
    }));
}

function truncate(text, max = 600) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function listPngFiles(dir, limit = 5) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .slice(0, limit);
}

function listZipFiles(dir, limit = 5) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.zip'))
    .slice(0, limit);
}

function embedScreenshot(fileName) {
  const filePath = path.join(screenshotsDir, fileName);
  if (!fs.existsSync(filePath)) return '';
  const base64 = fs.readFileSync(filePath).toString('base64');
  return [
    `<details><summary>${fileName}</summary>`,
    `<img src="data:image/png;base64,${base64}" alt="${fileName}" width="900"/>`,
    '</details>',
    '',
  ].join('\n');
}

function artifactLinks() {
  const repo = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  const browser = process.env.BROWSER || 'chromium';
  if (!repo || !runId) return [];

  const runUrl = `https://github.com/${repo}/actions/runs/${runId}`;
  const artifactName = `cucumber-${browser}-artifacts`;
  return [
    '## Reports & artifacts',
    '',
    `- [Download \`${artifactName}\` (Allure HTML, traces, screenshots)](${runUrl}#artifacts)`,
    `- Open \`reports/allure-report/index.html\` from the zip for the full Allure UI (pass/fail, attachments, trace zips).`,
    `- Playwright traces: extract \`reports/traces/*.zip\` and run \`npx playwright show-trace <file.zip>\`.`,
    '',
    'After the **publish-allure** job completes, the latest Allure report is also published to **GitHub Pages** (see that job Summary for the URL).',
    '',
  ];
}

function buildMarkdown(features) {
  const lines = [
    '## Loyalty Cucumber results',
    '',
  ];

  const browser = process.env.BROWSER;
  if (browser) {
    lines.push(`**Browser:** \`${browser}\``);
    lines.push('');
  }

  lines.push('| Status | Scenario | Test case |', '| --- | --- | --- |');

  let passed = 0;
  let failed = 0;
  let other = 0;
  const failureDetails = [];

  for (const feature of features) {
    for (const el of feature.elements || []) {
      if (el.type && el.type !== 'scenario' && el.type !== 'scenario_outline') continue;
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

      if (status === 'failed') {
        for (const step of failedSteps(el)) {
          failureDetails.push({
            scenario: el.name || feature.name || 'unnamed',
            step: step.name,
            error: step.error,
          });
        }
      }
    }
  }

  lines.push('');
  lines.push(`**Totals:** ${passed} passed, ${failed} failed, ${other} other`);
  lines.push('');

  if (failureDetails.length > 0) {
    lines.push('## Failure details');
    lines.push('');
    for (const f of failureDetails) {
      lines.push(`### ${f.scenario}`);
      lines.push('');
      lines.push(`**Failed step:** \`${f.step}\``);
      lines.push('');
      lines.push('```');
      lines.push(truncate(f.error));
      lines.push('```');
      lines.push('');
    }
  }

  const screenshots = listPngFiles(screenshotsDir);
  if (screenshots.length > 0) {
    lines.push('## Failure screenshots');
    lines.push('');
    for (const shot of screenshots) {
      lines.push(embedScreenshot(shot));
    }
  }

  const traces = listZipFiles(tracesDir);
  if (traces.length > 0) {
    lines.push('## Playwright traces (in artifact zip)');
    lines.push('');
    for (const trace of traces) {
      lines.push(`- \`reports/traces/${trace}\` — open locally with \`npx playwright show-trace\``);
    }
    lines.push('');
  }

  if (fs.existsSync(path.join(allureReportDir, 'index.html'))) {
    lines.push('## Allure HTML report');
    lines.push('');
    lines.push(
      'Included in the job artifact at `reports/allure-report/index.html` (single-file bundle — open offline after download).'
    );
    lines.push('');
  }

  lines.push(...artifactLinks());

  lines.push(
    `Allure TMS base: \`${tmsBase}\` — tag scenarios with \`@TC-<github-issue-number>\`.`
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
