/**
 * Subscription limits — host half.
 *
 * Resolves provider API keys through the harness credential seam, queries each
 * provider's subscription-usage or balance endpoint, normalizes 5-hour /
 * weekly / monthly windows, and serves one loopback JSON route. Keys stay
 * host-side; the browser receives percentages and amounts only.
 *
 * Providers come from a built-in registry (OpenCode Go, MiniMax, GLM Coding
 * Plan, Kimi For Coding, OpenRouter, DeepSeek, Moonshot). A profile may add or
 * override entries through the row `config.providers` list, and provider keys
 * are discovered from the profile's `llm-pi-ai` routes as well as from the
 * registry's default credential references.
 */

export const name = 'subscription-limits'
export const inject = ['webServer', 'credentials']

/** Loopback JSON route the browser half polls. */
const ROUTE_PATH = '/api/subscription-limits/overview'

/** A successful probe cycle is reused for this long before a fresh one starts. */
const CACHE_TTL_MS = 30_000

/** One probe may not stall the route longer than this. */
const FETCH_TIMEOUT_MS = 12_000

/* ------------------------------------------------------------------ *
 * Small value helpers
 * ------------------------------------------------------------------ */

/** Numeric coercion that rejects NaN and blank strings. */
function toNum(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

/** Non-empty trimmed string, else undefined. */
function str(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

/** Clamp a provider percentage into the renderable 0-100 band. */
function clampPercent(value) {
  return Math.max(0, Math.min(100, value))
}

/** Millisecond epoch or date string to ISO 8601, else undefined. */
function toIso(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    const ms = value < 1e12 ? value * 1000 : value
    const date = new Date(ms)
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
  }
  if (typeof value === 'string' && value !== '') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
  }
  return undefined
}

/** Fixed two-decimal display string. */
function money(value) {
  return value.toFixed(2)
}

/** Percent used from a used/limit pair, tolerant of either side being missing. */
function usedPercent(used, limit) {
  const u = toNum(used)
  const l = toNum(limit)
  if (u === undefined || l === undefined || l <= 0) return undefined
  return clampPercent((u / l) * 100)
}

/** Read a volatile config reference when the loader hands one over. */
function unwrapValue(value) {
  if (value !== null && typeof value === 'object' && typeof value.get === 'function') {
    try {
      return value.get()
    } catch {
      return undefined
    }
  }
  return value
}

/* ------------------------------------------------------------------ *
 * Provider response parsers
 * ------------------------------------------------------------------ */

/** OpenCode Go: percent-only rolling / weekly / monthly windows. */
function parseOpenCodeGo(body) {
  const usage = body?.usage
  if (typeof usage !== 'object' || usage === null) return undefined
  const windows = []
  for (const [field, key] of [['rolling', '5h'], ['weekly', 'week'], ['monthly', 'month']]) {
    const entry = usage[field]
    if (typeof entry !== 'object' || entry === null) continue
    const percent = toNum(entry.percent)
    if (percent === undefined) continue
    windows.push({
      key,
      percent: clampPercent(percent),
      // A 0 % window reports a placeholder reset time; drop it.
      resetsAt: percent === 0 ? undefined : toIso(entry.resetsAt),
    })
  }
  return windows.length === 0 ? undefined : { windows }
}

/** MiniMax coding plan: remaining-percent semantics on the `general` row. */
function parseMiniMax(body) {
  const remains = body?.model_remains
  if (!Array.isArray(remains)) return undefined
  const general = remains.find((entry) => typeof entry === 'object' && entry !== null && entry.model_name === 'general')
  if (typeof general !== 'object' || general === null) return undefined
  const windows = []
  const intervalRemaining = toNum(general.current_interval_remaining_percent)
  if (intervalRemaining !== undefined) {
    windows.push({ key: '5h', percent: clampPercent(100 - intervalRemaining), resetsAt: toIso(general.end_time) })
  }
  if (general.current_weekly_status === 1) {
    const weeklyRemaining = toNum(general.current_weekly_remaining_percent)
    if (weeklyRemaining !== undefined) {
      windows.push({ key: 'week', percent: clampPercent(100 - weeklyRemaining), resetsAt: toIso(general.weekly_end_time) })
    }
  }
  return windows.length === 0 ? undefined : { windows }
}

/** GLM Coding Plan: windows keyed by the provider's `unit` code (3/6/5). */
const GLM_UNIT_KEYS = { 3: '5h', 5: 'month', 6: 'week' }

/** Percent from a GLM credit row's exact ratio, else its own percentage. */
function glmCreditPercent(row) {
  const used = toNum(row.currentValue)
  const limit = toNum(row.usage)
  if (used !== undefined && limit !== undefined && limit > 0) return clampPercent((used / limit) * 100)
  const percentage = toNum(row.percentage)
  return percentage === undefined ? undefined : clampPercent(percentage)
}

