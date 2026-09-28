'use strict'

const fs = require('fs')
const path = require('path')
const { dueLines, isWellFormed, todayIso } = require('../../scripts/reminders')

/**
 * Dated reminders for Mike (design/features/reminders.json) — his instruction of 2026-09-28
 * when he parked 8.3: "an automated reminder to ask me again on December 15".
 *
 * A reminder that silently never fires looks exactly like one whose day has not come, and
 * nobody would find out until the date had long passed. So: it fires on its day and after,
 * not before; a malformed entry is shouted about rather than dropped; and every shipped entry
 * names an item that really exists.
 */

const ROOT = path.resolve(__dirname, '..', '..')
const SHIPPED = JSON.parse(fs.readFileSync(path.join(ROOT, 'design', 'features', 'reminders.json'), 'utf8'))
const one = { ref: '8.3', on: '2026-12-15', ask: 'Has OpenAI answered?', where: 'the parked file' }

describe('a reminder falls due on its date', () => {
  it('🔴 is silent the day before, and shows on the day and every day after', () => {
    expect(dueLines({ reminders: [one] }, '2026-12-14')).toBeNull()
    expect(dueLines({ reminders: [one] }, '2026-12-15').join('\n')).toMatch(/8\.3/)
    expect(dueLines({ reminders: [one] }, '2027-01-20').join('\n')).toMatch(/Has OpenAI answered\?/)
  })

  it('🔴 a malformed date is reported, never quietly skipped', () => {
    const lines = dueLines({ reminders: [Object.assign({}, one, { on: '2026-02-30' })] }, '2026-01-01')
    expect(lines.join('\n')).toMatch(/malformed/)
    expect(isWellFormed(Object.assign({}, one, { on: '15/12/2026' }))).toBe(false)
    expect(isWellFormed(Object.assign({}, one, { ask: ' ' }))).toBe(false)
  })

  it('says nothing when there are no reminders', () => {
    expect(dueLines({ reminders: [] }, '2026-12-15')).toBeNull()
    expect(dueLines(null, '2026-12-15')).toBeNull()
  })

  it('reads today on this computer\'s own calendar', () => {
    expect(todayIso(new Date(2026, 11, 15, 23, 30))).toBe('2026-12-15')
  })
})

describe('the shipped reminders', () => {
  it('🔴 every entry can fire, and names an item on the live list or in the done-and-parked file', () => {
    const live = fs.readFileSync(path.join(ROOT, 'design', 'features', 'to-do-items.json'), 'utf8')
    const archive = fs.readFileSync(path.join(ROOT, 'design', 'features', 'to-do-done-and-parked.md'), 'utf8')
    SHIPPED.reminders.forEach((r) => {
      expect({ ref: r.ref, wellFormed: isWellFormed(r) }).toEqual({ ref: r.ref, wellFormed: true })
      const named = live.includes('"ref": "' + r.ref + '"') || archive.includes('**' + r.ref + ' ·')
      expect({ ref: r.ref, named }).toEqual({ ref: r.ref, named: true })
    })
  })
})
