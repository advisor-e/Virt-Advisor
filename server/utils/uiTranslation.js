'use strict'

/**
 * @file The app's own wording in a reader's language — translated by the backend once per
 *   language, stored at the platform scope, and shared by every reader of that language.
 * @module server/utils/uiTranslation
 *
 * 🔴 WHY THIS REPLACED THE BROWSER POSTING ITS ENGLISH TO MYMEMORY (Mike, 2026-09-25).
 * The English wording is ~40,000 words in ~5,900 strings. MyMemory's free allowance is
 * about 10,000 words a day, and a failed chunk came back as the English it was sent — which
 * the browser then cached as the finished translation, for good. Measured the same day: one
 * language needed about four days of allowance, so every non-English reader saw mostly
 * English. The seven languages with a partial static file never asked at all.
 *
 * 🔴 NOTHING A PERSON TYPED REACHES THE MODEL. The source is `locales/en.json` and
 * Collaborate's wording file, read from disk here — the browser sends a language code and
 * nothing else. That is what makes `personal: false` and `moderate: []` true rather than
 * convenient (design/OPENAI-ZDR-CONSTRAINTS.md Z3), and why a chat message's translation
 * does NOT come through this file: it stays on /api/translate/locale, because a message
 * is personal content and only Meeting Review may send that to a model.
 *
 * 🔴 A TRANSLATION IS NOT TRUSTED. Each string is checked before it is kept: its
 * placeholders, plural separators and HTML tags must come back exactly as they went. A
 * string that fails is served in English and retried later — never cached as translated.
 *
 * Node 14, CommonJS.
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const overlay = require('./firmOverlay')
const { PLATFORM_SCOPE } = require('./platformScope')
const { nameForLanguageCode } = require('./languageName')
const aiProvider = require('./aiProvider')

const LOCALES_DIR = path.join(__dirname, '..', '..', 'locales')
const CONFIG_PREFIX = 'ui-translation:'
const AI_ROLE = 'translate'

/** One model call carries at most this many strings, or this many English characters. */
const BATCH_MAX_STRINGS = 60
const BATCH_MAX_CHARS = 4000
/** Model calls in flight at once for one language. */
const CONCURRENCY = 4
/** The store is written after this many batches, and again at the end. */
const SAVE_EVERY = 10
/** A string that failed its check is not retried sooner than this. */
const RETRY_FAILED_AFTER_MS = 60 * 60 * 1000
const CALL_TIMEOUT_MS = 120000

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * `{a:{b:'x'}}` → `{'a.b':'x'}`. Only string leaves are kept.
 * @param {object} obj
 * @param {string} [prefix]
 * @param {object} [out]
 * @returns {Object<string,string>}
 */
function flatten (obj, prefix, out) {
  const acc = out || {}
  Object.keys(obj).forEach((k) => {
    if (FORBIDDEN_KEYS.has(k)) { return }
    const key = prefix ? prefix + '.' + k : k
    const v = obj[k]
    if (v && typeof v === 'object') { flatten(v, key, acc) } else if (typeof v === 'string') { acc[key] = v }
  })
  return acc
}

/**
 * The inverse of `flatten`. A path with a forbidden segment is dropped, never written.
 * @param {Object<string,string>} flat
 * @returns {object}
 */
function unflatten (flat) {
  const result = {}
  Object.keys(flat).forEach((key) => {
    const parts = key.split('.')
    if (parts.some(p => FORBIDDEN_KEYS.has(p))) { return }
    let cur = result
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') { cur[parts[i]] = {} }
      cur = cur[parts[i]]
    }
    cur[parts[parts.length - 1]] = flat[key]
  })
  return result
}

function hashOf (text) {
  return crypto.createHash('sha1').update(String(text)).digest('hex').slice(0, 12)
}

