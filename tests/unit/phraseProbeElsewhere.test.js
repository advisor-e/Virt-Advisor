'use strict'

process.env.JWT_SECRET = 'test-secret'
process.env.MYSQL_DATABASE = 'virt_advisor_test'
process.env.MYSQL_PASSWORD = 'test'

/**
 * "WHY DIDN'T MINE WORK?" — the answer the page could not give.
 *
 * A firm manager opens the diagnostic because they wrote a distinction and it
 * never fired. The commonest cause is not poor wording: distinctions are scored
 * INSIDE the detected domain, so a row filed anywhere else is never shown to the
 * AI at all, however well it describes the situation.
 *
 * Found by Mike on 2026-08-03. He typed "clients who are not on the same page,
 * have poor decision making and no clear strategy". It read as `governance`. His
 * own row "Clients not on same page or haven't defined what each wants from the
 * business" sits in `conflict` — an almost verbatim match that never entered the
 * running. The page instead reported a PLATFORM row that did match and offered to
 * change THAT, which is the wrong material and the wrong answer.
 * See design/LOGIC-LAB-ACCEPT-AND-PUSH.md §1a.
 *
 * The classifier is mocked because it is a live AI call; what is under test is
 * WHICH ROWS ARE PUT IN FRONT OF IT, which is exactly where the bug was.
 */

jest.mock('../../server/utils/db', () => ({ execute: jest.fn(), getConnection: jest.fn() }))
// Spread the REAL engine and replace only the AI call. `scoreDomains` reads
// `DOMAIN_PATTERNS` from this module, so a bare mock leaves every sentence with no
// detected domain — at which point `matchDistinctions` returns early and the
// assertions below pass without ever reaching the code under test.
jest.mock('../../server/advisorEngine', () => {
  const actual = jest.requireActual('../../server/advisorEngine')
  return { ...actual, classifyMatchingRows: jest.fn() }
})

const engine = require('../../server/advisorEngine')
const phraseProbe = require('../../server/utils/phraseProbe')

const MIKES_SENTENCE = 'ive got clients who are not on the same page, have poor decision making and no clear strategy'

/** His real configuration, reduced to the rows that matter. */
const HIS_OWN_ROW = {
  id: 1,
  domain: 'conflict',
  source: 'firm-own',
  description: "Clients not on same page or haven't defined what each wants from the business.",
  triggers: ['Misaligned', 'Lacking Clarity', 'No Clear Vision', 'Lack of direction'],
  templates: ['Lite Strategy'],
  boost: 7
}

const PLATFORM_ROW = {
  id: 'pd-40',
  domain: 'governance',
  source: 'platform',
  description: 'Poor decision quality',
  triggers: ['analysis paralysis', 'going in circles'],
  templates: ['6 Hats'],
  boost: 5
}

const DOMAINS = [{ id: 'governance', label: 'Governance & Leadership' }]

beforeEach(() => { jest.clearAllMocks() })

describe('the firm’s own distinctions filed in another area', () => {
  it('reports the row that was never considered, and says where it is filed', async () => {
    engine.classifyMatchingRows.mockImplementation((rows) => {
      // In-domain pass: the platform row matches. Elsewhere pass: his does.
      if (rows.some(r => r.id === 'pd-40')) { return Promise.resolve([PLATFORM_ROW]) }
      return Promise.resolve(rows.filter(r => r.id === 1))
    })

    const out = await phraseProbe.probeText(MIKES_SENTENCE, null, [PLATFORM_ROW, HIS_OWN_ROW])
    const elsewhere = out.distinctions.elsewhere

    expect(elsewhere.considered).toBe(1)
    expect(elsewhere.rows.length).toBe(1)
    expect(elsewhere.rows[0].description).toContain('not on same page')
    // The area it is filed in IS the finding — it is what has to change.
    expect(elsewhere.rows[0].filedDomain).toBe('conflict')
  })

  it('only ever offers the firm’s OWN material, never the platform’s', async () => {
    // The rule that stops 2026-08-03 repeating: re-filing a row the firm never
    // wrote is not a determined fix, so a platform row elsewhere is not offered.
    const platformElsewhere = { ...PLATFORM_ROW, id: 'pd-77', domain: 'profit', source: 'platform' }
    engine.classifyMatchingRows.mockResolvedValue([])

    await phraseProbe.probeText(MIKES_SENTENCE, null, [PLATFORM_ROW, platformElsewhere])

    const elsewhereCall = engine.classifyMatchingRows.mock.calls
      .find(c => c[2] === 'logic-lab-elsewhere')
    expect(elsewhereCall).toBeUndefined()
  })

  it('includes a firm-override — an edited platform row is the firm’s material', async () => {
    const edited = { ...PLATFORM_ROW, id: 'pd-9', domain: 'staff', source: 'firm-override' }
    engine.classifyMatchingRows.mockResolvedValue([])

    await phraseProbe.probeText(MIKES_SENTENCE, null, [PLATFORM_ROW, edited])

    const elsewhereCall = engine.classifyMatchingRows.mock.calls
      .find(c => c[2] === 'logic-lab-elsewhere')
    expect(elsewhereCall).toBeDefined()
    expect(elsewhereCall[0].map(r => r.id)).toEqual(['pd-9'])
  })

  it('never re-offers a row that is already IN the detected area', async () => {
    // It was considered and did not match; that is a wording answer, not a
    // filing one, and conflating them would send the manager to the wrong fix.
    const inGovernance = { ...HIS_OWN_ROW, domain: 'governance' }
    engine.classifyMatchingRows.mockResolvedValue([])

    await phraseProbe.probeText(MIKES_SENTENCE, null, [inGovernance])

    const elsewhereCall = engine.classifyMatchingRows.mock.calls
      .find(c => c[2] === 'logic-lab-elsewhere')
    expect(elsewhereCall).toBeUndefined()
  })

  it('still looks elsewhere when the detected area holds nothing of theirs', async () => {
    // "You have none here, but one filed under Conflict fits" beats either half.
    engine.classifyMatchingRows.mockImplementation(rows => Promise.resolve(rows.filter(r => r.id === 1)))

    const out = await phraseProbe.probeText(MIKES_SENTENCE, null, [HIS_OWN_ROW])

    expect(out.distinctions.matched).toEqual([])
    expect(out.distinctions.reason).toContain('no distinctions yet')
    expect(out.distinctions.elsewhere.rows[0].filedDomain).toBe('conflict')
  })
})

// Referenced so the fixture's purpose is obvious rather than implied.
expect(DOMAINS[0].id).toBe('governance')
