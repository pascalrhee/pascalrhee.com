import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Astro inlines small module scripts. Authorize their exact built bytes, never
// unsafe-inline/eval. Regenerated with every build so edits cannot stale the CSP.
export async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await htmlFiles(path)));
    else if (entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}
const hashes = new Set();
for (const path of await htmlFiles('dist')) {
  const html = await readFile(path, 'utf8');
  for (const [, attributes, script] of html.matchAll(
    /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
  )) {
    if (!/\bsrc=/.test(attributes) && script.trim()) {
      hashes.add(
        `'sha256-${createHash('sha256').update(script).digest('base64')}'`,
      );
    }
  }
}
const policy = [
  "default-src 'self'",
  `script-src 'self' ${[...hashes].join(' ')}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
].join('; ');
await writeFile(
  'dist/_headers',
  `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: ${policy}

/_astro/*
  Cache-Control: public, max-age=31536000, immutable
`,
);
console.log(
  `Security headers generated with ${hashes.size} inline-script hashes.`,
);
