'use strict'

/**
 * The two report generators, and the citation check that stands between a model and an
 * advisor's coaching record.
 *
 * 🔴 THIS FILE CARRIES THE 100% BAR IN CLAUDE.md — "any function that processes or validates
 * LLM output gets tests written before or alongside it" — and the reason is specific rather
 * than procedural. An invented quote is the single most damaging thing this feature can
 * produce: it is a sentence attributed to a named advisor, in a report about their competence,
 * which they never said. It renders exactly like a true one. Nobody in UAT can tell the
 * difference without the transcript open beside them, and by then it has been believed.
 *
 * The other three shapes here are the same class: a client quote passed off as the advisor's,
 * a point the model silently skipped, and a "cannot be heard" guess hardening into an answer.
 *
 * Design: `design/features/meeting-review.md` P4, P5, P6. PII exception: `CLAUDE.md`.
 */

const {
  NOT_FOUND,
  TRANSCRIPT_OPEN,
  TRANSCRIPT_CLOSE,
  clock,
  normalise,
  findQuote,
  buildTranscriptBlock,
  parseJsonReply,
  buildSummaryMessages,
  validateSummary,
  buildCoachingMessages,
  validateCoaching,
  cannotHearFindings,
  generateSummary,
  generateCoachingNotes
} = require('../../server/utils/meetingReports')

const seg = (role, start, end, text) => ({ role, start, end, text })

const TRANSCRIPT = {
  attributionConfident: true,
  segments: [
    seg('advisor', 72, 88, 'So what I want to do today is walk through the year and then agree what we are doing about the March renewals.'),
    seg('client', 90, 96, 'That works for me, yes.'),
    seg('advisor', 1124, 1140, 'Think of the margin like a bucket with a slow leak.'),
    seg('client', 1145, 1160, 'It is like pouring money away, honestly.')
  ]
}

/** A stub OpenAI client returning one canned reply. */
function stubClient (content) {
  return {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 }
        })
      }
    }
  }
}

describe('meetingReports — quote verification', () => {
  it('forgives punctuation, case and curly quotes, because a model re-punctuates', () => {
    expect(normalise('It’s — "fine", isn\'t it?')).toBe("it's fine isn't it")
  })

  it('finds a real quote and reports when it was said', () => {
    const at = findQuote(TRANSCRIPT.segments, 'Think of the margin like a bucket with a slow leak')
    expect(at).not.toBeNull()
    expect(at.start).toBe(1124)
    expect(at.role).toBe('advisor')
  })

  it('refuses a quote that is not in the transcript', () => {
    expect(findQuote(TRANSCRIPT.segments, 'You should have drawn them a diagram at this point')).toBeNull()
  })

  it('refuses a quote too short to be evidence of anything', () => {
    // "That works" would match by accident and then be printed under a timestamp as a citation.
    expect(findQuote(TRANSCRIPT.segments, 'That works')).toBeNull()
  })

  it('allows a quote that spans two turns by the SAME speaker', () => {
    const segments = [seg('advisor', 0, 5, 'So the position is'), seg('advisor', 5, 9, 'that the margin has fallen away')]
    expect(findQuote(segments, 'So the position is that the margin has fallen away')).not.toBeNull()
  })

  it('refuses a quote stitched from two DIFFERENT speakers', () => {
    const segments = [seg('advisor', 0, 5, 'So the position is'), seg('client', 5, 9, 'that the margin has fallen away')]
    expect(findQuote(segments, 'So the position is that the margin has fallen away')).toBeNull()
  })

  it('renders a timestamp as m:ss', () => {
    expect(clock(1124)).toBe('18:44')
  })
})

