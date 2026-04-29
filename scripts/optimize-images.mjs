// scripts/optimize-images.mjs
// Compress all PNG/JPG in /public/projects to AVIF + WebP variants and
// shrink original PNG fallbacks. Designed for portfolio context where
// images are displayed via next/image (which already serves AVIF/WebP
// from a /public source) — but the source files themselves are 200KB-1.7MB
// uncompressed PNGs that next/image must process at runtime AND ship to
// CDN edges. By pre-compressing the source PNGs we cut storage, build
// time, and the worst-case image-optimizer cold path.
//
// Usage:  node scripts/optimize-images.mjs

import sharp from 'sharp'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd(), 'public/projects')
const MAX_WIDTH = 2000 // largest realistic display + retina

// Format-specific quality (we ONLY rewrite PNG fallbacks here; AVIF/WebP
// are produced on-the-fly by next/image — but we make sure the SOURCE
// PNG is reasonably sized so the CDN cache and revalidation stay cheap).
const PNG_QUALITY = 85
const PNG_COMPRESSION = 9   // max zlib
const PNG_PALETTE = true    // quantize when possible (kills 60-80%)

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else yield full
  }
}

async function processFile(file) {
  const ext = path.extname(file).toLowerCase()
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) return null

  const before = (await fs.stat(file)).size
  const buf = await fs.readFile(file)

  let pipeline = sharp(buf, { failOn: 'none' }).rotate()
  const meta = await pipeline.metadata()

  // Cap dimensions
  if (meta.width && meta.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true })
  }

  let out
  if (ext === '.png') {
    out = await pipeline
      .png({
        quality: PNG_QUALITY,
        compressionLevel: PNG_COMPRESSION,
        palette: PNG_PALETTE,
        effort: 10,
      })
      .toBuffer()
  } else {
    out = await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer()
  }

  // Only overwrite if we actually saved bytes (palette quantization may
  // hurt for some images — keep original in that case).
  if (out.length < before) {
    await fs.writeFile(file, out)
    return { file, before, after: out.length, saved: before - out.length }
  }
  return { file, before, after: before, saved: 0 }
}

async function main() {
  let totalBefore = 0
  let totalAfter = 0
  const results = []

  for await (const file of walk(ROOT)) {
    try {
      const r = await processFile(file)
      if (r) {
        results.push(r)
        totalBefore += r.before
        totalAfter += r.after
      }
    } catch (err) {
      console.error('FAIL', file, err.message)
    }
  }

  // Report
  results.sort((a, b) => b.saved - a.saved)
  for (const r of results) {
    const rel = path.relative(ROOT, r.file)
    const pct = r.before === 0 ? 0 : Math.round((1 - r.after / r.before) * 100)
    console.log(
      `${pct.toString().padStart(3)}%  ${(r.before / 1024).toFixed(0).padStart(6)} KB → ${(r.after / 1024).toFixed(0).padStart(6)} KB  ${rel}`,
    )
  }

  const savedMB = ((totalBefore - totalAfter) / 1024 / 1024).toFixed(2)
  const pct = Math.round((1 - totalAfter / totalBefore) * 100)
  console.log(
    `\nTotal: ${(totalBefore / 1024 / 1024).toFixed(2)} MB → ${(totalAfter / 1024 / 1024).toFixed(2)} MB  (saved ${savedMB} MB, ${pct}%)`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
