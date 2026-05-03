'use strict'

/**
 * POST /api/translate/locale
 *
 * Restify route — body already parsed by jsonBodyParser middleware.
 * Adapted from server-middleware/translate.js for the Restify backend.
 *
 * MyMemory free tier: set MYMEMORY_EMAIL env var for 10,000 words/day.
 */

const SEPARATOR = '\n\n---SPLIT---\n\n'
const CHUNK_CHARS = 900

async function post (req, res, next) {
  const { texts, langCode } = req.body || {}

  if (!texts || !langCode) {
    res.send(400, { success: false, error: { code: 'PARAMS_REQUIRED', message: 'texts and langCode are required' } })
    return next()
  }

  const keys = Object.keys(texts)
  const email = process.env.MYMEMORY_EMAIL

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

  for (const chunkKeys of chunks) {
    const combined = chunkKeys.map(k => String(texts[k] || '')).join(SEPARATOR)
    const params = new URLSearchParams({ q: combined, langpair: `en|${langCode}` })
    if (email) { params.set('de', email) }

    let mmRes
    try {
      mmRes = await fetch(`https://api.mymemory.translated.net/get?${params}`)
    } catch (netErr) {
      console.error('[translate] Network error:', netErr.message)
      chunkKeys.forEach((k) => { translated[k] = texts[k] })
      continue
    }

    if (!mmRes.ok) {
      console.error('[translate] MyMemory HTTP error:', mmRes.status)
      chunkKeys.forEach((k) => { translated[k] = texts[k] })
      continue
    }

    const data = await mmRes.json()

    if (data.responseStatus !== 200) {
      console.error('[translate] MyMemory rejected:', data.responseDetails)
      chunkKeys.forEach((k) => { translated[k] = texts[k] })
      continue
    }

    const parts = data.responseData.translatedText.split(/\n+---SPLIT---\n+/)
    chunkKeys.forEach((k, i) => {
      translated[k] = parts[i] !== undefined ? parts[i] : texts[k]
    })
  }

  res.send(200, translated)
  return next()
}

module.exports = { post }
