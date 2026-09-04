import polygonClipping from 'polygon-clipping';
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, extname} from 'node:path';
import sharp from 'sharp';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';

// Half of the centrally symmetric profile, in internal geometry units.
const HALF_PROFILE = [
  [-44.296891161745, 47.233824416704],
  [4.738984079328, 25.059432560485],
  [54.472131222383, 25.059452213024],
  [68.927125761957, -13.034812073895],
];
const PROFILE = [...HALF_PROFILE, ...HALF_PROFILE.map(([x, y]) => [-x, -y])];

function numberInRange(name, value, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} must be between ${min} and ${max}.`);
  }
}

export function buildGeometry({count = 150, spacing = 1, profileScale = 1} = {}) {
  numberInRange('count', count, 12, 600);
  if (!Number.isInteger(count)) throw new Error('count must be an integer.');
  numberInRange('spacing', spacing, 0.5, 2);
  numberInRange('profileScale', profileScale, 0.5, 2);
  const shapes = Array.from({length: count}, (_, i) => {
    const t = (1.10875 + i * 180 / count) * Math.PI / 180;
    const cx = spacing * (-111.555569429758 * Math.cos(2 * t) - 43.757456780324 * Math.sin(2 * t));
    const cy = spacing * (-43.757457027224 * Math.cos(2 * t) + 111.555563359208 * Math.sin(2 * t));
    return PROFILE.map(([x, y]) => [
      cx + profileScale * (x * Math.cos(t) - y * Math.sin(t)),
      cy + profileScale * (x * Math.sin(t) + y * Math.cos(t)),
    ]);
  });
  // Cyclic local occlusion preserves the three woven crossings without a seam.
  const occlusion = Math.ceil(count / 3);
  return shapes.flatMap((shape, i) => polygonClipping.difference(
    [shape],
    ...Array.from({length: occlusion}, (_, j) => [shapes[(i + j + 1) % count]]),
  ));
}

export function generateLogo(options = {}) {
  const {size = 300, margin = 10, strokeWidth, color = '#ff0000', rotation = 0} = options;
  numberInRange('size', size, 1, 10000);
  numberInRange('margin', margin, 0, size / 2 - 0.001);
  numberInRange('rotation', rotation, -360, 360);
  if (strokeWidth !== undefined) numberInRange('strokeWidth', strokeWidth, 0.001, size - 2 * margin - 0.001);
  if (typeof color !== 'string' || !/^#[\da-f]{6}$/i.test(color)) throw new Error('color must be a six-digit hex color, such as #ff0000.');
  const geometry = buildGeometry(options);
  const angle = rotation * Math.PI / 180;
  const rotated = geometry.map(polygon => polygon.map(ring => ring.map(([x, y]) => [
    x * Math.cos(angle) - y * Math.sin(angle),
    x * Math.sin(angle) + y * Math.cos(angle),
  ])));
  const points = rotated.flat(2);
  const minX = Math.min(...points.map(p => p[0]));
  const maxX = Math.max(...points.map(p => p[0]));
  const minY = Math.min(...points.map(p => p[1]));
  const maxY = Math.max(...points.map(p => p[1]));
  const span = Math.max(maxX - minX, maxY - minY);
  const scale = strokeWidth === undefined ? (size - 2 * margin) / (span + 1) : (size - 2 * margin - strokeWidth) / span;
  const width = strokeWidth ?? scale;
  const f = n => Number(n.toFixed(6)).toString();
  const paths = rotated.map(polygon => {
    const d = polygon.map(ring => ring.map(([x, y], i) => `${i ? 'L' : 'M'}${f(size / 2 + (x - (minX + maxX) / 2) * scale)},${f(size / 2 + (y - (minY + maxY) / 2) * scale)}`).join(' ') + ' Z').join(' ');
    return `    <path d="${d}" />`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${size}mm" height="${size}mm" viewBox="0 0 ${size} ${size}">\n  <g fill="none" stroke="${color}" stroke-width="${f(width)}">\n${paths.join('\n')}\n  </g>\n</svg>\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const {values} = parseArgs({options: {
    output: {type: 'string', default: 'output/logo-generated.svg'},
    'png-size': {type: 'string', default: '1800'},
    count: {type: 'string'}, spacing: {type: 'string'},
    'profile-scale': {type: 'string'}, size: {type: 'string'},
    margin: {type: 'string'}, 'stroke-width': {type: 'string'},
    color: {type: 'string'}, rotation: {type: 'string'},
    help: {type: 'boolean', short: 'h'},
  }});
  if (values.help) {
    console.log(`Usage: node generate.js [options]
  --output FILE         Output SVG (output/logo-generated.svg), plus matching PNG
  --png-size PX         Square PNG dimensions (1800), white background
  --count N             Number of repeated profiles, 12-600 (150)
  --spacing N           Orbit radius multiplier, 0.5-2 (1)
  --profile-scale N     Profile size multiplier, 0.5-2 (1)
  --size MM             Square page dimensions (300)
  --margin MM           Centerline/stroke allowance from page edge (10)
  --stroke-width MM     Stroke width (automatically scaled with the artwork)
  --color '#rrggbb'      Stroke color (#ff0000)
  --rotation DEGREES    Rotate around the center (0)`);
    process.exit(0);
  }
  const options = {};
  for (const [key, value] of Object.entries(values)) {
    if (key === 'output' || key === 'png-size') continue;
    options[key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = key === 'color' ? value : Number(value);
  }
  try {
    const pngSize = Number(values['png-size']);
    numberInRange('png-size', pngSize, 64, 8192);
    if (!Number.isInteger(pngSize)) throw new Error('png-size must be an integer.');
    if (extname(values.output).toLowerCase() !== '.svg') throw new Error('output must have an .svg extension.');
    const svg = generateLogo(options);
    const pngPath = values.output.slice(0, -4) + '.png';
    const size = options.size ?? 300;
    const png = await sharp(Buffer.from(svg), {density: pngSize * 25.4 / size})
      .resize(pngSize, pngSize)
      .flatten({background: '#ffffff'})
      .png()
      .toBuffer();
    mkdirSync(dirname(values.output), {recursive: true});
    writeFileSync(values.output, svg);
    writeFileSync(pngPath, png);
    console.log(`Wrote ${values.output} (${options.size ?? 300} mm square)`);
    console.log(`Wrote ${pngPath} (${pngSize} x ${pngSize} pixels)`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
