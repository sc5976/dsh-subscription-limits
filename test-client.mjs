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
}

// The widget's useState order: state, open, pinned, position, language.
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
  assert.equal(name, 'react')
  return React
})
assert.deepEqual(exportsObject.inject, ['slots'])
assert.equal(typeof exportsObject.apply, 'function')

// --- fake client context --------------------------------------------------
let injection = null
let registered = null
exportsObject.apply({
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
})
assert.equal(injection.ownerKey, 'conversation.composer.dock')
assert.equal(registered.options.name, 'conversation.composer.dock')
assert.equal(registered.options.id, 'subscription-limits')
assert.equal(typeof registered.component, 'function')

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
function renderWith(language) {
  const storage = {
    getItem(key) { return key === LANG_KEY ? language : null },
    setItem() {},
  }
  globalThis.localStorage = storage
  window.localStorage = storage
  presetQueue.length = 0
  presetQueue.push(
    overview,
    true, // popover open
    false, // not pinned
    { left: 20, bottom: 80 }, // anchored position
  )
  return registered.component({})
}

const EXPECTED_TITLES = {
  en: 'Subscription limits',
  ru: 'Лимиты подписок',
  zh: '订阅额度',
  fr: 'Limites d’abonnement',
  es: 'Límites de suscripción',
}
const LANGUAGE_NAMES = ['English', 'Русский', '中文', 'Français', 'Español']

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

console.log('OK: client bundle renders all five languages and registers the composer-dock widget')
