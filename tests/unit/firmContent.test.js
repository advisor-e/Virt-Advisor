'use strict'

/**
 * Phase 0 of design/FIRM-EDITABLE-TABLES-PLAN.md — firm-aware content loading.
 *
 * The centrepiece is the CROSS-FIRM LEAK TEST (plan §3, acceptance 1): with
 * firm A's override in play, firm B's session must never see firm A's text,
 * and the process-wide caches must stay pristine platform base. The rest
 * proves the loader's fallbacks and that no-override behaviour is identical
 * to before.
 */

const { CONFIG_KEYS, mergeEntry, loadFirmDomainSupport, loadFirmLogicTrees } = require('../../server/utils/firmContent')

// A loader stub that returns a value per config key (mirrors firmOverlay.loadFirmConfig).
const loaderFor = byKey => jest.fn((firmId, key) => Promise.resolve(byKey[key]))

// ── The loader ───────────────────────────────────────────────────────────────

describe('firmContent loaders', () => {
  it('returns null when firmId is absent (no loader call)', async () => {
    const loader = jest.fn()
    expect(await loadFirmDomainSupport(null, loader)).toBeNull()
    expect(await loadFirmLogicTrees(null, loader)).toBeNull()
    expect(loader).not.toHaveBeenCalled()
  })

  it('returns the stored override map from the loader', async () => {
    const loader = loaderFor({
      [CONFIG_KEYS.domainSupport]: { profit: { overview: 'Firm A overview' } },
      [CONFIG_KEYS.logicTrees]: { valuation: { entry_triggers: ['firm word'] } }
    })
    expect(await loadFirmDomainSupport('firm-A', loader)).toEqual({ profit: { overview: 'Firm A overview' } })
    expect(await loadFirmLogicTrees('firm-A', loader)).toEqual({ valuation: { entry_triggers: ['firm word'] } })
  })

  it('returns null when nothing is stored', async () => {
    const loader = loaderFor({})
    expect(await loadFirmDomainSupport('firm-A', loader)).toBeNull()
  })

  it('returns null for malformed stored values (never crashes a session)', async () => {
    for (const bad of ['a string', ['an', 'array'], 42, true]) {
      const loader = loaderFor({ [CONFIG_KEYS.domainSupport]: bad, [CONFIG_KEYS.logicTrees]: bad })
      expect(await loadFirmDomainSupport('firm-A', loader)).toBeNull()
      expect(await loadFirmLogicTrees('firm-A', loader)).toBeNull()
    }
  })

  it('falls back to null when the loader rejects and no dev file matches', async () => {
    const loader = jest.fn(() => Promise.reject(new Error('no db')))
    expect(await loadFirmDomainSupport('firm-not-in-any-dev-file', loader)).toBeNull()
    expect(await loadFirmLogicTrees('firm-not-in-any-dev-file', loader)).toBeNull()
  })
})

// ── mergeEntry semantics (the firmOverlay rule, re-homed) ────────────────────

describe('mergeEntry', () => {
  it('overrides scalar fields and keeps unmentioned base fields', () => {
    const merged = mergeEntry({ label: 'Base', overview: 'Base overview' }, { overview: 'Firm overview' })
    expect(merged).toEqual({ label: 'Base', overview: 'Firm overview' })
  })

  it('replaces arrays wholesale, never element-by-element', () => {
    const merged = mergeEntry({ trigger_keywords: ['a', 'b', 'c'] }, { trigger_keywords: ['x'] })
    expect(merged.trigger_keywords).toEqual(['x'])
  })

  it('merges nested objects recursively', () => {
    const merged = mergeEntry(
      { diagnostic_entry: { primary_question: 'Base?', note: 'keep' } },
      { diagnostic_entry: { primary_question: 'Firm?' } }
    )
    expect(merged.diagnostic_entry).toEqual({ primary_question: 'Firm?', note: 'keep' })
  })

  it('returns a new object and never mutates the base', () => {
    const base = { label: 'Base', tools: [{ name: 'T1' }] }
    const merged = mergeEntry(base, { label: 'Firm' })
    expect(merged).not.toBe(base)
    expect(base.label).toBe('Base')
  })
})

// ── Firm-aware domain support ────────────────────────────────────────────────

const DOMAIN_FILES = {
  profit: {
    label: 'Profit & Revenue',
    overview: 'Platform profit overview.',
    trigger_keywords: ['profit', 'margin'],
    support_tools: [{ name: 'Margin Ladder', purpose: 'Platform purpose.' }],
    advisor_guidance: { g1: 'Platform guidance.' }
  },
  staff: {
    label: 'Staff & Team',
    overview: 'Platform staff overview.',
    trigger_keywords: ['staff', 'team'],
    support_tools: [{ name: 'Team Grid', purpose: 'Platform team purpose.' }]
  }
}

