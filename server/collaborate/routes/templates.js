'use strict'

/**
 * Template routes — thin HTTP handler over the Advisory template source seam
 * (server/data/advisoryTemplates.js). READ-ONLY: the catalogue is master data and
 * is never created or edited from this app.
 *
 * @route GET /api/templates?q=<search>
 *   Returns the slim catalogue that feeds the "Choose the Advisor-e tool" picker.
 *   Each row: { pageId, title, section, subSection, tags }.
 *
 * Restify 9: async handlers take (req, res) only — no `next` (see people.js note).
 */

const templates = require('../data/advisoryTemplates')
const ipClass = require('../data/ipClassification')

function ok (res, data) { res.send(200, data) }

async function list (req, res) {
  const q = (req.query && req.query.q) || ''
  const rows = await templates.list(q)
  // Enrich each row with its IP classification (tier/label/locked) so the picker
  // can flag locked frameworks and prevent them being listed (plan §6; T3).
  const enriched = await Promise.all(rows.map(async r => Object.assign({}, r, await ipClass.classify(r.pageId))))
  ok(res, enriched)
}

module.exports = { list }
