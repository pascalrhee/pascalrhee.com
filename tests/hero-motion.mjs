import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';
const source = readFileSync(
  'src/components/21st/BackgroundPaths.astro',
  'utf8',
).match(/<script>([\s\S]*?)<\/script>/)[1];
function setup(reduced = false) {
  let next = 0,
    intersect;
  const frames = new Map(),
    events = {},
    docEvents = {},
    mediaEvents = {},
    winEvents = {};
  const scene = { style: {} };
  const button = {
    hidden: true,
    attrs: {},
    setAttribute(k, v) {
      this.attrs[k] = v;
    },
    addEventListener(k, v) {
      events['button:' + k] = v;
    },
  };
  const figure = {
    dataset: {},
    querySelector: (s) => (s === '.path-perspective' ? scene : button),
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 460, height: 480 }),
    addEventListener(k, v) {
      events[k] = v;
    },
  };
  const media = {
    matches: reduced,
    addEventListener(k, v) {
      mediaEvents[k] = v;
    },
  };
  const document = {
    hidden: false,
    querySelector: () => figure,
    addEventListener(k, v) {
      docEvents[k] = v;
    },
  };
  vm.runInNewContext(transformSync(source, { loader: 'ts' }).code, {
    document,
    window: {
      addEventListener(k, v) {
        winEvents[k] = v;
      },
    },
    matchMedia: () => media,
    Math,
    innerHeight: 800,
    IntersectionObserver: class {
      constructor(cb) {
        intersect = cb;
      }
      observe() {}
    },
    requestAnimationFrame: (cb) => {
      frames.set(++next, cb);
      return next;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
  });
  return {
    scene,
    button,
    figure,
    winEvents,
    events,
    docEvents,
    mediaEvents,
    media,
    document,
    frames,
    step() {
      const c = [...frames.values()];
      frames.clear();
      c.forEach((cb) => cb());
    },
    intersect(value) {
      intersect([{ isIntersecting: value }]);
    },
  };
}
const a = setup();
assert.equal(a.frames.size, 1);
a.step();
const initial = a.scene.style.transform;
assert.equal(a.frames.size, 0, 'no idle animation loop');
a.events.pointermove({ clientX: 455, clientY: 0 });
a.step();
assert.notEqual(
  a.scene.style.transform,
  initial,
  'pointer changes XY transform',
);
a.events['button:click']();
assert.equal(a.frames.size, 0);
assert.equal(a.button.attrs['aria-pressed'], 'true');
assert.equal(a.figure.dataset.still, 'true');
const frozen = a.scene.style.transform;
a.step();
assert.equal(a.scene.style.transform, frozen);
a.events['button:click']();
assert.equal(a.frames.size, 1);
assert.equal(a.figure.dataset.still, 'false');
a.intersect(false);
assert.equal(a.frames.size, 0);
a.intersect(true);
assert.equal(a.frames.size, 1);
a.document.hidden = true;
a.docEvents.visibilitychange();
assert.equal(a.frames.size, 0);
a.document.hidden = false;
a.docEvents.visibilitychange();
assert.equal(a.frames.size, 1);
a.media.matches = true;
a.mediaEvents.change();
assert.equal(a.frames.size, 0);
assert.equal(a.button.hidden, true);
assert.equal(a.figure.dataset.still, 'true');
a.media.matches = false;
a.mediaEvents.change();
assert.equal(a.frames.size, 1);
const b = setup(true);
assert.equal(b.frames.size, 0);
assert.equal(b.button.hidden, true);
const still = b.scene.style.transform;
b.events.pointermove({ clientX: 100, clientY: 10 });
assert.equal(b.scene.style.transform, still);
const c = setup();
c.step();
const before = c.scene.style.transform;
c.figure.getBoundingClientRect = () => ({
  top: -400,
  left: 0,
  width: 460,
  height: 480,
});
c.winEvents.scroll();
c.step();
assert.notEqual(c.scene.style.transform, before, 'scroll changes perspective');
c.events.pointermove({ clientX: 460, clientY: 480 });
c.step();
c.events.pointerup({ pointerType: 'touch' });
c.events.pointercancel();
c.step();
assert.equal(
  c.frames.size,
  1,
  'touch never prevents scrolling or interrupts loop',
);
const original = readFileSync(
  'vendor/21st/kokonut-ui/background-paths.tsx',
  'utf8',
);
const geometry = original.slice(
  original.indexOf('interface Point'),
  original.indexOf('const generateUniqueId'),
);
const adapted = readFileSync(
  'src/components/21st/background-paths.ts',
  'utf8',
).replace('export function', 'function');
const originalScope = {},
  adaptedScope = {};
vm.runInNewContext(
  transformSync(geometry, { loader: 'ts' }).code,
  originalScope,
);
vm.runInNewContext(transformSync(adapted, { loader: 'ts' }).code, adaptedScope);
for (const type of ['primary', 'secondary', 'accent'])
  for (const pos of [-1, 1])
    for (let i = 0; i < 15; i++)
      assert.equal(
        adaptedScope.generateAestheticPath(i, pos, type),
        originalScope.generateAestheticPath(i, pos, type),
        'retained upstream geometry',
      );
console.log(
  'PASS: upstream path parity; pointer XY, scroll, pause/resume, offscreen, hidden tab, reduced motion changes, touch reset',
);

for (let i = 0; i < 150; i++) c.step();
assert.equal(c.frames.size, 0, 'interpolation stops when settled');
