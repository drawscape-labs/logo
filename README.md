# Drawscape Logo Generator

![Generated Drawscape logo](output/logo-generated.png)

Deterministic JavaScript generator for a woven geometric logo. The default output is
300 mm by 300 mm, with the artwork centered and approximately 10 mm of margin.

Requires Node.js 20.9 or later and npm.

```sh
npm ci
npm run generate
```

Each run creates `output/logo-generated.svg` and a white-background
`output/logo-generated.png` preview at 1800 by 1800 pixels. The output folder is
created automatically. Use `--png-size 3000` for a larger preview.
The default SVG and PNG are included in the repository; additional files in
`output/` are ignored by Git.

Open `output/logo-generated.svg` in a browser, Inkscape, Illustrator, or a plotting tool.
Print at 100% to preserve the physical page dimensions.

```sh
# Set both canvas dimensions to 200 mm (default: 300 mm).
node generate.js --size 200

# Fewer lines and a thinner, black pen stroke.
node generate.js --count 100 --stroke-width 0.3 --color '#000000'

# Increase the orbit radius relative to the profile.
node generate.js --spacing 1.15 --margin 15

node generate.js --help
```

`--count` changes the number of repeated shapes, not the number of clipped paths.
`--size` is optional and takes one value in millimeters for both width and height
(default: `300`). PNG pixel dimensions are controlled separately by `--png-size`.
`--output` is optional. By default, each run replaces `output/logo-generated.svg`
and `output/logo-generated.png`. To keep a separate version, add
`--output output/logo-custom.svg`; the PNG uses the same directory and base name.
`--spacing` changes the orbit radius; `--profile-scale` changes the width of the
woven band. The finished geometry is always fitted proportionally to the square
page. `--stroke-width`, `--margin`, and `--size` are in millimeters.

## Construction

An eight-vertex, centrally symmetric profile follows a circular orbit. Over one
orbit it rotates half a turn in the opposite direction. With 150 profiles, this
gives 2.4 degrees of orbital movement and 1.2 degrees of profile rotation per step.
Boolean subtraction against the following third of the cycle removes hidden
regions and produces the three woven crossings. Polygon clipping uses
`polygon-clipping`; the geometry is generated entirely from numeric parameters,
without randomness or clock-dependent values.

Closed fragments can share edges; this is not a
deduplicated single-pass plotter export.

The generator also exports `generateLogo(options)` and `buildGeometry(options)`
for use from other JavaScript modules. Run `npm test` for determinism, input
validation, page dimensions, and a default-output regression check.
