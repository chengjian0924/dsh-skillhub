#!/usr/bin/env node
// Build a platform-labelled distribution of skillhub-plugin.
//
// The plugin itself is pure JavaScript: no native addons, no architecture
// binding, identical lib/ bytes on every platform. The only differences
// between the Windows and Linux artefacts are the bundled install notes and
// the skillhub.json path template. Do not add platform-specific runtime code
// here without a real native dependency to justify it.
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const platform = process.argv[2]
if (platform !== 'windows' && platform !== 'linux') {
  console.error('usage: node scripts/pack-platform.mjs <windows|linux>')
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const safeName = String(pkg.name).replace(/^@/, '').replace(/\//g, '-')
const dest = resolve(root, 'dist')
mkdirSync(dest, { recursive: true })

const staged = ['PLATFORM.md', 'skillhub.json.example']
const templateDir = join(root, 'templates', platform)
for (const name of staged) cpSync(join(templateDir, name), join(root, name))

let exitCode = 0
try {
  // Ignore lifecycle scripts: prepare rebuilds lib/ with shell-specific
  // commands (rm/cp) and the build already ran explicitly in the workflow.
  // pnpm has no pack --ignore-scripts flag, so use the npm_config_ env var.
  const env = { ...process.env, npm_config_ignore_scripts: 'true' }
  const result = spawnSync('pnpm', [
    'pack', '--pack-destination', dest,
  ], { cwd: root, env, stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.error) throw result.error
  exitCode = result.status || 0
  if (exitCode !== 0) throw new Error(`pnpm pack exited with ${exitCode}`)

  const original = join(dest, `${safeName}-${pkg.version}.tgz`)
  const target = join(dest, `${safeName}-${pkg.version}-${platform}.tgz`)
  renameSync(original, target)
  console.log(`packed ${target}`)
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err))
  exitCode = 1
} finally {
  for (const name of staged) rmSync(join(root, name), { force: true })
}
process.exit(exitCode)
