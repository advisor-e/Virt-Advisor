'use strict'

// Exercises the CONCEPT INDEX — the 52 concepts as records, to-do item 15.1.
//
// WHAT THESE TESTS ARE FOR, and why each one catches something UAT cannot (Mike's ruling,
// 2026-08-24). A person testing the session scope menu sees a list of concepts. What they
// cannot see is whether it is the RIGHT list:
//
//   1. A MISSING CONCEPT LOOKS EXACTLY LIKE A CONCEPT MIKE CHOSE NOT TO INCLUDE. The count
//      that first produced this feature was 45, taken from ADV.0's drifted index; the real
//      figure off his own decks is 52. Nobody spots four missing rows in a list of fifty by
//      reading it, which is why the count and the per-domain split are pinned here.
//   2. A BROKEN Decision E POINTER RENDERS A BLANK CELL OR, WORSE, A NEIGHBOUR'S SENTENCE.
//      The decks merge some Session Scope cells across two rows. Both failure modes read as
//      plausible prose on screen.
//   3. AN AGENDA ROW THAT ACQUIRES A DESCRIPTION IS A RULING BEING BROKEN, SILENTLY.
//      Decision B: the 18 agenda rows are name-only and those lines are Mike's to write,
//      never generated. Generated text would look perfectly good in UAT — that is the
//      danger, not a typo.
//   4. A CAPTURE FORM APPEARING ON AN "unmeasured" CONCEPT IS THE BUILD DESIGNING. Census
//      §4 is explicit that choosing one is a design decision, not a data edit.
//
// The acceptance test is Pivot.pdf, a deck Mike assembled by hand. It is run here on data
// alone, before any screen exists.

const frameworks = require('../../server/utils/strategyFrameworks')
const data = require('../../data/strategy-frameworks.json')

