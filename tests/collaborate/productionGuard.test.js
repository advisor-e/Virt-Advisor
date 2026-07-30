'use strict'

/**
 * Tests for server/utils/productionGuard.js — the production startup guard.
 * Target: 100% coverage (CLAUDE.md §Security — this is security-critical).
 */

const { productionStartupViolations, isPlaceholder, PLACEHOLDERS } = require('../../server/collaborate/utils/productionGuard')

const REAL = { AUTH: { secret: 'a-real-secret' }, DB: { password: 'a-real-password' } }

describe('isPlaceholder', () => {
  test('true for empty / undefined', () => {
    expect(isPlaceholder('')).toBe(true)
    expect(isPlaceholder(undefined)).toBe(true)
  })

  test('true for the known placeholder strings', () => {
    PLACEHOLDERS.forEach(p => expect(isPlaceholder(p)).toBe(true))
  })

  test('false for a real value', () => {
    expect(isPlaceholder('a-real-secret')).toBe(false)
  })
})

describe('productionStartupViolations', () => {
  test('no violations outside production, even with placeholders', () => {
    const env = { NODE_ENV: 'development', ALLOW_DEV_AUTH: 'true' }
    expect(productionStartupViolations(env, { AUTH: {}, DB: {} })).toEqual([])
  })

  test('no violations when env is missing entirely', () => {
    expect(productionStartupViolations(undefined, REAL)).toEqual([])
  })

  test('blocks ALLOW_DEV_AUTH=true in production', () => {
    const env = { NODE_ENV: 'production', ALLOW_DEV_AUTH: 'true' }
    const v = productionStartupViolations(env, REAL)
    expect(v.some(m => /ALLOW_DEV_AUTH/.test(m))).toBe(true)
  })

  test('blocks a placeholder JWT secret in production', () => {
    const env = { NODE_ENV: 'production' }
    const config = { AUTH: { secret: 'REPLACE_ME_WITH_ADVISOR_E_JWT_SECRET' }, DB: REAL.DB }
    const v = productionStartupViolations(env, config)
    expect(v.some(m => /JWT signing secret/.test(m))).toBe(true)
  })

  test('blocks a placeholder MySQL password in production', () => {
    const env = { NODE_ENV: 'production' }
    const config = { AUTH: REAL.AUTH, DB: { password: 'REPLACE_ME' } }
    const v = productionStartupViolations(env, config)
    expect(v.some(m => /MySQL password/.test(m))).toBe(true)
  })

  test('reports secret and password when config is missing in production', () => {
    const v = productionStartupViolations({ NODE_ENV: 'production' }, undefined)
    expect(v).toHaveLength(2)
  })

  test('no violations in production with real secrets and dev-auth off', () => {
    const env = { NODE_ENV: 'production', ALLOW_DEV_AUTH: 'false' }
    expect(productionStartupViolations(env, REAL)).toEqual([])
  })
})
