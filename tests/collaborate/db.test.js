'use strict'

/**
 * Tests for the MySQL pool singleton (server/utils/db.js).
 *
 * `mysql2/promise` is mocked so no real database connection is attempted. The
 * test asserts the pool is created once, from the integration DB config, with the
 * fixed safety options (utf8mb4, waitForConnections, queueLimit 0).
 */

jest.mock('mysql2/promise', () => ({ createPool: jest.fn(() => ({ __fakePool: true })) }))

const mysql = require('mysql2/promise')
const { DB } = require('../../config/collaborate/integration')

describe('db pool', () => {
  test('creates a single mysql2 pool from the integration DB config', () => {
    const pool = require('../../server/collaborate/utils/db')

    expect(mysql.createPool).toHaveBeenCalledTimes(1)
    expect(mysql.createPool).toHaveBeenCalledWith(expect.objectContaining({
      host: DB.host,
      port: DB.port,
      database: DB.database,
      user: DB.user,
      password: DB.password,
      connectionLimit: DB.connectionLimit,
      connectTimeout: DB.connectTimeout,
      waitForConnections: true,
      queueLimit: 0,
      charset: 'utf8mb4'
    }))
    expect(pool).toEqual({ __fakePool: true })
  })
})