describe('meetingReports — what is put in front of the model', () => {
  it('wraps the transcript in delimiters and tells the model it is not instructions', () => {
    const messages = buildSummaryMessages({ segments: TRANSCRIPT.segments, scenarioName: 'End of year meeting' })
    const whole = messages.map(m => m.content).join('\n')
    expect(whole).toContain(TRANSCRIPT_OPEN)
    expect(whole).toContain(TRANSCRIPT_CLOSE)
    // CLAUDE.md: treat user input in prompts as hostile. An hour of unscripted speech will
    // eventually contain a sentence that reads like an instruction.
    expect(whole).toContain('NOT instructions')
  })

  it('🔴 sends the spoken content and NOTHING that identifies anybody', () => {
    // PII exception condition (b), CLAUDE.md: internal DB IDs and firm/advisor identifiers are
    // STILL stripped — the exception covers the spoken content alone. This is the assertion
    // that keeps a later convenience ("just pass the meta through") from breaking it.
    const messages = buildSummaryMessages({
      segments: TRANSCRIPT.segments,
      scenarioName: 'End of year meeting'
    })
    const whole = messages.map(m => m.content).join('\n')
    expect(whole).not.toContain('firm-')
    expect(whole).not.toContain('adv-')
    expect(whole).toContain('ADVISOR:')
    expect(whole).toContain('CLIENT:')
  })

  it('tells the client-summary prompt not to assess the adviser at all', () => {
    // P6 keeps the two apart structurally; this keeps them apart in substance.
    const whole = buildSummaryMessages({ segments: TRANSCRIPT.segments }).map(m => m.content).join('\n')
    expect(whole.toLowerCase()).toContain('never assess')
  })

  it('offers the coaching prompt exactly two answers, one of them NOT FOUND', () => {
    const whole = buildCoachingMessages({
      segments: TRANSCRIPT.segments,
      points: [{ id: 'mo-eoy-1', text: 'I framed the meeting.' }]
    }).map(m => m.content).join('\n')
    expect(whole).toContain(NOT_FOUND)
    expect(whole).toContain('mo-eoy-1')
  })

  it('renders the transcript with roles and clock times only', () => {
    const block = buildTranscriptBlock([seg('advisor', 72, 88, 'Hello there')])
    expect(block).toContain('[1:12] ADVISOR: Hello there')
  })
})

describe('meetingReports — reading a model reply', () => {
  it('parses plain JSON', () => {
    expect(parseJsonReply('{"a":1}')).toEqual({ a: 1 })
  })

  it('parses JSON the model wrapped in a code fence', () => {
    expect(parseJsonReply('```json\n{"a":1}\n```')).toEqual({ a: 1 })
  })

  it('parses JSON the model prefaced with prose', () => {
    expect(parseJsonReply('Here you go:\n{"a":1}')).toEqual({ a: 1 })
  })

  it('returns null for anything that is not a JSON object', () => {
    expect(parseJsonReply('not json at all')).toBeNull()
    expect(parseJsonReply('[1,2,3]')).toBeNull()
    expect(parseJsonReply('{ broken')).toBeNull()
    expect(parseJsonReply(null)).toBeNull()
    expect(parseJsonReply(42)).toBeNull()
  })

  it('returns null for something brace-shaped that is not valid JSON', () => {
    // Truncated output is the common form of this: the model ran out of tokens mid object.
    expect(parseJsonReply('{ "covered": }')).toBeNull()
    expect(parseJsonReply('{ "covered": "we met"')).toBeNull()
  })

  it('returns null when the braces contain a JSON value that is not an object', () => {
    expect(parseJsonReply('["a"] {')).toBeNull()
  })
})