function readJson (file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

let _source = null

/**
 * Every English string the browser can show — `en.json` plus Collaborate's sections, joined
 * the way plugins/i18n.js joins them, and refusing a collision the same way.
 * @returns {{flat: Object<string,string>, version: string}}
 */
function englishSource () {
  if (_source) { return _source }
  const en = readJson(path.join(LOCALES_DIR, 'en.json'))
  const collab = readJson(path.join(LOCALES_DIR, 'collaborate', 'en.json'))
  const merged = Object.assign({}, en)
  Object.keys(collab).forEach((section) => {
    if (Object.prototype.hasOwnProperty.call(en, section)) {
      throw new Error("uiTranslation: section '" + section + "' exists in both locale files")
    }
    merged[section] = collab[section]
  })
  const flat = flatten(merged)
  _source = { flat, version: hashOf(JSON.stringify(flat)) }
  return _source
}

/**
 * The strings a shipped static file already holds for this language. They keep their
 * shipped wording, so a reader of one of the seven sees no change to what was there.
 * @param {string} code
 * @returns {Object<string,string>}
 */
function staticStrings (code) {
  const file = path.join(LOCALES_DIR, code + '.json')
  if (code === 'en' || !fs.existsSync(file)) { return {} }
  return flatten(readJson(file))
}

/**
 * U+FFFD is what a letter becomes when its bytes were decoded in two halves. Until
 * 2026-09-25 the OpenAI reader did exactly that, and stored German had "Verm��genswerte".
 * @param {string} text
 * @returns {boolean}
 */
function hasBrokenCharacter (text) {
  return String(text).includes('�')
}

/** A stored translation still good to serve: same English, and no broken character. */
function usable (cached, english) {
  return !!cached && cached.h === hashOf(english) && typeof cached.t === 'string' &&
    !(hasBrokenCharacter(cached.t) && !hasBrokenCharacter(english))
}

const PLACEHOLDER = /\{[A-Za-z0-9_]+\}/g
const TAG = /<[^>]*>/g

function sortedMatches (text, re) {
  return (String(text).match(re) || []).slice().sort()
}

function sameList (a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

/**
 * Whether a translated string may replace its English one.
 *
 * Every rule here protects something that breaks silently on screen: a lost `{name}` prints
 * nothing where a name belongs, a lost `|` collapses a plural, and a changed tag is how
 * markup would get into a `v-html` — which is why tags must match EXACTLY, attributes and all.
 *
 * @param {string} english
 * @param {*} translated
 * @returns {{ok: boolean, reason?: string}}
 */
function checkTranslation (english, translated) {
  if (typeof translated !== 'string') { return { ok: false, reason: 'not-a-string' } }
  if (english.trim() && !translated.trim()) { return { ok: false, reason: 'empty' } }
  if (hasBrokenCharacter(translated) && !hasBrokenCharacter(english)) { return { ok: false, reason: 'broken-character' } }
  if (!sameList(sortedMatches(english, PLACEHOLDER), sortedMatches(translated, PLACEHOLDER))) {
    return { ok: false, reason: 'placeholders' }
  }
  if (english.split('|').length !== translated.split('|').length) { return { ok: false, reason: 'plural-forms' } }
  if (!sameList(sortedMatches(english, TAG), sortedMatches(translated, TAG))) { return { ok: false, reason: 'tags' } }
  // vue-i18n reads `@:` and `@.` as links to other messages.
  if (/@[:.]/.test(translated) && !/@[:.]/.test(english)) { return { ok: false, reason: 'link-syntax' } }
  if (translated.length > english.length * 4 + 40) { return { ok: false, reason: 'too-long' } }
  return { ok: true }
}

/**
 * The model's instructions. The English goes in the user message as JSON data, never
 * spliced into this text.
 * @param {string} languageName
 * @param {string} code
 * @returns {string}
 */
function systemPrompt (languageName, code) {
  return [
    'You translate the user-interface text of a professional business-advisory application from English into ' +
      languageName + ' (language code ' + code + '). Accountants, business advisors and business owners read it.',
    'You receive a JSON object whose values are English interface strings. Reply with a JSON object with exactly ' +
      'the same keys, each value translated into ' + languageName + '.',
    'Rules:',
    '- Keep every placeholder in curly braces exactly as written, for example {name} or {count}. Never translate, add or remove one.',
    '- A " | " separates singular and plural forms. Keep the same number of " | " separators.',
    '- Keep HTML tags such as <strong> exactly as written.',
    '- Keep markdown (**, ##, -), line breaks, emoji, arrows and symbols such as → ✓ ✕ where they are.',
    '- Keep the product name Advisor-e unchanged.',
    '- Use the professional register a firm would use with its clients.',
    '- Reply with the JSON object only.'
  ].join('\n')
}

/**
 * Split strings into model-sized batches.
 * @param {string[]} keys
 * @param {Object<string,string>} flat
 * @returns {string[][]}
 */
function buildBatches (keys, flat) {
  const batches = []
  let current = []
  let chars = 0
  keys.forEach((k) => {
    const len = flat[k].length
    if (current.length && (current.length >= BATCH_MAX_STRINGS || chars + len > BATCH_MAX_CHARS)) {
      batches.push(current)
      current = []
      chars = 0
    }
    current.push(k)
    chars += len
  })
  if (current.length) { batches.push(current) }
  return batches
}

function logAI (label, startTime, success, usage, reply, err) {
  const tokens = usage
    ? 'prompt=' + usage.prompt_tokens + ' completion=' + usage.completion_tokens + ' total=' + usage.total_tokens
    : 'tokens=unknown'
  console.log('[openai] ' + label + ' role=' + AI_ROLE + ' status=' + (success ? 'ok' : 'error') +
    ' latency=' + (Date.now() - startTime) + 'ms ' + tokens + ' ' + aiProvider.logSuffix(reply || null, err))
}

/**
 * Translate one batch. Never throws: a failed call fails every string in it.
 * @param {string} code
 * @param {string} languageName
 * @param {string[]} keys
 * @param {Object<string,string>} flat - English by key
 * @param {object} client - an aiProvider client
 * @returns {Promise<{ok: Object<string,string>, failed: string[]}>}
 */
async function translateBatch (code, languageName, keys, flat, client) {
  const payload = {}
  keys.forEach((k, i) => { payload[String(i)] = flat[k] })
  const t0 = Date.now()
  let reply
  try {
    reply = await client.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt(languageName, code) },
        { role: 'user', content: JSON.stringify(payload) }
      ],
      temperature: 0,
      response_format: { type: 'json_object' }
      // moderate: [] — the app's own wording from locales/, nothing a person typed (Z3).
    }, { personal: false, moderate: [], timeout: CALL_TIMEOUT_MS })
  } catch (err) {
    logAI('ui-translation:' + code, t0, false, null, null, err)
    console.error('[ui-translation] ' + code + ' batch failed:', err.message)
    return { ok: {}, failed: keys.slice() }
  }
  logAI('ui-translation:' + code, t0, true, reply && reply.usage, reply)

  let parsed = null
  try {
    const content = reply && reply.choices && reply.choices[0] && reply.choices[0].message
      ? reply.choices[0].message.content
      : ''
    parsed = JSON.parse(content)
  } catch (err) {
    parsed = null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    console.warn('[ui-translation] ' + code + ' batch reply was not a JSON object — ' + keys.length + ' strings stay English')
    return { ok: {}, failed: keys.slice() }
  }

  const ok = {}
  const failed = []
  const reasons = {}
  keys.forEach((k, i) => {
    const verdict = checkTranslation(flat[k], parsed[String(i)])
    if (verdict.ok) { ok[k] = parsed[String(i)] } else {
      failed.push(k)
      reasons[verdict.reason] = (reasons[verdict.reason] || 0) + 1
    }
  })
  if (failed.length) {
    console.warn('[ui-translation] ' + code + ' kept English for ' + failed.length + ' of ' + keys.length +
      ' strings: ' + JSON.stringify(reasons))
  }
  return { ok, failed }
}

