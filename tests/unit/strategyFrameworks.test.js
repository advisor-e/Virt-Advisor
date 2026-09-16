'use strict'

// Exercises strategyFrameworks — Decision 3 of the Strategy Planner drawing, ruled by
// Mike 2026-09-16: a framework is DATA naming its capture shape, never its own screen.
//
// WHAT THESE TESTS ARE FOR. Every framework here is authored, and will be authored by a
// mentor on a screen once the Mentor Hub tab is built. Three kinds of malformed record
// produce a plan that is wrong while looking perfectly normal on screen:
//
//   1. TWO BOXES WITH THE SAME KEY. They share a row in strategy_session_entries, whose
//      UNIQUE key is (session, framework, field), so one silently overwrites the other and
//      the plan quotes whichever was typed last. A tester sees two boxes and fills both.
//   2. A FRAMEWORK IN NO PLANNING DOMAIN. Nothing can reach it, so the content is
//      authored, invisible, and nobody is told — the 4.16 failure in miniature.
//   3. A MATERIAL POINTER THAT RESOLVES TO NOTHING. The card renders with no concept text
//      and the advisor teaches the framework from memory, or not at all.
//
// And the join itself, which is the other half of Decision 3: the concept text stays in
// the domain support file where it is authored and reaches the AI. A copy here would drift
// and nothing would fail.

const frameworks = require('../../server/utils/strategyFrameworks')
const strategySupport = require('../../data/strategy-domain-support.json')

describe('the three proving frameworks load', () => {
  it('loads exactly the three Mike named, and no more', () => {
    // "Build the machine and prove it on three frameworks, not fifty." A fourth arriving
    // here without a decision is scope creep with no ruling behind it.
    expect(frameworks.listFrameworks().map(f => f.id).sort())
      .toEqual(['porters-five-forces', 'profit-levers', 'swot-pest'])
  })

  it('gives the three genuinely different shapes the decision turns on', () => {
    // If all three were the same shape they would prove nothing about one renderer
    // carrying 45 frameworks.
    const shapes = frameworks.listFrameworks().map(f => f.shape).sort()
    expect(shapes).toEqual(['buckets', 'forces', 'quadrants'])
  })

  it('gives the 8 Profit Levers exactly eight boxes', () => {
    expect(frameworks.getFramework('profit-levers').fields).toHaveLength(8)
  })

  it('gives SWOT four quadrants, in the deck\'s order', () => {
    const keys = frameworks.getFramework('swot-pest').fields.map(f => f.key)
    expect(keys).toEqual(['strengths', 'weaknesses', 'opportunities', 'threats'])
  })

  it('marks exactly one Porter\'s box as the centre the others press upon', () => {
    const centre = frameworks.getFramework('porters-five-forces')
      .fields.filter(f => f.centre)
    expect(centre.map(f => f.key)).toEqual(['existing-rivalry'])
  })

  it('returns null for a framework nobody authored', () => {
    expect(frameworks.getFramework('does-not-exist')).toBeNull()
  })
})

describe('the concept text is joined, never copied', () => {
  it('reads the summary from the domain support file rather than holding its own', () => {
    // The point of the join: edit the material and the Planner follows. A copy in
    // strategy-frameworks.json would drift from this and nothing would fail.
    const material = strategySupport.materials.find(m => m.id === 'strategy-swot-pest')
    expect(frameworks.getFramework('swot-pest').conceptSummary).toBe(material.summary)
  })

  it('carries the material\'s steps and who/when through as well', () => {
    const material = strategySupport.materials.find(m => m.id === 'strategy-porters-pine')
    const f = frameworks.getFramework('porters-five-forces')

    expect(f.whoWhen).toBe(material.who_when)
    expect(f.steps).toEqual(material.steps)
  })

  it('names where the concept came from, so a screen can link back to it', () => {
    expect(frameworks.getFramework('profit-levers').materialRef)
      .toEqual({ domain: 'strategy', id: 'strategy-profit-levers-blue-ocean' })
  })
})

describe('a Planning Domain offers its own frameworks', () => {
  it('finds the three Strategic Orientation offers', () => {
    const ids = frameworks.frameworksForPlanningDomain('strategic-orientation').map(f => f.id)
    expect(ids.sort()).toEqual(['porters-five-forces', 'profit-levers', 'swot-pest'])
  })

  it('lets one framework belong to two domains, because the decks repeat it', () => {
    // The 8 Profit Levers is in Business Targets AND Strategic Orientation 2. Forcing it
    // into one would make the other domain's Session Scope table wrong against the deck.
    expect(frameworks.frameworksForPlanningDomain('business-targets').map(f => f.id))
      .toEqual(['profit-levers'])
  })

  it('returns nothing for a domain no framework has reached yet', () => {
    // Organisational Review's eight and Sales & Marketing's fifteen are authored in the
    // other two domain support files and are not yet in the Planner. Empty is the honest
    // answer; it must not throw.
    expect(frameworks.frameworksForPlanningDomain('organisational-review')).toEqual([])
    expect(frameworks.frameworksForPlanningDomain('sales-marketing-review')).toEqual([])
  })

  it('returns nothing for a domain that does not exist', () => {
    expect(frameworks.frameworksForPlanningDomain('not-a-domain')).toEqual([])
  })
})

