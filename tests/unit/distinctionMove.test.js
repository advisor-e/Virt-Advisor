'use strict'

// The pick-endpoint-by-source seam for the manager "Move it here" action.
// The near-miss bridge only surfaces firm-own and firm-override rows, and each
// moves via a different endpoint — this locks the routing so a wiring change can't
// silently send a firm-own row to the platform endpoint (or vice versa).

const { buildMoveRequest, buildCopyRequest } = require('../../utils/distinctionMove')

describe('buildMoveRequest', () => {
  test('firm-own near-miss → partial domain update on the firm row', () => {
    const req = buildMoveRequest({ id: 7, source: 'firm-own' }, 'profitability')
    expect(req).toEqual({
      method: 'PUT',
      path: '/api/firm-manager/distinctions/7',
      body: { domain: 'profitability' }
    })
  })

  test('firm-override near-miss → platform move endpoint carrying the target domain', () => {
    const req = buildMoveRequest({ id: 'pd-3', source: 'firm-override' }, 'sales')
    expect(req).toEqual({
      method: 'POST',
      path: '/api/firm-manager/distinctions/platform/pd-3/move',
      body: { targetDomain: 'sales' }
    })
  })

  test('encodes the id in the path', () => {
    const req = buildMoveRequest({ id: 'pd 9', source: 'firm-override' }, 'staff')
    expect(req.path).toBe('/api/firm-manager/distinctions/platform/pd%209/move')
  })
})

// Copy is the Logic-Lab page's third near-miss option: the situation genuinely
// arises in BOTH areas, so moving it would fix one and break the other.
describe('buildCopyRequest', () => {
  const row = {
    id: 7,
    source: 'firm-own',
    description: 'Owner cannot let go',
    triggers: ['wont let go', 'cannot step back'],
    templates: ['Succession Plan'],
    boost: 8
  }

  test('creates a NEW firm row in the target area, touching no existing endpoint', () => {
    expect(buildCopyRequest(row, 'staff')).toEqual({
      method: 'POST',
      path: '/api/firm-manager/distinctions',
      body: {
        domain: 'staff',
        description: 'Owner cannot let go',
        triggers: ['wont let go', 'cannot step back'],
        templates: ['Succession Plan'],
        boost: 8
      }
    })
  })

  test('a firm-override copies the same way — the firm’s edited wording, as a firm row', () => {
    const req = buildCopyRequest({ ...row, id: 'pd-3', source: 'firm-override' }, 'sales')
    expect(req.method).toBe('POST')
    expect(req.path).toBe('/api/firm-manager/distinctions')
    expect(req.body.domain).toBe('sales')
    expect(req.body.description).toBe('Owner cannot let go')
  })

  test('falls back to the default boost rather than sending nothing', () => {
    const req = buildCopyRequest({ description: 'x', triggers: ['a'], templates: ['b'] }, 'staff')
    expect(req.body.boost).toBe(5)
  })

  test('never sends a non-array for triggers or templates', () => {
    const req = buildCopyRequest({ description: 'x', triggers: null, templates: undefined }, 'staff')
    expect(req.body.triggers).toEqual([])
    expect(req.body.templates).toEqual([])
  })
})
