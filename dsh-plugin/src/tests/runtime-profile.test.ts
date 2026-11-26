import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test, { type TestContext } from 'node:test'
import { bindRuntimeProfileHost, currentProfileDir, dshHome, isDesktopHost, resolveRuntimeProfile } from '../runtime-profile.js'

function fixture(t: TestContext) {
  const home = mkdtempSync(join(tmpdir(), 'skillhub-profiles-'))
  const desktop = join(home, 'profiles', 'desktop')
  const custom = join(home, 'profiles', 'custom')
  writeFileSync(join(home, 'skillhub.json'), JSON.stringify({ apiBase: 'http://skillhub.internal' }))
  bindRuntimeProfileHost({ get: (name) => name === 'profileContext' ? { name: 'desktop', dir: desktop, home } : undefined })
  t.after(() => {
    bindRuntimeProfileHost(undefined)
    rmSync(home, { recursive: true, force: true })
  })
  return { home, desktop, custom }
}

test('runtime profile uses the launcher context and preserves its home and directory', (t) => {
  const { home, desktop, custom } = fixture(t)
  assert.deepEqual(resolveRuntimeProfile(undefined, { argv: ['node', 'bin.js', '--profile', 'web'] }), { name: 'desktop', dir: desktop, home })
  assert.equal(dshHome(), home)
  assert.equal(currentProfileDir(), desktop)
  assert.deepEqual(resolveRuntimeProfile('custom'), { name: 'custom', dir: custom, home })
  assert.throws(() => resolveRuntimeProfile('../web'), /无效 profile/)
  assert.throws(() => resolveRuntimeProfile(undefined, { host: { profileContext: { name: '../web' } } }), /profile 名称无效/)
})

test('runtime profile supports CLI selections and detects Desktop without a bound host', () => {
  const home = join(tmpdir(), 'skillhub-profile-fallback')
  const input = { host: {}, home, electron: false }
  assert.equal(resolveRuntimeProfile(undefined, { ...input, argv: ['node', 'bin.js', '--profile', 'team-web'] }).name, 'team-web')
  assert.equal(resolveRuntimeProfile(undefined, { ...input, argv: ['node', 'bin.js', '--profile=custom'] }).name, 'custom')
  assert.equal(resolveRuntimeProfile(undefined, { ...input, argv: ['node', 'bin.js', 'custom'] }).name, 'custom')
  assert.equal(resolveRuntimeProfile('团队 工作区', { ...input, argv: [] }).name, '团队 工作区')
  assert.equal(resolveRuntimeProfile(undefined, { ...input, argv: ['node', 'bin.js', 'web', '--', '--profile', 'other'] }).name, 'web')
  assert.equal(resolveRuntimeProfile(undefined, { ...input, argv: ['node', 'bin.js'] }).name, 'web')
  assert.equal(resolveRuntimeProfile(undefined, { ...input, argv: ['electron', 'index.js'], electron: true }).name, 'desktop')
  assert.equal(isDesktopHost(['electron', '/app/@deepseek-ai/dsh-desktop-host/lib/index.js'], {}), true)
  assert.equal(isDesktopHost(['node', 'bin.js'], { ELECTRON_RUN_AS_NODE: '1' }), true)
  assert.equal(resolveRuntimeProfile(undefined, {
    host: {}, home,
    argv: ['electron', '/app/@deepseek-ai/dsh-desktop-host/lib/index.js', '/app/runtime', '/projects/example'],
  }).name, 'desktop')
  assert.throws(() => resolveRuntimeProfile(undefined, { ...input, argv: ['node', 'bin.js', '--profile', '../web'] }), /无效 profile/)
  assert.throws(() => resolveRuntimeProfile(undefined, { ...input, argv: ['node', 'bin.js', '--profile'] }), /缺少 profile/)
  assert.throws(() => resolveRuntimeProfile('node_modules', input), /无效 profile/)
})