describe('the capture route can tell a real box from an invented one', () => {
  it('knows a framework\'s own field', () => {
    expect(frameworks.hasField('swot-pest', 'strengths')).toBe(true)
  })

  it('refuses a field belonging to a different framework', () => {
    expect(frameworks.hasField('swot-pest', 'suppliers')).toBe(false)
  })

  it('refuses a field on a framework that does not exist', () => {
    expect(frameworks.hasField('nope', 'strengths')).toBe(false)
  })
})

describe('a malformed authored record fails loudly, not quietly', () => {
  const good = {
    id: 'test-framework',
    name: 'Test',
    planningDomains: ['strategic-orientation'],
    shape: 'quadrants',
    material: { domain: 'strategy', id: 'strategy-swot-pest' },
    fields: [
      { key: 'a', label: 'A' }, { key: 'b', label: 'B' },
      { key: 'c', label: 'C' }, { key: 'd', label: 'D' }
    ]
  }

  function withFields (fields) {
    return Object.assign({}, good, { fields })
  }

  it('accepts a well-formed record', () => {
    expect(frameworks.buildFramework(good).id).toBe('test-framework')
  })

  it('🔴 refuses two boxes sharing a key, which would silently overwrite each other', () => {
    const clash = withFields([
      { key: 'a', label: 'A' }, { key: 'a', label: 'Also A' },
      { key: 'c', label: 'C' }, { key: 'd', label: 'D' }
    ])
    expect(() => frameworks.buildFramework(clash))
      .toThrow(/same key/)
  })

  it('refuses a box with no key at all', () => {
    const blank = withFields([
      { key: '', label: 'A' }, { key: 'b', label: 'B' },
      { key: 'c', label: 'C' }, { key: 'd', label: 'D' }
    ])
    expect(() => frameworks.buildFramework(blank)).toThrow(/needs a key/)
  })

  it('refuses a quadrants framework that is not four boxes', () => {
    // A 2x2 renderer given three or five boxes misplaces them, and the screen looks
    // plausible either way.
    const three = withFields([
      { key: 'a', label: 'A' }, { key: 'b', label: 'B' }, { key: 'c', label: 'C' }
    ])
    expect(() => frameworks.buildFramework(three)).toThrow(/takes 4 to 4/)
  })

  it('refuses an unknown capture shape rather than rendering nothing', () => {
    const odd = Object.assign({}, good, { shape: 'spiral' })
    expect(() => frameworks.buildFramework(odd)).toThrow(/unknown capture shape/)
  })

  it('refuses a framework belonging to no Planning Domain, because nothing could reach it', () => {
    const orphan = Object.assign({}, good, { planningDomains: [] })
    expect(() => frameworks.buildFramework(orphan)).toThrow(/no Planning Domain/)
  })

  it('refuses a Planning Domain that does not exist', () => {
    const wrong = Object.assign({}, good, { planningDomains: ['marketing-ish'] })
    expect(() => frameworks.buildFramework(wrong)).toThrow(/does not exist/)
  })

  it('refuses a material pointer that resolves to nothing', () => {
    const missing = Object.assign({}, good, {
      material: { domain: 'strategy', id: 'strategy-no-such-material' }
    })
    expect(() => frameworks.buildFramework(missing)).toThrow(/No material/)
  })

  it('refuses a domain support file nobody registered', () => {
    const elsewhere = Object.assign({}, good, {
      material: { domain: 'valuation', id: 'anything' }
    })
    expect(() => frameworks.buildFramework(elsewhere)).toThrow(/No domain support file/)
  })

  it('refuses a record with no id', () => {
    const anon = Object.assign({}, good, { id: '' })
    expect(() => frameworks.buildFramework(anon)).toThrow(/must have an id/)
  })
})

describe('the loaded set cannot be mutated by a caller', () => {
  it('hands out copies, so one request cannot corrupt the next', () => {
    const first = frameworks.getFramework('swot-pest')
    first.fields[0].label = 'VANDALISED'
    first.planningDomains.push('nonsense')

    const second = frameworks.getFramework('swot-pest')
    expect(second.fields[0].label).toBe('Strengths')
    expect(second.planningDomains).toEqual(['strategic-orientation'])
  })
})

describe('the shapes that exist, and the two that do not yet', () => {
  it('knows exactly the three shapes built so far', () => {
    expect(Object.keys(frameworks.STRATEGY_SHAPES).sort())
      .toEqual(['buckets', 'forces', 'quadrants'])
  })

  it('names the four Planning Domains in the deck\'s own order', () => {
    expect(frameworks.PLANNING_DOMAINS).toEqual([
      'business-targets',
      'strategic-orientation',
      'organisational-review',
      'sales-marketing-review'
    ])
  })
})
