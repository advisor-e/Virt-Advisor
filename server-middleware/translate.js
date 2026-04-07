/**
 * POST /api/translate/locale
 *
 * Translates a flat key→value object via MyMemory (mymemory.translated.net).
 * Free with no credit card — just set MYMEMORY_EMAIL in .env to unlock
 * 10,000 words/day (vs 1,000/day anonymous). No email = still works.
 *
 * All strings are batched into one request using a unique separator,
 * so each locale load costs exactly one API call.
 */

const SEPARATOR = '\n\n---SPLIT---\n\n'

module.exports = function translateMiddleware (req, res, next) {
  if (req.method !== 'POST' || req.url !== '/locale') {
    return next()
  }

  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', () => {
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
  const combined = keys.map(k => texts[k]).join(SEPARATOR)

  const params = new URLSearchParams({
    q: combined,
    langpair: `en|${langCode}`
  })
  const email = process.env.MYMEMORY_EMAIL
  if (email) params.set('de', email)

  const mmRes = await fetch(`https://api.mymemory.translated.net/get?${params}`)

  if (!mmRes.ok) {
    console.error('[translate] MyMemory error:', mmRes.status)
    res.writeHead(mmRes.status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Translation service error' }))
    return
  }

  const data = await mmRes.json()

  if (data.responseStatus !== 200) {
    console.error('[translate] MyMemory rejected:', data.responseDetails)
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: data.responseDetails || 'Translation rejected' }))
    return
  }

  const parts = data.responseData.translatedText.split(/\n+---SPLIT---\n+/)

  const translated = {}
  keys.forEach((k, i) => {
    translated[k] = parts[i] !== undefined ? parts[i] : texts[k]
  })

  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(translated))
}
