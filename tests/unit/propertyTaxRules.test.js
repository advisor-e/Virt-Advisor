'use strict'

const {
  BASE_PROPERTY_TAX_RULES,
  CONFIG_KEY,
  validatePropertyTaxRules,
  loadResolvedPropertyTaxRules
} = require('../../server/utils/propertyTaxRules')
const { setFirmMembership, globalScopeId, groupScopeId } = require('../../server/utils/tierChain')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

/**
 * The property model's tax rules, resolved through the tier chain.
 *
 * Ruled by Mike 2026-08-17 (§8 Q6): a GROUP — normally a country — sets them, a FIRM may
 * correct them, and an ADVISOR types over them on the report for one client. The advisor
 * half is not stored anywhere, so it is not tested here; it is the report screen's own
 * form, and `multiplePropertyScreen.component.test.js` covers it.
 *
 * 🔴 THE CLAIM THIS FILE MAKES IS DELIBERATELY WEAKER THAN A LIVE SCREEN, and it is
 * stated as such. No real login produces a group manager and the `firms` table has no
 * country column, so the group tier can only be exercised against a SEEDED membership
 * map. That is Advisor-e's data to supply — question 5 of MASTER-TEAM-INTEGRATION-EMAIL.
 */

const BRAND = 'Acme Advisory'
const COUNTRY = 'New Zealand'
const FIRM = 'firm-nz-1'

/** An overlay reader over a plain object of scopeId → stored partial. */
function readerFor (store) {
  return (scopeId, key) => {
    expect(key).toBe(CONFIG_KEY)
    return Promise.resolve(store[scopeId] || null)
  }
}

afterEach(() => { setFirmMembership({}) })

describe('validatePropertyTaxRules', () => {
  it('accepts a PARTIAL object — a level holds only its changes', () => {
    const out = validatePropertyTaxRules({ lossTreatment: 'offset' })
    expect(out.ok).toBe(true)
    expect(out.value).toEqual({ lossTreatment: 'offset' })
  })

  it('accepts every recognised field at once', () => {
    const out = validatePropertyTaxRules({
      yearOneAddBack: 'setupAndPurchase',
      managementFeeGstRate: 0.2,
      depreciableAssets: 'chattelsAndBuilding',
      depreciationMethod: 'sl',
      depreciationRateChattels: 0.1,
      buildingDepreciationRate: 0.025,
      lossTreatment: 'offset',
      interestDeductibility: 'Yes',
      phasingTable: [1, 0.5]
    })
    expect(out.ok).toBe(true)
    expect(Object.keys(out.value)).toHaveLength(9)
  })

  it('refuses a value outside the allowed set rather than falling back to a default', () => {
    const out = validatePropertyTaxRules({ lossTreatment: 'ringfence' })
    expect(out.ok).toBe(false)
    expect(out.errors[0]).toContain('lossTreatment')
  })

  it('refuses a rate typed in the wrong unit instead of clamping it', () => {
    // 🔴 15 is not a bad 15%. Clamping it to 100% — or taking it as 1500% — would put a
    // wrong tax rule into live advice with nothing on screen to notice it by.
    const out = validatePropertyTaxRules({ managementFeeGstRate: 15 })
    expect(out.ok).toBe(false)
    expect(out.errors[0]).toContain('0.15, not 15')
  })

  it('refuses a negative rate', () => {
    expect(validatePropertyTaxRules({ depreciationRateChattels: -0.1 }).ok).toBe(false)
  })

  it('refuses an unrecognised field rather than dropping it silently', () => {
    // A typo that vanishes quietly is a setting somebody believes they saved.
    const out = validatePropertyTaxRules({ lossTreatmnet: 'offset' })
    expect(out.ok).toBe(false)
    expect(out.errors[0]).toContain('is not a property tax rule')
  })

  it('refuses a phasing table that is empty, too long, or holds a bad rate', () => {
    expect(validatePropertyTaxRules({ phasingTable: [] }).ok).toBe(false)
    expect(validatePropertyTaxRules({ phasingTable: new Array(11).fill(1) }).ok).toBe(false)
    expect(validatePropertyTaxRules({ phasingTable: [1, 2] }).ok).toBe(false)
    expect(validatePropertyTaxRules({ phasingTable: 'yes' }).ok).toBe(false)
  })

  it('refuses anything that is not a plain object', () => {
    expect(validatePropertyTaxRules(null).ok).toBe(false)
    expect(validatePropertyTaxRules([]).ok).toBe(false)
    expect(validatePropertyTaxRules('x').ok).toBe(false)
    expect(validatePropertyTaxRules(undefined).ok).toBe(false)
  })

  it('accepts an empty object — that is how a level stops holding its own rules', () => {
    const out = validatePropertyTaxRules({})
    expect(out.ok).toBe(true)
    expect(out.value).toEqual({})
  })
})