describe('meetingReports — validating the Meeting Summary', () => {
  const good = {
    covered: 'We reviewed the year to 31 March.',
    actions: [{ who: 'James', what: 'send the subcontractor schedule', when: '12 September' }],
    next: 'We meet again in November.',
    agreementQuote: 'Think of the margin like a bucket with a slow leak'
  }

  it('accepts a well-formed reply and keeps a verified citation', () => {
    const result = validateSummary(good, TRANSCRIPT.segments)
    expect(result.valid).toBe(true)
    expect(result.data.actions).toHaveLength(1)
    expect(result.data.agreement.at).toBe('18:44')
  })

  it('rejects a reply that is not a plain object', () => {
    expect(validateSummary(null, TRANSCRIPT.segments).valid).toBe(false)
    expect(validateSummary([], TRANSCRIPT.segments).valid).toBe(false)
    expect(validateSummary('a summary', TRANSCRIPT.segments).valid).toBe(false)
  })

  it('rejects a reply with no prose', () => {
    expect(validateSummary({ ...good, covered: '' }, TRANSCRIPT.segments).valid).toBe(false)
    expect(validateSummary({ actions: [] }, TRANSCRIPT.segments).valid).toBe(false)
  })

  it('rejects actions of the wrong type outright', () => {
    expect(validateSummary({ ...good, actions: 'James will send it' }, TRANSCRIPT.segments).valid).toBe(false)
  })

  it('drops a malformed action without losing the good ones', () => {
    const result = validateSummary({
      ...good,
      actions: [{ what: 'a real action' }, null, { who: 'James' }, 'a string']
    }, TRANSCRIPT.segments)
    expect(result.valid).toBe(true)
    expect(result.data.actions).toHaveLength(1)
    expect(result.dropped).toBe(3)
  })

  it('🔴 drops an agreement quote the transcript does not contain', () => {
    const result = validateSummary({ ...good, agreementQuote: 'We agreed all of that then and there' }, TRANSCRIPT.segments)
    expect(result.valid).toBe(true)
    expect(result.data.agreement).toBeNull()
    expect(result.dropped).toBe(1)
  })

  it('accepts NOT FOUND for the agreement without counting it as a drop', () => {
    const result = validateSummary({ ...good, agreementQuote: NOT_FOUND }, TRANSCRIPT.segments)
    expect(result.data.agreement).toBeNull()
    expect(result.dropped).toBe(0)
  })

  it('tolerates a missing "next" rather than failing the whole summary', () => {
    const result = validateSummary({ covered: 'We met.', actions: [] }, TRANSCRIPT.segments)
    expect(result.valid).toBe(true)
    expect(result.data.next).toBe('')
  })

  it('coerces wrong-typed optional fields instead of failing on them', () => {
    // A model that returns a number where prose was asked for has still done the useful part.
    const result = validateSummary({
      covered: 'We met.',
      actions: [{ what: 'do the thing', who: 42, when: null }],
      next: 99,
      agreementQuote: 12345
    }, TRANSCRIPT.segments)

    expect(result.valid).toBe(true)
    expect(result.data.next).toBe('')
    expect(result.data.actions[0].who).toBe('')
    expect(result.data.actions[0].when).toBe('')
    expect(result.data.agreement).toBeNull()
  })
})

