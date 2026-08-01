'use strict'

// Stable row ids for the platform coaching reference.
//
// WHY THEY EXIST. The firm-editable cascade keys a firm's decisions about a row
// — switch it off, edit it, keep their version when the mentor changes theirs —
// to that row's id. Until these ids were added a coaching entry was identified
// only by its `template` title, so a retitle would have silently discarded
// whatever a firm had decided about it, and a switched-off row would have
// quietly reappeared. No error, no warning. Not hypothetical: five page titles
// were retitled upstream in the week before this was written. Same defect, and
// same fix, as data/*-domain-support.json — see domainSupportRowIds.test.js.
//
// WHY THE `cr-` PREFIX. A firm's own PROMOTED coaching entries live under the
// same firmOverlay config_key ('coaching-reference') and already carry ids —
// but NUMBERS, assigned by appendFirmCoachingEntry. Two id systems under one
// name is how collisions arrive later. The prefix keeps the platform's ids
// visibly and permanently distinct from the firm's.
//
// THE RULE THIS LOCKS. An id is assigned once and never changes. It was seeded
// from the title so a human reading the JSON can tell rows apart, but it is NOT
// required to keep matching the title: a retitled row keeps its original id, on
// purpose. Do not "tidy" an id to match a new name — that is exactly the
// breakage this guards against.
//
// Adding a coaching entry means adding its id to the list below, deliberately.
// The list is the control; a comment asking people to be careful is not.

const fs = require('fs')
const path = require('path')

const COACHING_FILE = path.resolve(process.cwd(), 'data/coaching-reference.json')

const LOCKED_IDS = [
  'cr-growth-fundamentals-framework',
  'cr-eoy-meeting',
  'cr-working-capital-cycle',
  'cr-8-profit-levers',
  'cr-deming-s-theory-of-volatility',
  'cr-rubbish-in-rubbish-out',
  'cr-revenue-model',
  'cr-dashboard-discussions',
  'cr-ratio-analysis',
  'cr-loan-estimator',
  'cr-customer-journey',
  'cr-planning-outcomes-review',
  'cr-porter-s-pine',
  'cr-blue-ocean-strategy-8-profit-levers',
  'cr-covid-19-client-pre-meeting'
]

function readCoaching () {
  return JSON.parse(fs.readFileSync(COACHING_FILE, 'utf8'))
}

describe('coaching-reference row ids', () => {
  test('every coaching row carries a non-empty string id', () => {
    const missing = []
    readCoaching().forEach((row, i) => {
      if (typeof row.id !== 'string' || row.id.trim() === '') {
        missing.push('[' + i + '] ' + (row.template || '(untitled)'))
      }
    })
    expect(missing).toEqual([])
  })

  test('ids are unique', () => {
    const ids = readCoaching().map(r => r.id)
    expect(ids.length).toBe(new Set(ids).size)
  })

  test('every id carries the cr- prefix that keeps it clear of the firm\'s numeric ids', () => {
    const strays = readCoaching()
      .map(r => r.id)
      .filter(id => !String(id).startsWith('cr-'))
    expect(strays).toEqual([])
  })

  test('the id set is exactly the locked set — a changed id breaks a firm\'s saved choices', () => {
    const actual = readCoaching().map(r => r.id)
    expect(actual.slice().sort()).toEqual(LOCKED_IDS.slice().sort())
  })

  test('adding a coaching entry is a deliberate act — the row count is locked too', () => {
    expect(readCoaching().length).toBe(LOCKED_IDS.length)
  })
})
