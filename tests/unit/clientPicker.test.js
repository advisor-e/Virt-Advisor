'use strict'

// filterClientRegister — the session-start picker at scale (design approved
// 2026-07-14): recently-worked clients first when the box is empty (capped,
// with an honest "type to search all N" flag), live type-to-filter across the
// whole register otherwise. Zero matches = the typed text is a new client.

import { filterClientRegister, normaliseClientKey } from '../../utils/clients'

function client (id, name, createdAt) {
  return { id, name, nameKey: normaliseClientKey(name), createdAt: createdAt || '2026-01-01T00:00:00.000Z' }
}

// A register of 10; the advisor has recent cases with two of them.
const register = [
  client('arch', 'Archibald Motors'),
  client('criss', 'Criss Cross Marketing'),
  client('flan', 'Flannagan Brewery'),
  client('jones', 'Jones Scaffolding Ltd'),
  client('rose', 'Rose Flowers'),
  client('smith', 'Smith Windows'),
  client('kirk', 'Kirkby Joinery'),
  client('dave', "Dave's Bakery"),
  client('acme', 'Acme Co'),
  client('new1', 'Brand New Client', '2026-07-01T00:00:00.000Z')
]

// Cases arrive newest-first from the server.
const cases = [
  { clientId: 'rose', createdAt: '2026-07-10T00:00:00.000Z' },
  { clientId: 'jones', createdAt: '2026-07-05T00:00:00.000Z' },
  { clientId: 'rose', createdAt: '2026-06-01T00:00:00.000Z' } // older Rose case — first (newest) wins
]

describe('filterClientRegister — empty input (recent-first, capped)', () => {
  test('recently-worked clients lead, in last-activity order', () => {
    const r = filterClientRegister(register, cases, '', 8)
    expect(r.clients[0].id).toBe('rose') // 10 Jul
    expect(r.clients[1].id).toBe('jones') // 5 Jul
  })

  test('never-worked clients follow, newest-registered first, capped with the truncated flag', () => {
    const r = filterClientRegister(register, cases, '', 8)
    expect(r.clients[2].id).toBe('new1') // newest registration among the unworked
    expect(r.clients).toHaveLength(8)
    expect(r.truncated).toBe(true) // 10 in the register, 8 shown
  })

  test('a register within the cap is shown in full, not flagged', () => {
    const r = filterClientRegister(register.slice(0, 5), cases, '', 8)
    expect(r.clients).toHaveLength(5)
    expect(r.truncated).toBe(false)
  })
})

describe('filterClientRegister — typing filters the WHOLE register', () => {
  test('a fragment matches regardless of case and punctuation', () => {
    expect(filterClientRegister(register, cases, 'jon', 8).clients.map(c => c.id)).toEqual(['jones'])
    expect(filterClientRegister(register, cases, 'ROSE', 8).clients.map(c => c.id)).toEqual(['rose'])
    expect(filterClientRegister(register, cases, "dave's", 8).clients.map(c => c.id)).toEqual(['dave'])
  })

  test('matches beyond the empty-input cap are still found (search covers all N)', () => {
    // 'acme' sits below the cap of 8 in the recent-first ordering.
    const r = filterClientRegister(register, cases, 'acme', 8)
    expect(r.clients.map(c => c.id)).toEqual(['acme'])
  })

  test('several matches keep the recent-first order', () => {
    // "s c" fragments: 'scaffolding' matches jones; 'cross' contains no... use 'cr':
    const r = filterClientRegister(register, cases, 'cr', 8)
    expect(r.clients.map(c => c.id)).toEqual(['criss']) // crisscrossmarketing contains 'cr'
  })

  test('zero matches → empty list (the typed text becomes a NEW client name)', () => {
    const r = filterClientRegister(register, cases, 'Completely Unknown Pty', 8)
    expect(r.clients).toEqual([])
    expect(r.truncated).toBe(false)
  })
})

describe('normaliseClientKey — mirrors the backend normaliser', () => {
  test.each([
    ['Vanoss Scaffolding Ltd.', 'vanossscaffoldingltd'],
    ['Café Río', 'caferio'],
    ['', ''],
    [null, '']
  ])('%s → %s', (input, expected) => {
    expect(normaliseClientKey(input)).toBe(expected)
  })
})
