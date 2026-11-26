import assert from 'node:assert/strict'
import test from 'node:test'
import { authHeaders, getAuthProvider, noneAuthProvider, registerAuthProvider, registeredAuthProviders } from '../auth.js'
import { withDefaults } from '../config-store.js'

const base = withDefaults({ apiBase: 'http://skillhub.internal' })

test('auth is disabled by default and never emits headers', async () => {
  assert.equal(base.authEnabled, false)
  assert.equal(base.authProvider, 'none')
  assert.deepEqual(await authHeaders(base), {})
  assert.equal(getAuthProvider('none'), noneAuthProvider)
  assert.ok(registeredAuthProviders().includes('none'))
})

test('a disabled provider is never invoked even when configured', async () => {
  let called = false
  registerAuthProvider({
    name: 'should-not-run',
    headers: () => { called = true; return { 'x-secret': 'leak' } },
  })
  const cfg = withDefaults({ authEnabled: false, authProvider: 'should-not-run' })
  assert.deepEqual(await authHeaders(cfg), {})
  assert.equal(called, false)
})

test('enabling a registered provider injects its headers and options', async () => {
  registerAuthProvider({
    name: 'header-test',
    headers: ({ options }) => ({
      'x-api-key': String(options.key ?? ''),
      'x-client-user-id': String(options.user ?? ''),
      ignored: 42,
    }),
  })
  const cfg = withDefaults({
    authEnabled: true,
    authProvider: 'header-test',
    authOptions: { key: 'local-key', user: 'u1' },
  })
  assert.deepEqual(await authHeaders(cfg), {
    'x-api-key': 'local-key',
    'x-client-user-id': 'u1',
  })
})

test('an unknown provider fails loudly instead of silently dropping auth', async () => {
  const cfg = withDefaults({ authEnabled: true, authProvider: 'missing' })
  await assert.rejects(() => authHeaders(cfg), /未注册的鉴权提供者: missing/)
})
