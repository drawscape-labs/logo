import polygonClipping from 'polygon-clipping';

// Design units, independent of the SVG's printed size.
const RADIUS = 120;
// A bent, eight-sided profile: draw half, then reflect through the origin.
const HALF_PROFILE = [[-52.3, 38.18], [0, 25.5], [48.87, 34.74], [70.15, 0]];
const PROFILE = [...HALF_PROFILE, ...HALF_PROFILE.map(([x, y]) => [-x, -y])];

function rotate([x, y], angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [x * c - y * s, x * s + y * c];
}

export function numberInRange(name, value, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} must be between ${min} and ${max}.`);
  }
}

export function buildProfiles({count = 150, spacing = 1, profileScale = 1} = {}) {
  numberInRange('count', count, 12, 600);
  if (!Number.isInteger(count)) throw new Error('count must be an integer.');
  numberInRange('spacing', spacing, 0.5, 2);
  numberInRange('profileScale', profileScale, 0.5, 2);
  const radius = RADIUS * spacing;
  return Array.from({length: count}, (_, i) => {
    const angle = 2 * Math.PI * i / count;
    // One trip around the circle, half a turn in the opposite direction.
    const cx = -radius * Math.cos(angle), cy = radius * Math.sin(angle);
    return PROFILE.map(point => {
      const [x, y] = rotate(point, angle / 2);
      return [cx + x * profileScale, cy + y * profileScale];
    });
  });
}

export function buildGeometry(options = {}) {
  const profiles = buildProfiles(options).map(profile => [profile]);
  // Each profile goes under the next third of the ring, including across the seam.
  const ahead = Math.ceil(profiles.length / 3);
  const cyclic = [...profiles, ...profiles.slice(0, ahead)];
  // Clip one cover at a time; each operation only needs the remaining sliver.
  return profiles.flatMap((profile, i) => cyclic.slice(i + 1, i + 1 + ahead).reduce(
    (visible, cover) => polygonClipping.difference(visible, cover), [profile],
  ));
}

export function generateLogo(options = {}) {
  const {size = 300, margin = 10, strokeWidth, color = '#ff0000', rotation = 0} = options;
  numberInRange('size', size, 1, 10000);
  numberInRange('margin', margin, 0, size / 2 - 0.001);
  numberInRange('rotation', rotation, -360, 360);
  if (strokeWidth !== undefined) numberInRange('strokeWidth', strokeWidth, 0.001, size - 2 * margin - 0.001);
  if (typeof color !== 'string' || !/^#[\da-f]{6}$/i.test(color)) throw new Error('color must be a six-digit hex color, such as #ff0000.');

  const angle = rotation * Math.PI / 180;
  const geometry = buildGeometry(options).map(polygon => polygon.map(ring =>
    ring.map(point => rotate(point, angle)),
  ));
  const points = geometry.flat(2);
  const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY);
  const scale = strokeWidth === undefined ? (size - 2 * margin) / (span + 1) : (size - 2 * margin - strokeWidth) / span;
  const width = strokeWidth ?? scale;
  const f = n => Number(n.toFixed(6)).toString();
  const project = ([x, y]) => [
    f(size / 2 + (x - (minX + maxX) / 2) * scale),
    f(size / 2 + (y - (minY + maxY) / 2) * scale),
  ].join(',');
  const paths = geometry.map(polygon => {
    const d = polygon.map(ring => ring.map((point, i) => `${i ? 'L' : 'M'}${project(point)}`).join(' ') + ' Z').join(' ');
    return `    <path d="${d}" />`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${size}mm" height="${size}mm" viewBox="0 0 ${size} ${size}">\n  <g fill="none" stroke="${color}" stroke-width="${f(width)}">\n${paths.join('\n')}\n  </g>\n</svg>\n`;
}