describe('the shipped base', () => {
  it('is New Zealand, and reproduces the workbook exactly', () => {
    expect(BASE_PROPERTY_TAX_RULES).toEqual({
      yearOneAddBack: 'setup',
      managementFeeGstRate: 0.15,
      depreciableAssets: 'chattels',
      depreciationMethod: 'dv',
      depreciationRateChattels: 0.28,
      buildingDepreciationRate: 0,
      lossTreatment: 'ringFenced',
      interestDeductibility: 'Phasing',
      phasingTable: [1, 0.75, 0.5, 0.25, 0]
    })
  })

  it('carries no documentation key into the resolved object', () => {
    // The data file explains WHY these are New Zealand's, beside the values. That note
    // must never reach an API response, a merge, or the model.
    expect(Object.keys(BASE_PROPERTY_TAX_RULES).some(k => k.charAt(0) === '_')).toBe(false)
  })
})

describe('loadResolvedPropertyTaxRules', () => {
  it('gives the shipped set when there is no scope at all', async () => {
    const rules = await loadResolvedPropertyTaxRules(null, readerFor({}))
    expect(rules).toBe(BASE_PROPERTY_TAX_RULES)
  })

  it('gives the layer above BY REFERENCE when a scope has changed nothing', async () => {
    // Identity, not merely equality: "this level changed nothing" is then provable.
    const rules = await loadResolvedPropertyTaxRules(FIRM, readerFor({}))
    expect(rules).toBe(BASE_PROPERTY_TAX_RULES)
  })

  it("takes a GROUP's rules down to a firm that has set none of its own", async () => {
    setFirmMembership({ [FIRM]: { globalGroup: BRAND, country: COUNTRY } })
    const group = groupScopeId(BRAND, COUNTRY)
    const rules = await loadResolvedPropertyTaxRules(FIRM, readerFor({
      [group]: { managementFeeGstRate: 0.2, lossTreatment: 'offset' }
    }))

    expect(rules.managementFeeGstRate).toBe(0.2)
    expect(rules.lossTreatment).toBe('offset')
    // Everything the group did NOT touch still comes from the platform — the whole
    // point of holding changes rather than a copy.
    expect(rules.depreciationRateChattels).toBe(0.28)
    expect(rules.yearOneAddBack).toBe('setup')
  })

  it("lets a FIRM correct one of its group's settings without losing the rest", async () => {
    setFirmMembership({ [FIRM]: { globalGroup: BRAND, country: COUNTRY } })
    const group = groupScopeId(BRAND, COUNTRY)
    const rules = await loadResolvedPropertyTaxRules(FIRM, readerFor({
      [group]: { managementFeeGstRate: 0.2, lossTreatment: 'offset' },
      [FIRM]: { lossTreatment: 'ringFenced' }
    }))

    expect(rules.lossTreatment).toBe('ringFenced') //   the firm's own correction
    expect(rules.managementFeeGstRate).toBe(0.2) //     still the group's
    expect(rules.depreciationRateChattels).toBe(0.28) // still the platform's
  })

  it('layers all four tiers in order — platform, global, group, firm', async () => {
    setFirmMembership({ [FIRM]: { globalGroup: BRAND, country: COUNTRY } })
    const rules = await loadResolvedPropertyTaxRules(FIRM, readerFor({
      [globalScopeId(BRAND)]: { depreciationMethod: 'sl' },
      [groupScopeId(BRAND, COUNTRY)]: { managementFeeGstRate: 0.1 },
      [FIRM]: { yearOneAddBack: 'none' }
    }))

    expect(rules.depreciationMethod).toBe('sl') //      the brand's
    expect(rules.managementFeeGstRate).toBe(0.1) //     the country's
    expect(rules.yearOneAddBack).toBe('none') //        the branch's
    expect(rules.lossTreatment).toBe('ringFenced') //   nobody touched it
  })

  it('replaces a phasing schedule wholesale rather than merging two countries together', async () => {
    setFirmMembership({ [FIRM]: { globalGroup: BRAND, country: COUNTRY } })
    const rules = await loadResolvedPropertyTaxRules(FIRM, readerFor({
      [groupScopeId(BRAND, COUNTRY)]: { phasingTable: [1, 0] }
    }))
    expect(rules.phasingTable).toEqual([1, 0])
  })

  it('ignores stored rubbish rather than letting it reach the model', async () => {
    // A value that fails validation is treated as "this level decided nothing" — the
    // model would otherwise fall back per-field and report it in defaultedInputs, which
    // is a worse place to find out.
    const rules = await loadResolvedPropertyTaxRules(FIRM, readerFor({
      [FIRM]: { lossTreatment: 'nonsense' }
    }))
    expect(rules).toBe(BASE_PROPERTY_TAX_RULES)
  })

  it('serves the layer above when the store cannot be reached, and never rejects', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const rules = await loadResolvedPropertyTaxRules(FIRM, () => Promise.reject(new Error('offline')))
    expect(rules).toBe(BASE_PROPERTY_TAX_RULES)
    spy.mockRestore()
  })

  it('resolves the mentor scope itself without looking for a parent', async () => {
    const rules = await loadResolvedPropertyTaxRules(PLATFORM_SCOPE, readerFor({}))
    expect(rules).toBe(BASE_PROPERTY_TAX_RULES)
  })

  it('falls back to the platform when no membership data exists — today, for every firm', async () => {
    // 🔴 This is the honest limit stated as a test rather than a comment: with no
    // country data the chain runs mentor → firm exactly as it did before it existed.
    setFirmMembership({})
    const rules = await loadResolvedPropertyTaxRules(FIRM, readerFor({
      [groupScopeId(BRAND, COUNTRY)]: { lossTreatment: 'offset' }
    }))
    expect(rules.lossTreatment).toBe('ringFenced')
  })
})