// Loads a fresh domainSupport module with fs mocked to the files above, so the
// module-level _cache starts clean for every scenario.
function loadDomainSupportModule (files) {
  let mod
  jest.isolateModules(() => {
    jest.doMock('fs', () => ({
      readdirSync: jest.fn(() => Object.keys(files).map(id => `${id}-domain-support.json`)),
      readFileSync: jest.fn((p) => {
        const m = String(p).match(/([\w-]+)-domain-support\.json$/)
        if (m && files[m[1]]) { return JSON.stringify(files[m[1]]) }
        throw new Error('ENOENT')
      })
    }))
    mod = require('../../server/utils/domainSupport')
  })
  return mod
}

const FIRM_A_SUPPORT = {
  profit: {
    overview: 'FIRM-A-MARKER profit overview.',
    trigger_keywords: ['bespoke levers']
  }
}

describe('domainSupport — firm-aware resolution', () => {
  it('no override → output identical to the platform base', () => {
    const mod = loadDomainSupportModule(DOMAIN_FILES)
    const base = mod.formatDomainSupportForPrompt('profit')
    expect(mod.formatDomainSupportForPrompt('profit', null)).toBe(base)
    expect(mod.formatDomainSupportForPrompt('profit', undefined)).toBe(base)
    expect(base).toContain('Platform profit overview.')
  })

  it('override changes only the overridden fields; base fields survive', () => {
    const mod = loadDomainSupportModule(DOMAIN_FILES)
    const out = mod.formatDomainSupportForPrompt('profit', FIRM_A_SUPPORT)
    expect(out).toContain('FIRM-A-MARKER profit overview.')
    expect(out).not.toContain('Platform profit overview.')
    expect(out).toContain('Margin Ladder') // un-overridden tool still present
    expect(out).toContain('Platform guidance.')
  })

  it('CROSS-FIRM LEAK TEST: firm B (and firm-less callers) never see firm A text, even after firm A was served', () => {
    const mod = loadDomainSupportModule(DOMAIN_FILES)
    const pristine = mod.formatDomainSupportForPrompt('profit')

    const firmA = mod.formatDomainSupportForPrompt('profit', FIRM_A_SUPPORT)
    expect(firmA).toContain('FIRM-A-MARKER')

    // Firm B has no override of its own → must get the pristine platform base.
    const firmB = mod.formatDomainSupportForPrompt('profit', null)
    expect(firmB).not.toContain('FIRM-A-MARKER')
    expect(firmB).toBe(pristine)

    // And the platform cache itself was not polluted by the merged copy.
    const again = mod.formatDomainSupportForPrompt('profit')
    expect(again).toBe(pristine)
  })

  it('detection: a firm keyword edit changes which domain fires FOR THAT FIRM ONLY', () => {
    const mod = loadDomainSupportModule(DOMAIN_FILES)
    // Base keywords: 'bespoke levers' matches nothing.
    expect(mod.detectDomainForSession('we need bespoke levers')).toBeNull()
    // Firm A replaced profit's keywords → fires profit for firm A only.
    expect(mod.detectDomainForSession('we need bespoke levers', FIRM_A_SUPPORT)).toBe('profit')
    // Firm A's keyword replacement is wholesale: 'profit' no longer triggers for them…
    expect(mod.detectDomainForSession('profit is down', FIRM_A_SUPPORT)).toBeNull()
    // …while the base (every other firm) is untouched.
    expect(mod.detectDomainForSession('profit is down')).toBe('profit')
  })

  it('detectDomainsForDesign honours the override the same way', () => {
    const mod = loadDomainSupportModule(DOMAIN_FILES)
    expect(mod.detectDomainsForDesign('bespoke levers and team issues', FIRM_A_SUPPORT)).toEqual(['profit', 'staff'])
    expect(mod.detectDomainsForDesign('bespoke levers and team issues')).toEqual(['staff'])
  })

  it('an override for an unknown domain id is ignored (existing domains only in Phase 0)', () => {
    const mod = loadDomainSupportModule(DOMAIN_FILES)
    const out = mod.formatDomainSupportForPrompt('profit', { 'not-a-domain': { overview: 'x' } })
    expect(out).toContain('Platform profit overview.')
    expect(mod.formatDomainSupportForPrompt('not-a-domain', { 'not-a-domain': { overview: 'x' } })).toBeNull()
  })

  it('a malformed per-domain override value falls back to the base', () => {
    const mod = loadDomainSupportModule(DOMAIN_FILES)
    for (const bad of ['a string', ['array'], 7]) {
      const out = mod.formatDomainSupportForPrompt('profit', { profit: bad })
      expect(out).toContain('Platform profit overview.')
    }
  })
})

