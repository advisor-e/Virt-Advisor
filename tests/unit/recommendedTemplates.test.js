'use strict'

const {
  resolveRecommendedTemplates,
  resolveRecommendedTemplatesWithSource,
  extractDeclaredTemplates,
  extractTemplatesFromText,
  stripTemplateMarker,
  getHighestTier,
  TEMPLATE_MARK_OPEN
} = require('../../server/utils/tierLookup')

/**
 * Which templates a Phase 3 answer actually recommended.
 *
 * This drives the advisor's capability record — the Team Dashboard and Capability
 * Progression screens are built from it, including the HIGHEST TIER reached in a
 * session. Getting it wrong is not cosmetic: it misstates how an advisor is working.
 *
 * It used to be guessed by scanning prose, and was wrong in both directions:
 *   - names the AI had bolded (its house style for a real recommendation) never
 *     matched, so genuine recommendations went unrecorded;
 *   - ordinary sentences matched: "your retail shop needs better forecasting and a
 *     pivot in leadership" logged five tools nobody recommended — and because `Pivot`
 *     is an advanced-tier template, the advisor's record said they worked at advanced
 *     level that session.
 *
 * The AI now DECLARES what it recommended in a trailing marker. The prose scan remains
 * only as a fallback, with both defects fixed, so a model that ignores the instruction
 * degrades to sensible behaviour rather than recording nothing.
 */

describe('the AI declares what it recommended', () => {
  it('takes the declared list over anything in the prose', () => {
    const text = 'Long answer mentioning retail and shop in passing.\n\n[[TEMPLATES: Quick & Worst]]'
    expect(resolveRecommendedTemplates(text)).toEqual(['quick & worst'])
  })

  it('accepts an explicitly empty declaration — "I recommended nothing" is an answer', () => {
    // Distinct from "no marker at all", which falls back to the prose scan.
    const text = 'Here is some general guidance.\n\n[[TEMPLATES: ]]'
    expect(extractDeclaredTemplates(text)).toEqual([])
    expect(resolveRecommendedTemplates(text)).toEqual([])
  })

  it('discards names that are not real templates', () => {
    // An LLM naming a template is not evidence the template exists.
    const text = '[[TEMPLATES: Quick & Worst | The Amazing Made-Up Tool]]'
    expect(resolveRecommendedTemplates(text)).toEqual(['quick & worst'])
  })

  it('tolerates comma separators and stray asterisks', () => {
    const text = '[[TEMPLATES: **Quick & Worst**, Retail]]'
    expect(resolveRecommendedTemplates(text).sort()).toEqual(['quick & worst', 'retail'])
  })

  it('does not record the same template twice', () => {
    expect(resolveRecommendedTemplates('[[TEMPLATES: Retail | retail]]')).toEqual(['retail'])
  })

  it('returns null when there is no marker, so the caller can tell the difference', () => {
    expect(extractDeclaredTemplates('No marker here.')).toBeNull()
  })
})

/**
 * Item 4.53. The AI writes the marker only SOMETIMES — confirmed by three real
 * conversations on 2026-08-26: one wrote it, one did not, one could not be told apart.
 * When it does not, the prose fallback runs, and that fallback is the defect the marker
 * was built to replace. Both paths return a plausible list, so a tester in UAT cannot
 * see which ran. Reporting the source is what makes the fallback countable.
 */