/** GLM / Z.AI coding-plan quota endpoint (`/api/monitor/usage/quota/limit`). */
function parseGlm(body) {
  if (body?.success !== true) return undefined
  const limits = body?.data?.limits
  if (!Array.isArray(limits)) return undefined
  const windows = []
  for (const entry of limits) {
    if (typeof entry !== 'object' || entry === null) continue
    const kind = str(entry.type)
    // The MCP request cap is a per-minute request budget, not a plan window.
    if (kind === 'TIME_LIMIT') continue
    const key = GLM_UNIT_KEYS[toNum(entry.unit) ?? Number.NaN]
    if (key === undefined) continue
    if (kind !== 'TOKENS_LIMIT' && kind !== 'CREDIT_LIMIT') continue
    let percent
    if (kind === 'CREDIT_LIMIT') {
      percent = glmCreditPercent(entry)
    } else {
      const percentage = toNum(entry.percentage)
      percent = percentage === undefined ? undefined : clampPercent(percentage)
    }
    windows.push({ key, percent, resetsAt: toIso(entry.nextResetTime) })
  }
  return windows.length === 0 ? undefined : { windows }
}

/** Kimi For Coding: `limits[]` per-window rows plus the weekly `usage` summary. */
function parseKimi(body) {
  if (typeof body !== 'object' || body === null) return undefined
  const windows = []
  if (Array.isArray(body.limits)) {
    for (const entry of body.limits) {
      if (typeof entry !== 'object' || entry === null) continue
      const detail = entry.detail
      if (typeof detail !== 'object' || detail === null) continue
      const duration = typeof entry.window === 'object' && entry.window !== null ? toNum(entry.window.duration) : undefined
      const unit = typeof entry.window === 'object' && entry.window !== null ? str(entry.window.timeUnit) : undefined
      let key = 'window'
      if (duration === 300 && unit === 'TIME_UNIT_MINUTE') key = '5h'
      else if (duration === 10080) key = 'week'
      else if (duration !== undefined) key = 'w-' + duration
      windows.push({
        key,
        percent: usedPercent(detail.used, detail.limit),
        resetsAt: toIso(detail.resetTime),
      })
    }
  }
  if (typeof body.usage === 'object' && body.usage !== null) {
    windows.push({
      key: 'week',
      percent: usedPercent(body.usage.used, body.usage.limit),
      resetsAt: toIso(body.usage.resetTime),
    })
  }
  const unique = windows.filter((window, index) => windows.findIndex((other) => other.key === window.key) === index)
  return unique.length === 0 ? undefined : { windows: unique }
}

/** OpenRouter prepaid credits: purchased minus used. */
function parseOpenRouter(body) {
  const data = body?.data
  if (typeof data !== 'object' || data === null) return undefined
  const credits = toNum(data.total_credits)
  const used = toNum(data.total_usage) ?? 0
  if (credits === undefined) return undefined
  return { balance: { amount: money(credits - used), currency: 'USD' } }
}

/** DeepSeek API balance: first balance_info row. */
function parseDeepSeek(body) {
  const infos = body?.balance_infos
  if (!Array.isArray(infos) || infos.length === 0) return undefined
  const first = infos[0]
  if (typeof first !== 'object' || first === null) return undefined
  const currency = str(first.currency)
  const total = str(first.total_balance)
  if (currency === undefined || total === undefined) return undefined
  return { balance: { amount: total, currency } }
}

/** Moonshot balance: `data.available_balance` in the site's currency. */
function parseMoonshot(body, provider) {
  const available = toNum(body?.data?.available_balance)
  if (available === undefined) return undefined
  return { balance: { amount: money(available), currency: provider.currency ?? 'CNY' } }
}

/** Parser registry; custom providers name one of these by `parser`. */
const PARSERS = {
  'opencode-go': parseOpenCodeGo,
  minimax: parseMiniMax,
  glm: parseGlm,
  kimi: parseKimi,
  openrouter: parseOpenRouter,
  deepseek: parseDeepSeek,
  moonshot: parseMoonshot,
}

/** Parser registry, exported for local adapter tests. */
export { PARSERS as parsers }

/* ------------------------------------------------------------------ *
 * Built-in provider registry
 * ------------------------------------------------------------------ */

/**
 * `refs` are credential references tried in order after the profile's own
 * `llm-pi-ai` apiKeyEnv for the same route id. `auth` is how the key rides the
 * request: Bearer by default, raw for providers that expect the bare key.
 */
