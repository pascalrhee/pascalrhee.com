import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';
const source = readFileSync(
  'src/components/21st/MagicCard.astro',
  'utf8',
).match(/<script>([\s\S]*?)<\/script>/)[1];
const events = {},
  global = {},
  props = {},
  mediaEvents = {};
const card = {
  style: {
    setProperty(k, v) {
      props[k] = v;
    },
  },
  getBoundingClientRect: () => ({ left: 20, top: 40 }),
  addEventListener(k, v) {
    events[k] = v;
  },
};
const reduce = {
    matches: false,
    addEventListener(_k, v) {
      mediaEvents.reduce = v;
    },
  },
  fine = {
    matches: true,
    addEventListener(_k, v) {
      mediaEvents.fine = v;
    },
  };
const doc = {
  hidden: false,
  querySelectorAll: () => [card],
  addEventListener(k, v) {
    global[k] = v;
  },
};
vm.runInNewContext(transformSync(source, { loader: 'ts' }).code, {
  document: doc,
  window: {
    addEventListener(k, v) {
      global[k] = v;
    },
  },
  matchMedia: (q) => (q.includes('reduced') ? reduce : fine),
});
events.pointermove({ clientX: 100, clientY: 120, pointerType: 'mouse' });
assert.equal(props['--mouse-x'], '80px');
assert.equal(props['--mouse-y'], '80px');
events.pointerleave();
assert.equal(props['--mouse-x'], '-300px');
reduce.matches = true;
events.pointermove({ clientX: 100, clientY: 120 });
assert.equal(props['--mouse-x'], '-300px');
reduce.matches = false;
fine.matches = false;
events.pointermove({ clientX: 100, clientY: 120 });
assert.equal(props['--mouse-x'], '-300px');
fine.matches = true;
events.pointermove({ clientX: 100, clientY: 120, pointerType: 'touch' });
assert.equal(props['--mouse-x'], '-300px');
events.pointermove({ clientX: 100, clientY: 120 });
global.blur();
assert.equal(props['--mouse-x'], '-300px');
const html = readFileSync('dist/index.html', 'utf8');
assert.equal((html.match(/class="magic-card"/g) || []).length, 2);
assert.equal((html.match(/class="interactive-button/g) || []).length, 3);
assert.equal((html.match(/stroke-linecap="round"/g) || []).length, 74);
assert.ok(!html.includes('<canvas'), 'SVG fallback works without JavaScript');
for (const href of [
  '/projects/',
  '/about/',
  'https://www.linkedin.com/in/jprhee/',
])
  assert.ok(html.includes(`href="${href}"`));
assert.ok(!html.includes('href="/writing/"'));
console.log(
  'PASS: card pointer tracking/reset, reduced motion, coarse/touch input; built hero/card/button markup and navigation',
);