describe('which path produced the list is recorded', () => {
  it('reports "declared" when the AI wrote a marker', () => {
    const out = resolveRecommendedTemplatesWithSource('Some prose.\n\n[[TEMPLATES: Retail]]')
    expect(out.source).toBe('declared')
    expect(out.templates).toEqual(['retail'])
  })

  it('reports "declared" for an explicitly empty marker, not "prose"', () => {
    // The distinction that matters most: the AI saying "I recommended nothing" is an
    // answer it gave, not a failure to answer. Scoring it as a fallback would count a
    // working session as a broken one.
    const out = resolveRecommendedTemplatesWithSource('Guidance about retail.\n\n[[TEMPLATES: ]]')
    expect(out.source).toBe('declared')
    expect(out.templates).toEqual([])
  })

  it('reports "prose" when there is no marker at all', () => {
    const out = resolveRecommendedTemplatesWithSource('I suggest the **Retail** template.')
    expect(out.source).toBe('prose')
  })

  it('reports "prose" even when the fallback finds nothing', () => {
    // An empty list is not evidence a marker was present — the two must stay separable.
    const out = resolveRecommendedTemplatesWithSource('No tools named anywhere in this answer.')
    expect(out.source).toBe('prose')
    expect(out.templates).toEqual([])
  })

  it('returns the same templates as the plain resolver, whichever path ran', () => {
    for (const text of [
      'Prose.\n\n[[TEMPLATES: Retail]]',
      'I suggest the **Retail** template.',
      'Nothing named here.'
    ]) {
      expect(resolveRecommendedTemplatesWithSource(text).templates)
        .toEqual(resolveRecommendedTemplates(text))
    }
  })
})

describe('the marker never reaches the advisor', () => {
  it('is stripped from the visible answer', () => {
    expect(stripTemplateMarker('The answer.\n\n[[TEMPLATES: Retail]]')).toBe('The answer.')
  })

  it('leaves an answer without a marker untouched', () => {
    expect(stripTemplateMarker('Just the answer.')).toBe('Just the answer.')
  })

  it('strips a truncated marker too — a cut-off response must not leak it', () => {
    // max_tokens can end a response mid-marker.
    expect(stripTemplateMarker('The answer.\n\n[[TEMPLATES: Ret')).toBe('The answer.')
  })
})

describe('prose fallback — used only when the AI declared nothing', () => {
  it('finds a bolded template name, which the old scan missed entirely', () => {
    expect(extractTemplatesFromText('I recommend **Quick & Worst** here.')).toContain('quick & worst')
  })

  it('finds one under a heading or bullet', () => {
    expect(extractTemplatesFromText('#### Quick & Worst')).toContain('quick & worst')
    expect(extractTemplatesFromText('- Quick & Worst')).toContain('quick & worst')
  })

  it('no longer matches everyday words in ordinary sentences', () => {
    // The reported defect, verbatim. This used to return five templates.
    const prose = 'Your retail shop needs better forecasting and a pivot in leadership.'
    expect(extractTemplatesFromText(prose)).toEqual([])
  })

  it('still counts an everyday-word title when the AI emphasises it', () => {
    expect(extractTemplatesFromText('Try the **Retail** tool.')).toContain('retail')
  })

  it('counts a multi-word title without emphasis — nobody writes those by accident', () => {
    expect(extractTemplatesFromText('The Quick & Worst approach fits here.')).toContain('quick & worst')
  })

  it('finds an emphasised mention even when an earlier plain one appears first', () => {
    const text = 'A retail business. I recommend **Retail** for this.'
    expect(extractTemplatesFromText(text)).toContain('retail')
  })
})

describe('the consequence this protects — capability tier', () => {
  it('ordinary prose no longer pushes an advisor to advanced level', () => {
    // `Pivot` is an advanced-tier template. Appearing in a normal sentence, it used to
    // record the whole session as advanced-level work.
    const prose = 'Your retail shop needs a pivot in leadership.'
    expect(getHighestTier(extractTemplatesFromText(prose))).toBeNull()
  })

  it('a genuine declaration still sets the tier', () => {
    const tier = getHighestTier(resolveRecommendedTemplates('[[TEMPLATES: Pivot]]'))
    expect(tier).toBe('advanced')
  })
})

