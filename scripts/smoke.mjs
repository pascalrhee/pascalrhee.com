// End-to-end smoke test for pascalrhee.com.
//
// Builds the site, boots `wrangler dev --local`, drives a request workload that
// touches every route and every branch of the Worker, asserts on the results,
// then tears the server down.
//
// Node built-ins only — no new dependencies. Local KV only: `--local` disables
// remote bindings, so this never touches production or the free-tier quota.
//
//   node scripts/smoke.mjs [--no-build] [--port N] [--keep-alive]
//
// Distilled from reports/harness-worker-coverage.mjs, which established these
// behaviours against a live workerd during the dead-code analysis.

import { spawn, spawnSync } from 'node:child_process';
import { createServer, connect } from 'node:net';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

if (flag('--browser')) {
  console.error(
    'Browser assertions are not implemented (Q1 option B was deferred).\n' +
    'The CDP prototype lives in reports/harness-css-coverage.mjs.',
  );
  process.exit(2);
}

// Real Chrome UA — must pass isBotUA(). Note that a HeadlessChrome UA would NOT,
// which is why the browser-driven analysis was itself bot-filtered.
const UA_BROWSER =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const UA_BOT = 'curl/8.4.0';

// ─── assertion plumbing ──────────────────────────────────────────────────────

const results = [];
let failures = 0;

function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  if (!ok) failures++;
  results.push({ ok, name, detail });
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? `  — ${detail}` : ''}`);
}

// ─── port selection ──────────────────────────────────────────────────────────
// Default away from 8787: that is the documented `wrangler dev` port, and this
// working tree is shared by parallel sessions. Colliding with a human's dev
// server would be a confusing failure.

function freePort(preferred) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once('error', () => resolve(freePort(0)));
    srv.listen(preferred, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

// ─── raw HTTP, for the one case fetch() cannot express ───────────────────────
// Node's fetch always sends a User-Agent. The Worker's fail-closed branch
// (src/worker/index.ts:38, `if (!ua) return true`) is only reachable by a request
// with no UA header at all, so it needs a hand-written request.

function rawRequest(port, lines) {
  return new Promise((resolve, reject) => {
    const sock = connect(port, '127.0.0.1', () => sock.write(lines.join('\r\n')));
    let buf = '';
    sock.setTimeout(10_000, () => { sock.destroy(); reject(new Error('raw request timeout')); });
    sock.on('data', (d) => { buf += d.toString(); });
    sock.on('error', reject);
    sock.on('close', () => {
      const status = Number(buf.split(' ')[1]);
      resolve({ status, raw: buf });
    });
  });
}

// ─── boot ────────────────────────────────────────────────────────────────────

const PORT = Number(opt('--port', 0)) || (await freePort(8788));
const BASE = `http://127.0.0.1:${PORT}`;
let child = null;

function shutdown() {
  if (!child || child.killed) return;
  try { process.kill(-child.pid, 'SIGTERM'); } catch { /* group already gone */ }
  child = null;
}
process.on('exit', shutdown);
process.on('SIGINT', () => { shutdown(); process.exit(130); });

