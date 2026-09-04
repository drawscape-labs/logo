import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {generateLogo} from '../generate.js';

test('default output is deterministic and physically 300 mm square', () => {
  const svg = generateLogo();
  assert.equal(svg, generateLogo());
  assert.match(svg, /width="300mm" height="300mm" viewBox="0 0 300 300"/);
  assert.match(svg, /stroke="#ff0000"/);
  assert.doesNotMatch(svg, /NaN|Infinity/);
});

test('parameters change the geometry and reject invalid inputs', () => {
  const fewer = generateLogo({count: 75, spacing: 1.2, strokeWidth: 0.3});
  assert.notEqual(fewer, generateLogo());
  assert.match(fewer, /stroke-width="0.3"/);
  for (const options of [{count: 0}, {count: 12.5}, {spacing: NaN}, {margin: 150}, {strokeWidth: -1}, {color: '"><script>'}]) {
    assert.throws(() => generateLogo(options));
  }
});

test('default SVG output remains stable', () => {
  const digest = createHash('sha256').update(generateLogo()).digest('hex');
  assert.equal(digest, '69b3224a1c14267daff8f2e5544fa4664aaa22fcbd817475d802fb0a518b33db');
});
