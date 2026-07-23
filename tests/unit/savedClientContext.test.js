'use strict'

const {
  extractSavedClientFactsFromCases,
  resolveSavedClientContext,
  parseSavedFactAnswer,
  buildSavedFactConfirmPrompt,
  continuityClaimAllowed,
  buildContinuityDirective,
  buildSavedClientTraceAudit,
  buildContinuityTraceAudit
} = require('../../server/advisorEngine')

describe('extractSavedClientFactsFromCases', () => {
  test('extracts industry, ownership, and advisory stage from the newest case decisionTrace.situation', () => {
    const cases = [
      {
        decisionTrace: {
          situation: [
            'Industry: scaffolding',
            'Business ownership: privately owned',
            'Advisory Staircase position: Step 2: Assimilation'
          ].join('\n')
        }
      }
    ]

    const out = extractSavedClientFactsFromCases(cases)
    expect(out.industry).toBe('scaffolding')
    expect(out.ownership).toBe('privately owned')
    expect(out.advisoryStaircase).toBe('Step 2: Assimilation')
    expect(out.industrySource).toBe('decisionTrace.situation:Industry')
    expect(out.ownershipSource).toBe('decisionTrace.situation:Business ownership')
    expect(out.advisoryStaircaseSource).toBe('decisionTrace.situation:Advisory Staircase position')
  })

  test('fills gaps from older cases when newest case is incomplete', () => {
    const cases = [
      {
        decisionTrace: {
          situation: 'Industry: scaffolding\nBusiness ownership: pending\nAdvisory Staircase position: Step 3: Interpretation'
        }
      },
      {
        decisionTrace: {
          situation: 'Industry: farming\nBusiness ownership: privately owned\nAdvisory Staircase position: Step 1: Compilation & Verification'
        }
      }
    ]

    const out = extractSavedClientFactsFromCases(cases)
    expect(out.industry).toBe('scaffolding')
    expect(out.ownership).toBe('privately owned')
    expect(out.advisoryStaircase).toBe('Step 3: Interpretation')
  })

  test('returns null facts when no reusable fields exist', () => {
    const out = extractSavedClientFactsFromCases([{ decisionTrace: { situation: 'foo: bar' } }])
    expect(out).toEqual({
      industry: null,
      ownership: null,
      advisoryStaircase: null,
      industrySource: null,
      ownershipSource: null,
      advisoryStaircaseSource: null
    })
  })

  test('extracts all 5 advisory staircase levels correctly', () => {
    const stages = [
      'Step 1: Compilation & Verification',
      'Step 2: Assimilation',
      'Step 3: Interpretation',
      'Step 4: Application',
      'Step 5: Observation'
    ]

    stages.forEach((stage) => {
      const out = extractSavedClientFactsFromCases([{
        decisionTrace: { situation: `Advisory Staircase position: ${stage}` }
      }])
      expect(out.advisoryStaircase).toBe(stage)
    })
  })
})

describe('resolveSavedClientContext', () => {
  test('fails closed for missing identity/client', async () => {
    const out = await resolveSavedClientContext({ clientId: '', advisorId: 'a1', firmId: 'f1' })
    expect(out.hasTrustedContext).toBe(false)
    expect(out.resolutionState).toBe('unresolved')
    expect(out.reason).toBe('missing_identity_or_client')
  })

  test('returns out-of-scope when firm-scoped client lookup fails and does not query case history', async () => {
    const listCasesForClient = jest.fn().mockResolvedValue([])
    const out = await resolveSavedClientContext(
      { clientId: 'c1', advisorId: 'a1', firmId: 'f1' },
      {
        getClientById: jest.fn().mockResolvedValue(null),
        listCasesForClient
      }
    )

    expect(out.hasTrustedContext).toBe(false)
    expect(out.reason).toBe('client_not_found_or_out_of_scope')
    expect(listCasesForClient).not.toHaveBeenCalled()
  })

  test('returns resolved when trusted client and all three facts are present', async () => {
    const out = await resolveSavedClientContext(
      { clientId: 'c1', advisorId: 'a1', firmId: 'f1' },
      {
        getClientById: jest.fn().mockResolvedValue({ id: 'c1', firmId: 'f1', name: 'Jones Scaffolding Ltd' }),
        listCasesForClient: jest.fn().mockResolvedValue([
          {
            decisionTrace: {
              situation: 'Industry: scaffolding\nBusiness ownership: privately owned\nAdvisory Staircase position: Step 2: Assimilation'
            }
          }
        ])
      }
    )

    expect(out.hasTrustedContext).toBe(true)
    expect(out.resolutionState).toBe('resolved')
    expect(out.clientName).toBe('Jones Scaffolding Ltd')
    expect(out.hasCaseHistory).toBe(true)
    expect(out.caseCount).toBe(1)
    expect(out.resolvedFacts).toEqual({
      industry: 'scaffolding',
      ownership: 'privately owned',
      advisoryStaircase: 'Step 2: Assimilation'
    })
  })

  test('returns partial when 1-2 facts are available', async () => {
    const out = await resolveSavedClientContext(
      { clientId: 'c1', advisorId: 'a1', firmId: 'f1' },
      {
        getClientById: jest.fn().mockResolvedValue({ id: 'c1', firmId: 'f1', name: 'Client A' }),
        listCasesForClient: jest.fn().mockResolvedValue([
          {
            decisionTrace: {
              situation: 'Industry: scaffolding\nAdvisory Staircase position: Step 3: Interpretation'
            }
          }
        ])
      }
    )

    expect(out.hasTrustedContext).toBe(true)
    expect(out.resolutionState).toBe('partial')
    expect(out.resolvedFacts).toEqual({
      industry: 'scaffolding',
      ownership: null,
      advisoryStaircase: 'Step 3: Interpretation'
    })
  })
})

