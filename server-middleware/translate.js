/**
 * POST /api/translate/locale
 *
 * Translates a flat key→value object via MyMemory (mymemory.translated.net).
 * Free with no credit card — just set MYMEMORY_EMAIL in .env to unlock
 * 10,000 words/day (vs 1,000/day anonymous). No email = still works.
 *
 * Strings are batched in chunks ≤ CHUNK_CHARS so each chunk fits inside
 * MyMemory's GET URL limit (~2 KB). Each locale load may cost multiple calls
 * but they are sequential and the result is cached client-side.
 */

const SEPARATOR = '\n\n---SPLIT---\n\n'
const CHUNK_CHARS = 900 // conservative limit per MyMemory GET request
const BODY_LIMIT = 128 * 1024 // 128 KB

module.exports = function translateMiddleware (req, res, next) {
  if (req.method !== 'POST' || req.url !== '/locale') {
    return next()
  }

  let body = ''
  let bodySize = 0
  let bodyRejected = false

  req.on('error', (err) => {
    console.error('[translate] Request socket error:', err.message)
    if (!res.headersSent) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Request error' }))
    }
  })

  req.on('data', (chunk) => {
    if (bodyRejected) return
    bodySize += chunk.length
    if (bodySize > BODY_LIMIT) {
      bodyRejected = true
      if (!res.headersSent) {
        res.writeHead(413, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Request body too large' }))
      }
      req.socket && req.socket.destroy()
      return
    }
    body += chunk.toString('utf8')
  })

  req.on('end', () => {
    if (bodyRejected) return
    handleTranslate(body, res).catch(err => {
      console.error('[translate] Error:', err.message)
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Translation failed' }))
      }
    })
  })
}

async function handleTranslate (rawBody, res) {
  let parsed
  try { parsed = JSON.parse(rawBody) } catch (e) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Invalid JSON' }))
    return
  }

  const { texts, langCode } = parsed
  if (!texts || !langCode) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'texts and langCode are required' }))
    return
  }

  const keys = Object.keys(texts)
  const email = process.env.MYMEMORY_EMAIL

  // Split keys into chunks that fit inside MyMemory's GET URL limit.
  // Avoids 414 / silent truncation on large locale payloads.
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
  if (currentChunk.length > 0) chunks.push(currentChunk)

  const translated = {}

  for (const chunkKeys of chunks) {
    const combined = chunkKeys.map(k => String(texts[k] || '')).join(SEPARATOR)
    const params = new URLSearchParams({ q: combined, langpair: `en|${langCode}` })
    if (email) params.set('de', email)

    let mmRes
    try {
      mmRes = await fetch(`https://api.mymemory.translated.net/get?${params}`)
    } catch (netErr) {
      console.error('[translate] Network error:', netErr.message)
      chunkKeys.forEach(k => { translated[k] = texts[k] })
      continue
    }

    if (!mmRes.ok) {
      console.error('[translate] MyMemory HTTP error:', mmRes.status)
      chunkKeys.forEach(k => { translated[k] = texts[k] })
      continue
    }

    const data = await mmRes.json()

    if (data.responseStatus !== 200) {
      console.error('[translate] MyMemory rejected:', data.responseDetails)
      chunkKeys.forEach(k => { translated[k] = texts[k] })
      continue
    }

    const parts = data.responseData.translatedText.split(/\n+---SPLIT---\n+/)
    chunkKeys.forEach((k, i) => {
      translated[k] = parts[i] !== undefined ? parts[i] : texts[k]
    })
  }

  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(translated))
}
