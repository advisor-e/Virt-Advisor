'use strict'

/**
 * The Economic Analysis validator — item 4.66.
 *
 * 🔴 THE TWO TESTS THAT MATTER ARE THE FIRST TWO, AND THEY RUN AGAINST REAL OUTPUT.
 *
 * `design/ECONOMIC-ANALYSIS-TEST-RUNS.md` keeps run 1 and run 4 in full. Runs 1 to 3 each
 * put a correct figure beside the WRONG source, always inside a restatement in section 4;
 * run 4 fixed it by forbidding section 4 to restate a figure at all, and came back clean.
 * The prompt file says that fix "rests on a single run" and "must be re-checked when the
 * feature is built".
 *
 * This is that re-check. Run 4 must pass and run 1 must be refused, naming the figures it
 * repeated — and because both are read from the committed page rather than copied here,
 * the guard also fires if anyone edits run 4's section 4 to put the numbers back.
 *
 * The rest of the file is the shape work the standards require of anything that processes
 * LLM output: valid, malformed, missing fields, wrong types.
 */

const {
  validateResearch,
  extractText,
  findSections,
  figuresIn,
  countWords,
  hostOf,
  MIN_UNIQUE_SOURCES
} = require('../../server/report/economicAnalysis/researchResult')

const { loadRun, responseFrom } = require('../fixtures/economicAnalysisRuns')

/** Five well-formed sections with enough distinct sources to pass, for the shape cases. */
function goodText (overrides) {
  const o = overrides || {}
  return [
    '1. Global economic outlook',
    o.s1 || 'World trade grew 1.9% in the period. Energy averaged US$96.80 per barrel.',
    '',
    '2. Local and regional outlook',
    o.s2 || 'Consumer prices rose 3.4%. Average weekly earnings were 1,046.88.',
    '',
    '3. Sector outlook',
    o.s3 || 'Insured lives numbered 2.55 million. The average premium was 1,902.',
    '',
    '4. What this means for the business under review',
    o.s4 || 'Conditions are mixed and cost pressure persists. No figures are repeated here.',
    '',
    '5. What could not be sourced',
    o.s5 || 'Local commercial rents could not be sourced.'
  ].join('\n')
}

/** Six distinct hosts, anchored on text that exists in `goodText`. */
const GOOD_CITES = [
  { url: 'https://wto.org/a', at: '1.9%' },
  { url: 'https://iea.org/b', at: 'US$96.80' },
  { url: 'https://cso.ie/c', at: '3.4%' },
  { url: 'https://centralbank.ie/d', at: '1,046.88' },
  { url: 'https://hia.ie/e', at: '2.55 million' },
  { url: 'https://gov.ie/f', at: '1,902' }
]

describe('the citation fix, re-checked against the runs that produced it', () => {
  test('run 4 passes — section 4 restates nothing, so every figure lives once', () => {
    const result = validateResearch(loadRun(4))

    expect(result.ok).toBe(true)
    expect(result.error).toBeNull()

    // The page records 2,276 words for this run. If this number moves, the fixture is no
    // longer reading the run the fix was proven on.
    expect(result.data.wordCount).toBe(2276)

    const synthesis = result.data.sections.find(s => s.n === 4)
    expect(figuresIn(synthesis.body)).toEqual([])
    expect(synthesis.citations).toEqual([])

    // …while the evidence sections kept a source per figure.
    for (const n of [1, 2, 3]) {
      expect(result.data.sections.find(s => s.n === n).citations.length).toBeGreaterThan(0)
    }
  })

  test('run 1 is refused, and names the figures its section 4 repeated', () => {
    const result = validateResearch(loadRun(1))

    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('SECTION_4_RESTATED')

    // The euro rate is the one the page records as carrying the misfiled citation: the
    // figure was right and the source beside it was wrong.
    expect(result.error.detail.figures).toContain('0.50935')
    expect(result.error.detail.figures).toContain('5.6')
    expect(result.error.detail.figures).toContain('2.0')
  })

  // The approved prompt permits a NEW figure in section 4 "with its own source and date
  // like any other". A check stricter than the artefact it enforces is its own drift.
  test('a genuinely new figure in section 4 is allowed when it carries a source', () => {
    const text = goodText({ s4: 'One further measure, freight at US$4,465 per container, bears on this.' })
    const cites = GOOD_CITES.concat([{ url: 'https://drewry.co.uk/g', at: 'US$4,465' }])

    const result = validateResearch(responseFrom(text, cites))
    expect(result.ok).toBe(true)
  })

  test('a new figure in section 4 with no source at all is refused', () => {
    const text = goodText({ s4: 'One further measure, freight at US$4,465 per container, bears on this.' })

    const result = validateResearch(responseFrom(text, GOOD_CITES))
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('SECTION_4_UNSOURCED')
    expect(result.error.detail.figures).toContain('4465')
  })
})

