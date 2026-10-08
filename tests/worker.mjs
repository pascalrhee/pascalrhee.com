import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
const code = transformSync(readFileSync('src/worker/index.ts', 'utf8'), {
  loader: 'ts',
  format: 'esm',
}).code;
const { default: worker } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
);
let assets = 0;
const env = {
  ASSETS: {
    fetch: async () => {
      assets++;
      return new Response('static');
    },
  },
  VIEWS_KV: {
    get() {
      throw new Error('KV must not be read');
    },
    put() {
      throw new Error('KV must not be written');
    },
  },
};
for (const path of ['/api/track', '/api/views', '/api/unknown']) {
  for (const method of ['GET', 'POST', 'HEAD', 'OPTIONS', 'DELETE']) {
    const response = await worker.fetch(
      new Request(`https://pascalrhee.com${path}`, { method }),
      env,
    );
    assert.equal(response.status, 410);
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    if (method === 'HEAD') assert.equal(await response.text(), '');
  }
}
assert.equal(assets, 0);
assert.equal(
  await (
    await worker.fetch(new Request('https://pascalrhee.com/about/'), env)
  ).text(),
  'static',
);
assert.equal(assets, 1);
console.log(
  'PASS: retired API methods never access KV; static requests delegate to assets.',
);
