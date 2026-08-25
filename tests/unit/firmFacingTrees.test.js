'use strict'

/**
 * GUARD — firm-facing logic trees belong to the learning surface, never to the client
 * engine.
 *
 * Four trees are about running an accountancy firm, not about advising a client:
 * FM Coaching & Firm Culture, CA Firm Strategy, Firm Board Pack, and Leadership & Partner
 * Development. The triage of 2026-06-23 ruled they *"belong to the firm/learning surface,
 * not the client engine"*.
 *
 * 🔴 WHAT MAKES THAT TRUE IS TWO FIELDS, AND NOTHING ELSE.
 *
 *   `mode: 'learn'`         — the client template soft-hint skips learn trees
 *                             (`server/advisorEngine.js`, the `_tree.mode === 'learn'`
 *                             filter), so a firm-internal tree can no longer boost a
 *                             template in a CLIENT recommendation.
 *   `section: 'get-organised'` — `isClientDeliveryLearnTree` refuses `get-the-job` and
 *                             `get-organised`, so they never open as a client deep dive.
 *
 * Drop either field and the tree silently rejoins the client path. Measured before the
 * fields were added: a client conversation about staff walked `fm_coach_culture` and came
 * back with "Advisory Performance Improvement" and "Advisor-e Coaching Plan", which then
 * took a scoring boost in the resolver. Nothing on any screen would have shown that.
 *
 * ⚠ THIS IS A DATA GUARD, NOT A CODE ONE. It reads `data/logic_trees.json`, which is
 * hand-maintained and editable from the Mentor Hub, so the fields can be lost by an edit
 * that looks entirely reasonable.
 */

const { readFileSync } = require('fs')
const { resolve } = require('path')

const { isClientDeliveryLearnTree } = require('../../server/utils/logicTrees')

const trees = JSON.parse(
  readFileSync(resolve(__dirname, '..', '..', 'data', 'logic_trees.json'), 'utf8')
).trees

/** The four, by id. Named rather than pattern-matched: a rule you can read. */
const FIRM_FACING = [
  'fm_coach_culture',
  'org_ca_firm_strategy',
  'org_firm_board_pack',
  'org_leadership'
]

const byId = id => trees.find(t => t.id === id)

describe('the firm-facing trees are still here', () => {
  test.each(FIRM_FACING)('%s exists', (id) => {
    expect(byId(id)).toBeDefined()
  })
})

describe('🔴 they are on the learning surface, not the client engine', () => {
  test.each(FIRM_FACING)('%s is a learn tree', (id) => {
    // Without this, the client template soft-hint walks the tree and its named
    // templates boost a CLIENT recommendation.
    expect(byId(id).mode).toBe('learn')
  })

  test.each(FIRM_FACING)('%s sits in get-organised', (id) => {
    expect(byId(id).section).toBe('get-organised')
  })

  test.each(FIRM_FACING)('%s can never open as a client deep dive', (id) => {
    // The outcome rather than the field — this runs the production predicate.
    expect(isClientDeliveryLearnTree(byId(id))).toBe(false)
  })
})

describe('and an adviser can actually reach them', () => {
  test('all four are in the Learn picker\'s menu', () => {
    // The menu is every `mode: 'learn'` tree. Before the fields were added, three of
    // these four were reachable by no adviser-development function at all.
    const menu = trees.filter(t => t && t.mode === 'learn').map(t => t.id)
    FIRM_FACING.forEach(id => expect(menu).toContain(id))
  })
})
