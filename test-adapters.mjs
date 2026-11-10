/**
 * Adapter tests for the subscription-limits host half.
 *
 * Imports the exported parser registry and feeds it representative provider
 * responses, asserting the normalized windows/balances the browser renders.
 */
import assert from 'node:assert/strict'
import { parsers } from './index.js'

// --- OpenCode Go ----------------------------------------------------------
const opencode = parsers['opencode-go']({
  usage: {
    rolling: { percent: 2, resetsAt: '2026-11-10T15:12:55.000Z' },
    weekly: { percent: 0, resetsAt: '2026-11-17T00:00:00.000Z' },
    monthly: { percent: 9, resetsAt: '2026-12-06T07:56:57.000Z' },
  },
})
assert.equal(opencode.windows.length, 3)
assert.equal(opencode.windows[0].key, '5h')
assert.equal(opencode.windows[0].percent, 2)
assert.equal(opencode.windows[1].key, 'week')
assert.equal(opencode.windows[1].resetsAt, undefined, 'a 0 % window drops its placeholder reset time')
assert.equal(opencode.windows[2].key, 'month')

// --- MiniMax --------------------------------------------------------------
const minimax = parsers.minimax({
  model_remains: [{
    model_name: 'general',
    current_interval_remaining_percent: 96,
    end_time: 1794313200000,
    current_weekly_status: 1,
    current_weekly_remaining_percent: 98,
    weekly_end_time: 1794825600000,
  }],
})
assert.deepEqual(minimax.windows.map((window) => [window.key, window.percent]), [['5h', 4], ['week', 2]])
assert.ok(minimax.windows[0].resetsAt.startsWith('2026-'))

// --- GLM coding plan ------------------------------------------------------
const glm = parsers.glm({
  success: true,
  data: {
    limits: [
      { type: 'TIME_LIMIT', unit: 5, percentage: 50 },
      { type: 'TOKENS_LIMIT', unit: 3, percentage: 12, nextResetTime: '2026-11-10T15:00:00Z' },
      { type: 'TOKENS_LIMIT', unit: 6, percentage: 40, nextResetTime: '2026-11-16T00:00:00Z' },
      { type: 'TOKENS_LIMIT', unit: 5, percentage: 7 },
      { type: 'CREDIT_LIMIT', unit: 6, currentValue: 25, usage: 100 },
    ],
  },
})
assert.deepEqual(glm.windows.map((window) => [window.key, Math.round(window.percent)]), [['5h', 12], ['week', 40], ['month', 7], ['week', 25]])

// --- Kimi For Coding ------------------------------------------------------
const kimi = parsers.kimi({
  limits: [{ window: { duration: 300, timeUnit: 'TIME_UNIT_MINUTE' }, detail: { limit: 100, used: 30, resetTime: '2026-11-10T15:00:00Z' } }],
  usage: { limit: 1000, used: 250, resetTime: '2026-11-16T00:00:00Z' },
})
const kimiKeys = kimi.windows.map((window) => window.key)
assert.deepEqual(kimiKeys, ['5h', 'week'])
assert.equal(Math.round(kimi.windows[1].percent), 25)

// --- Balances -------------------------------------------------------------
assert.deepEqual(parsers.openrouter({ data: { total_credits: 15, total_usage: 5 } }), {
  balance: { amount: '10.00', currency: 'USD' },
})
assert.deepEqual(parsers.deepseek({ balance_infos: [{ currency: 'USD', total_balance: '5.45' }] }), {
  balance: { amount: '5.45', currency: 'USD' },
})
assert.deepEqual(parsers.moonshot({ data: { available_balance: 12.5 } }, { currency: 'CNY' }), {
  balance: { amount: '12.50', currency: 'CNY' },
})

// --- Unknown shapes read as unsupported, never throw ----------------------
assert.equal(parsers.glm({ success: false }), undefined)
assert.equal(parsers.minimax({ model_remains: [] }), undefined)
assert.equal(parsers.openrouter({ data: {} }), undefined)

console.log('OK: all provider adapters normalize their responses')