describe('the 52 concepts load', () => {
  it('holds exactly 52, which is Mike\'s scoping ruling of 2026-09-17', () => {
    // 52, never 45. The 45 came from ADV.0's index; this count comes from the five decks'
    // own contents tables and agendas. PLANNING-TEMPLATE-CENSUS.md §1.
    expect(frameworks.listConcepts()).toHaveLength(52)
  })

  it('splits across the four Planning Domains exactly as the census counts them', () => {
    // Business Targets 5 · Strategic Orientation 1 (4) + 2 (18) = 22 · Sales & Marketing 16
    // · Organisational Review 9. A domain quietly losing rows is invisible on screen.
    expect({
      'business-targets': frameworks.conceptsForPlanningDomain('business-targets').length,
      'strategic-orientation': frameworks.conceptsForPlanningDomain('strategic-orientation').length,
      'sales-marketing-review': frameworks.conceptsForPlanningDomain('sales-marketing-review').length,
      'organisational-review': frameworks.conceptsForPlanningDomain('organisational-review').length
    }).toEqual({
      'business-targets': 5,
      'strategic-orientation': 22,
      'sales-marketing-review': 16,
      'organisational-review': 9
    })
  })

  it('gives every concept a unique id', () => {
    const ids = frameworks.listConcepts().map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('splits 34 described rows to 18 name-only agenda rows', () => {
    const bySource = frameworks.listConcepts().reduce((acc, c) => {
      acc[c.source] = (acc[c.source] || 0) + 1
      return acc
    }, {})
    expect(bySource).toEqual({ 'session-scope-table': 34, agenda: 18 })
  })

  it('points every concept at a page in a real deck', () => {
    // Page counts read from the PDFs in design/planning-templates/ on 2026-09-17. A page
    // reference past the end of its deck is how ADV.0's copy drifted — off by one from
    // Sales & Marketing page 12 onward — and it is unnoticeable until someone opens the deck.
    const pages = {
      'strategic-orientation-1': 20,
      'strategic-orientation-2': 42,
      'sales-marketing': 57,
      'business-targets': 13,
      'organisational-review': 25
    }
    frameworks.listConcepts().forEach((c) => {
      expect(pages[c.deck]).toBeDefined()
      expect(c.page).toBeGreaterThanOrEqual(1)
      expect(c.page).toBeLessThanOrEqual(pages[c.deck])
    })
  })
})

describe('Decision B — an agenda row only ever carries words Mike wrote', () => {
  it('never gives an agenda row a Helps Your Client To… line', () => {
    // Ruled 2026-09-17: that line is Mike's to write on all 18. Never generated, never
    // inferred from the slides, never filled by an AI. If this test fails because a row
    // acquired text, the question is WHO WROTE IT — not how to make the test pass. That is
    // the danger here: generated prose looks entirely reasonable to a person in UAT.
    const agenda = frameworks.listConcepts().filter(c => c.source === 'agenda')
    expect(agenda).toHaveLength(18)
    agenda.forEach((c) => {
      expect(c.helpsClientTo).toBeNull()
    })
  })

  it('carries a summary on exactly the nine rows whose slide already prints one', () => {
    // Mike's ruling of 2026-09-17, made once he was shown they existed: Organisational
    // Review's agenda prints a one-line description under each of its nine items, so those
    // nine use his own line. The other nine — Business Targets 5, Strategic Orientation 1
    // 4 — have no such line on the slide and stay null until he writes them.
    const withSummary = frameworks.listConcepts()
      .filter(c => c.source === 'agenda' && c.conceptSummary !== null)
    expect(withSummary).toHaveLength(9)
    expect(withSummary.every(c => c.deck === 'organisational-review')).toBe(true)

    const nameOnly = frameworks.listConcepts()
      .filter(c => c.source === 'agenda' && c.conceptSummary === null)
    expect(nameOnly.map(c => c.deck).sort()).toEqual([
      'business-targets', 'business-targets', 'business-targets', 'business-targets',
      'business-targets', 'strategic-orientation-1', 'strategic-orientation-1',
      'strategic-orientation-1', 'strategic-orientation-1'
    ])
  })

  it('takes those nine lines off the slide rather than paraphrasing them', () => {
    // 🔴 The second of this file's two deliberate wording pins, for the same reason as the
    // first: Decision A says his text is never rewritten, and a paraphrase reads perfectly
    // well. Organisational Review slide 2, the line under each agenda item.
    const summaries = frameworks.listConcepts()
      .filter(c => c.deck === 'organisational-review')
      .map(c => c.conceptSummary)
    expect(summaries).toEqual([
      'Where are we headed?',
      'What our team say about the organisation',
      'Are we doing the basics (already) before seeking improvement?',
      'How best to lead our team',
      'What’s MOST important to us?',
      'Why we do the same old things, the same old way',
      'Who reports to who?',
      'How we measure divisional performance',
      'Milestones, broken down to each team layer'
    ])
  })

  it('still gives every described row both of its lines', () => {
    frameworks.listConcepts()
      .filter(c => c.source === 'session-scope-table')
      .forEach((c) => {
        expect(typeof c.conceptSummary).toBe('string')
        expect(c.conceptSummary.length).toBeGreaterThan(0)
        expect(typeof c.helpsClientTo).toBe('string')
        expect(c.helpsClientTo.length).toBeGreaterThan(0)
      })
  })
})

describe('Decision E — shared text is stored once and pointed at', () => {
  it('stores the merged cell on ONE concept and points the other at it', () => {
    // The deck writes one sentence across the Price For Problem Solving / Price For
    // Delivery Medium pair. Two copies would drift, with nothing failing — exactly what
    // ADV.0's index did to the decks it copies.
    const holder = frameworks.getConcept('price-for-problem-solving')
    const pointer = frameworks.getConcept('price-for-delivery-medium')

    expect(holder.conceptSummaryRef).toBeNull()
    expect(pointer.conceptSummaryRef).toBe('price-for-problem-solving')
    expect(pointer.conceptSummary).toBe(holder.conceptSummary)
    expect(pointer.conceptSummarySharedWith).toBe('price-for-problem-solving')
  })

  it('shares the Helps column across Vertical and Horizontal Integration', () => {
    // One cell across both rows on Strategic Orientation 2 slide 3 — the sentence covers
    // protecting existing share (vertical) AND new products (horizontal).
    const vertical = frameworks.getConcept('vertical-integration')
    const horizontal = frameworks.getConcept('horizontal-integration')

    expect(horizontal.helpsClientToRef).toBe('vertical-integration')
    expect(horizontal.helpsClientTo).toBe(vertical.helpsClientTo)
    // Their SUMMARIES are their own and must not be collapsed together.
    expect(horizontal.conceptSummary).not.toBe(vertical.conceptSummary)
  })

  it('handles the row whose one sentence fills both of its own columns', () => {
    // Drafting Tender Proposals: the deck puts the same sentence in the Concept Summary and
    // the Helps column of a single row, which is a pointer at its own other field.
    const c = frameworks.getConcept('drafting-tender-proposals')
    expect(c.helpsClientToRef).toBe('drafting-tender-proposals#conceptSummary')
    expect(c.helpsClientTo).toBe(c.conceptSummary)
  })

  it('never stores a copy alongside a pointer', () => {
    // Both at once is two versions of one sentence, which is the drift the ruling forbids.
    data.concepts.forEach((raw) => {
      ;['conceptSummary', 'helpsClientTo'].forEach((field) => {
        if (raw[field + 'Ref']) {
          expect(raw[field]).toBeFalsy()
        }
      })
    })
  })
})

describe('capture forms are measured or absent, never invented', () => {
  it('names the fill-in template behind every measured capture form', () => {
    // "measured" is a claim that census §3 matched this concept to one of Mike's own
    // templates. Without the template name the claim cannot be checked by anyone.
    frameworks.listConcepts()
      .filter(c => c.captureFormBasis === 'measured')
      .forEach((c) => {
        expect(typeof c.captureForm).toBe('string')
        expect(typeof c.captureTemplate).toBe('string')
      })
  })

  it('leaves an unmeasured concept with no capture form at all', () => {
    // Census §4: the nine capture forms were measured across 24 templates, not across all
    // 52 concepts, and choosing one for a concept outside those 24 is a DESIGN DECISION.
    // A form appearing here is the data file quietly designing the product.
    frameworks.listConcepts()
      .filter(c => c.captureFormBasis === 'unmeasured')
      .forEach((c) => {
        expect(c.captureForm).toBeNull()
        expect(c.captureTemplate).toBeNull()
      })
  })
})

describe('the acceptance test — Pivot.pdf, run on data alone', () => {
  it('finds all eleven of Pivot\'s concepts as their own entry', () => {
    // THE TEST, from PLANNING-TEMPLATE-CENSUS.md §1: an advisor ticks these eleven and the
    // app produces Pivot. Before the index, 0 of the 11 existed as an entry anywhere — the
    // engine's unit was a DOCUMENT, so its best possible answer was "the two decks", 34
    // concepts for a session needing 11. That is the hand-assembly this feature ends.
    const pivot = [
      'porters-5-forces', 'market-diffusion-theory', 'product-life-cycle', 'technology-points',
      'sigmoid-curve', 'vertical-integration', 'horizontal-integration',
      'progression-of-economic-value', 'blue-ocean-strategy', '6-marketing-questions',
      'a-i-d-c-r-a-advertisement-framework'
    ]
    const found = pivot.map(id => frameworks.getConcept(id)).filter(Boolean)
    expect(found).toHaveLength(11)
    // Every one of them is lifted from Strategic Orientation 2 or Sales & Marketing, which
    // is what makes Pivot a cut-down of those two decks rather than a deck of its own.
    found.forEach((c) => {
      expect(['strategic-orientation-2', 'sales-marketing']).toContain(c.deck)
    })
  })

  it('finds the three that appeared nowhere in the engine at all', () => {
    // Measured 2026-09-17 against templates.json + content-summaries.json: these three were
    // absent even as words inside a document's purpose text.
    expect(frameworks.getConcept('vertical-integration')).not.toBeNull()
    expect(frameworks.getConcept('6-marketing-questions')).not.toBeNull()
    expect(frameworks.getConcept('a-i-d-c-r-a-advertisement-framework')).not.toBeNull()
  })
})

describe('the words are Mike\'s, not ours', () => {
  it('carries Porter\'s Session Scope line exactly as his deck sets it', () => {
    // 🔴 A DELIBERATE WORDING PIN, and the only one in this file. Mike's ruling of
    // 2026-08-24 says not to assert user-facing wording EXCEPT where it must not drift —
    // and Decision A, approved 2026-09-17, is exactly that: "Concept Summary and Helps Your
    // Client To… are his text — never rewritten, never summarised, never generated."
    //
    // This string is load-bearing because the failure it guards has already happened once:
    // the built `porters-five-forces` framework in this same file carries "Look out for
    // changes… so THEY can be ready", a third-person rewrite of the line below, taken from
    // ADV.0 rather than the deck. A rewrite reads perfectly well in UAT. Only a comparison
    // with the deck catches it, and this is that comparison.
    //
    // Strategic Orientation 2, slide 3, Helps Your Client To… column, page 13 row.
    expect(frameworks.getConcept('porters-5-forces').helpsClientTo).toBe(
      'To look out for changes in the market and anticipate how everyone will react; ' +
      'so you can be ready to take advantage of the situation.'
    )
  })

  it('🔴 keeps an agenda row on ONE line, brackets and all, as the slide sets it', () => {
    // A SECOND DELIBERATE WORDING PIN, added 2026-09-17 because this one has already
    // drifted once — in the approved drawing rather than in the data. As first drawn, the
    // session scope menu split the bracketed half of five agenda rows onto a smaller
    // sub-line, and on one row it MOVED "(section 2)" from mid-sentence to the end.
    //
    // The decks do not do that. Read with the text extractor, each of these is a single
    // line at one size and one x-position — Business Targets p2 at x=64.8 size 12, and
    // Strategic Orientation 1 p2 at x=72.3 size 12. Mike's ruling: "each concept needs to
    // be presented AS IT CURRENTLY APPEARS in the slides."
    //
    // ⚠ Organisational Review is the genuine exception and is NOT pinned here: its
    // descriptions are a real second column on the slide, at x=352.7, which is why those
    // nine rows carry a conceptSummary and no other agenda row does.
    expect(frameworks.getConcept('review-your-profit-lever-focus-how-you-plan-to-achieve-your').name)
      .toBe('Review Your Profit Lever Focus (how you plan to achieve your objectives - ' +
        'based on the profit levers)')
    // The id itself corroborates it: it truncates to "…-data-sectio", so "(section 2)" was
    // inside the name when the index was read off the deck, not appended afterwards.
    expect(frameworks.getConcept('assess-current-position-by-reviewing-pre-meeting-data-sectio').name)
      .toBe('Assess current position by reviewing (pre-meeting) data (section 2) & ' +
        'Financial Performance Reports')
  })

  it('keeps the deck\'s own punctuation rather than normalising it away', () => {
    // The decks set apostrophes as the curly U+2019 — Porter's, Senge's, Deming's. Three
    // form lookups keyed on a typed straight quote matched nothing and silently left those
    // concepts with no form at all, which is why ids strip the character and names keep it.
    expect(frameworks.getConcept('porters-5-forces').name).toBe('Porter’s 5 Forces')
    expect(frameworks.getConcept('porters-5-forces').teachingForm).toBe('radial-hub')
    expect(frameworks.getConcept('senges-circles-of-causality').teachingForm).toBe('causal-loop')
    expect(frameworks.getConcept('e-demings-volatility-theory').teachingForm).toBe('live-data-chart')
  })
})

describe('a malformed concept fails at load, not in a client meeting', () => {
  const good = {
    id: 'x',
    name: 'X',
    planningDomain: 'strategic-orientation',
    deck: 'strategic-orientation-2',
    page: 1,
    source: 'session-scope-table',
    captureFormBasis: 'unmeasured'
  }
  const known = new Set(['x', 'other'])

  it('rejects a concept in no Planning Domain', () => {
    // Nothing could reach it: authored, invisible, and nobody told. The 4.16 failure.
    expect(() => frameworks.buildConcept(
      Object.assign({}, good, { planningDomain: 'nope' }), known)).toThrow(/Planning Domain/)
  })

  it('rejects an unknown source', () => {
    expect(() => frameworks.buildConcept(
      Object.assign({}, good, { source: 'invented' }), known)).toThrow(/source/)
  })

  it('rejects a page number that is missing or not a whole page', () => {
    expect(() => frameworks.buildConcept(
      Object.assign({}, good, { page: 0 }), known)).toThrow(/page/)
    expect(() => frameworks.buildConcept(
      Object.assign({}, good, { page: null }), known)).toThrow(/page/)
  })

  it('rejects text and a pointer at the same time', () => {
    expect(() => frameworks.buildConcept(Object.assign({}, good, {
      conceptSummary: 'mine', conceptSummaryRef: 'other'
    }), known)).toThrow(/Decision E/)
  })

  it('rejects a pointer at a concept that does not exist', () => {
    expect(() => frameworks.buildConcept(Object.assign({}, good, {
      helpsClientToRef: 'ghost'
    }), known)).toThrow(/not a concept/)
  })

  it('rejects "measured" with no template named', () => {
    expect(() => frameworks.buildConcept(Object.assign({}, good, {
      captureFormBasis: 'measured', captureForm: 'banded-grid'
    }), known)).toThrow(/measured/)
  })

  it('rejects a capture form smuggled onto an unmeasured concept', () => {
    expect(() => frameworks.buildConcept(Object.assign({}, good, {
      captureForm: 'banded-grid'
    }), known)).toThrow(/design decision/)
  })

  it('rejects a concept with no id or no name', () => {
    expect(() => frameworks.buildConcept(Object.assign({}, good, { id: '' }), known))
      .toThrow(/no id/)
    expect(() => frameworks.buildConcept(Object.assign({}, good, { name: '' }), known))
      .toThrow(/no name/)
  })
})

describe('a concept names the deck page it is taught from', () => {
  // 🔴 THERE IS NO `slide` FIELD ANY MORE — Mike's ruling, 2026-09-18. A concept used to
  // carry a path to a JPEG of his own deck page. He had not asked for that, and it cannot
  // be white-labelled: his pages carry the advisor-e.com logo burned into the image, and a
  // client is always shown the ADVISOR'S firm logo. The images and their renderer are gone.
  //
  // 🔴 WHAT WHOEVER REBUILDS THE GRAPHIC MUST KNOW, because the guard that used to enforce
  // it went with the images: AN AGENDA-ONLY CONCEPT'S `page` IS NOT ITS TEACHING PAGE. The
  // 18 concepts listed only on a deck's agenda all carry page 2, the agenda itself. Drawing
  // from that number would put the same contents page behind nine different concepts of
  // Organisational Review and look entirely plausible in every one. Check `source` first.
  // There is no test for it below because there is now no code that resolves a page to a
  // graphic — write one with the rebuild, not before it.
  const good = {
    id: 'x',
    name: 'X',
    planningDomain: 'strategic-orientation',
    deck: 'strategic-orientation-2',
    page: 13,
    source: 'session-scope-table',
    captureFormBasis: 'unmeasured'
  }
  const known = new Set(['x'])

  it('carries the response page separately, where the deck holds the table', () => {
    const withResponse = Object.assign({}, good, { page: 22, responsePage: 24 })
    const built = frameworks.buildConcept(withResponse, known)
    expect(built.page).toBe(22)
    expect(built.responsePage).toBe(24)
  })

  it('serves no image path for a concept, so nothing can carry his logo to a client', () => {
    const built = frameworks.buildConcept(good, known)
    expect(built.slide).toBeUndefined()
    expect(built.responseSlide).toBeUndefined()
  })

  it('rejects a response page that is not a page', () => {
    expect(() => frameworks.buildConcept(
      Object.assign({}, good, { responsePage: 0 }), known)).toThrow(/responsePage/)
  })

  it('pairs both Integration concepts to the one table Mike named', () => {
    // His own words on the register, 2026-09-18: "you are missing the vertical and
    // horizontal integration tasks page". One page answers both concepts, and that is
    // correct rather than a clash.
    const vertical = frameworks.getConcept('vertical-integration')
    const horizontal = frameworks.getConcept('horizontal-integration')
    expect(vertical.responsePage).toBe(24)
    expect(horizontal.responsePage).toBe(vertical.responsePage)
  })
})
