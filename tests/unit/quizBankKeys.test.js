'use strict'

// CB-30 locking test — Mike's ruling (2026-07-17): question banks are keyed
// by the EXACT template-library title, because domain-keyed or misnamed
// content "will get lost". This test makes the ruling mechanical: a bank
// filed under a name that is not an exact template title fails the suite at
// commit time. It also guards the transcription shape, so a future bank
// can't ship half-formed (the firm's IP must arrive whole or not at all).

const fs = require('fs')
const path = require('path')

const quizzes = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data/course-quizzes.json'), 'utf8'))
const templates = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data/templates.json'), 'utf8'))

const templateTitles = new Set(templates.map(t => t.title))
const bankEntries = Object.entries(quizzes.banks || {}).filter(([key]) => !key.startsWith('_'))

describe('course-quizzes.json banks (CB-30 exact-title ruling)', () => {
  test('at least one live bank exists (Working Capital Cycle shipped 2026-07-18)', () => {
    expect(bankEntries.length).toBeGreaterThan(0)
  })

  test.each(bankEntries.map(([key]) => [key]))(
    'bank key "%s" is an exact template-library title',
    (key) => {
      expect(templateTitles.has(key)).toBe(true)
    }
  )

  test.each(bankEntries)('bank "%s" has a well-formed transcription', (key, bank) => {
    expect(typeof bank.source).toBe('string')
    expect(bank.source.trim()).not.toBe('')
    expect(Array.isArray(bank.entries)).toBe(true)
    expect(bank.entries.length).toBeGreaterThan(0)

    const ids = new Set()
    for (const entry of bank.entries) {
      expect(Number.isInteger(entry.id) && entry.id >= 1).toBe(true)
      expect(ids.has(entry.id)).toBe(false)
      ids.add(entry.id)
      for (const field of ['question', 'answer', 'keyPoint']) {
        expect(typeof entry[field]).toBe('string')
        expect(entry[field].trim()).not.toBe('')
      }
    }
  })
})
