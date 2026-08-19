// Real per-line execution coverage for src/worker/index.ts.
//
// workerd does not implement Profiler.startPreciseCoverage, so instead we set a
// breakpoint on every possible breakpoint location in the worker bundle, drive a
// real end-to-end HTTP workload against `wrangler dev`, and record which
// locations actually pause. A breakpoint hit is direct proof the line executed.
// Bundle locations are mapped back to the original TypeScript via the sourcemap
// wrangler emits next to the bundle.
import { createRequire } from 'node:module';
import { writeFileSync, readFileSync } from 'node:fs';
const require_ = createRequire('/Users/pascalrhee/claude/website/');
const WebSocketImpl = require_('ws');

const BASE = 'http://127.0.0.1:8787';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// ---------- sourcemap VLQ decoding ----------
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function decodeVLQ(str) {
  const out = []; let shift = 0, value = 0;
  for (const c of str) {
    const digit = B64.indexOf(c);
    if (digit === -1) throw new Error('bad base64 ' + c);
    const cont = digit & 32;
    value += (digit & 31) << shift;
    if (cont) { shift += 5; }
    else {
      const neg = value & 1;
      value >>= 1;
      out.push(neg ? (value === 0 ? -0x80000000 : -value) : value);
      value = 0; shift = 0;
    }
  }
  return out;
}
// genLine -> [{genCol, srcIdx, srcLine, srcCol}]
function parseMappings(map) {
  const res = new Map();
  let srcIdx = 0, srcLine = 0, srcCol = 0;
  map.mappings.split(';').forEach((lineStr, genLine) => {
    let genCol = 0;
    if (!lineStr) return;
    const entries = [];
    for (const seg of lineStr.split(',')) {
      if (!seg) continue;
      const f = decodeVLQ(seg);
      genCol += f[0];
      if (f.length >= 4) {
        srcIdx += f[1]; srcLine += f[2]; srcCol += f[3];
        entries.push({ genCol, srcIdx, srcLine, srcCol });
      } else {
        entries.push({ genCol, srcIdx: null });
      }
    }
    res.set(genLine, entries);
  });
  return res;
}
function mapLoc(mappings, genLine, genCol) {
  const entries = mappings.get(genLine);
  if (!entries || !entries.length) return null;
  let best = null;
  for (const e of entries) {
    if (e.genCol <= genCol && e.srcIdx !== null) best = e;
  }
  if (!best) best = entries.find((e) => e.srcIdx !== null) || null;
  return best;
}

