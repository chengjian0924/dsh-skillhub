#!/usr/bin/env node
// Cross-platform replacement for the shell build script.
// The old "rm -rf lib && tsc && cp ..." failed on Windows runners because
// rm/cp are not native cmd.exe commands regardless of the action shell.
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lib = join(root, 'lib')

rmSync(lib, { recursive: true, force: true })

const tsc = spawnSync(process.execPath, [
  join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tsconfig.json',
], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })
if (tsc.error) throw tsc.error
if (tsc.status !== 0) process.exit(tsc.status || 1)

mkdirSync(join(lib, 'tests', 'fixtures'), { recursive: true })
cpSync(join(root, 'src', 'client.js'), join(lib, 'client.js'))
for (const entry of readdirSync(join(root, 'src', 'tests', 'fixtures'))) {
  cpSync(join(root, 'src', 'tests', 'fixtures', entry), join(lib, 'tests', 'fixtures', entry))
}