describe('meetingReports — validating My Coaching Notes', () => {
  const POINTS = [
    { id: 'mo-eoy-1', text: 'I framed the meeting.' },
    { id: 'mo-eoy-2', text: 'I used a metaphor.' }
  ]

  it('accepts findings whose quotes are really there', () => {
    const result = validateCoaching({
      findings: [
        { pointId: 'mo-eoy-1', quote: 'So what I want to do today is walk through the year' },
        { pointId: 'mo-eoy-2', quote: 'Think of the margin like a bucket with a slow leak' }
      ]
    }, TRANSCRIPT.segments, POINTS)

    expect(result.valid).toBe(true)
    expect(result.data.findings.map(f => f.state)).toEqual(['found', 'found'])
    expect(result.data.findings[1].at).toBe('18:44')
    expect(result.dropped).toBe(0)
  })

  it('rejects a reply that is not a plain object, or has no findings array', () => {
    expect(validateCoaching(null, TRANSCRIPT.segments, POINTS).valid).toBe(false)
    expect(validateCoaching([], TRANSCRIPT.segments, POINTS).valid).toBe(false)
    expect(validateCoaching({ findings: 'none' }, TRANSCRIPT.segments, POINTS).valid).toBe(false)
  })

  it('🔴 drops an invented quote and reports the point as not found', () => {
    const result = validateCoaching({
      findings: [{ pointId: 'mo-eoy-1', quote: 'I began by setting out our agenda for the hour ahead' }]
    }, TRANSCRIPT.segments, POINTS)

    // Not shown with a warning. Not downgraded. Gone — and the point says the honest thing.
    expect(result.data.findings[0].state).toBe('not_found')
    expect(result.data.findings[0].quote).toBeNull()
    expect(result.dropped).toBe(1)
  })

  it('🔴 drops a quote that the CLIENT said, not the adviser', () => {
    // "Did the adviser use a metaphor" is not satisfied by the client using one, and a model
    // under pressure to find something reaches for the nearest match regardless of who spoke.
    const result = validateCoaching({
      findings: [{ pointId: 'mo-eoy-2', quote: 'It is like pouring money away, honestly' }]
    }, TRANSCRIPT.segments, POINTS)

    expect(result.data.findings[1].state).toBe('not_found')
    expect(result.dropped).toBe(1)
  })

  it('reports a point the model skipped entirely as not found, never omits it', () => {
    // A missing row on screen is indistinguishable from a point nobody set.
    const result = validateCoaching({ findings: [] }, TRANSCRIPT.segments, POINTS)
    expect(result.data.findings).toHaveLength(2)
    expect(result.data.findings.every(f => f.state === 'not_found')).toBe(true)
  })

  it('ignores a finding for a point that was never asked about', () => {
    const result = validateCoaching({
      findings: [{ pointId: 'mo-invented-9', quote: 'Think of the margin like a bucket with a slow leak' }]
    }, TRANSCRIPT.segments, POINTS)
    expect(result.data.findings.map(f => f.pointId)).toEqual(['mo-eoy-1', 'mo-eoy-2'])
  })

  it('treats a malformed finding row as an unanswered point', () => {
    const result = validateCoaching({ findings: [null, 'nope', { quote: 'no id' }] }, TRANSCRIPT.segments, POINTS)
    expect(result.valid).toBe(true)
    expect(result.data.findings.every(f => f.state === 'not_found')).toBe(true)
  })

  it('treats a wrong-typed pointId or quote as an unanswered point', () => {
    const result = validateCoaching({
      findings: [{ pointId: 7, quote: 'Think of the margin like a bucket' }, { pointId: 'mo-eoy-2', quote: 99 }]
    }, TRANSCRIPT.segments, POINTS)
    expect(result.data.findings.every(f => f.state === 'not_found')).toBe(true)
  })

  it('copes with being given no points to check at all', () => {
    const result = validateCoaching({ findings: [] }, TRANSCRIPT.segments, null)
    expect(result.valid).toBe(true)
    expect(result.data.findings).toEqual([])
  })

  it('copes with a transcript that has no segments', () => {
    const result = validateCoaching({
      findings: [{ pointId: 'mo-eoy-1', quote: 'anything at all really' }]
    }, null, POINTS)
    expect(result.data.findings[0].state).toBe('not_found')
  })
})

describe('meetingReports — points a recording cannot hear', () => {
  const POINT = { id: 'mo-eoy-9', text: 'I drew the numbers out.', cannotHear: true, hintWords: ['let me sketch this out'] }

  it('raises the hint when the adviser actually said it', () => {
    const segments = [seg('advisor', 1263, 1270, 'Right, let me sketch this out for you.')]
    const [finding] = cannotHearFindings([POINT], segments)
    expect(finding.state).toBe('cannot_hear')
    expect(finding.hint.at).toBe('21:03')
  })

  it('🔴 never stores an answer, however strong the hint', () => {
    // Mike's ruling 2026-09-01: the stored finding is the advisor's confirmation, never the
    // guess — or a maybe hardens into a fact on its way to a manager's figures.
    const segments = [seg('advisor', 1263, 1270, 'Right, let me sketch this out for you.')]
    expect(cannotHearFindings([POINT], segments)[0].advisorAnswer).toBeNull()
  })

  it('offers no hint at all when the words were never said', () => {
    const [finding] = cannotHearFindings([POINT], TRANSCRIPT.segments)
    expect(finding.hint).toBeNull()
    expect(finding.advisorAnswer).toBeNull()
  })

  it('ignores hint words spoken by the client', () => {
    const segments = [seg('client', 100, 108, 'Could you let me sketch this out myself?')]
    expect(cannotHearFindings([POINT], segments)[0].hint).toBeNull()
  })

  it('copes with a point whose author supplied no hint words', () => {
    const bare = { id: 'mo-eoy-9', text: 'I drew the numbers out.', cannotHear: true }
    expect(cannotHearFindings([bare], TRANSCRIPT.segments)[0].hint).toBeNull()
  })
})