// ── Firm-aware logic trees ───────────────────────────────────────────────────

const MOCK_TREES = {
  trees: [
    {
      id: 'valuation',
      name: 'Valuation',
      mode: 'client',
      description: 'Platform valuation tree',
      entry_triggers: ['valuation', 'sell the business'],
      nodes: [
        {
          id: 'root',
          branch_name: 'Entry',
          type: 'recommendation',
          condition: 'always',
          templates: ['Platform Valuation Template']
        }
      ]
    },
    {
      id: 'succession',
      name: 'Succession',
      mode: 'client',
      description: 'Platform succession tree',
      entry_triggers: ['succession'],
      nodes: [
        { id: 'root', branch_name: 'Entry', type: 'recommendation', condition: 'always', templates: [] }
      ]
    }
  ]
}

// Loads a fresh logicTrees module with fs mocked (clean _trees cache). The fs
// mock serves logic_trees.json; masterExport's ghost check degrades safely.
function loadLogicTreesModule (data) {
  let mod
  jest.isolateModules(() => {
    jest.doMock('fs', () => ({
      readFileSync: jest.fn(() => JSON.stringify(data)),
      readdirSync: jest.fn(() => []),
      existsSync: jest.fn(() => false)
    }))
    mod = require('../../server/utils/logicTrees')
  })
  return mod
}

const FIRM_A_TREES = {
  valuation: {
    entry_triggers: ['FIRM-A-TRIGGER'],
    nodes: [
      {
        id: 'root',
        branch_name: 'Entry',
        type: 'recommendation',
        condition: 'always',
        templates: ['Firm A Valuation Template']
      }
    ]
  }
}

describe('logicTrees — firm-aware resolution', () => {
  it('no override → effectiveTrees returns the very same base array (zero change)', () => {
    const mod = loadLogicTreesModule(MOCK_TREES)
    const base = mod.loadLogicTrees()
    expect(mod.effectiveTrees(null)).toBe(base)
    expect(mod.effectiveTrees(undefined)).toBe(base)
    expect(mod.effectiveTrees(['not', 'a', 'map'])).toBe(base)
  })

  it('detection: a firm trigger edit changes which tree fires FOR THAT FIRM ONLY', () => {
    const mod = loadLogicTreesModule(MOCK_TREES)
    expect(mod.detectLogicTree('FIRM-A-TRIGGER please')).toBeNull()
    const firmHit = mod.detectLogicTree('FIRM-A-TRIGGER please', FIRM_A_TREES)
    expect(firmHit).not.toBeNull()
    expect(firmHit.id).toBe('valuation')
    // Wholesale trigger replacement: the base trigger no longer fires for firm A…
    expect(mod.detectLogicTree('thinking about a valuation', FIRM_A_TREES)).toBeNull()
    // …while every other firm still gets the base behaviour.
    expect(mod.detectLogicTree('thinking about a valuation').id).toBe('valuation')
  })

  it('CROSS-FIRM LEAK TEST: firm A node edits never reach the base or another firm', () => {
    const mod = loadLogicTreesModule(MOCK_TREES)
    const walkedA = mod.walkLogicTree({}, 'valuation', FIRM_A_TREES)
    expect(walkedA).toEqual(['Firm A Valuation Template'])

    // Firm B (no override) and firm-less callers walk the pristine base.
    expect(mod.walkLogicTree({}, 'valuation', null)).toEqual(['Platform Valuation Template'])
    expect(mod.walkLogicTree({}, 'valuation')).toEqual(['Platform Valuation Template'])

    // The cached base tree object itself is untouched.
    const base = mod.loadLogicTrees().find(t => t.id === 'valuation')
    expect(base.nodes[0].templates).toEqual(['Platform Valuation Template'])
    expect(base.entry_triggers).toEqual(['valuation', 'sell the business'])
  })

  it('detectLogicTrees keeps un-overridden trees intact alongside an override', () => {
    const mod = loadLogicTreesModule(MOCK_TREES)
    const hits = mod.detectLogicTrees('FIRM-A-TRIGGER and succession planning', FIRM_A_TREES)
    expect(hits.map(t => t.id).sort()).toEqual(['succession', 'valuation'])
    const succession = hits.find(t => t.id === 'succession')
    expect(succession.entry_triggers).toEqual(['succession'])
  })

  it('an override for an unknown tree id is ignored (existing trees only in Phase 0)', () => {
    const mod = loadLogicTreesModule(MOCK_TREES)
    const trees = mod.effectiveTrees({ 'not-a-tree': { entry_triggers: ['x'] } })
    expect(trees.map(t => t.id)).toEqual(['valuation', 'succession'])
    expect(mod.detectLogicTree('x', { 'not-a-tree': { entry_triggers: ['x'] } })).toBeNull()
  })
})
