import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test, { type TestContext } from 'node:test'
import { withDefaults } from '../config-store.js'
import { handleApi } from '../local-api.js'
import { bindRuntimeProfileHost } from '../runtime-profile.js'

async function fixture(t: TestContext) {
  const home = mkdtempSync(join(tmpdir(), 'skillhub-client-api-'))
  const desktop = join(home, 'profiles', 'desktop')
  bindRuntimeProfileHost({ profileContext: { name: 'desktop', dir: desktop, home } })
  const cfg = withDefaults({ skillsDir: join(home, 'skills') })
  const server = createServer((req, res) => void handleApi(req, res, cfg))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  cfg.apiBase = `http://127.0.0.1:${address.port}`
  t.after(async () => {
    await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()))
    bindRuntimeProfileHost(undefined)
    rmSync(home, { recursive: true, force: true })
  })
  return {
    async post(body: Record<string, unknown>) {
      const response = await fetch(`${cfg.apiBase}/skillhub`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      return { response, data: await response.json() as Record<string, unknown> }
    },
  }
}

test('local API exposes config without authOptions and rejects unknown methods', async (t) => {
  const b = await fixture(t)
  const config = await b.post({ method: 'config' })
  assert.equal(config.response.status, 200)
  assert.equal(config.data.authEnabled, false)
  assert.equal('authOptions' in config.data, false)
  const unknown = await b.post({ method: 'pluginInstall' })
  assert.equal(unknown.response.status, 400)
  assert.equal(unknown.data.ok, false)
})