describe('maxLvr — the lending ceiling that shares this block', () => {
  it('is NOT shipped, and that is the decision rather than an omission', () => {
    // The source workbook has no ceiling anywhere: it computes an LVR at R5 that no
    // formula on any of its seven sheets ever reads. A figure shipped here would be a
    // lending policy nobody chose, arriving with the authority of a calculated result.
    expect(BASE_PROPERTY_TAX_RULES.maxLvr).toBeUndefined()
    expect(Object.prototype.hasOwnProperty.call(BASE_PROPERTY_TAX_RULES, 'maxLvr')).toBe(false)
  })

  it('is accepted as a rate, like every other rate on this tab', () => {
    const out = validatePropertyTaxRules({ maxLvr: 0.7 })
    expect(out.ok).toBe(true)
    expect(out.value).toEqual({ maxLvr: 0.7 })
  })

  it('refuses 70 rather than reading it as 7000%', () => {
    // The unit mistake this whole validator exists to catch, on the field where it would
    // be easiest to make: an LVR is spoken as "seventy percent" every time it is said.
    const out = validatePropertyTaxRules({ maxLvr: 70 })
    expect(out.ok).toBe(false)
    expect(out.errors.join(' ')).toMatch(/rate between 0 and 1/)
    expect(out.value.maxLvr).toBeUndefined()
  })

  it('refuses a negative ceiling', () => {
    expect(validatePropertyTaxRules({ maxLvr: -0.1 }).ok).toBe(false)
  })

  it('accepts a numeric string, as the other rates do', () => {
    expect(validatePropertyTaxRules({ maxLvr: '0.65' }).value).toEqual({ maxLvr: 0.65 })
  })

  it("takes a GROUP's ceiling down to a firm, and lets the firm tighten it", async () => {
    setFirmMembership({ [FIRM]: { globalGroup: BRAND, country: COUNTRY } })
    const group = groupScopeId(BRAND, COUNTRY)

    const inherited = await loadResolvedPropertyTaxRules(FIRM, readerFor({
      [group]: { maxLvr: 0.7 }
    }))
    expect(inherited.maxLvr).toBe(0.7)
    // And it did not disturb the tax rules it sits beside.
    expect(inherited.depreciationRateChattels).toBe(0.28)

    const corrected = await loadResolvedPropertyTaxRules(FIRM, readerFor({
      [group]: { maxLvr: 0.7 },
      [FIRM]: { maxLvr: 0.65 }
    }))
    expect(corrected.maxLvr).toBe(0.65)
  })

  it('is simply absent while nobody has set one', async () => {
    setFirmMembership({ [FIRM]: { globalGroup: BRAND, country: COUNTRY } })
    const rules = await loadResolvedPropertyTaxRules(FIRM, readerFor({
      [groupScopeId(BRAND, COUNTRY)]: { lossTreatment: 'offset' }
    }))
    // Absent, never 0 — a ceiling of zero would refuse every loan ever written.
    expect(rules.maxLvr).toBeUndefined()
  })
})