describe('validateResearch — the shapes it must refuse', () => {
  test('nothing at all', () => {
    expect(validateResearch(null).error.code).toBe('RESEARCH_EMPTY')
    expect(validateResearch({}).error.code).toBe('RESEARCH_EMPTY')
    expect(validateResearch({ output: [] }).error.code).toBe('RESEARCH_EMPTY')
    expect(validateResearch({ output: 'not an array' }).error.code).toBe('RESEARCH_EMPTY')
  })

  test('whitespace only', () => {
    expect(validateResearch(responseFrom('   \n  ')).error.code).toBe('RESEARCH_EMPTY')
  })

  test('four sections instead of five, and it says which is missing', () => {
    const text = goodText().split('\n5. What could not be sourced')[0]
    const result = validateResearch(responseFrom(text, GOOD_CITES))

    expect(result.error.code).toBe('SECTIONS_MISSING')
    expect(result.error.detail.missing).toEqual([5])
  })

  test('an evidence section with no citation behind it', () => {
    // Every citation anchored in sections 1 and 2 only, leaving 3 unsourced.
    const cites = GOOD_CITES.filter(c => ['1.9%', 'US$96.80', '3.4%', '1,046.88'].includes(c.at))
      .concat([
        { url: 'https://a.example/1', at: 'World trade' },
        { url: 'https://b.example/2', at: 'Consumer prices' }
      ])

    const result = validateResearch(responseFrom(goodText(), cites))
    expect(result.error.code).toBe('SECTION_UNSOURCED')
    expect(result.error.detail.sections).toEqual([3])
  })

  test('too few distinct sources to stand as an outlook', () => {
    const cites = GOOD_CITES.slice(0, 3).concat([
      // Same host repeated — a data point, not an outlook.
      { url: 'https://cso.ie/x', at: '1,046.88' },
      { url: 'https://cso.ie/y', at: '2.55 million' },
      { url: 'https://cso.ie/z', at: '1,902' }
    ])

    const result = validateResearch(responseFrom(goodText(), cites))
    expect(result.error.code).toBe('TOO_FEW_SOURCES')
    expect(result.error.detail.needed).toBe(MIN_UNIQUE_SOURCES)
    expect(result.error.detail.found).toBeLessThan(MIN_UNIQUE_SOURCES)
  })

  test('a refusal never carries the research text back to the caller', () => {
    const result = validateResearch(loadRun(1))
    expect(result.data).toBeNull()
    expect(JSON.stringify(result.error)).not.toContain('Reserve Bank')
  })
})

describe('validateResearch — what a passing run returns', () => {
  const result = validateResearch(responseFrom(goodText(), GOOD_CITES))

  test('five sections, each with its own word count and citations', () => {
    expect(result.ok).toBe(true)
    expect(result.data.sections.map(s => s.n)).toEqual([1, 2, 3, 4, 5])
    expect(result.data.sections[0].wordCount).toBeGreaterThan(0)
  })

  test('sources are deduplicated by URL and carry a readable host', () => {
    expect(result.data.sources.length).toBe(GOOD_CITES.length)
    expect(result.data.sources.map(s => s.host)).toContain('cso.ie')
  })

  test('the citation count is the raw number, not the deduplicated one', () => {
    expect(result.data.citationCount).toBe(GOOD_CITES.length)
  })
})

describe('extractText — malformed output must not throw', () => {
  test('items and parts of the wrong kind are skipped', () => {
    const res = {
      output: [
        null,
        { type: 'web_search_call' },
        { type: 'message', content: null },
        { type: 'message', content: [null, { type: 'refusal' }, { type: 'output_text', text: 42 }] },
        { type: 'message', content: [{ type: 'output_text', text: 'kept', annotations: 'nope' }] }
      ]
    }
    expect(extractText(res)).toEqual({ text: 'kept', citations: [] })
  })

  test('annotations without a usable url are dropped', () => {
    const res = {
      output: [{
        type: 'message',
        content: [{
          type: 'output_text',
          text: 'text',
          annotations: [
            null,
            { type: 'file_citation', url: 'https://x.example' },
            { type: 'url_citation' },
            { type: 'url_citation', url: '' },
            { type: 'url_citation', url: 'https://ok.example', title: 7 }
          ]
        }]
      }]
    }
    const out = extractText(res)
    expect(out.citations.length).toBe(1)
    expect(out.citations[0].title).toBe('')
  })

  test('annotation indices missing from the payload default to the start', () => {
    const res = {
      output: [{
        type: 'message',
        content: [{ type: 'output_text', text: 'abc', annotations: [{ type: 'url_citation', url: 'https://x.example' }] }]
      }]
    }
    expect(extractText(res).citations[0]).toEqual({ url: 'https://x.example', title: '', start: 0, end: 0 })
  })

  // 🔴 The offset shift is what files a citation into the right section. Getting it wrong
  // is the same class of fault the whole feature is guarding against.
  test('a second text part shifts its annotations by everything before it', () => {
    const res = {
      output: [{
        type: 'message',
        content: [
          { type: 'output_text', text: '12345', annotations: [] },
          {
            type: 'output_text',
            text: 'abcde',
            annotations: [{ type: 'url_citation', url: 'https://x.example', start_index: 1, end_index: 3 }]
          }
        ]
      }]
    }
    const out = extractText(res)
    expect(out.text).toBe('12345abcde')
    expect(out.citations[0].start).toBe(6)
    expect(out.citations[0].end).toBe(8)
  })
})

