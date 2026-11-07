/**
 * pnpm brand:assets — favicons and app icons from the logo files in public/brand/ (spec
 * Appendix B). The tile takes the light theme's primary color and the mark its primary-fg, so
 * run `pnpm tokens:build` first whenever the palette changes, then commit what this writes.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, wcagLuminance } from 'culori'
import sharp from 'sharp'

import { tokens } from '../src/styles/tokens.generated'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const brand = (file: string) => path.join(root, 'public/brand', file)

const tileColor = tokens.light.primary
const mark = readFileSync(
  brand(
    wcagLuminance(parse(tokens.light['primary-fg'])!) > 0.5
      ? 'logo-mark-dark.png'
      : 'logo-mark-light.png',
  ),
)

/**
 * The mark centred on a square tile. `scale` is the mark's width as a share of the tile;
 * `radius` rounds the corners (0 for icons the platform masks itself).
 */
async function tile(size: number, scale: number, radius: number) {
  const width = Math.round(size * scale)
  const resized = await sharp(mark).resize({ width, kernel: 'lanczos3' }).toBuffer()
  const { height = width } = await sharp(resized).metadata()
  const background = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${Math.round(size * radius)}" fill="${tileColor}"/></svg>`
  return sharp(Buffer.from(background))
    .composite([
      {
        input: resized,
        left: Math.round((size - width) / 2),
        top: Math.round((size - height) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer()
}

/** An ICO file holding PNG images, which every current browser reads. */
function ico(images: Array<{ size: number; png: Buffer }>) {
  const header = Buffer.alloc(6 + 16 * images.length)
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach(({ size, png }, i) => {
    const entry = 6 + 16 * i
    header.writeUInt8(size % 256, entry) // 0 means 256
    header.writeUInt8(size % 256, entry + 1)
    header.writeUInt16LE(1, entry + 4) // colour planes
    header.writeUInt16LE(32, entry + 6) // bits per pixel
    header.writeUInt32LE(png.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += png.length
  })
  return Buffer.concat([header, ...images.map((image) => image.png)])
}

// Small sizes give the mark more of the tile so its bars stay apart.
const favicon = await Promise.all(
  (
    [
      [16, 0.8],
      [32, 0.72],
      [48, 0.68],
    ] as const
  ).map(async ([size, scale]) => ({ size, png: await tile(size, scale, 0.22) })),
)

const outputs: Array<[string, Buffer]> = [
  ['src/app/favicon.ico', ico(favicon)],
  ['src/app/icon.png', await tile(512, 0.62, 0.22)],
  // iOS rounds the corners itself and shows transparency as black.
  ['src/app/apple-icon.png', await tile(180, 0.58, 0)],
  ['public/brand/icon-192.png', await tile(192, 0.62, 0.22)],
  ['public/brand/icon-512.png', await tile(512, 0.62, 0.22)],
  // Maskable icons may be cut to a circle 80% wide: the mark's corners must stay inside it.
  ['public/brand/icon-maskable-512.png', await tile(512, 0.52, 0)],
]
for (const [file, data] of outputs) writeFileSync(path.join(root, file), data)
console.log(`Wrote ${outputs.map(([file]) => file).join(', ')}.`)