const DEFAULT_PROVIDERS = [
  {
    id: 'opencode-go',
    name: 'OpenCode Go',
    kind: 'plan',
    parser: 'opencode-go',
    url: 'https://opencode.ai/zen/go/v1/usage',
    refs: ['OPENCODE_GO_API_KEY'],
  },
  {
    id: 'minimax',
    name: 'MiniMax Coding Plan',
    kind: 'plan',
    parser: 'minimax',
    url: 'https://api.minimax.io/v1/api/openplatform/coding_plan/remains',
    refs: ['MINIMAX_API_KEY'],
  },
  {
    id: 'minimax-cn',
    name: 'MiniMax Coding Plan (CN)',
    kind: 'plan',
    parser: 'minimax',
    url: 'https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains',
    refs: ['MINIMAX_CN_API_KEY'],
  },
  {
    id: 'zai',
    name: 'GLM Coding Plan (Z.AI)',
    kind: 'plan',
    parser: 'glm',
    url: 'https://api.z.ai/api/monitor/usage/quota/limit',
    refs: ['ZAI_API_KEY'],
    auth: 'raw',
    headers: { 'accept-language': 'en-US,en' },
  },
  {
    id: 'zai-coding-cn',
    name: 'GLM Coding Plan (BigModel)',
    kind: 'plan',
    parser: 'glm',
    url: 'https://open.bigmodel.cn/api/monitor/usage/quota/limit',
    refs: ['ZAI_CODING_CN_API_KEY', 'ZHIPU_API_KEY', 'GLM_API_KEY'],
    auth: 'raw',
    headers: { 'accept-language': 'en-US,en' },
  },
  {
    id: 'kimi-coding',
    name: 'Kimi For Coding',
    kind: 'plan',
    parser: 'kimi',
    url: 'https://api.kimi.com/coding/v1/usages',
    refs: ['KIMI_API_KEY'],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    kind: 'balance',
    parser: 'openrouter',
    url: 'https://openrouter.ai/api/v1/credits',
    refs: ['OPENROUTER_API_KEY'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    kind: 'balance',
    parser: 'deepseek',
    url: 'https://api.deepseek.com/user/balance',
    refs: ['DEEPSEEK_API_KEY'],
  },
  {
    id: 'moonshot-cn',
    name: 'Moonshot AI (CN)',
    kind: 'balance',
    parser: 'moonshot',
    currency: 'CNY',
    url: 'https://api.moonshot.cn/v1/users/me/balance',
    refs: ['MOONSHOT_API_KEY'],
  },
  {
    id: 'moonshot',
    name: 'Moonshot AI',
    kind: 'balance',
    parser: 'moonshot',
    currency: 'USD',
    url: 'https://api.moonshot.ai/v1/users/me/balance',
    refs: ['MOONSHOT_AI_API_KEY', 'MOONSHOT_API_KEY'],
  },
]

/** Route config to effective provider list (defaults + overrides + hide). */
function resolveProviders(config) {
  const rows = new Map(DEFAULT_PROVIDERS.map((provider) => [provider.id, { ...provider }]))
  const overrides = Array.isArray(config?.providers) ? config.providers : []
  for (const raw of overrides) {
    if (raw === null || typeof raw !== 'object' || typeof raw.id !== 'string' || raw.id === '') continue
    const base = rows.get(raw.id) ?? { id: raw.id, kind: 'plan', refs: [] }
    const refs = Array.isArray(raw.refs)
      ? raw.refs.map(String)
      : (typeof raw.env === 'string' && raw.env !== '' ? [raw.env] : (base.refs ?? []))
    rows.set(raw.id, {
      ...base,
      ...raw,
      refs,
      kind: raw.kind === 'balance' ? 'balance' : (base.kind ?? 'plan'),
    })
  }
  const hidden = new Set(Array.isArray(config?.hide) ? config.hide.map(String) : [])
  return [...rows.values()].filter((provider) => !hidden.has(provider.id))
}

/* ------------------------------------------------------------------ *
 * Credential resolution
 * ------------------------------------------------------------------ */

/** Read `llm-pi-ai` provider apiKeyEnv references from the composed settings. */
function readPiAiProfiles(ctx) {
  const map = {}
  try {
    const settings = ctx.get('settings')
    if (settings === undefined) return map
    let descriptors
    if (typeof settings.describe === 'function') {
      descriptors = settings.describe({ redactSecrets: false })
    } else if (typeof settings.get === 'function') {
      const value = settings.get('llm-pi-ai')
      descriptors = value === undefined ? [] : [{ ns: 'llm-pi-ai', value }]
    }
    for (const descriptor of Array.isArray(descriptors) ? descriptors : []) {
      const value = unwrapValue(descriptor?.value)
      const providers = value !== null && typeof value === 'object' ? value.providers : undefined
      if (providers === null || typeof providers !== 'object') continue
      for (const [id, profile] of Object.entries(providers)) {
        const ref = profile !== null && typeof profile === 'object' ? profile.apiKeyEnv : undefined
        if (typeof ref === 'string' && ref !== '') map[id] = ref
      }
    }
  } catch {
    // A settings surface that is absent or mid-reload reads as no discovery.
  }
  return map
}

/** Resolve the first usable key from a provider's reference candidates. */
async function resolveKey(ctx, provider, discovered) {
  let credentials
  try {
    credentials = ctx.get('credentials')
  } catch {
    return undefined
  }
  if (credentials === undefined) return undefined
  const refs = []
  const discoveredRef = discovered[provider.id]
  if (typeof discoveredRef === 'string') refs.push(discoveredRef)
  for (const ref of provider.refs ?? []) if (!refs.includes(ref)) refs.push(ref)
  for (const ref of refs) {
    try {
      // A credential reference is the plain environment-variable-shaped string
      // (the `credentialRef` brand is compile-time only), so the seam accepts
      // it as-is and this plugin needs no host-package import of its own.
      const resolved = await credentials.resolve(ref)
      const value = resolved?.value
      if (typeof value === 'string' && value !== '') return value
    } catch {
      // A malformed reference reads as absent.
    }
  }
  return undefined
}

/* ------------------------------------------------------------------ *
 * Probing and normalization
 * ------------------------------------------------------------------ */

/** Query one provider and normalize its answer. */
async function probeProvider(ctx, provider, discovered) {
  const key = await resolveKey(ctx, provider, discovered)
  if (key === undefined) return undefined
  const headers = {
    accept: 'application/json',
    ...(provider.auth === 'raw' ? { authorization: key } : { authorization: 'Bearer ' + key }),
    ...(provider.headers ?? {}),
  }
  const response = await fetch(provider.url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  const text = await response.text()
  let body
  try {
    body = text === '' ? undefined : JSON.parse(text)
  } catch {
    body = undefined
  }
  if (!response.ok) throw new Error('HTTP ' + response.status)
  const parse = PARSERS[provider.parser]
  if (typeof parse !== 'function') throw new Error('unknown parser: ' + provider.parser)
  const parsed = parse(body, provider)
  if (parsed === undefined) throw new Error('unexpected provider response')
  return {
    id: provider.id,
    name: provider.name ?? provider.id,
    kind: provider.kind ?? 'plan',
    status: 'ok',
    ...(parsed.windows !== undefined ? { windows: parsed.windows } : {}),
    ...(parsed.balance !== undefined ? { balance: parsed.balance } : {}),
  }
}

/** Run every configured provider probe; one failure never hides the others. */
async function collect(ctx, providers, discovered) {
  const results = await Promise.all(providers.map(async (provider) => {
    const key = await resolveKey(ctx, provider, discovered)
    if (key === undefined) return undefined
    try {
      return await probeProvider(ctx, provider, discovered)
    } catch (error) {
      return {
        id: provider.id,
        name: provider.name ?? provider.id,
        kind: provider.kind ?? 'plan',
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }))
  return {
    updatedAt: Date.now(),
    providers: results.filter((provider) => provider !== undefined),
  }
}

/* ------------------------------------------------------------------ *
 * HTTP plumbing
 * ------------------------------------------------------------------ */

/** Whether the request comes from this machine's loopback interface. */
function isLoopbackRequest(request) {
  const address = request.socket?.remoteAddress
  if (typeof address !== 'string') return true
  const normalized = address.toLowerCase()
  if (normalized === '::1') return true
  if (normalized.startsWith('::ffff:')) return /^127\./.test(normalized.slice('::ffff:'.length))
  return /^127\./.test(normalized)
}

/** Write one JSON response. */
function writeJson(response, status, value) {
  const body = JSON.stringify(value)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  response.end(body)
}

/**
 * Host body: one cached overview route for the browser half.
 * @param ctx - host root context.
 * @param config - the row's config (`providers`, `hide`).
 */
export function apply(ctx, config) {
  const providers = resolveProviders(unwrapValue(config))
  let cache
  let inflight

  /** Cached overview with one shared in-flight probe cycle. */
  const overview = () => {
    if (cache !== undefined && Date.now() - cache.at < CACHE_TTL_MS) return Promise.resolve(cache.data)
    if (inflight === undefined) {
      const discovered = readPiAiProfiles(ctx)
      inflight = collect(ctx, providers, discovered)
        .then((data) => {
          cache = { at: Date.now(), data }
          return data
        })
        .finally(() => {
          inflight = undefined
        })
    }
    return inflight
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: ROUTE_PATH,
    handler: async (request, response) => {
      if (!isLoopbackRequest(request)) {
        writeJson(response, 403, { ok: false, error: 'forbidden: loopback-only' })
        return
      }
      try {
        writeJson(response, 200, await overview())
      } catch (error) {
        writeJson(response, 502, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  }), 'subscription-limits: overview route')
}