describe('findSections', () => {
  test('reads hashes, bold markers and separators the runs actually produced', () => {
    const text = ['#### 1. Global', 'a', '## 2 · Local', 'b', '**3) Sector**', 'c', '4: Means', 'd', '5 – Gaps', 'e'].join('\n')
    expect(findSections(text).map(s => s.n)).toEqual([1, 2, 3, 4, 5])
  })

  test('a number out of order does not open a section', () => {
    // "4." appears inside section 2's prose before section 3 exists.
    const text = ['1. Global', 'a', '2. Local', '4. this is a list item, not a heading', '3. Sector', 'c'].join('\n')
    expect(findSections(text).map(s => s.n)).toEqual([1, 2, 3])
  })

  test('sections run from one heading to the next, and the last to the end', () => {
    const sections = findSections('1. A\nfirst\n2. B\nsecond')
    expect(sections[0].body).toBe('1. A\nfirst\n')
    expect(sections[1].body).toBe('2. B\nsecond')
  })

  test('no headings at all', () => {
    expect(findSections('just prose')).toEqual([])
    expect(findSections('')).toEqual([])
    expect(findSections(null)).toEqual([])
  })
})

describe('figuresIn — what counts as a figure a lender reads', () => {
  test('percentages, currency, decimals, separators and large integers count', () => {
    expect(figuresIn('rose 3.4%')).toEqual(['3.4'])
    expect(figuresIn('rose 12 per cent')).toEqual(['12'])
    expect(figuresIn('rose 12 percent')).toEqual(['12'])
    // ⚠ 1902 is inside the year range the date stripper removes. A currency mark beside
    // it makes it a figure — run 4's own average premium was €1,902.
    expect(figuresIn('cost €1902')).toEqual(['1902'])
    expect(figuresIn('cost €1,902')).toEqual(['1902'])
    expect(figuresIn('up 2026%')).toEqual(['2026'])
    expect(figuresIn('during 2026')).toEqual([])
    expect(figuresIn('cost 1,046.88')).toEqual(['1046.88'])
    expect(figuresIn('a total of 531100 people')).toEqual(['531100'])
  })

  test('small bare numbers are not figures', () => {
    expect(figuresIn('9 staff across 2 sites')).toEqual([])
    expect(figuresIn('a 12 month period')).toEqual([])
  })

  // ⚠ This is the guard against a false accusation. Run 4's section 4 opens on the
  // assessment period, and section 1 gives the same date.
  test('dates are not figures, in any of the forms the runs wrote them', () => {
    expect(figuresIn('on 6 September 2026')).toEqual([])
    expect(figuresIn('in August 2026')).toEqual([])
    expect(figuresIn('at 31 December')).toEqual([])
    expect(figuresIn('in Q1 2026')).toEqual([])
    expect(figuresIn('during 2025')).toEqual([])
    expect(figuresIn('on 1st March 2026')).toEqual([])
  })

  test('the same figure twice is reported once', () => {
    expect(figuresIn('3.4% and later 3.4% again')).toEqual(['3.4'])
  })

  test('empty and null are safe', () => {
    expect(figuresIn('')).toEqual([])
    expect(figuresIn(null)).toEqual([])
  })
})

describe('countWords', () => {
  test('counts words across the whitespace the model actually uses', () => {
    expect(countWords('one two  three\nfour')).toBe(4)
    expect(countWords('  padded  ')).toBe(1)
  })

  test('nothing counts as nothing, never as one', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   ')).toBe(0)
    expect(countWords(null)).toBe(0)
  })
})

describe('hostOf', () => {
  test('strips the scheme and a leading www', () => {
    expect(hostOf('https://www.cso.ie/a/b?c=1')).toBe('cso.ie')
    expect(hostOf('http://rtb.ie')).toBe('rtb.ie')
  })

  test('anything that is not a URL comes back as itself', () => {
    expect(hostOf('not a url')).toBe('not a url')
    expect(hostOf(null)).toBe('')
  })
})
