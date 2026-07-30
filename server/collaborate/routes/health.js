'use strict'

function get (req, res, next) {
  res.send(200, { ok: true, timestamp: new Date().toISOString() })
  return next()
}

module.exports = { get }
