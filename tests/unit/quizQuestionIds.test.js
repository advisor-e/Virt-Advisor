'use strict'

// Stable question ids for the platform quiz banks (data/course-quizzes.json).
//
// WHY THEY EXIST. The firm-editable mechanism keys a firm's decisions about a row
// — switch it off, edit it, keep their version when Advisor-e changes ours — to
// that row's id. A quiz bank had no such id: a question was identified only by its
// position within its bank (1, 2, 3…). Insert one question near the top of a bank
// and every question below it shifts up a number, so a firm's "we switched that one
// off" would silently move to a DIFFERENT question, and their reworded question
// would attach to someone else's. No error, no warning. Same defect and same fix as
// data/*-domain-support.json and the coaching reference — see domainSupportRowIds
// .test.js and coachingReferenceRowIds.test.js.
//
// WHY `qid` AND NOT `id`. The positional `id` could not simply be replaced: it is a
// live handshake with the AI. courseEngine writes "Entry {id}" into the quiz
// generation prompt, the model returns a `bankRef` naming one, and the grader looks
// the entry back up by that number to find the firm's model answer. Changing its
// type would change the prompt and could break grading. So the stable id is added
// ALONGSIDE it and the positional number is left exactly as it was.
//
// WHY THE IDS ARE OPAQUE. `qz-N`, assigned once in file order, never reused and
// never renumbered. Deliberately NOT derived from the question's wording: a
// reworded question would then get a new identity, which is precisely the silent
// loss this prevents — and rewording is the normal case the Adopt / Keep-mine offer
// is built for.
//
// ADDING A QUESTION means giving it the next free number (qz-653, then qz-654…) and
// updating the count below, deliberately. Never renumber to close a gap: a gap is a
// question we removed, and reusing its number would hand a firm's old decision about
// the removed question to a brand new one.

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const QUIZ_FILE = path.resolve(process.cwd(), 'data/course-quizzes.json')

/** Every question that carries a stable id, in file order. */
const LOCKED_COUNT = 652

/**
 * SHA-256 of `qid|bankKey|positionalId` for all 652 questions, in file order.
 *
 * This locks IDENTITY, not content: question, answer and key-point wording are
 * deliberately excluded, because improving the wording of a question is normal and
 * must not fail a test. What must never happen silently is a qid landing on a
 * different bank or a different position — the two ways a firm's saved decision
 * gets re-filed onto a question they never chose.
 */
const LOCKED_IDENTITY_SHA256 = '60fa8a67bc042da9897693b7e30cf542f59cf1a20958778ded7ab06068d91eca'

function readBanks () {
  const data = JSON.parse(fs.readFileSync(QUIZ_FILE, 'utf8'))
  const out = []
  for (const [key, bank] of Object.entries(data.banks || {})) {
    if (key.startsWith('_')) { continue }
    for (const entry of bank.entries || []) {
      out.push({ bank: key, entry })
    }
  }
  return out
}

function identityFingerprint (rows) {
  const canonical = rows.map(r => `${r.entry.qid}|${r.bank}|${r.entry.id}`).join('\n')
  return crypto.createHash('sha256').update(canonical).digest('hex')
}

describe('course-quizzes question ids', () => {
  test('every question carries a qid', () => {
    const missing = readBanks()
      .filter(r => typeof r.entry.qid !== 'string' || r.entry.qid.trim() === '')
      .map(r => `${r.bank} #${r.entry.id}`)
    expect(missing).toEqual([])
  })

  test('every qid has the qz- prefix that keeps it clear of a firm\'s own ids', () => {
    const strays = readBanks()
      .map(r => r.entry.qid)
      .filter(qid => !/^qz-\d+$/.test(String(qid)))
    expect(strays).toEqual([])
  })

  test('qids are unique across every bank, not just within one', () => {
    // Uniqueness must be global: a firm's decision names a qid alone, so the same
    // number appearing in two banks would make it ambiguous which question it meant.
    const ids = readBanks().map(r => r.entry.qid)
    expect(ids.length).toBe(new Set(ids).size)
  })

  test('the positional id the AI uses is untouched — still an integer from 1', () => {
    // The guarantee that made `qid` a second field rather than a replacement.
    const bad = readBanks()
      .filter(r => !Number.isInteger(r.entry.id) || r.entry.id < 1)
      .map(r => `${r.bank} qid=${r.entry.qid}`)
    expect(bad).toEqual([])
  })

  test('adding or removing a question is a deliberate act — the count is locked', () => {
    expect(readBanks().length).toBe(LOCKED_COUNT)
  })

  test('no qid has been re-filed onto a different bank or position', () => {
    // The lock that matters. If this fails, do NOT update the hash to make it pass
    // until you know WHY it moved: a re-filed qid silently hands a firm's saved
    // decision to a question they never made it about.
    expect(identityFingerprint(readBanks())).toBe(LOCKED_IDENTITY_SHA256)
  })
})
