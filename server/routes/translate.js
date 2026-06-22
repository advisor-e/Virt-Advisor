'use strict'

/**
 * POST /api/translate/locale
 *
 * Restify route — body already parsed by jsonBodyParser middleware.
 * Translates a flat key→value object via MyMemory (mymemory.translated.net).
 *
 * This is the single home for the locale-translation logic: the third-party
 * call lives on the Restify backend (per the architecture boundary), and the
 * Nuxt server-middleware is a thin proxy that forwards here.
 *
 * Node 14.15: the outbound call uses the built-in `https` module — NOT the
 * global `fetch`, which does not exist before Node 18 and would throw on the
 * locked runtime.
 *
 * MyMemory free tier: set MYMEMORY_EMAIL env var for 10,000 words/day.
 */

const https = require('https')

const SEPARATOR = '\n\n---SPLIT---\n\n'
const CHUNK_CHARS = 900
const REQUEST_TIMEOUT_MS = 15000

/**
 * GET a URL with the Node-14 `https` module and resolve the raw response.
 * Resolves `{ statusCode, body }`; rejects only on a transport-level error or
 * timeout (the caller decides what a non-200 status means).
 *
 * @param {string} urlString - Absolute https URL
 * @returns {Promise<{ statusCode: number, body: string }>}
 */
function httpsGet (urlString) {
  return new Promise((resolve, reject) => {
    const req = https.get(urlString, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => { resolve({ statusCode: res.statusCode, body: data }) })
    })
    req.on('error', reject)
    req.setTimeout(REQUEST_TIMEOUT_MS, () => { req.destroy(new Error('MyMemory request timed out')) })
  })
}

async function post (req, res) {
  const { texts, langCode } = req.body || {}

  if (!texts || !langCode) {
    res.send(400, { success: false, error: { code: 'PARAMS_REQUIRED', message: 'texts and langCode are required' } })
    return
  }

  const keys = Object.keys(texts)
  const email = process.env.MYMEMORY_EMAIL

  // Split keys into chunks that fit inside MyMemory's GET URL limit (~2 KB),
  // avoiding 414 / silent truncation on large locale payloads.
  const chunks = []
  let currentChunk = []
  let currentLen = 0
  for (const k of keys) {
    const val = String(texts[k] || '')
    const addition = currentLen > 0 ? SEPARATOR.length + val.length : val.length
    if (addition > CHUNK_CHARS && currentChunk.length > 0) {
      chunks.push(currentChunk)
      currentChunk = [k]
      currentLen = val.length
    } else {
      currentChunk.push(k)
      currentLen += addition
    }
  }
  if (currentChunk.length > 0) { chunks.push(currentChunk) }

  const translated = {}

  // Each chunk that fails to translate falls back to the original (English)
  // text for its keys, so a partial outage degrades gracefully rather than
  // dropping strings or failing the whole request.
  for (const chunkKeys of chunks) {
    const combined = chunkKeys.map(k => String(texts[k] || '')).join(SEPARATOR)
    const params = new URLSearchParams({ q: combined, langpair: `en|${langCode}` })
    if (email) { params.set('de', email) }

    let mmRes
    try {
      mmRes = await httpsGet(`https://api.mymemory.translated.net/get?${params}`)
    } catch (netErr) {
      console.error('[translate] Network error:', netErr.message)
      chunkKeys.forEach((k) => { translated[k] = texts[k] })
      continue
    }

    if (mmRes.statusCode !== 200) {
      console.error('[translate] MyMemory HTTP error:', mmRes.statusCode)
      chunkKeys.forEach((k) => { translated[k] = texts[k] })
      continue
    }

    let data
    try {
      data = JSON.parse(mmRes.body)
    } catch (e) {
      console.error('[translate] MyMemory returned non-JSON')
      chunkKeys.forEach((k) => { translated[k] = texts[k] })
      continue
    }

    if (!data || data.responseStatus !== 200 || !data.responseData || typeof data.responseData.translatedText !== 'string') {
      console.error('[translate] MyMemory rejected:', data && data.responseDetails)
      chunkKeys.forEach((k) => { translated[k] = texts[k] })
      continue
    }

    const parts = data.responseData.translatedText.split(/\n+---SPLIT---\n+/)
    chunkKeys.forEach((k, i) => {
      translated[k] = parts[i] !== undefined ? parts[i] : texts[k]
    })
  }

  res.send(200, translated)
}

module.exports = { post }