/** code → { strings, loading, job, failed: Map<key, time>, revision, served, saving } */
const _states = new Map()

function stateFor (code) {
  if (!_states.has(code)) {
    _states.set(code, { strings: {}, loading: null, job: null, failed: new Map(), revision: 0, served: null, saving: Promise.resolve() })
  }
  return _states.get(code)
}

/** Read the stored translation once per process. Concurrent askers share the one read. */
function loadStored (code, state) {
  if (!state.loading) {
    state.loading = (async () => {
      try {
        const stored = await overlay.loadFirmConfig(PLATFORM_SCOPE, CONFIG_PREFIX + code)
        state.strings = (stored && stored.strings && typeof stored.strings === 'object') ? stored.strings : {}
      } catch (err) {
        // No database (the laptop) or a read failure: translate into memory and say so.
        console.error('[ui-translation] could not read the stored ' + code + ' translation:', err.message)
        state.strings = {}
      }
    })()
  }
  return state.loading
}

/**
 * Write the language's translations, keeping only strings English still has. Chained so two
 * writes for one language never overlap. A failed write is logged; the memory copy stands.
 */
function persist (code, state, flat) {
  state.saving = state.saving.then(async () => {
    const kept = {}
    Object.keys(state.strings).forEach((k) => { if (flat[k] !== undefined) { kept[k] = state.strings[k] } })
    try {
      await overlay.saveFirmConfig(PLATFORM_SCOPE, CONFIG_PREFIX + code, { strings: kept }, 'ui-translation')
    } catch (err) {
      console.error('[ui-translation] could not store the ' + code + ' translation:', err.message)
    }
  })
  return state.saving
}

/**
 * The English strings this language still needs.
 * @returns {string[]}
 */
function pendingKeys (state, flat, statics, now) {
  return Object.keys(flat).filter((k) => {
    if (statics[k] !== undefined) { return false }
    if (usable(state.strings[k], flat[k])) { return false }
    const failedAt = state.failed.get(k)
    return !(failedAt && now - failedAt < RETRY_FAILED_AFTER_MS)
  })
}

