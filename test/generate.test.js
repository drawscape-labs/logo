import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildProfiles, buildGeometry, generateLogo} from '../logo.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≈ ${expected}`);

test('profiles follow a circle and turn half as far in the opposite direction', () => {
  const profiles = buildProfiles({count: 12});
  const center = profile => [0, 1].map(axis => profile.reduce((sum, point) => sum + point[axis], 0) / profile.length);
  const centers = profiles.map(center);
  for (const [x, y] of centers) close(Math.hypot(x, y), 120);
  close(centers[0][0], -120);
  close(centers[0][1], 0);
  close(centers[6][0], 120);
  close(centers[6][1], 0);

  // Halfway round the orbit, every local point has made a quarter turn.
  profiles[0].forEach(([x, y], i) => {
    close(profiles[6][i][0] - centers[6][0], -(y - centers[0][1]));
    close(profiles[6][i][1] - centers[6][1], x - centers[0][0]);
  });
  // A final half turn swaps the two halves of the profile, closing the loop.
  profiles[0].slice(0, 4).forEach(([x, y], i) => {
    close(x + profiles[0][i + 4][0], 2 * centers[0][0]);
    close(y + profiles[0][i + 4][1], 2 * centers[0][1]);
  });
});

test('weaving produces closed, finite paths at both sparse and dense counts', () => {
  for (const count of [12, 50, 600]) {
    const geometry = buildGeometry({count});
    assert.ok(geometry.length > 0);
    for (const polygon of geometry) {
      for (const ring of polygon) {
        assert.ok(ring.length >= 4);
        assert.deepEqual(ring[0], ring.at(-1));
        assert.ok(ring.flat().every(Number.isFinite));
      }
    }
  }
});

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
  for (const options of [{count: 0}, {count: 12.5}, {spacing: NaN}, {profileScale: 0}, {margin: 150}, {strokeWidth: -1}, {rotation: Infinity}, {color: '"><script>'}]) {
    assert.throws(() => generateLogo(options));
  }
});

test('default SVG output remains stable', () => {
  const digest = createHash('sha256').update(generateLogo()).digest('hex');
  assert.equal(digest, '38d5903cdecf7b79a1229b8238ae1bca2b874314acdfcdfaf5b27fa22901e74e');
});
