// Real CSS rule usage + JS coverage for the shipped pages, collected from
// headless Chrome via CDP while it loads the site from `wrangler dev`.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require_ = createRequire('/Users/pascalrhee/claude/website/');
const WebSocketImpl = require_('ws');

const BASE = 'http://127.0.0.1:8787';
const PAGES = ['/', '/about/', '/writing/', '/writing/first-look/', '/projects/'];

const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const pageTarget = targets.find((t) => t.type === 'page');
if (!pageTarget) throw new Error('no page target');

const ws = new WebSocketImpl(pageTarget.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let id = 0; const pending = new Map();
const sheets = new Map();   // styleSheetId -> header
const send = (method, params = {}) => new Promise((res, rej) => {
  const msgId = ++id; pending.set(msgId, { res, rej });
  ws.send(JSON.stringify({ id: msgId, method, params }));
});
let loadFired = false;
ws.on('message', (d) => {
  const m = JSON.parse(d.toString());
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id); pending.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
    return;
  }
  if (m.method === 'CSS.styleSheetAdded') sheets.set(m.params.header.styleSheetId, m.params.header);
  if (m.method === 'Page.loadEventFired') loadFired = true;
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await new Promise((r) => ws.on('open', r));

await send('Page.enable');
await send('DOM.enable');
await send('CSS.enable');
await send('Runtime.enable');
await send('Profiler.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });

const perPage = [];
const jsCoverageAll = [];

for (const path of PAGES) {
  sheets.clear();
  loadFired = false;
  await send('CSS.startRuleUsageTracking');
  await send('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
  await send('Page.navigate', { url: BASE + path });
  for (let i = 0; i < 100 && !loadFired; i++) await sleep(100);
  await sleep(1800); // let the counter's fetches resolve and paint

  const { ruleUsage } = await send('CSS.stopRuleUsageTracking');
  const jsCov = await send('Profiler.takePreciseCoverage');
  await send('Profiler.stopPreciseCoverage');

  // pull text for every sheet we saw
  const sheetTexts = {};
  for (const [sid, header] of sheets) {
    try {
      const { text } = await send('CSS.getStyleSheetText', { styleSheetId: sid });
      sheetTexts[sid] = { origin: header.origin, sourceURL: header.sourceURL, isInline: header.isInline, length: header.length, text };
    } catch { /* some sheets are not retrievable */ }
  }

  perPage.push({ path, ruleUsage, sheetTexts });
  jsCoverageAll.push({
    path,
    scripts: jsCov.result
      .filter((s) => s.url.includes('127.0.0.1') || s.url === '')
      .map((s) => ({ url: s.url, functions: s.functions })),
  });
  console.log(`${path.padEnd(24)} sheets=${Object.keys(sheetTexts).length} rules_tracked=${ruleUsage.length} used=${ruleUsage.filter((r) => r.used).length}`);
}

writeFileSync(process.argv[2], JSON.stringify({ perPage, jsCoverage: jsCoverageAll }, null, 2));
ws.close();
