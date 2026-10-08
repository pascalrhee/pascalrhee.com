import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';
const source = readFileSync('src/components/SystemArt.astro', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
function setup(reduced = false) {
  let next = 0, time = 0, points = [], clears = 0, intersect;
  const frames = new Map(), events = {}, docEvents = {}, mediaEvents = {};
  const ctx = {clearRect(){points=[];clears++},beginPath(){},moveTo(x,y){points.push([x,y])},lineTo(){},stroke(){},setTransform(){}};
  const stage = {clientWidth:460,clientHeight:380};
  const canvas = {getContext:()=>ctx,parentElement:stage};
  const button = {hidden:true,attrs:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,v){events['button:'+k]=v}};
  const figure = {querySelector:s=>s==='canvas'?canvas:button,classList:{add(){}},getBoundingClientRect:()=>({top:0,left:0,width:460,height:480}),addEventListener(k,v){events[k]=v}};
  const media = {matches:reduced,addEventListener(k,v){mediaEvents[k]=v}};
  const document = {hidden:false,querySelector:()=>figure,addEventListener(k,v){docEvents[k]=v}};
  vm.runInNewContext(transformSync(source,{loader:'ts'}).code,{document,matchMedia:()=>media,Math,performance:{now:()=>time},innerHeight:800,devicePixelRatio:3,ResizeObserver:class{constructor(cb){this.cb=cb}observe(){this.cb()}},IntersectionObserver:class{constructor(cb){intersect=cb}observe(){}},requestAnimationFrame:cb=>{frames.set(++next,cb);return next},cancelAnimationFrame:id=>frames.delete(id)});
  return {canvas,button,events,docEvents,mediaEvents,media,document,figure,frames,get points(){return points},get clears(){return clears},step(){const callbacks=[...frames.values()];frames.clear();time+=40;callbacks.forEach(cb=>cb(time))},intersect(value){intersect([{isIntersecting:value}])}};
}
const a=setup();assert.equal(a.canvas.width,920);assert.equal(a.frames.size,1);a.step();const initial=JSON.stringify(a.points);a.events.pointermove({clientX:455,clientY:0});a.step();assert.notEqual(JSON.stringify(a.points),initial,'pointer changes geometry');
a.events['button:click']();assert.equal(a.frames.size,0);assert.equal(a.button.attrs['aria-pressed'],'true');a.events['button:click']();assert.equal(a.frames.size,1);
a.intersect(false);assert.equal(a.frames.size,0);a.intersect(true);assert.equal(a.frames.size,1);a.document.hidden=true;a.docEvents.visibilitychange();assert.equal(a.frames.size,0);a.document.hidden=false;a.docEvents.visibilitychange();assert.equal(a.frames.size,1);
a.media.matches=true;a.mediaEvents.change();assert.equal(a.frames.size,0);assert.equal(a.button.hidden,true);
const b=setup(true);assert.equal(b.frames.size,0);assert.ok(b.clears>0);assert.equal(b.button.hidden,true);b.events.pointermove({clientX:100,clientY:10});assert.equal(b.frames.size,0);
const c=setup();c.step();const before=JSON.stringify(c.points);c.figure.getBoundingClientRect=()=>({top:-400,left:0,width:460,height:480});c.step();assert.notEqual(JSON.stringify(c.points),before,'scroll changes geometry');
console.log('PASS: pointer, scroll, pause/resume, offscreen, hidden tab, reduced motion, 2x DPR cap');
