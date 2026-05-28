'use strict'
/**
 * Template Registry — canonical join layer keyed by template page ID.
 *
 * Loads templates.json + content-summaries.json at startup and builds a
 * single Map<pageId, { template, summary }> so every downstream lookup uses
 * the stable page ID rather than brittle name matching.
 *
 * Usage:
 *   const { getEntry, getSummaryByPage, getTemplateByPage } = require('./templateRegistry')
 *
 *   const entry   = getEntry('8-profit-levers')        // { template, summary }
 *   const summary = getSummaryByPage('8-profit-levers') // summary object or null
 *   const tmpl    = getTemplateByPage('8-profit-levers') // template object or null
 */

const { readFileSync } = require('fs')
const { resolve } = require('path')

let _registry = null

function buildRegistry () {
  const templatesRaw = JSON.parse(readFileSync(resolve(process.cwd(), 'data/templates.json'), 'utf8'))
  const allTemplates = templatesRaw.templates || templatesRaw

  const summariesRaw = JSON.parse(readFileSync(resolve(process.cwd(), 'data/content-summaries.json'), 'utf8'))
  const allSummaries = summariesRaw.summaries || summariesRaw

  // Build page → summary index from the enriched page/pages fields
  const summaryByPage = new Map()
  for (const s of allSummaries) {
    if (s.page) {
      summaryByPage.set(s.page, s)
    }
    if (s.pages && Array.isArray(s.pages)) {
      for (const pageId of s.pages) {
        if (!summaryByPage.has(pageId)) {
          summaryByPage.set(pageId, s)
        }
      }
    }
  }

  // Build the registry: page → { template, summary }
  const registry = new Map()
  for (const t of allTemplates) {
    if (!t.page) { continue }
    registry.set(t.page, {
      template: t,
      summary: summaryByPage.get(t.page) || null
    })
  }

  return registry
}

function getRegistry () {
  if (!_registry) { _registry = buildRegistry() }
  return _registry
}

function getEntry (pageId) {
  if (!pageId) { return null }
  return getRegistry().get(pageId) || null
}

function getSummaryByPage (pageId) {
  const entry = getEntry(pageId)
  return entry ? entry.summary : null
}

function getTemplateByPage (pageId) {
  const entry = getEntry(pageId)
  return entry ? entry.template : null
}

/**
 * Returns all client-facing templates with their summaries.
 * Used by Stage 1 semantic selection.
 */
function getClientTemplatesWithSummaries () {
  const registry = getRegistry()
  const result = []
  for (const entry of registry.values()) {
    if (entry.template.includedInClient === true) {
      result.push(entry)
    }
  }
  return result
}

module.exports = { getRegistry, getEntry, getSummaryByPage, getTemplateByPage, getClientTemplatesWithSummaries }
