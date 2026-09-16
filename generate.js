import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, extname} from 'node:path';
import sharp from 'sharp';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
import {generateLogo, numberInRange} from './logo.js';

// Preserve programmatic imports from the original entry point.
export {buildGeometry, generateLogo} from './logo.js';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const {values} = parseArgs({options: {
    output: {type: 'string', default: 'output/logo/logo-generated.svg'},
    'png-size': {type: 'string', default: '1800'},
    count: {type: 'string'}, spacing: {type: 'string'},
    'profile-scale': {type: 'string'}, size: {type: 'string'},
    margin: {type: 'string'}, 'stroke-width': {type: 'string'},
    color: {type: 'string'}, rotation: {type: 'string'},
    help: {type: 'boolean', short: 'h'},
  }});
  if (values.help) {
    console.log(`Usage: node generate.js [options]
  --output FILE         Output SVG (output/logo/logo-generated.svg), plus matching PNG
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