/**
 * Translate the pending strings in the background. Resolves when done; never rejects.
 */
async function runJob (code, languageName, keys, flat, state, client) {
  const batches = buildBatches(keys, flat)
  state.job = { done: 0, total: keys.length, startedAt: Date.now() }
  console.log('[ui-translation] ' + code + ': translating ' + keys.length + ' strings in ' + batches.length + ' batches')
  let next = 0
  let finished = 0
  const worker = async () => {
    while (next < batches.length) {
      const batch = batches[next++]
      const result = await translateBatch(code, languageName, batch, flat, client)
      Object.keys(result.ok).forEach((k) => { state.strings[k] = { h: hashOf(flat[k]), t: result.ok[k] } })
      const now = Date.now()
      result.failed.forEach((k) => { state.failed.set(k, now) })
      state.job.done += batch.length
      finished += 1
      if (finished % SAVE_EVERY === 0) { persist(code, state, flat) }
    }
  }
  try {
    const workers = []
    for (let i = 0; i < Math.min(CONCURRENCY, batches.length); i++) { workers.push(worker()) }
    await Promise.all(workers)
  } catch (err) {
    console.error('[ui-translation] ' + code + ' job stopped:', err.message)
  }
  await persist(code, state, flat)
  console.log('[ui-translation] ' + code + ': finished in ' + (Date.now() - state.job.startedAt) + 'ms')
  state.job = null
  state.revision += 1
}

/**
 * A language's wording for the browser.
 *
 * Returns at once. If strings are still to translate, a background job starts (once per
 * language) and the answer is `translating` with progress; the browser asks again. When
 * nothing is pending the answer is `ready` with every string — the static file's where it
 * has one, the translation where one passed its check, English otherwise.
 *
 * @param {string} code - a language code from data/languages.json, never 'en'
 * @param {string} [have] - the version the browser already holds; if it still matches,
 *   `messages` is left out
 * @param {object} [deps] - tests only: `{ client }`
 * @returns {Promise<object>} `{status, version?, done?, total?, messages?, unchanged?, english?}` —
 *   when ready, `english` counts the strings still in English out of `total`
 * @throws {Error} code UNKNOWN_LANGUAGE for a code that is not offered, or 'en'
 */
async function getLocale (code, have, deps) {
  const languageName = nameForLanguageCode(code)
  // Checked as a string: the lookup is a plain object, so '__proto__' finds its prototype.
  if (typeof languageName !== 'string' || !languageName || code === 'en') {
    const err = new Error('uiTranslation: unknown language "' + code + '"')
    err.code = 'UNKNOWN_LANGUAGE'
    throw err
  }
  const { flat, version } = englishSource()
  const statics = staticStrings(code)
  const state = stateFor(code)
  await loadStored(code, state)

  if (!state.job) {
    const pending = pendingKeys(state, flat, statics, Date.now())
    if (pending.length) {
      const client = (deps && deps.client) || aiProvider.getClient(AI_ROLE)
      state.jobPromise = runJob(code, languageName, pending, flat, state, client)
    }
  }
  if (state.job) {
    return { status: 'translating', done: state.job.done, total: state.job.total }
  }

  if (!state.served || state.served.revision !== state.revision || state.served.source !== version) {
    const out = {}
    let english = 0
    Object.keys(flat).forEach((k) => {
      const cached = state.strings[k]
      if (statics[k] !== undefined) { out[k] = statics[k] } else if (usable(cached, flat[k])) { out[k] = cached.t } else {
        out[k] = flat[k]
        english += 1
      }
    })
    state.served = { revision: state.revision, source: version, version: hashOf(JSON.stringify(out)), flat: out, english }
  }
  const served = state.served
  const counts = { english: served.english, total: Object.keys(flat).length }
  if (have && have === served.version) {
    return Object.assign({ status: 'ready', version: served.version, unchanged: true }, counts)
  }
  return Object.assign({ status: 'ready', version: served.version, messages: unflatten(served.flat) }, counts)
}

/** Tests only: forget every language's state and the cached English. */
function _reset () {
  _states.clear()
  _source = null
}

module.exports = {
  getLocale,
  checkTranslation,
  buildBatches,
  flatten,
  unflatten,
  englishSource,
  staticStrings,
  systemPrompt,
  AI_ROLE,
  CONFIG_PREFIX,
  BATCH_MAX_STRINGS,
  BATCH_MAX_CHARS,
  _states,
  _reset
}