async function waitForReady(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/`, { headers: { 'User-Agent': UA_BROWSER } });
      if (r.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

const get = (path, ua = UA_BROWSER) =>
  fetch(`${BASE}${path}`, { headers: { 'User-Agent': ua }, redirect: 'manual' });
const post = (path, ua = UA_BROWSER) =>
  fetch(`${BASE}${path}`, { method: 'POST', headers: { 'User-Agent': ua }, redirect: 'manual' });

const views = async () => (await (await get('/api/views')).json()).count;

// ─── run ─────────────────────────────────────────────────────────────────────

if (!flag('--no-build')) {
  console.log('\n── build ──');
  const b = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });
  if (b.status !== 0) { console.error('build failed — aborting smoke test'); process.exit(1); }
}

console.log(`\n── boot: wrangler dev --local on :${PORT} ──`);
child = spawn(
  './node_modules/.bin/wrangler',
  ['dev', '--local', '--port', String(PORT), '--log-level', 'warn',
   '--show-interactive-dev-session', 'false'],
  { detached: true, stdio: ['ignore', 'pipe', 'pipe'] },
);
let serverLog = '';
child.stdout.on('data', (d) => { serverLog += d.toString(); });
child.stderr.on('data', (d) => { serverLog += d.toString(); });

if (!(await waitForReady())) {
  console.error('wrangler dev never became ready. Server output:\n' + serverLog);
  shutdown();
  process.exit(1);
}
console.log('   ready\n');

const PAGES = [
  ['/',                    'data-attendance',                  'landing + counter mount'],
  ['/about/',              'Architecture of pascalrhee.com',   'about + SVG diagram title'],
  ['/writing/',            'from the record.',                 'writing index'],
  ['/writing/first-look/', 'A first look at the new place',    'post via ProseLayout'],
  ['/projects/',           'workshop.',                        'projects index'],
];

const sizes = {};

try {
  console.log('── static routes ──');
  for (const [path, marker, label] of PAGES) {
    const r = await get(path);
    const body = await r.text();
    sizes[path] = body.length;
    check(`GET ${path} → 200 (${label})`, r.status === 200, `status ${r.status}`);
    check(`GET ${path} contains "${marker}"`, body.includes(marker));
  }
  const missing = await get('/definitely-not-a-page/');
  check('GET /definitely-not-a-page/ → 404 (assets fallthrough)', missing.status === 404,
    `status ${missing.status}`);

  console.log('\n── /api/views contract ──');
  const vr = await get('/api/views');
  const vj = await vr.json();
  check('GET /api/views → 200', vr.status === 200, `status ${vr.status}`);
  check('Cache-Control is public, max-age=60',
    vr.headers.get('cache-control') === 'public, max-age=60',
    `got "${vr.headers.get('cache-control')}"`);
  check('body has numeric count', typeof vj.count === 'number', `count=${vj.count}`);
  check('body has boolean visible', typeof vj.visible === 'boolean', `visible=${vj.visible}`);
  check('visible is true while PUBLIC_THRESHOLD is 0', vj.visible === true);

  console.log('\n── routing semantics ──');
  const wrongMethod = await get('/api/track');
  check('GET /api/track → 405 (method check is in the handler)', wrongMethod.status === 405,
    `status ${wrongMethod.status}`);
  const slashed = await get('/api/track/');
  check('GET /api/track/ → 404 (exact-match router, falls through to assets)',
    slashed.status === 404, `status ${slashed.status}`);

  console.log('\n── counter round-trip (delta-based, safe to re-run) ──');
  const before = await views();
  const tracked = await post('/api/track');
  check('POST /api/track → 204', tracked.status === 204, `status ${tracked.status}`);
  const afterReal = await views();
  check('real browser UA increments by exactly 1', afterReal === before + 1,
    `${before} → ${afterReal}`);

  const botted = await post('/api/track', UA_BOT);
  check(`POST /api/track (${UA_BOT}) → 204`, botted.status === 204, `status ${botted.status}`);
  const afterBot = await views();
  check('bot UA does NOT increment', afterBot === afterReal, `${afterReal} → ${afterBot}`);

  const noUa = await rawRequest(PORT, [
    'POST /api/track HTTP/1.1', `Host: 127.0.0.1:${PORT}`,
    'Content-Length: 0', 'Connection: close', '', '',
  ]);
  check('POST /api/track with NO User-Agent → 204 (fail-closed branch)',
    noUa.status === 204, `status ${noUa.status}`);
  const afterNoUa = await views();
  check('missing UA does NOT increment (src/worker/index.ts:38)',
    afterNoUa === afterBot, `${afterBot} → ${afterNoUa}`);
} catch (err) {
  check('harness completed without throwing', false, err.message);
}

shutdown();

// ─── report ──────────────────────────────────────────────────────────────────

const passed = results.length - failures;
console.log(`\n── baseline snapshot ──`);
console.log('  rendered bytes per route (informational, not asserted):');
for (const [path, n] of Object.entries(sizes)) {
  console.log(`    ${path.padEnd(24)} ${n}`);
}
console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'}  ${passed}/${results.length} assertions`);
if (failures > 0) {
  console.log('\nfailed:');
  for (const r of results.filter((r) => !r.ok)) console.log(`  ✗ ${r.name}  ${r.detail}`);
}
process.exit(failures === 0 ? 0 : 1);
