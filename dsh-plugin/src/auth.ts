/**
 * Pluggable authentication extension point.
 *
 * Business code never talks to a concrete auth scheme. It calls `authHeaders`
 * once, gets a plain header map, and passes it to the HTTP layer. To add a
 * provider later: implement `AuthProvider`, call `registerAuthProvider`, and
 * set `authProvider` / `authOptions` in the host (server-side) config.
 *
 * No provider is enabled in this build. `none` is the only registered one.
 */

import type { PluginConfig } from './types.js'

export interface AuthContext {
  /** Read-only view of the live plugin config. */
  readonly config: PluginConfig
  /** Provider-specific settings supplied by the host config, never by the UI overlay. */
  readonly options: Record<string, unknown>
}

export interface AuthProvider {
  readonly name: string
  /** Return headers to merge into every request made to the configured SkillHub API. */
  headers(context: AuthContext): Promise<Record<string, unknown>> | Record<string, unknown>
}

const providers = new Map<string, AuthProvider>()

export const noneAuthProvider: AuthProvider = {
  name: 'none',
  headers: () => ({}),
}

registerAuthProvider(noneAuthProvider)

/** Register a provider. Later registrations with the same name replace earlier ones. */
export function registerAuthProvider(provider: AuthProvider): void {
  const name = String(provider?.name || '').trim()
  if (!name) throw new Error('鉴权提供者缺少名称')
  providers.set(name, provider)
}

export function registeredAuthProviders(): string[] {
  return [...providers.keys()]
}

export function getAuthProvider(name: string): AuthProvider | undefined {
  return providers.get(String(name || '').trim())
}

function normalizeHeaders(raw: Record<string, unknown> | null | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [key, value] of Object.entries(raw)) {
    const name = key.trim()
    if (!name || typeof value !== 'string') continue
    out[name] = value
  }
  return out
}

/**
 * The single auth entry point used by all API-bound requests.
 * Icon and other third-party fetches must NOT call this function.
 */
export async function authHeaders(cfg: PluginConfig): Promise<Record<string, string>> {
  if (!cfg.authEnabled || !cfg.authProvider || cfg.authProvider === 'none') return {}
  const provider = getAuthProvider(cfg.authProvider)
  if (!provider) throw new Error(`未注册的鉴权提供者: ${cfg.authProvider}`)
  return normalizeHeaders(await provider.headers({
    config: cfg,
    options: cfg.authOptions && typeof cfg.authOptions === 'object' ? cfg.authOptions : {},
  }))
}