describe('meetingReports — generating', () => {
  it('produces a summary that is a draft, not an approved document', () => {
    // P7: the app writes, the advisor publishes.
    return generateSummary({
      transcript: TRANSCRIPT,
      scenarioName: 'End of year meeting',
      client: stubClient({ covered: 'We met.', actions: [], next: '', agreementQuote: NOT_FOUND })
    }).then((report) => {
      expect(report.approvedAt).toBeNull()
      expect(report.editedText).toBeNull()
    })
  })

  it('fails loudly when the model returns something unusable', async () => {
    // P11: a tidy page of nothing must never be what a total failure looks like.
    await expect(generateSummary({
      transcript: TRANSCRIPT,
      client: stubClient('the model apologises and offers no JSON')
    })).rejects.toThrow(/not usable/)
  })

  it('🔴 never asks the model about a point that cannot be heard', async () => {
    const client = stubClient({ findings: [{ pointId: 'mo-eoy-2', quote: 'Think of the margin like a bucket with a slow leak' }] })
    const report = await generateCoachingNotes({
      transcript: TRANSCRIPT,
      metrics: { usable: true },
      points: [
        { id: 'mo-eoy-2', text: 'I used a metaphor.' },
        { id: 'mo-eoy-9', text: 'I drew the numbers out.', cannotHear: true, hintWords: [] }
      ],
      client
    })

    const prompt = client.chat.completions.create.mock.calls[0][0].messages.map(m => m.content).join('\n')
    expect(prompt).toContain('mo-eoy-2')
    expect(prompt).not.toContain('mo-eoy-9')
    // It still reaches the advisor — held back from the model, not from the report.
    expect(report.findings.map(f => f.state)).toEqual(['found', 'cannot_hear'])
  })

  it('does not call the model at all when every point is un-hearable', async () => {
    const client = stubClient({ findings: [] })
    const report = await generateCoachingNotes({
      transcript: TRANSCRIPT,
      points: [{ id: 'mo-eoy-9', text: 'I drew the numbers out.', cannotHear: true }],
      client
    })
    expect(client.chat.completions.create).not.toHaveBeenCalled()
    expect(report.findings).toHaveLength(1)
  })

  it('lets a transport failure out rather than returning an empty report', async () => {
    // A network error that resolved to "nothing found" would read on screen as a meeting in
    // which the adviser did none of the things they set out to do. P11.
    const failing = { chat: { completions: { create: jest.fn().mockRejectedValue(new Error('socket hang up')) } } }
    await expect(generateSummary({ transcript: TRANSCRIPT, client: failing })).rejects.toThrow('socket hang up')
  })

  it('counts dropped items on the summary so an inventing model is visible in the logs', async () => {
    const report = await generateSummary({
      transcript: TRANSCRIPT,
      client: stubClient({
        covered: 'We met.',
        actions: [{ what: 'a real action' }, null],
        next: '',
        agreementQuote: 'A sentence that was never spoken in this meeting at all'
      })
    })
    // One malformed action, one uncited quote.
    expect(report.droppedItems).toBe(2)
    expect(report.agreement).toBeNull()
  })

  it('counts dropped findings on the coaching notes for the same reason', async () => {
    const report = await generateCoachingNotes({
      transcript: TRANSCRIPT,
      points: [{ id: 'mo-eoy-1', text: 'I framed the meeting.' }],
      client: stubClient({ findings: [{ pointId: 'mo-eoy-1', quote: 'A sentence nobody ever said in this room' }] })
    })
    expect(report.droppedFindings).toBe(1)
    expect(report.findings[0].state).toBe('not_found')
  })

  it('fails loudly when the coaching reply is unusable', async () => {
    await expect(generateCoachingNotes({
      transcript: TRANSCRIPT,
      points: [{ id: 'mo-eoy-1', text: 'I framed the meeting.' }],
      client: stubClient('no JSON here either')
    })).rejects.toThrow(/not usable/)
  })

  it('starts with an empty dispute record rather than no record', () => {
    return generateCoachingNotes({
      transcript: TRANSCRIPT,
      points: [],
      client: stubClient({ findings: [] })
    }).then((report) => {
      expect(report.disputes).toEqual({})
    })
  })
})
