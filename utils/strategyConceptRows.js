/**
 * The rows of the Strategy Concepts library (item 15.20, drawing §2): every concept an advisor
 * can scope a session from — the ones that ship with the platform and the ones a manager
 * imported — with what each column says about it.
 *
 * Returns locale KEYS and their parameters, never words, so the words stay Mike's approved
 * ones in locales/en.json.
 */

import { conceptSheetCount } from '~/components/strategy/concepts/index.js'

/**
 * @typedef {Object} LibraryRow
 * @property {string} id
 * @property {string} name
 * @property {string} section - the section's display name
 * @property {{key: string, params: object}|null} teaching - null where a shipped concept has no
 *   drawing yet and teaches from Mike's words
 * @property {{key: string, params: object}} response
 * @property {{key: string, params: object}} from
 * @property {boolean} removable - true only for a concept this level added itself
 * @property {string} [importedName] - the name the remove question uses
 */

/**
 * The capture forms built so far, each with Mike's approved name under
 * `strategyConcepts.forms.<id>` (drawing §8c, 2026-09-29). A form missing here shows
 * "Not yet chosen" rather than an internal id; tests/unit/strategyConceptRows.test.js checks
 * this list against every form the concept data uses, so a ninth form fails the build.
 */
export const KNOWN_FORMS = [
  'banded-grid',
  'prompt-answer-sheet',
  'named-rows-staged-columns',
  'parallel-prompt-pair',
  'small-comparison-grid',
  'attribute-rows-entity-columns',
  'named-field-stack',
  'parent-child-list'
]

const k = (key, params) => ({ key: 'strategyConcepts.' + key, params: params || {} })

function teachingOfShipped (id) {
  const n = conceptSheetCount(id)
  if (n === 0) { return null }
  return n === 1 ? k('teaching.drawn') : k('teaching.drawnPages', { n })
}

function responseOfShipped (c) {
  if (c.model) { return k('forms.model') }
  if (c.captureForm && KNOWN_FORMS.includes(c.captureForm)) { return k('forms.' + c.captureForm) }
  return k('forms.notChosen')
}

/**
 * @param {{shipped: Array<object>, concepts: Array<object>, sections: Array<{id: string,
 *   name: string}>, viewerTier: string}} list - the backend's answer
 * @param {function(string): string} dateOf - an ISO date as the reader's locale shows it
 * @returns {LibraryRow[]} shipped first in their own order, then imported top tier first
 */
export function libraryRows (list, dateOf) {
  const sectionName = {}
  ;(list.sections || []).forEach((s) => { sectionName[s.id] = s.name })
  // The shipped concepts are the mentor's own; every other level inherits them.
  const shippedFrom = list.viewerTier === 'mentor' ? k('from.mentor') : k('from.inherited')

  const shipped = (list.shipped || []).map(c => ({
    id: c.id,
    name: c.name,
    section: sectionName[c.planningDomain] || '',
    teaching: teachingOfShipped(c.id),
    response: responseOfShipped(c),
    from: shippedFrom,
    removable: false
  }))

  const imported = (list.concepts || []).map(c => ({
    id: c.id,
    name: c.name,
    section: sectionName[c.planningDomain] || '',
    teaching: c.teachingPageCount > 1 ? k('teaching.importedPages', { n: c.teachingPageCount }) : k('teaching.imported'),
    response: k('forms.imported'),
    from: c.here ? k('from.addedHere', { date: dateOf(c.addedAt) }) : k('from.inherited'),
    removable: Boolean(c.here),
    importedName: c.name
  }))

  return shipped.concat(imported)
}

/**
 * The two counts in the cascade note: concepts reaching this level from above, and added here.
 * @param {{shipped: Array<object>, concepts: Array<object>, viewerTier: string}} list
 * @returns {{n: number, m: number}}
 */
export function cascadeCounts (list) {
  const concepts = list.concepts || []
  const here = concepts.filter(c => c.here).length
  // At the mentor the shipped concepts are its own, so nothing reaches it from above.
  const shippedAbove = list.viewerTier === 'mentor' ? 0 : (list.shipped || []).length
  return { n: shippedAbove + concepts.length - here, m: here + (list.viewerTier === 'mentor' ? (list.shipped || []).length : 0) }
}
