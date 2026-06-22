'use strict'

// The pick-endpoint-by-source seam for the manager "Move it here" action.
// The near-miss bridge only surfaces firm-own and firm-override rows, and each
// moves via a different endpoint — this locks the routing so a wiring change can't
// silently send a firm-own row to the platform endpoint (or vice versa).

const { buildMoveRequest } = require('../../utils/distinctionMove')

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
