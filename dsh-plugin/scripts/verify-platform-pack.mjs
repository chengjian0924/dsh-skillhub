#!/usr/bin/env node
// Cross-platform pack verification: no tar/grep/sha256sum external commands.
// Reads the tarball produced by pack-platform.mjs, checks required files,
// rejects leaks, writes the labelled copy plus a SHA-256 sidecar.
import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const platform = process.env.PLATFORM
const label = process.env.LABEL
const dest = process.env.PACK_DEST
if (!platform || !label || !dest) {
  console.error('PLATFORM, LABEL and PACK_DEST are required')
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const safeName = String(pkg.name).replace(/^@/, '').replace(/\//g, '-')
const src = join(root, 'dist', `${safeName}-${pkg.version}-${platform}.tgz`)
const target = join(dest, `${safeName}-${pkg.version}-${label}.tgz`)
mkdirSync(dest, { recursive: true })
copyFileSync(src, target)

/**
 * Minimal tar entry-name reader. pnpm/npm tarballs are ustar with 512-byte
 * headers; we only need names, so skip payload by the declared size field.
 */
function tarNames(buf) {
  const out = []
  for (let off = 0; off + 512 <= buf.length;) {
    const header = buf.subarray(off, off + 512)
    if (header.every((b) => b === 0)) break
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '')
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/, '')
    const full = prefix ? `${prefix}/${name}` : name
    let bytes = 0
    for (const c of header.subarray(124, 136)) {
      if (c === 0 || c === 0x20) break
      bytes = bytes * 8 + (c - 0x30)
    }
    if (full) out.push(full)
    off += 512 + Math.ceil(bytes / 512) * 512
  }
  return out
}

const names = tarNames(gunzipSync(readFileSync(target)))

const must = [
  'PLATFORM.md', 'skillhub.json.example', 'lib/host.js', 'lib/client.js',
  'cordis.patch.yml', 'lib/api.js', 'lib/auth.js', 'lib/install.js',
]
const missing = must.filter((f) => !names.includes(`package/${f}`))
if (missing.length) {
  console.error(`missing in ${target}: ${missing.join(', ')}`)
  process.exit(1)
}
const leaked = names.filter((n) => /^package\/(src\/|lib\/tests\/|node_modules\/|\.env)/.test(n))
if (leaked.length) {
  console.error(`leaked: ${leaked.join(', ')}`)
  process.exit(1)
}

const hash = createHash('sha256').update(readFileSync(target)).digest('hex')
writeFileSync(`${target}.sha256`, `${hash}  ${basename(target)}\n`)
console.log(`verified ${target} (${names.length} entries)`)
console.log(`${hash}  ${basename(target)}`)
