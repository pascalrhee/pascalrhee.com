import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
const files = walk('dist');
const pages = files.filter((path) => path.endsWith('.html'));
const expected = [
  'index.html',
  'about/index.html',
  'projects/index.html',
  'writing/index.html',
  'writing/first-look/index.html',
];
for (const page of expected)
  assert.ok(existsSync(join('dist', page)), `Missing route: ${page}`);
const headers = readFileSync('dist/_headers', 'utf8');
assert.ok(headers.includes("frame-ancestors 'none'"));
assert.ok(headers.includes('X-Content-Type-Options: nosniff'));
assert.ok(!/script-src[^;]*unsafe-inline/.test(headers));
const base = 'https://pascalrhee.com';
let largest = 0;
for (const path of pages) {
  const html = readFileSync(path, 'utf8');
  const route = '/' + path.replace(/^dist\//, '').replace(/index\.html$/, '');
  assert.match(html, /<html[^>]+lang="en"/);
  assert.equal(
    (html.match(/<h1(?:\s|>)/g) || []).length,
    1,
    `${route}: exactly one h1`,
  );
  assert.match(html, /<main[^>]+id="main"/);
  assert.match(html, /href="#main"/);
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.match(html, /name="description" content="[^"<>]+"/);
  assert.ok(
    html.includes(`rel="canonical" href="${base}${route}"`),
    `${route}: canonical`,
  );
  assert.ok(
    !/<(?:astro-island|iframe)\b/i.test(html),
    `${route}: unexpected client framework/embed`,
  );
  assert.ok(
    !/\son\w+=/i.test(html),
    `${route}: inline event handler violates CSP`,
  );
  for (const [, attrs, script] of html.matchAll(
    /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
  )) {
    if (!/\bsrc=/.test(attrs) && script.trim()) {
      const hash = createHash('sha256').update(script).digest('base64');
      assert.ok(
        headers.includes(`'sha256-${hash}'`),
        `${route}: missing script CSP hash`,
      );
    }
  }
  for (const [, raw] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const url = new URL(raw.replaceAll('&amp;', '&'), base + route);
    assert.ok(
      ['https:', 'mailto:', 'tel:'].includes(url.protocol),
      `${route}: unsafe URL protocol`,
    );
    if (url.origin !== base || url.pathname.startsWith('/api/')) continue;
    const target = resolve('dist', '.' + decodeURIComponent(url.pathname));
    assert.ok(target.startsWith(resolve('dist')), 'Path escapes dist');
    const file =
      existsSync(target) && statSync(target).isFile()
        ? target
        : join(target, 'index.html');
    assert.ok(existsSync(file), `${route}: broken local link ${raw}`);
    if (url.hash && file.endsWith('.html')) {
      assert.ok(
        readFileSync(file, 'utf8').includes(
          `id="${decodeURIComponent(url.hash.slice(1))}"`,
        ),
        `${route}: missing fragment ${raw}`,
      );
    }
  }
  const size = gzipSync(html).byteLength;
  largest = Math.max(largest, size);
  assert.ok(
    size <= 30 * 1024,
    `${route}: compressed HTML exceeds 30 KiB budget`,
  );
}
const jsBytes = files
  .filter((path) => path.endsWith('.js'))
  .reduce((sum, path) => sum + statSync(path).size, 0);
assert.ok(jsBytes <= 50 * 1024, 'External JS exceeds 50 KiB budget');
console.log(
  `PASS: ${pages.length} routes, semantic/SEO checks, local links/fragments, CSP hashes. Largest HTML gzip ${(largest / 1024).toFixed(1)} KiB; external JS ${jsBytes} bytes.`,
);
