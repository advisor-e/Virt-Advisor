'use strict'
/* eslint-env jest */

/**
 * pages/connections.vue is RETIRED (Phase 4 of FEAT-CONNECTING) — it now only
 * redirects to the unified /connecting screen, which replaces it. Its former
 * behaviour (connections, requests, groups, message-a-connection) lives on the
 * Connecting page (tests/connecting.test.js).
 */

import Connections from '../../components/collaborate/screens/connections.vue'

describe('connections redirect', () => {
  test('redirects to /connecting', () => {
    const redirect = jest.fn()
    Connections.middleware({ redirect, query: {} })
    expect(redirect).toHaveBeenCalledWith('/connecting')
  })
})
