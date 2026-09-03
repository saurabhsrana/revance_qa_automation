/**
 * Generates docs/traceability-matrix.md from Playwright specs (TC-* / allure.tms)
 * and the latest reports/allure-results (when present).
 *
 * Chain: TC-N <- test() <- expect() <- Allure status
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const TESTS_DIR = path.join(ROOT, "tests");
const ALLURE_DIR = path.join(ROOT, "reports", "allure-results");
const OUT_FILE = path.join(ROOT, "docs", "traceability-matrix.md");

/**
 * @param {string} dir
 * @returns {string[]}
 */
function listSpecFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  /** @type {string[]} */
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSpecFiles(full));
    else if (/\.spec\.ts$/i.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * Parse TC ids and test titles from a Playwright spec.
 * @param {string} filePath
 */
function parseSpec(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const relative = path.relative(ROOT, filePath).replace(/\\/g, "/");
  /** @type {{ tcId: string, scenario: string, featureFile: string }[]} */
  const rows = [];

  const tmsIds = [
    ...text.matchAll(/allure\.tms\(\s*["'](\d+)["']/g),
  ].map((m) => m[1]);
  const tagIds = [
    ...text.matchAll(/["']TC-(\d+)["']/gi),
  ].map((m) => m[1]);
  const ids = [...new Set([...tmsIds, ...tagIds])];

  const titleMatch =
    text.match(/test\(\s*["'`]([^"'`]+)["'`]/) ||
    text.match(/test\.describe\(\s*["'`]([^"'`]+)["'`]/);
  const scenario = titleMatch ? titleMatch[1].trim() : path.basename(filePath);

  for (const tcId of ids) {
    rows.push({ tcId, scenario, featureFile: relative });
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
    if (!name.endsWith("-result.json")) continue;
    try {
      const raw = JSON.parse(
        fs.readFileSync(path.join(ALLURE_DIR, name), "utf8"),
      );
      const status = raw.status || "unknown";
      const labels = raw.labels || [];
      const fromLabels = labels
        .filter(
          (l) =>
            l.name === "tag" && /^@?TC-\d+$/i.test(String(l.value || "")),
        )
        .map((l) => String(l.value).replace(/^@/i, "").replace(/^TC-/i, ""));

      const ids = [...new Set(fromLabels)];
      for (const id of ids) {
        const prev = map.get(id);
        if (prev === "failed" || prev === "broken") continue;
        map.set(id, status);
      }
    } catch {
      // skip corrupt files
    }
  }
  return map;
}

function main() {
  const specRows = listSpecFiles(TESTS_DIR).flatMap(parseSpec);
  const statuses = loadAllureStatuses();
  const generatedAt = new Date().toISOString();

  const lines = [
    "# Traceability matrix",
    "",
    `_Generated ${generatedAt} — do not hand-edit; run \`npm run traceability:generate\`._`,
    "",
    "Chain: `TC-*` / `allure.tms` -> `test.step` / `expect()` -> Allure status",
    "",
    "| TC-ID | Spec file | Test | Last CI / Allure status |",
    "| --- | --- | --- | --- |",
  ];

  const seen = new Set();
  for (const row of specRows.sort((a, b) => Number(a.tcId) - Number(b.tcId))) {
    const key = `${row.tcId}:${row.featureFile}:${row.scenario}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const status = statuses.get(row.tcId) || "_not run_";
    lines.push(
      `| TC-${row.tcId} | \`${row.featureFile}\` | ${row.scenario} | ${status} |`,
    );
  }

  if (specRows.length === 0) {
    lines.push(
      "| _none_ | — | — | Tag tests with `TC-<n>` / `allure.tms` |",
    );
  }

  lines.push("");
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, lines.join("\n"), "utf8");
  console.log(`Wrote ${OUT_FILE} (${specRows.length} row(s))`);
}

main();
