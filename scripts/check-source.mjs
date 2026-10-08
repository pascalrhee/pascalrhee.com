import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

// Deliberately narrow, high-signal guard. Not a substitute for a full secret scan
// or GitHub secret scanning; report filenames only, never matching secret bytes.
const files = execFileSync(
  'git',
  ['ls-files', '-co', '--exclude-standard', '-z'],
  { encoding: 'utf8' },
)
  .split('\0')
  .filter(Boolean);
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
];
for (const file of new Set(files)) {
  if (!existsSync(file)) continue;
  assert.ok(
    !/(^|\/)\.env(?:\.|$)/.test(file) || file.endsWith('.example'),
    `Environment file must not be committed: ${file}`,
  );
  const text = readFileSync(file, 'utf8');
  assert.ok(
    !secretPatterns.some((pattern) => pattern.test(text)),
    `Potential secret in ${file}; review locally.`,
  );
}
console.log(
  'PASS: tracked/pending files contain no known high-signal secret patterns.',
);

const manifest = JSON.parse(
  readFileSync('vendor/21st/source-hashes.json', 'utf8'),
);
for (const [file, expected] of Object.entries(manifest)) {
  const bytes = readFileSync(`vendor/21st/${file}`);
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    expected.sha256,
    `Vendor source/license changed: ${file}; verify upstream provenance.`,
  );
}
console.log(
  'PASS: upstream component and license hashes match provenance manifest.',
);
