// Writes .br and .gz copies of text assets next to the originals so WhiteNoise can serve them pre-compressed
// (no CPU spent compressing on every request, ~70% fewer bytes over the wire).
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

const DIST = fileURLToPath(new URL('../../backend/frontend_dist/', import.meta.url))
const TEXT = new Set(['.js', '.css', '.html', '.svg', '.json', '.txt', '.map'])
let files = 0, before = 0, after = 0

const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (TEXT.has(extname(name)) && statSync(p).size > 512) {
      const src = readFileSync(p)
      const br = brotliCompressSync(src, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } })
      const gz = gzipSync(src, { level: 9 })
      writeFileSync(p + '.br', br)
      writeFileSync(p + '.gz', gz)
      files++; before += src.length; after += br.length
    }
  }
}
walk(DIST)
console.log(`precompressed ${files} files: ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB (brotli)`)