describe('the streaming hold-back', () => {
  /**
   * Mirrors the engine's logic exactly: stream everything except a tail as long as the
   * marker's opening sentinel, so a half-arrived marker cannot flash on screen.
   */
  function streamOut (chunks) {
    let buffer = ''
    let sent = 0
    let shown = ''
    for (const text of chunks) {
      buffer += text
      const markAt = buffer.indexOf(TEMPLATE_MARK_OPEN)
      const safeEnd = markAt === -1
        ? Math.max(0, buffer.length - (TEMPLATE_MARK_OPEN.length - 1))
        : buffer.slice(0, markAt).replace(/\s+$/, '').length
      if (safeEnd > sent) { shown += buffer.slice(sent, safeEnd); sent = safeEnd }
    }
    const visible = stripTemplateMarker(buffer)
    if (visible.length > sent) { shown += visible.slice(sent) }
    return shown
  }

  it('shows the whole answer and none of the marker', () => {
    const shown = streamOut(['Use the ', 'Quick & Worst tool.', '\n\n[[TEMPLATES:', ' Quick & Worst]]'])
    expect(shown).toBe('Use the Quick & Worst tool.')
  })

  it('never shows a partial marker, however the chunks are split', () => {
    // The failure that would be visible to a client: "[[TEMPL" appearing mid-answer.
    const shown = streamOut(['Answer.', '\n\n[', '[', 'T', 'EMPLATES: Retail', ']]'])
    expect(shown).toBe('Answer.')
    expect(shown).not.toContain('[')
  })

  it('shows everything when there is no marker at all', () => {
    expect(streamOut(['Hello ', 'world.'])).toBe('Hello world.')
  })

  it('does not lose the last characters of an answer without a marker', () => {
    // The hold-back tail must be flushed at the end, or answers would end truncated.
    const shown = streamOut(['The final word is import', 'ant.'])
    expect(shown).toBe('The final word is important.')
  })

  it('handles a marker that arrives in one piece', () => {
    expect(streamOut(['Done.\n\n[[TEMPLATES: Retail]]'])).toBe('Done.')
  })
})

/**
 * The three places the engine emits AI-written text, and why only one of them used to
 * be protected.
 *
 * Phase 3 streams token by token, so it needs the hold-back above. The other two —
 * the ordinary conversational reply (advisorEngine.js, `_mainBuffer`) and the
 * follow-up an advisor asks after a recommendation (`_postBuffer`) — buffer the whole
 * answer and emit it in one piece. That difference is why they were missed: there is
 * no streaming tail to get wrong, so neither looked like it needed anything.
 *
 * But both carry client.txt as their system prompt, SECTION 11 included, so the marker
 * can arrive in either. Nothing stripped it, and because these paths emit once and
 * whole, the marker would not have flashed — it would have been printed and stayed.
 *
 * Found 2026-08-26 while running the first live conversations against the marker
 * (4.50). It was never seen to fire: three real conversations produced a marker in
 * one Phase 3 answer and none in two follow-ups. It is a hole proven from the code,
 * not an observed leak — which is exactly the kind a person in UAT cannot be relied
 * on to catch, because it depends on a model obeying an instruction erratically.
 */
describe('the buffered paths strip it too', () => {
  /** Mirrors what both buffered paths now do: strip once, before display. */
  const emitBuffered = buffer => stripTemplateMarker(buffer)

  it('removes a marker from a whole buffered reply', () => {
    const reply = 'Start with the Working Capital Cycle.\n\n[[TEMPLATES: Working Capital Cycle]]'
    expect(emitBuffered(reply)).toBe('Start with the Working Capital Cycle.')
  })

  it('leaves a reply that has no marker exactly as it was', () => {
    const reply = 'Because the cycle explains where the cash actually goes.'
    expect(emitBuffered(reply)).toBe(reply)
  })

  it('takes the blank line before the marker with it', () => {
    // Otherwise the answer ends in a gap where the marker used to be.
    expect(emitBuffered('Answer.\n\n[[TEMPLATES: Retail]]')).not.toMatch(/\s$/)
  })

  it('removes a marker even when the AI wrote it mid-answer rather than last', () => {
    // SECTION 11 says "on the last line". A model that ignores half an instruction is
    // the reason this defect exists, so do not assume it obeys the other half either.
    const reply = 'First point.\n\n[[TEMPLATES: Retail]]\n\nSecond point.'
    expect(emitBuffered(reply)).not.toContain('[[')
  })

  it('still removes it when the marker is the entire reply', () => {
    expect(emitBuffered('[[TEMPLATES: Retail]]')).toBe('')
  })
})