// ---------- CDP plumbing ----------
const ws = new WebSocketImpl('ws://127.0.0.1:9229/ws', { headers: { Origin: 'http://127.0.0.1:9229' } });
let id = 0; const pending = new Map(); const scripts = [];
const hits = new Map();   // "line:col" -> count
let paused = 0;
const send = (method, params = {}) => new Promise((res) => {
  const msgId = ++id; pending.set(msgId, res);
  ws.send(JSON.stringify({ id: msgId, method, params }));
});
ws.on('message', (d) => {
  const m = JSON.parse(d.toString());
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Debugger.scriptParsed') scripts.push(m.params);
  if (m.method === 'Debugger.paused') {
    paused++;
    const loc = m.params.callFrames?.[0]?.location;
    if (loc) {
      const k = `${loc.lineNumber}:${loc.columnNumber}`;
      hits.set(k, (hits.get(k) || 0) + 1);
    }
    ws.send(JSON.stringify({ id: ++id, method: 'Debugger.resume', params: {} }));
  }
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await new Promise((r) => ws.on('open', r));
await send('Runtime.enable');
await send('Debugger.enable');
await sleep(1500);

const worker = scripts.find((s) => s.url.includes('.wrangler/tmp/dev'));
if (!worker) throw new Error('worker script not found');
const { result: srcRes } = await send('Debugger.getScriptSource', { scriptId: worker.scriptId });
const bundleSrc = srcRes.scriptSource;
const bundleLines = bundleSrc.split('\n');

// sourcemap sits next to the bundle on disk
const mapPath = worker.url.replace('file://', '') + '.map';
const rawMap = JSON.parse(readFileSync(mapPath, 'utf8'));
const mappings = parseMappings(rawMap);
const WORKER_SRC = rawMap.sources.findIndex((s) => s.includes('worker/index.ts'));
console.log('sourcemap sources:', JSON.stringify(rawMap.sources));
console.log('worker source index:', WORKER_SRC);

// ---------- enumerate + set breakpoints ----------
const { result: possible } = await send('Debugger.getPossibleBreakpoints', {
  start: { scriptId: worker.scriptId, lineNumber: 0, columnNumber: 0 },
  end: { scriptId: worker.scriptId, lineNumber: 90, columnNumber: 0 },
  restrictToFunction: false,
});
const locs = possible.locations || [];
console.log('possible breakpoint locations in worker region:', locs.length);

const bpMeta = [];
for (const loc of locs) {
  const mapped = mapLoc(mappings, loc.lineNumber, loc.columnNumber ?? 0);
  const inWorker = mapped && mapped.srcIdx === WORKER_SRC;
  const r = await send('Debugger.setBreakpoint', { location: { scriptId: worker.scriptId, lineNumber: loc.lineNumber, columnNumber: loc.columnNumber ?? 0 } });
  bpMeta.push({
    key: `${loc.lineNumber}:${loc.columnNumber ?? 0}`,
    bundleLine: loc.lineNumber + 1,
    bundleText: (bundleLines[loc.lineNumber] || '').trim().slice(0, 120),
    srcLine: inWorker ? mapped.srcLine + 1 : null,
    inWorker: !!inWorker,
    breakpointId: r.result?.breakpointId ?? null,
    setError: r.error?.message ?? null,
  });
}
console.log('breakpoints set:', bpMeta.filter((b) => b.breakpointId).length);
console.log('  of which map into src/worker/index.ts:', bpMeta.filter((b) => b.inWorker && b.breakpointId).length);

// ---------- drive a real end-to-end workload ----------
const workload = [];
async function hit(method, path, headers = {}) {
  const t0 = Date.now();
  const res = await fetch(BASE + path, { method, headers: { 'User-Agent': UA, ...headers } });
  const body = await res.text();
  workload.push({ method, path, ua: headers['User-Agent'] ?? '(browser UA)', status: res.status, ms: Date.now() - t0, bodyPreview: body.slice(0, 90) });
  return res;
}

// static routes -> ASSETS fallthrough
for (const p of ['/', '/about/', '/writing/', '/writing/first-look/', '/projects/']) await hit('GET', p);
// a hashed asset and a 404, both still the ASSETS branch
await hit('GET', '/_astro/BaseLayout.D1QLpCuf.css');
await hit('GET', '/definitely-not-a-real-page/');
// write path as a real browser
await hit('POST', '/api/track');
await hit('POST', '/api/track');
// write path as bots -> isBotUA early return
await hit('POST', '/api/track', { 'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' });
await hit('POST', '/api/track', { 'User-Agent': 'curl/8.4.0' });
await hit('POST', '/api/track', { 'User-Agent': 'python-requests/2.31.0' });
await hit('POST', '/api/track', { 'User-Agent': 'Mozilla/5.0 (X11) HeadlessChrome/120' });
// wrong method -> 405 branch
await hit('GET', '/api/track');
await hit('PUT', '/api/track');
// read path
await hit('GET', '/api/views');
await hit('GET', '/api/views');
// method-agnostic read path (documented: handleViews never checks method)
await hit('POST', '/api/views');
// trailing slash / query variants
await hit('GET', '/api/track/');
await hit('GET', '/api/views?cachebust=1');

await sleep(800);

// ---------- report ----------
const covered = bpMeta.filter((b) => hits.has(b.key));
const inWorkerBps = bpMeta.filter((b) => b.inWorker && b.breakpointId);
const out = {
  note: 'workerd does not implement Profiler.startPreciseCoverage; coverage here is breakpoint-hit evidence from live workerd under wrangler dev (local mode).',
  bundle: worker.url,
  sourcemapSources: rawMap.sources,
  workload,
  pauseEvents: paused,
  breakpoints: bpMeta.map((b) => ({ ...b, hits: hits.get(b.key) || 0 })),
  summary: {
    possibleLocations: locs.length,
    breakpointsSet: bpMeta.filter((b) => b.breakpointId).length,
    mappedIntoWorkerSource: inWorkerBps.length,
    coveredLocations: covered.length,
    coveredInWorkerSource: inWorkerBps.filter((b) => hits.has(b.key)).length,
  },
};
writeFileSync(process.argv[2], JSON.stringify(out, null, 2));

console.log('\n--- pause events:', paused);
console.log('--- covered locations:', covered.length, '/', bpMeta.filter((b) => b.breakpointId).length);
console.log('\nUNCOVERED locations mapping into src/worker/index.ts:');
for (const b of inWorkerBps) {
  if (!hits.has(b.key)) console.log(`  src line ${String(b.srcLine).padStart(3)}  (bundle ${b.bundleLine})  ${b.bundleText}`);
}
console.log('\nCOVERED src lines:', [...new Set(inWorkerBps.filter((b) => hits.has(b.key)).map((b) => b.srcLine))].sort((a, b) => a - b).join(', '));
ws.close();
