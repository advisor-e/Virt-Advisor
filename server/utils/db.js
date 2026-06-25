'use strict'

/**
 * db — MySQL connection pool (singleton).
 *
 * Import this module anywhere a DB query is needed:
 *   const db = require('./db')
 *   const [rows] = await db.execute('SELECT ...', [params])
 *
 * INTEGRATION NOTE (for Advisor-e team):
 *   Connection settings are read from config/integration.js → DB section.
 *   Edit that file (or set the corresponding env vars) to point at the
 *   Advisor-e MySQL instance. This module does not need to change.
 */

const mysql = require('mysql2/promise')
const { DB } = require('../../config/integration')

const pool = mysql.createPool({
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
})

module.exports = pool
