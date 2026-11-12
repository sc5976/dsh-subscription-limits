/**
 * Static smoke test for the subscription-limits browser bundle.
 *
 * Loads client.js with a stub module loader and a stub React, then:
 *  - captures the registered module id and factory,
 *  - runs the factory and calls apply() with a fake client context,
 *  - asserts the composer-dock registration,
 *  - renders the widget once per UI language and checks the copy.
 */
import fs from 'node:fs'
import assert from 'node:assert/strict'

const source = fs.readFileSync(new URL('./client.js', import.meta.url), 'utf8')

let captured
const window = {
  __ModuleLoader__: {
    load(spec) {
      captured = spec
    },
  },
}
globalThis.window = window
globalThis.document = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} }
globalThis.fetch = async () => { throw new Error('fetch must not run in a static render') }

// Evaluate the bundle (it only calls window.__ModuleLoader__.load).
new Function('window', source)(window)
assert.ok(captured, 'bundle registered a module')
assert.equal(captured.id, '@local/dsh-subscription-limits')
assert.equal(typeof captured.factory, 'function')

// --- stub React -----------------------------------------------------------
function createElement(type, props, ...children) {
  if (typeof type === 'function') {
    return type({ ...(props || {}), children: children.length <= 1 ? children[0] : children })
  }
  return { type, props: props || {}, children }
}
const baseReact = {
  createElement,
  useEffect() {},
  useRef(value) { return { current: value === undefined ? null : value } },
  useCallback(fn) { return fn },
  useSyncExternalStore(_subscribe, getSnapshot) { return getSnapshot() },
}

// The widget's useState order: state, open, pinned, position, language, showAll.
const presetQueue = []
const React = {
  ...baseReact,
  useState(initial) {
    if (presetQueue.length > 0) return [presetQueue.shift(), () => {}]
    const value = typeof initial === 'function' ? initial() : initial
    return [value, () => {}]
  },
}

const exportsObject = captured.factory((name) => {
  if (name === 'react') return React
  if (name === 'react-dom') return { createPortal: (node) => node }
  throw new Error('unexpected require: ' + name)
})
assert.deepEqual(exportsObject.inject, ['slots'])
assert.equal(typeof exportsObject.apply, 'function')

// --- fake client context --------------------------------------------------
let injection = null
let registered = null
const slotsOnly = {
  get() { return undefined },
  slots: {
    inject(ownerKey, callback) {
      injection = { ownerKey }
      callback()
      return () => {}
    },
    register(options, component) {
      registered = { options, component }
      return () => {}
    },
  },
}
exportsObject.apply(slotsOnly)
assert.equal(injection.ownerKey, 'conversation.composer.dock')
assert.equal(registered.options.name, 'conversation.composer.dock')
assert.equal(registered.options.id, 'subscription-limits')
assert.equal(typeof registered.component, 'function')
assert.equal(typeof registered.options.inject, 'function')
assert.deepEqual(registered.options.inject('session-1'), {}, 'without modelDirectories the widget falls back to every provider')

// With the model-selection service present, the slot inject exposes the
// session's model store plus its catalog loader.
const modelStore = {
  snapshot: {
    current: { provider: 'minimax', model: 'MiniMax-M3' },
    groups: [{ id: 'minimax', name: 'MiniMax', models: [{ id: 'MiniMax-M3', name: 'MiniMax-M3' }] }],
  },
  getSnapshot() { return this.snapshot },
  subscribe() { return () => {} },
}
const withModels = {
  ...slotsOnly,
  get(name) {
    if (name !== 'modelDirectories') return undefined
    return { directoryFor(sessionId) { return { store: modelStore, load: async () => {} } } }
  },
}
exportsObject.apply(withModels)
const injected = registered.options.inject('session-1')
assert.equal(injected.modelStore, modelStore, 'slot inject exposes the model store')
assert.equal(typeof injected.loadModels, 'function', 'slot inject exposes the catalog loader')

// --- canned host overview -------------------------------------------------
const overview = {
  status: 'ready',
  error: null,
  data: {
    updatedAt: Date.UTC(2026, 10, 10, 12, 15),
    providers: [
      {
        id: 'opencode-go', name: 'OpenCode Go', kind: 'plan', status: 'ok',
        windows: [
          { key: '5h', percent: 2, resetsAt: '2026-11-10T15:12:55.000Z' },
          { key: 'week', percent: 0 },
          { key: 'month', percent: 9, resetsAt: '2026-12-06T07:56:57.000Z' },
        ],
      },
      {
        id: 'minimax', name: 'MiniMax Coding Plan', kind: 'plan', status: 'ok',
        windows: [
          { key: '5h', percent: 4, resetsAt: '2026-11-10T15:00:00.000Z' },
          { key: 'week', percent: 2, resetsAt: '2026-11-16T00:00:00.000Z' },
        ],
      },
      { id: 'openrouter', name: 'OpenRouter', kind: 'balance', status: 'ok', balance: { amount: '10.00', currency: 'USD' } },
      { id: 'deepseek', name: 'DeepSeek', kind: 'balance', status: 'ok', balance: { amount: '5.45', currency: 'USD' } },
    ],
  },
}

const LANG_KEY = 'dsh-subscription-limits.lang'
const SHOW_ALL_KEY = 'dsh-subscription-limits.showAll'
function renderWith(language, options = {}) {
  const storage = {
    getItem(key) {
      if (key === LANG_KEY) return language
      if (key === SHOW_ALL_KEY) return options.showAll ? '1' : null
      return null
    },
    setItem() {},
  }
  globalThis.localStorage = storage
  window.localStorage = storage
  presetQueue.length = 0
  presetQueue.push(
    options.overview ?? overview,
    true, // popover open
    false, // not pinned
    { left: 20, bottom: 80 }, // anchored position
  )
  const props = {}
  if (options.modelStore !== undefined) props.modelStore = options.modelStore
  return registered.component(props)
}

