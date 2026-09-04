# Drawscape Logo Generator

![Generated Drawscape logo](output/logo-generated.png)

Create a woven logo as SVG and PNG. The same settings always produce the same image.

## Run

Requires Node.js 20.9 or later.

```sh
npm ci
npm run generate
```

Files are saved in `output/`:

- `logo-generated.svg`: 300 x 300 mm.
- `logo-generated.png`: 1800 x 1800 pixels, white background.

Each run replaces these files.

## Options

All options are optional. Use one size value for both width and height.

```sh
# 200 x 200 mm
node generate.js --size 200

# Fewer shapes and thin black lines
node generate.js --count 100 --stroke-width 0.3 --color '#000000'

# Save a separate SVG and PNG
node generate.js --output output/custom.svg

node generate.js --help
```

Use `--margin` for the page margin in mm and `--png-size` for the PNG width in pixels.
Run `node generate.js --help` for all options.

## Test

```sh
npm test
```
