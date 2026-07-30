'use strict'

/**
 * GUARD — every piece of content must be provably in a known lane, and content
 * must not silently change lanes.
 *
 * Why this file exists. On 2026-07-31, while planning the transcription of
 * three new client-facing logic tables, they were about to be filed in the
 * `flat_if_then` shape because that is what the source PDFs look like. That
 * shape is not cosmetic: logicTrees.js documents it as "never walked, and never
 * fed into the client recommendation path". The tables would have rendered
 * correctly in Firm Manager, saved correctly, passed every existing test — and
 * influenced nothing.
 *
 * That is the third instance of the same failure class in two days (the
 * domain-support storage-key defect and the Course Builder session-briefing
 * defect were the other two). Every one was caught by a person reading code.
 * Mike's instruction was to make the routing visible rather than rely on that
 * happening again.
 *
 * A report alone would not do it — nobody re-reads a report that has never been
 * wrong. This test is the control; the report is generated from the same
 * classifier so the two cannot drift.
 *
 * NOTE ON WHAT THIS PROVES. It proves an asset's lane is DETERMINABLE and has
 * not changed unnoticed. It does not prove the lane is the RIGHT one for that
 * content — that is a judgement (see the Get-the-Job allowlist below, which is
 * where those judgements are written down).
 */

const {
  LANES,
  LANE_DESCRIPTIONS,
  classifyLogicTrees,
  classifyDomainSupport,
  classifyTemplates,
  classifyQuizBanks,
  classifyDistinctions,
  classifyAllContent,
  summariseRouting
} = require('../../server/utils/contentRouting')

/**
 * The logic tables that are legitimately advisor-read-only: the Get-the-Job
 * advisor-development kit, which by design §2.5 must NOT reach client
 * templates. Anything else landing in this lane is the 2026-07-31 near-miss
 * happening again, so a new entry has to be added here deliberately, with a
 * reason, rather than appearing by accident.
 */
const EXPECTED_ADVISOR_ONLY_TREES = {
  get_sales_tracker: 'Get-the-Job — advisor sales-tracking kit (design §2.5)',
  get_marketing: 'Get-the-Job — advisor marketing kit (design §2.5)',
  get_positioning: 'Get-the-Job — advisor positioning kit (design §2.5)',
  get_team_problem: 'Get-the-Job — advisor team-problem kit (design §2.5)',
  get_pricing_proposals: 'Get-the-Job — advisor pricing/proposal kit (design §2.5)'
}

