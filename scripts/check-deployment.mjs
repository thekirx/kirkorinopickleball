import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
assert.equal(config.framework,'vite');assert.equal(config.outputDirectory,'dist');assert.equal(config.buildCommand,'npm run build');
assert.ok(config.rewrites.some(r=>r.source==='/(.*)'&&r.destination==='/index.html'));
console.log('Vite SPA deployment configuration passed.');