describe('parseSavedFactAnswer', () => {
  test('keeps saved industry on explicit keep', () => {
    const out = parseSavedFactAnswer('industry', 'scaffolding', 'yes keep that')
    expect(out.action).toBe('keep')
    expect(out.value).toBe('scaffolding')
  })

  test('keeps saved value on challenge phrase', () => {
    const out = parseSavedFactAnswer('industry', 'scaffolding', 'this is a saved client you should know this')
    expect(out.action).toBe('keep')
    expect(out.value).toBe('scaffolding')
  })

  test('asks manual follow-up on change-without-value', () => {
    const out = parseSavedFactAnswer('industry', 'scaffolding', 'no change it')
    expect(out.action).toBe('ask-manual')
  })

  test('updates industry when advisor provides a replacement', () => {
    const out = parseSavedFactAnswer('industry', 'scaffolding', 'construction services')
    expect(out.action).toBe('update')
    expect(out.value).toBe('construction services')
  })

  test('normalises ownership updates to canonical values', () => {
    const out = parseSavedFactAnswer('ownership', 'privately owned', 'publicly listed company')
    expect(out.action).toBe('update')
    expect(out.value).toBe('publicly listed')
  })
})

describe('buildSavedFactConfirmPrompt', () => {
  test('uses yes/no wording when saved value exists', () => {
    const text = buildSavedFactConfirmPrompt('industry', 'scaffolding', 'Jones Scaffolding Ltd')
    expect(text).toMatch(/is the industry still/i)
    expect(text).toMatch(/scaffolding/i)
  })

  test('falls back to standard ask when saved value is unavailable', () => {
    const text = buildSavedFactConfirmPrompt('ownership', null, null)
    expect(text).toBe('Is the business privately owned, a not-for-profit, or publicly listed?')
  })
})

describe('continuityClaimAllowed', () => {
  test('returns false when there is no prior evidence', () => {
    expect(continuityClaimAllowed(null)).toBe(false)
    expect(continuityClaimAllowed({ sessions: 0, engagements: [] })).toBe(false)
  })

  test('returns true only when summary has sessions and engagement records', () => {
    expect(continuityClaimAllowed({ sessions: 2, engagements: [{}, {}] })).toBe(true)
    expect(continuityClaimAllowed({ sessions: 2, engagements: [] })).toBe(false)
  })
})

describe('buildContinuityDirective', () => {
  test('uses neutral guard wording when continuity is not allowed', () => {
    const text = buildContinuityDirective(false)
    expect(text).toMatch(/no prior-session evidence/i)
    expect(text).toMatch(/do not claim or imply prior discussions/i)
  })

  test('allows continuity wording when evidence is present', () => {
    const text = buildContinuityDirective(true)
    expect(text).toMatch(/continuity evidence is present/i)
    expect(text).toMatch(/may reference prior sessions/i)
  })
})

describe('buildSavedClientTraceAudit', () => {
  test('marks prefilled/confirmed/edited fields from resolved facts + usage', () => {
    const out = buildSavedClientTraceAudit(
      {
        resolvedFacts: {
          industry: 'scaffolding',
          ownership: 'privately owned',
          advisoryStaircase: 'Step 2: Assimilation'
        }
      },
      {
        industry: 'kept',
        ownership: 'edited',
        advisoryStaircase: 'kept'
      }
    )

    expect(out.savedClientContextUsed).toBe(true)
    expect(out.prefilledFields).toEqual(['industry', 'ownership', 'advisoryStaircase'])
    expect(out.confirmedFields).toEqual(['industry', 'advisoryStaircase'])
    expect(out.editedFields).toEqual(['ownership'])
  })

  test('stays empty when no saved facts were resolved', () => {
    const out = buildSavedClientTraceAudit(
      { resolvedFacts: { industry: null, ownership: null, advisoryStaircase: null } },
      { industry: 'provided', ownership: null, advisoryStaircase: null }
    )

    expect(out.savedClientContextUsed).toBe(false)
    expect(out.prefilledFields).toEqual([])
    expect(out.confirmedFields).toEqual([])
    expect(out.editedFields).toEqual([])
  })
})

