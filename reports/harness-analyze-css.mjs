// Difference used CSS rule ranges against the full stylesheet text to find
// rules that never matched anything across a real 5-page browse.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const raw = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 10);

// Enumerate top-level style rules (selector + block) with their byte offsets.
// Handles nesting inside @media / @supports by recursing one level.
function enumerateRules(text) {
  const rules = [];
  let i = 0, depth = 0, selStart = 0, atRuleStack = [];
  while (i < text.length) {
    const c = text[i];
    if (c === '/' && text[i + 1] === '*') { const e = text.indexOf('*/', i + 2); i = e === -1 ? text.length : e + 2; continue; }
    if (c === '{') {
      const prelude = text.slice(selStart, i).trim();
      if (prelude.startsWith('@')) {
        atRuleStack.push({ prelude, depth });
        depth++; i++; selStart = i; continue;
      }
      // find matching close brace
      let d = 1, j = i + 1;
      while (j < text.length && d > 0) {
        if (text[j] === '/' && text[j + 1] === '*') { const e = text.indexOf('*/', j + 2); j = e === -1 ? text.length : e + 2; continue; }
        if (text[j] === '{') d++;
        else if (text[j] === '}') d--;
        j++;
      }
      rules.push({
        selector: prelude.replace(/\s+/g, ' '),
        start: selStart,
        end: j,
        inAtRule: atRuleStack.length ? atRuleStack[atRuleStack.length - 1].prelude : null,
      });
      i = j; selStart = i; continue;
    }
    if (c === '}') {
      depth--;
      if (atRuleStack.length && atRuleStack[atRuleStack.length - 1].depth === depth) atRuleStack.pop();
      i++; selStart = i; continue;
    }
    i++;
  }
  return rules;
}

// key each stylesheet by identity that survives per-navigation styleSheetIds
const sheetsByKey = new Map();
for (const page of raw.perPage) {
  const idToKey = new Map();
  for (const [sid, s] of Object.entries(page.sheetTexts)) {
    const key = s.sourceURL && !s.isInline ? s.sourceURL : `inline:${hash(s.text)}`;
    idToKey.set(sid, key);
    if (!sheetsByKey.has(key)) {
      sheetsByKey.set(key, { key, sourceURL: s.sourceURL, isInline: s.isInline, text: s.text, usedOffsets: new Set(), pages: new Set() });
    }
    sheetsByKey.get(key).pages.add(page.path);
  }
  for (const u of page.ruleUsage) {
    const key = idToKey.get(u.styleSheetId);
    if (!key || !u.used) continue;
    sheetsByKey.get(key).usedOffsets.add(`${u.startOffset}:${u.endOffset}`);
  }
}

const report = [];
for (const s of sheetsByKey.values()) {
  const rules = enumerateRules(s.text);
  const usedStarts = new Set([...s.usedOffsets].map((o) => Number(o.split(':')[0])));
  const usedRanges = [...s.usedOffsets].map((o) => o.split(':').map(Number));
  const annotated = rules.map((r) => {
    const used = usedStarts.has(r.start) || usedRanges.some(([a, b]) => a <= r.start && r.end <= b + 1);
    return { ...r, used, line: s.text.slice(0, r.start).split('\n').length };
  });
  report.push({
    key: s.key,
    sourceURL: s.sourceURL,
    isInline: s.isInline,
    bytes: s.text.length,
    seenOnPages: [...s.pages],
    totalRules: annotated.length,
    usedRules: annotated.filter((r) => r.used).length,
    unusedRules: annotated.filter((r) => !r.used).map((r) => ({ selector: r.selector, inAtRule: r.inAtRule, line: r.line, startOffset: r.start })),
  });
}

writeFileSync(process.argv[3], JSON.stringify(report, null, 2));

for (const r of report) {
  console.log(`\n=== ${r.sourceURL || r.key} ${r.isInline ? '(inline)' : ''}`);
  console.log(`    ${r.bytes} bytes | rules ${r.usedRules}/${r.totalRules} used | pages: ${r.seenOnPages.join(' ')}`);
  if (r.unusedRules.length) {
    console.log('    NEVER MATCHED:');
    for (const u of r.unusedRules) console.log(`      L${String(u.line).padStart(4)}  ${u.inAtRule ? u.inAtRule + ' { ' : ''}${u.selector}`);
  }
}
