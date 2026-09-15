'use strict'

/**
 * WHICH AI CALLS MAY REACH A SECOND PROVIDER (item 4.97 US8, T049; research R8's table).
 *
 * 🔴 WHY THIS TEST READS THE SOURCE INSTEAD OF CALLING THE CODE. `personal` is a privacy
 * classification, not behaviour: a call marked `personal: false` by mistake still works
 * perfectly, still returns a good answer, and still passes every other test in this repo.
 * The only symptom is a client's words reaching a fallback provider during an outage that
 * nobody chose — invisible in UAT, invisible in the logs, and discovered, if ever, by
 * somebody outside this company. So the flags are pinned as text, at the call site.
 *
 * Mike's ruling, 2026-09-15, on the one row research R8 left open ("Mike to confirm"): the
 * ADVISOR'S CONVERSATION IS TREATED AS PERSONAL. No client record is sent, but the advisor
 * is describing a real business in their own words, and the candidate fallback at the time
 * (DeepSeek) is hosted in China with terms permitting training on submitted data. His
 * decision was that it never falls back until a chosen provider's WRITTEN terms have been
 * read — the same standard he applied to the OpenAI audio letter of 2026-09-12. Flipping it
 * is one word per site, and deliberately so.
 *
 * If a call site below is genuinely reclassified, change the table AND say why in the commit.
 * A test edited to match the code it is meant to constrain guards nothing.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8')

/**
 * Every file that calls the model through the seam, and what its calls must say.
 * `personal` is the value EVERY `getClient` call in that file must pass.
 */
const SITES = [
  // A whole client conversation, sent to be de-identified. Personal by definition — it is
  // the text the anonymiser exists to strip. The client is INJECTED from `cases.js`, so the
  // seam call lives there and the flag lives at the call in `anonymiseCase.js`; both are
  // checked, each for the half it owns.
  { file: 'server/routes/cases.js', personal: true, why: 'hands the seam client to the anonymiser', flagIn: 'server/utils/anonymiseCase.js' },
  // The full meeting transcript. The consent the client gave aloud names AI transcription,
  // not an arbitrary list of companies (Brief P13, CLAUDE.md's scoped exception).
  { file: 'server/utils/meetingReports.js', personal: true, why: 'the full meeting transcript' },

  // Not personal: page figures the mentor is already looking at, the user's own pasted
  // document, and document file names.
  { file: 'server/utils/hubReading.js', personal: false, why: 'the figures already on the mentor page' },
  { file: 'server/routes/promptCheck.js', personal: false, why: "the user's own pasted document" },
  { file: 'server/utils/complianceCheck.js', personal: false, why: 'document file names' }
]

/**
 * 🔴 NOT YET ROUTED THROUGH THE SEAM — the next session's first job, and their class is
 * ALREADY RULED so it does not have to be re-argued:
 *
 *   server/advisorEngine.js  (10 sites, 4 of them streaming)  → personal: TRUE
 *       Mike's ruling of 2026-09-15, above: the advisor is describing a real client in
 *       their own words. Six of the ten are the live conversation.
 *   server/courseEngine.js   (4 sites, 2 streaming)           → personal: FALSE
 *       a firm's own course profile and quiz answers; no client is involved.
 *
 * They were left because a streaming call that breaks does not fail cleanly — it half-works
 * — so converting them means driving the running app afterwards, not just running this suite.
 * Until then they call OpenAI directly and behave exactly as they always have: the seam is
 * additive, so nothing is half-converted. ADD THEM TO `SITES` ABOVE when they are routed.
 *
 * Both also want a success log line while someone is in there: `courseEngine` has none on
 * any of its four, and `advisorEngine`'s `pickLearnTreeAI` and intake stream have none.
 */

/**
 * The `personal:` value on every `chat.completions.create` call in `src`.
 *
 * Read from the CALL, not from the `getClient` that built the client: most files cache the
 * client once at module level and call it somewhere else entirely, so proximity to
 * `getClient` proves nothing. The flag belongs to the call, and that is where it is checked.
 */
function personalFlagsIn (src) {
  const flags = []
  const re = /chat\.completions\.create\s*\(/g
  let m
  while ((m = re.exec(src)) !== null) {
    // Scan forward to the end of this call's argument list. The flag is in the second
    // argument, so it is always before the next `.create(` — and a call that has no flag at
    // all reads as null, which fails.
    const rest = src.slice(m.index + m[0].length)
    const nextCall = rest.search(/chat\.completions\.create\s*\(/)
    const window = nextCall === -1 ? rest : rest.slice(0, nextCall)
    const found = window.match(/personal:\s*(true|false)/)
    flags.push(found ? found[1] === 'true' : null)
  }
  return flags
}

describe('every AI call site states its privacy class, and states it correctly', () => {
  SITES.forEach((site) => {
    test(`${site.file} — personal: ${site.personal} (${site.why})`, () => {
      const src = read(site.file)
      // The file gets its client from the seam...
      expect(src).toContain('aiProvider')
      // ...and the flag is stated where the call is actually made, which for an injected
      // client is a different file.
      const flags = personalFlagsIn(site.flagIn ? read(site.flagIn) : src)
      expect(flags.length).toBeGreaterThan(0)
      // Every call carries the flag...
      expect(flags.filter(f => f === null)).toEqual([])
      // ...and every one carries the RIGHT flag.
      expect(flags.every(f => f === site.personal)).toBe(true)
    })
  })

  // The seam throws without the flag, so a site that forgets it fails loudly at runtime
  // rather than defaulting to the permissive answer. This pins that it still does.
  test('the seam refuses a call that does not state its class', async () => {
    const { getClient } = require('../../server/utils/aiProvider')
    await expect(getClient('classify').chat.completions.create({ messages: [] }, {}))
      .rejects.toMatchObject({ code: 'AI_PERSONAL_FLAG_MISSING' })
    await expect(getClient('classify').chat.completions.create({ messages: [] }))
      .rejects.toMatchObject({ code: 'AI_PERSONAL_FLAG_MISSING' })
  })
})

/**
 * The four calls that CANNOT have a fallback: three use Responses-API-only features (web
 * search with citations, base64 PDF input) and one is audio. No chat-completions equivalent
 * exists at another provider, so the seam records that rather than pretending (research R8).
 */
describe('the no-fallback sites say so rather than pretending', () => {
  const NO_FALLBACK = [
    { file: 'server/routes/economicAnalysis.js', why: 'Responses API + web search with citations' },
    { file: 'server/utils/depreciationExtract.js', why: 'Responses API + base64 PDF input' },
    { file: 'server/utils/countryScheduleRead.js', why: 'Responses API + base64 PDF input' },
    { file: 'server/routes/meetingReview.js', why: 'audio transcription, a different endpoint' }
  ]

  NO_FALLBACK.forEach((site) => {
    test(`${site.file} logs fallback=none (${site.why})`, () => {
      const src = read(site.file)
      expect(src).toMatch(/logSuffixNoFallback|fallback=none/)
    })
  })

  test('none of them routes chat completions through the seam', () => {
    NO_FALLBACK.forEach((site) => {
      const src = read(site.file)
      expect(src).not.toMatch(/getClient\s*\(\s*['"][a-z]+['"]\s*\)\s*\.chat/)
    })
  })
})
