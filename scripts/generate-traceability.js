/**
 * Generates docs/traceability-matrix.md from feature files (@TC-* tags) and
 * the latest reports/allure-results (when present).
 *
 * Chain: GitHub Issue #N <- @TC-N <- Scenario <- Then/expect <- Allure status
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const FEATURES_DIR = path.join(ROOT, 'features');
const ALLURE_DIR = path.join(ROOT, 'reports', 'allure-results');
const OUT_FILE = path.join(ROOT, 'docs', 'traceability-matrix.md');

const tmsBase =
  process.env.ALLURE_TMS_URL ||
  'https://github.com/revance/PlaywrightAutomationAgent/issues/';

/**
 * @param {string} dir
 * @returns {string[]}
 */
function listFeatureFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.feature'))
    .map((f) => path.join(dir, f));
}

/**
 * Parse scenarios and @TC- ids from a feature file.
 * @param {string} filePath
 */
function parseFeature(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const relative = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const lines = text.split(/\r?\n/);
  /** @type {{ tcId: string, scenario: string, featureFile: string }[]} */
  const rows = [];

  let pendingTags = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('@')) {
      pendingTags = pendingTags.concat(line.split(/\s+/).filter(Boolean));
      continue;
    }
    const scenarioMatch = line.match(/^(Scenario(?: Outline)?):\s*(.+)$/i);
    if (scenarioMatch) {
      const tcTags = pendingTags
        .map((t) => t.match(/^@TC-(\d+)$/i))
        .filter(Boolean)
        .map((m) => m[1]);
      // Also inherit feature-level tags collected before first scenario? We only keep
      // tags since last blank / Feature header — reset after consuming.
      for (const tcId of tcTags.length ? tcTags : []) {
        rows.push({
          tcId,
          scenario: scenarioMatch[2].trim(),
          featureFile: relative,
        });
      }
      // If no TC on scenario, check tags on same block from feature-level earlier lines
      if (tcTags.length === 0) {
        const featureTc = [...text.matchAll(/^\s*@TC-(\d+)\s*$/gim)].map((m) => m[1]);
        // Prefer unique feature-level TCs only when scenario has none and feature has exactly one
        if (featureTc.length === 1) {
          rows.push({
            tcId: featureTc[0],
            scenario: scenarioMatch[2].trim(),
            featureFile: relative,
          });
        }
      }
      pendingTags = [];
      continue;
    }
    if (line.startsWith('Feature:')) {
      pendingTags = [];
    }
  }

  return rows;
}

/**
 * Map TC id → last status from Allure result JSON.
 * @returns {Map<string, string>}
 */
function loadAllureStatuses() {
  /** @type {Map<string, string>} */
  const map = new Map();
  if (!fs.existsSync(ALLURE_DIR)) return map;

  for (const name of fs.readdirSync(ALLURE_DIR)) {
    if (!name.endsWith('-result.json')) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(ALLURE_DIR, name), 'utf8'));
      const status = raw.status || 'unknown';
      const labels = raw.labels || [];
      const links = raw.links || [];

      const fromLabels = labels
        .filter((l) => l.name === 'tag' && /^@?TC-\d+$/i.test(String(l.value || '')))
        .map((l) => String(l.value).replace(/^@/i, '').replace(/^TC-/i, ''));

      const fromLinks = links
        .filter((l) => l.type === 'tms' || /TC-\d+/i.test(String(l.name || '')))
        .map((l) => {
          const m = String(l.name || l.url || '').match(/(\d+)/);
          return m ? m[1] : null;
        })
        .filter(Boolean);

      const ids = [...new Set([...fromLabels, ...fromLinks])];
      for (const id of ids) {
        // Prefer failed over passed if multiple results
        const prev = map.get(id);
        if (prev === 'failed' || prev === 'broken') continue;
        map.set(id, status);
      }
    } catch {
      // skip corrupt files
    }
  }
  return map;
}

function main() {
  const featureRows = listFeatureFiles(FEATURES_DIR).flatMap(parseFeature);
  const statuses = loadAllureStatuses();
  const generatedAt = new Date().toISOString();

  const lines = [
    '# Traceability matrix',
    '',
    `_Generated ${generatedAt} — do not hand-edit; run \`npm run traceability:generate\`._`,
    '',
    'Chain: **GitHub Issue** -> `@TC-*` Scenario tag -> `Then` / `expect()` -> Allure TMS link + status',
    '',
    '| TC-ID | Feature file | Scenario | GitHub Issue | Last CI / Allure status |',
    '| --- | --- | --- | --- | --- |',
  ];

  const seen = new Set();
  for (const row of featureRows.sort((a, b) => Number(a.tcId) - Number(b.tcId))) {
    const key = `${row.tcId}:${row.featureFile}:${row.scenario}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const issueUrl = `${tmsBase}${row.tcId}`;
    const status = statuses.get(row.tcId) || '_not run_';
    lines.push(
      `| TC-${row.tcId} | \`${row.featureFile}\` | ${row.scenario} | [#${row.tcId}](${issueUrl}) | ${status} |`
    );
  }

  if (featureRows.length === 0) {
    lines.push('| _none_ | — | — | — | Tag scenarios with `@TC-<n>` |');
  }

  lines.push('');
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, lines.join('\n'), 'utf8');
  console.log(`Wrote ${OUT_FILE} (${featureRows.length} row(s))`);
}

main();