describe('buildContinuityTraceAudit', () => {
  test('records continuity source only when claim is evidence-allowed', () => {
    const allowed = buildContinuityTraceAudit(true, { sessions: 2 })
    expect(allowed).toEqual({ continuityClaimed: true, continuitySource: 'priorEngagementSummary' })

    const blocked = buildContinuityTraceAudit(false, null)
    expect(blocked).toEqual({ continuityClaimed: false, continuitySource: 'none' })
  })
})

describe('Phase B Integration — Saved-Client Intake Flow', () => {
  test('end-to-end: extract context → generate yes/no prompts → handle responses', async () => {
    // Setup: prior case with all three fields saved
    const priorCase = {
      decisionTrace: {
        situation: [
          'Industry: scaffolding',
          'Business ownership: privately owned',
          'Advisory Staircase position: Step 2: Assimilation'
        ].join('\n')
      }
    }

    // Phase A: Extract facts from prior case
    const extracted = extractSavedClientFactsFromCases([priorCase])
    expect(extracted.industry).toBe('scaffolding')
    expect(extracted.ownership).toBe('privately owned')
    expect(extracted.advisoryStaircase).toBe('Step 2: Assimilation')

    // Resolve full context
    const context = await resolveSavedClientContext(
      { clientId: 'c1', advisorId: 'a1', firmId: 'f1' },
      {
        getClientById: jest.fn().mockResolvedValue({ id: 'c1', firmId: 'f1', name: 'Jones Scaffolding' }),
        listCasesForClient: jest.fn().mockResolvedValue([priorCase])
      }
    )
    expect(context.resolutionState).toBe('resolved')
    expect(context.resolvedFacts.industry).toBe('scaffolding')
    expect(context.resolvedFacts.ownership).toBe('privately owned')
    expect(context.resolvedFacts.advisoryStaircase).toBe('Step 2: Assimilation')

    // Phase B: Generate yes/no confirm prompts
    const industryPrompt = buildSavedFactConfirmPrompt('industry', 'scaffolding')
    expect(industryPrompt).toMatch(/is the industry still/i)
    expect(industryPrompt).toContain('scaffolding')

    const ownershipPrompt = buildSavedFactConfirmPrompt('ownership', 'privately owned')
    expect(ownershipPrompt).toMatch(/are they still/i)
    expect(ownershipPrompt).toContain('privately owned')

    const stagePrompt = buildSavedFactConfirmPrompt('advisoryStaircase', 'Step 2: Assimilation')
    expect(stagePrompt).toMatch(/is the advisory stage still/i)
    expect(stagePrompt).toContain('Step 2: Assimilation')

    // Scenario 1: Advisor confirms all three (answers "yes")
    const usage1 = {}
    usage1.industry = parseSavedFactAnswer('industry', 'scaffolding', 'yes').action === 'keep' ? 'kept' : 'edited'
    usage1.ownership = parseSavedFactAnswer('ownership', 'privately owned', 'yes').action === 'keep' ? 'kept' : 'edited'
    usage1.advisoryStaircase = parseSavedFactAnswer('advisoryStaircase', 'Step 2: Assimilation', 'yes').action === 'keep' ? 'kept' : 'edited'

    const audit1 = buildSavedClientTraceAudit(context, usage1)
    expect(audit1.savedClientContextUsed).toBe(true)
    expect(audit1.prefilledFields).toEqual(['industry', 'ownership', 'advisoryStaircase'])
    expect(audit1.confirmedFields).toEqual(['industry', 'ownership', 'advisoryStaircase'])
    expect(audit1.editedFields).toEqual([])

    // Scenario 2: Advisor changes ownership, keeps others (answers "no" then provides new value)
    const usage2 = {}
    usage2.industry = 'kept'
    usage2.ownership = 'edited'
    usage2.advisoryStaircase = 'kept'

    const audit2 = buildSavedClientTraceAudit(context, usage2)
    expect(audit2.savedClientContextUsed).toBe(true)
    expect(audit2.prefilledFields).toEqual(['industry', 'ownership', 'advisoryStaircase'])
    expect(audit2.confirmedFields).toEqual(['industry', 'advisoryStaircase'])
    expect(audit2.editedFields).toEqual(['ownership'])

    // Scenario 3: No saved context — falls back to open questions
    const noContextPrompt = buildSavedFactConfirmPrompt('industry', null)
    expect(noContextPrompt).toBe('What industry is the client in?')

    const noStagePrompt = buildSavedFactConfirmPrompt('advisoryStaircase', null)
    expect(noStagePrompt).toContain('Where would you say your current engagement')
  })
})
