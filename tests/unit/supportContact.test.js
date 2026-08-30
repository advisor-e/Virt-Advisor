'use strict'

/**
 * The support address a refused firm manager is sent to — item 4.31.
 *
 * 🔴 WHY THIS IS TESTED AT ALL. Mike asked for the address to be easy to change
 * (2026-08-25), and "easy to change" is only true if changing it badly cannot break the
 * screen. A person editing `data/support-contact.json` can leave a trailing comma, blank
 * the value, or delete the file — and the one thing that must never happen is an
 * accountant meeting a refusal with a dead button, which the design forbids outright
 * (`PROMPT-CONTRIBUTION-SAFETY.md` §5). Every failure below has to land on the fallback.
 *
 * 🔴 THE NO-CACHE TEST IS THE PROMISE. The file is read on every call so an edit takes
 * effect immediately. If somebody adds caching for tidiness, that promise silently
 * becomes false and this is what says so.
 */

const fs = require('fs')
const { supportEmail, FALLBACK_EMAIL, FILE } = require('../../server/utils/supportContact')

let warn

beforeEach(() => { warn = jest.spyOn(console, 'warn').mockImplementation(() => {}) })
afterEach(() => { jest.restoreAllMocks() })

/** Make the next read return exactly this file content. */
function fileHolds (content) {
  jest.spyOn(fs, 'readFileSync').mockImplementation(() => content)
}

/** Make the next read fail the way a missing or unreadable file does. */
function fileFails (code) {
  jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
    throw Object.assign(new Error('no'), { code })
  })
}

describe('the address that ships', () => {
  it('is read from the real file, not from a constant', () => {
    expect(supportEmail()).toBe('mike@advisor-e.com')
    expect(FILE).toMatch(/support-contact\.json$/)
  })

  it('picks up a changed address with no restart — that is the whole promise', () => {
    fileHolds(JSON.stringify({ supportEmail: 'someone.else@advisor-e.com' }))
    expect(supportEmail()).toBe('someone.else@advisor-e.com')

    fileHolds(JSON.stringify({ supportEmail: 'third@advisor-e.com' }))
    expect(supportEmail()).toBe('third@advisor-e.com')
  })

  it('trims whitespace, because a copied address usually carries some', () => {
    fileHolds(JSON.stringify({ supportEmail: '  help@advisor-e.com \n' }))
    expect(supportEmail()).toBe('help@advisor-e.com')
  })
})

describe('a bad edit never reaches an accountant', () => {
  it('falls back when the file is gone', () => {
    fileFails('ENOENT')
    expect(supportEmail()).toBe(FALLBACK_EMAIL)
  })

  it('falls back when the file cannot be read at all', () => {
    fileFails('EACCES')
    expect(supportEmail()).toBe(FALLBACK_EMAIL)
  })

  it('falls back on a hand-edit that broke the JSON', () => {
    fileHolds('{ "supportEmail": "a@b.com",, }')
    expect(supportEmail()).toBe(FALLBACK_EMAIL)
  })

  it('falls back when the address was blanked out', () => {
    fileHolds(JSON.stringify({ supportEmail: '   ' }))
    expect(supportEmail()).toBe(FALLBACK_EMAIL)
  })

  it('falls back when what is there is not an address', () => {
    fileHolds(JSON.stringify({ supportEmail: 'ask Mike' }))
    expect(supportEmail()).toBe(FALLBACK_EMAIL)
  })

  it('falls back when the key is missing or the wrong type', () => {
    fileHolds(JSON.stringify({ email: 'a@b.com' }))
    expect(supportEmail()).toBe(FALLBACK_EMAIL)
    fileHolds(JSON.stringify({ supportEmail: 42 }))
    expect(supportEmail()).toBe(FALLBACK_EMAIL)
  })

  it('never throws, whatever it is handed', () => {
    fileHolds('null')
    expect(() => supportEmail()).not.toThrow()
    fileHolds('[]')
    expect(() => supportEmail()).not.toThrow()
    fileHolds('')
    expect(() => supportEmail()).not.toThrow()
  })
})

describe('saying so when an edit went wrong', () => {
  it('warns when the file is there but the address is not usable', () => {
    // Silence here would leave somebody staring at an address they thought they changed.
    fileHolds(JSON.stringify({ supportEmail: 'not an address' }))
    supportEmail()
    expect(warn).toHaveBeenCalled()
  })

  it('says nothing when the file simply is not there', () => {
    // A fresh checkout without the file is normal, not a fault worth a log line.
    fileFails('ENOENT')
    supportEmail()
    expect(warn).not.toHaveBeenCalled()
  })
})