describe('content routing — the lane guard', () => {
  describe('nothing is unclassifiable', () => {
    it('places every content asset in a known lane', () => {
      const { unknown } = summariseRouting()

      // The message matters more than the assertion: a bare "expected 3 to be 0"
      // sends the next person hunting. Name the assets.
      const detail = unknown
        .map(r => `  ${r.family} "${r.id}" — ${r.decidedBy} (${r.evidence})`)
        .join('\n')

      expect(unknown.length === 0 ? '' : `\n${detail}\n`).toBe('')
    })

    it('uses only the declared lanes, and describes each one it uses', () => {
      const rows = classifyAllContent()
      const declared = Object.values(LANES)
      const used = Array.from(new Set(rows.map(r => r.lane)))

      for (const lane of used) {
        expect(declared).toContain(lane)
        expect(typeof LANE_DESCRIPTIONS[lane]).toBe('string')
        expect(LANE_DESCRIPTIONS[lane].length).toBeGreaterThan(0)
      }
    })

    it('gives every asset a reason and evidence, so no report row can be blank', () => {
      for (const row of classifyAllContent()) {
        expect(typeof row.decidedBy).toBe('string')
        expect(row.decidedBy.trim().length).toBeGreaterThan(0)
        expect(typeof row.evidence).toBe('string')
        expect(row.evidence.trim().length).toBeGreaterThan(0)
      }
    })
  })

  /**
   * A guard that iterates an empty list passes and proves nothing. These floors
   * are the trap the entry-node and session-reach work both recorded: they fail
   * if a data file stops loading, is renamed, or is emptied — the failure mode
   * where a green suite means the guard silently stopped guarding.
   */
  describe('the guard cannot pass vacuously', () => {
    it('classifies the full content set, not a subset', () => {
      expect(classifyLogicTrees().length).toBeGreaterThanOrEqual(42)
      expect(classifyDomainSupport().length).toBeGreaterThanOrEqual(29)
      expect(classifyTemplates().length).toBeGreaterThanOrEqual(285)
      expect(classifyQuizBanks().length).toBeGreaterThanOrEqual(60)
      expect(classifyDistinctions().length).toBeGreaterThanOrEqual(60)
    })

    it('finds content in every lane it claims to distinguish', () => {
      const { byLane } = summariseRouting()

      expect(byLane[LANES.CLIENT_RECOMMENDATION]).toBeGreaterThan(0)
      expect(byLane[LANES.AI_BRIEFING]).toBeGreaterThan(0)
      expect(byLane[LANES.ADVISOR_READ_ONLY]).toBeGreaterThan(0)
    })
  })

  describe('logic tables — the shape decides the lane', () => {
    it('routes every `nodes` tree to client recommendations', () => {
      const nodeTrees = classifyLogicTrees()
        .filter(r => r.decidedBy.indexOf('`nodes` graph') === 0)

      expect(nodeTrees.length).toBeGreaterThanOrEqual(37)
      for (const tree of nodeTrees) {
        expect(tree.lane).toBe(LANES.CLIENT_RECOMMENDATION)
      }
    })

    it('routes every `flat_if_then` tree to advisor-read-only', () => {
      const flat = classifyLogicTrees()
        .filter(r => r.evidence.includes('type=flat_if_then'))

      expect(flat.length).toBeGreaterThan(0)
      for (const tree of flat) {
        expect(tree.lane).toBe(LANES.ADVISOR_READ_ONLY)
      }
    })

    /**
     * THE ONE THAT WOULD HAVE CAUGHT THE 2026-07-31 NEAR-MISS. Filing a
     * client-facing table as flat_if_then adds it to the advisor-read-only lane,
     * which fails here until someone writes down why it belongs there.
     */
    it('has no advisor-read-only logic table that is not a recorded Get-the-Job kit', () => {
      const unexpected = classifyLogicTrees()
        .filter(r => r.lane === LANES.ADVISOR_READ_ONLY)
        .filter(r => !EXPECTED_ADVISOR_ONLY_TREES[r.id])
        .map(r => r.id)

      // If this fails, the tree is Learn-mode reference only: it will never
      // influence a client recommendation. Either give it a `nodes` graph, or
      // add it above with the reason it is advisor-only.
      expect(unexpected).toEqual([])
    })

    it('still holds every recorded Get-the-Job kit in the advisor-only lane', () => {
      const byId = {}
      for (const row of classifyLogicTrees()) { byId[row.id] = row }

      for (const id of Object.keys(EXPECTED_ADVISOR_ONLY_TREES)) {
        expect(byId[id]).toBeDefined()
        expect(byId[id].lane).toBe(LANES.ADVISOR_READ_ONLY)
      }
    })
  })

  describe('domain support briefs the AI but never selects templates (§0.6)', () => {
    it('routes every domain-support file to the briefing lane', () => {
      const rows = classifyDomainSupport()

      expect(rows.length).toBeGreaterThanOrEqual(29)
      for (const row of rows) {
        expect(row.lane).toBe(LANES.AI_BRIEFING)
      }
    })

    it('never routes domain support to client recommendations', () => {
      const leaked = classifyDomainSupport()
        .filter(r => r.lane === LANES.CLIENT_RECOMMENDATION)
        .map(r => r.id)

      expect(leaked).toEqual([])
    })
  })

  describe('quiz banks never reach a client recommendation', () => {
    it('routes every bank to advisor-read-only', () => {
      const rows = classifyQuizBanks()

      expect(rows.length).toBeGreaterThanOrEqual(60)
      for (const row of rows) {
        expect(row.lane).toBe(LANES.ADVISOR_READ_ONLY)
      }
    })
  })

  describe('distinctions do move recommendations, by design', () => {
    it('routes a distinction with a boost and targets to client recommendations', () => {
      const live = classifyDistinctions()
        .filter(r => r.lane === LANES.CLIENT_RECOMMENDATION)

      expect(live.length).toBeGreaterThan(0)
      for (const row of live) {
        expect(row.decidedBy).toMatch(/boost \+\d+ added to \d+ template/)
      }
    })

    it('does not count a distinction that cannot change a score as live', () => {
      for (const row of classifyDistinctions()) {
        if (row.lane !== LANES.CLIENT_RECOMMENDATION) {
          expect(row.decidedBy).toBe('no boost or no target templates — cannot change a score')
        }
      }
    })
  })

  describe('templates split on includedInClient', () => {
    it('routes client-eligible pages one way and advisor-only pages the other', () => {
      const rows = classifyTemplates()
      const client = rows.filter(r => r.lane === LANES.CLIENT_RECOMMENDATION)
      const advisor = rows.filter(r => r.lane === LANES.ADVISOR_READ_ONLY)

      expect(client.length).toBeGreaterThan(0)
      expect(advisor.length).toBeGreaterThan(0)
      expect(client.length + advisor.length).toBe(rows.length)
    })
  })
})
