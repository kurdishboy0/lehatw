const { spawnSync } = require('node:child_process');
const { mkdirSync, readdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const results = path.join(root, 'test-results');
mkdirSync(results, { recursive: true });
const coverage = process.argv.includes('--coverage');
const summaries = [];
for (const project of ['server', 'client']) {
  const cwd = path.join(root, project);
  const tests = readdirSync(path.join(cwd, 'tests'), { recursive: true }).filter(file => file.endsWith('.test.js')).sort().map(file => path.join('tests', file));
  const flags = ['--test', '--test-reporter=tap'];
  if (coverage) flags.push('--experimental-test-coverage', '--test-coverage-exclude=**/tests/**', '--test-coverage-exclude=**/node_modules/**');
  console.log(`\nRunning ${project} tests (${tests.length} files)\n`);
  const run = spawnSync(process.execPath, [...flags, ...tests], { cwd, encoding: 'utf8', timeout: 180000, maxBuffer: 30 * 1024 * 1024 });
  const output = (run.stdout || '') + (run.stderr || '');
  process.stdout.write(output);
  writeFileSync(path.join(results, `${project}.tap`), output);
  const metric = name => Number([...output.matchAll(new RegExp(`^# ${name} (\\d+)$`, 'gm'))].at(-1)?.[1] || 0);
  summaries.push({ project, files: tests.length, tests: metric('tests'), pass: metric('pass'), fail: metric('fail'),
    skipped: metric('skipped'), todo: metric('todo'), exitCode: run.status, error: run.error?.message || null });
}
writeFileSync(path.join(results, 'summary.json'), JSON.stringify({ generatedAt: new Date().toISOString(), coverage, projects: summaries }, null, 2) + '\n');
console.log('\nSummary:', JSON.stringify(summaries));
process.exitCode = summaries.some(s => s.exitCode !== 0) ? 1 : 0;
