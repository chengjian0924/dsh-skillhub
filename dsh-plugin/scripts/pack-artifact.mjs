#!/usr/bin/env node
// Self-contained cross-platform packer.
// Produces skillhub-plugin-<version>-<label>.tgz plus a .sha256 sidecar.
// No tar / grep / sha256sum / mv: those are not portable to Windows runners.
//
// Required env:
//   PLATFORM_LABEL  e.g. linux-x64 / win32-x64
//   PACK_DEST       absolute output directory
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const label = String(process.env.PLATFORM_LABEL || '').trim()
const dest = process.env.PACK_DEST ? resolve(process.env.PACK_DEST) : ''
if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(label)) {
  console.error('PLATFORM_LABEL must be a lowercase slug (e.g. linux-x64)')
  process.exit(1)
}
if (!dest) {
  console.error('PACK_DEST is required')
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const safeName = String(pkg.name).replace(/^@/, '').replace(/\//g, '-')
mkdirSync(dest, { recursive: true })

// pnpm pack may re-run prepare (build.mjs). That is safe on every platform now:
// build.mjs uses only Node file APIs, never rm/cp from a cmd.exe shell.
// Keep ignore_scripts as a hint; if honoured, the workflow's test step has
// already produced lib/, so the tarball is still complete.
const env = { ...process.env, npm_config_ignore_scripts: 'true' }
const packed = spawnSync('pnpm', ['pack', '--pack-destination', dest], {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
if (packed.error) throw packed.error
if (packed.status !== 0) process.exit(packed.status || 1)

const src = join(dest, `${safeName}-${pkg.version}.tgz`)
const target = join(dest, `${safeName}-${pkg.version}-${label}.tgz`)
renameSync(src, target)

/** Read entry names from a ustar/npm tarball without external commands. */
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

const tarball = readFileSync(target)
const names = tarNames(gunzipSync(tarball))
const must = [
  'LICENSE', 'README.md', 'package.json', 'cordis.patch.yml',
  'lib/host.js', 'lib/client.js', 'lib/api.js', 'lib/http.js',
  'lib/install.js', 'lib/unzip.js', 'lib/config-store.js', 'lib/auth.js',
  'lib/skill-detail.js', 'lib/runtime-profile.js', 'lib/local-api.js',
  'lib/categories.js',
]
const missing = must.filter((f) => !names.includes(`package/${f}`))
if (missing.length) {
  console.error(`missing from tarball: ${missing.join(', ')}`)
  process.exit(1)
}
const leaked = names.filter((n) => /^package\/(src\/|lib\/tests\/|node_modules\/|\.env)/.test(n))
if (leaked.length) {
  console.error(`leaked into tarball: ${leaked.join(', ')}`)
  process.exit(1)
}

const hash = createHash('sha256').update(tarball).digest('hex')
writeFileSync(`${target}.sha256`, `${hash}  ${basename(target)}\n`)
console.log(`verified ${target} (${names.length} entries)`)
console.log(`${hash}  ${basename(target)}`)
