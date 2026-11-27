#!/usr/bin/env node
// Cross-platform build: the shell form "rm -rf lib && tsc && cp ..." fails on
// Windows because npm lifecycle scripts run through cmd.exe regardless of the
// action-level shell. Pure Node file operations keep every platform identical.
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lib = join(root, 'lib')

rmSync(lib, { recursive: true, force: true })

const tscBin = join(root, 'node_modules', 'typescript', 'bin', 'tsc')
const tsc = spawnSync(process.execPath, [tscBin, '-p', 'tsconfig.json'], {
  cwd: root,
  stdio: 'inherit',
})
if (tsc.error) throw tsc.error
if (tsc.status !== 0) process.exit(tsc.status || 1)

mkdirSync(join(lib, 'tests', 'fixtures'), { recursive: true })
cpSync(join(root, 'src', 'client.js'), join(lib, 'client.js'))
for (const entry of readdirSync(join(root, 'src', 'tests', 'fixtures'))) {
  cpSync(join(root, 'src', 'tests', 'fixtures', entry), join(lib, 'tests', 'fixtures', entry))
}