const EXPECTED_TITLES = {
  en: 'Subscription limits',
  ru: 'Лимиты подписок',
  zh: '订阅额度',
  fr: 'Limites d’abonnement',
  es: 'Límites de suscripción',
  de: 'Abo-Limits',
  pt: 'Limites da assinatura',
  ja: 'サブスクリプションの上限',
  ko: '구독 한도',
}
const LANGUAGE_NAMES = ['English', 'Русский', '中文', 'Français', 'Español', 'Deutsch', 'Português', '日本語', '한국어']

for (const [language, title] of Object.entries(EXPECTED_TITLES)) {
  const tree = renderWith(language)
  const flat = JSON.stringify(tree)
  assert.ok(flat.includes(title), language + ': title rendered')
  assert.ok(flat.includes('OpenCode Go'), language + ': provider rendered')
  assert.ok(flat.includes('2%'), language + ': percentage rendered')
  assert.ok(flat.includes('10.00'), language + ': balance rendered')
  for (const name of LANGUAGE_NAMES) assert.ok(flat.includes(name), language + ': language option ' + name)
}

// Default language is English and its copy is English (the language list still
// carries each language's own name, so only the UI labels are asserted here).
const englishFlat = JSON.stringify(renderWith('en'))
assert.ok(englishFlat.includes('5h 2%'), 'en chip shows the 5-hour window')
assert.ok(englishFlat.includes('5 hours'), 'en render names the 5-hour window')
assert.ok(!englishFlat.includes('订阅额度'), 'en render does not use the Chinese title')
assert.ok(!englishFlat.includes('Лимиты подписок'), 'en render does not use the Russian title')

// Russian render carries Cyrillic window labels.
const russianFlat = JSON.stringify(renderWith('ru'))
assert.ok(russianFlat.includes('5ч 2%'), 'ru chip shows the 5-hour window')
assert.ok(russianFlat.includes('Неделя'), 'ru render names the week window')

// The newly added languages render their own labels too.
const germanFlat = JSON.stringify(renderWith('de'))
assert.ok(germanFlat.includes('Woche'), 'de render names the week window')
const portugueseFlat = JSON.stringify(renderWith('pt'))
assert.ok(portugueseFlat.includes('Semana'), 'pt render names the week window')
const japaneseFlat = JSON.stringify(renderWith('ja'))
assert.ok(japaneseFlat.includes('週間'), 'ja render names the week window')
const koreanFlat = JSON.stringify(renderWith('ko'))
assert.ok(koreanFlat.includes('주간'), 'ko render names the week window')

// The scope switch sits in the card header, left of the language select, and
// only appears when the host exposes the session's model selection.
for (const [language, label] of Object.entries({ en: 'All', ru: 'Все', zh: '全部', fr: 'Tout', es: 'Todo', de: 'Alle', pt: 'Tudo', ja: 'すべて', ko: '전체' })) {
  const tree = renderWith(language, { modelStore })
  const flat = JSON.stringify(tree)
  assert.ok(flat.includes('"role":"switch"'), language + ': scope switch rendered')
  assert.ok(flat.includes(label), language + ': scope switch copy')
}

// Without model data the switch is absent and every provider is listed.
const unscopedFlat = JSON.stringify(renderWith('en'))
assert.ok(!unscopedFlat.includes('"role":"switch"'), 'no scope switch without model data')
assert.ok(unscopedFlat.includes('OpenCode Go') && unscopedFlat.includes('MiniMax Coding Plan'), 'unscoped render lists every plan')
assert.ok(unscopedFlat.includes('10.00'), 'unscoped render lists balances')

// A current model on an untracked route cannot narrow anything: list it all.
const unknownStore = {
  snapshot: { current: { provider: 'deepseek-account', model: 'deepseek-chat' }, groups: [] },
  getSnapshot() { return this.snapshot },
  subscribe() { return () => {} },
}
const untrackedFlat = JSON.stringify(renderWith('en', { modelStore: unknownStore }))
assert.ok(untrackedFlat.includes('OpenCode Go') && untrackedFlat.includes('10.00'), 'untracked route keeps every provider')
assert.ok(!untrackedFlat.includes('Current model ·'), 'untracked route shows no current-model caption')

// A known current model narrows the chip and card to its provider only.
const scopedFlat = JSON.stringify(renderWith('en', { modelStore }))
assert.ok(scopedFlat.includes('MiniMax Coding Plan'), 'scoped render shows the current model provider')
assert.ok(!scopedFlat.includes('OpenCode Go'), 'scoped render hides other plans')
assert.ok(!scopedFlat.includes('10.00'), 'scoped render hides unrelated balances')
assert.ok(scopedFlat.includes('Current model · MiniMax-M3'), 'scoped render names the current model')
assert.ok(scopedFlat.includes('"aria-checked":false'), 'scope switch is off by default')

// The switch widens back to every provider.
const expandedFlat = JSON.stringify(renderWith('en', { modelStore, showAll: true }))
assert.ok(expandedFlat.includes('OpenCode Go') && expandedFlat.includes('MiniMax Coding Plan'), 'expanded render lists every plan')
assert.ok(expandedFlat.includes('10.00'), 'expanded render lists balances')
assert.ok(expandedFlat.includes('"aria-checked":true'), 'scope switch reports the expanded state')

console.log('OK: client bundle renders all nine languages, registers the composer-dock widget, and scopes providers to the current model')
