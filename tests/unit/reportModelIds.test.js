'use strict'

/**
 * Every calculation model carries a permanent id of its own.
 *
 * Asked for by Mike, 2026-09-23: *"allocate each model an ID and make sure any new model
 * added gets an ID allocated automatically"*.
 *
 * 🔴 WHAT THIS GUARDS, AND WHY A PERSON CANNOT. A model's id is never drawn on a screen,
 * so no amount of UAT will ever notice one missing, duplicated or quietly changed. What
 * it costs is invisible in the same way: the master library resolves a template's real
 * page address from its `link` id (`server/utils/outlineResources.js`), and because the
 * models had no id they could not be resolved at all — so their addresses were written
 * into the prompt for the AI to copy, and dropped about half the time. This file is the
 * reason that cannot come back by someone adding a twentieth model and forgetting.
 *
 * 🔴 AND IT IS THE "AUTOMATICALLY" HALF. The allocator fills gaps; this asserts the
 * shipped file has none left, so a model added without an id fails here with the one
 * command to run. Nobody types an id, and nobody has to remember to.
 */

const { readFileSync } = require('fs')
const { resolve } = require('path')
const { allocateIds, missingIds, ID_RE, DATA_PATH } = require('../../scripts/allocate-model-ids')
const { listReportModels } = require('../../server/utils/reportModels')

/** The file exactly as it ships, parsed fresh so a test can never mutate the real one. */
function shipped () {
  return JSON.parse(readFileSync(resolve(process.cwd(), DATA_PATH), 'utf8'))
}

describe('every calculation model has an id, and the file is already complete', () => {
  it('🔴 A MODEL WITH NO ID FAILS HERE — run `npm run models:ids`', () => {
    expect(missingIds(shipped())).toEqual([])
  })

  it('every id is in this app’s own namespace and shaped the same way', () => {
    shipped().models.forEach((m) => {
      expect(m.id).toMatch(ID_RE)
    })
  })

  it('no two models share an id', () => {
    const ids = shipped().models.map(m => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('🔴 THE ALLOCATOR FINDS NOTHING LEFT TO DO — the committed file is fully allocated', () => {
    // If this fails the file was committed mid-allocation: the suite would pass on one
    // machine and the ids would differ on the next.
    expect(allocateIds(shipped()).allocated).toEqual([])
  })

  it('the id reaches the record the rest of the app reads, not just the raw file', () => {
    listReportModels().forEach((m) => {
      expect(m.id).toMatch(ID_RE)
    })
  })
})

describe('an id is allocated once and never changes', () => {
  it('🔴 AN EXISTING ID IS NEVER REWRITTEN, whatever the name above it becomes', () => {
    const data = { models: [{ id: 'model-0000000001', route: '/x', name: 'Renamed Since' }] }
    const out = allocateIds(data)
    expect(out.data.models[0].id).toBe('model-0000000001')
    expect(out.allocated).toEqual([])
  })

  it('a newly added model is given one without being asked', () => {
    const data = { models: [{ route: '/new-thing', name: 'A Twentieth Model' }] }
    const out = allocateIds(data)
    expect(out.data.models[0].id).toMatch(ID_RE)
    expect(out.allocated).toHaveLength(1)
  })

  it('a new model never lands on an id another model already holds', () => {
    // Force the collision: the seed for this name, handed to the model beside it.
    const seed = allocateIds({ models: [{ name: 'Twin' }] }).data.models[0].id
    const out = allocateIds({ models: [{ id: seed, name: 'Holder' }, { name: 'Twin' }] })
    expect(out.data.models[1].id).not.toBe(seed)
    expect(out.data.models[0].id).toBe(seed)
  })

  it('allocating twice in a row changes nothing the second time', () => {
    const once = allocateIds(shipped()).data
    expect(allocateIds(once).allocated).toEqual([])
  })
})

describe('a model id can never be mistaken for a master-library template id', () => {
  it('🔴 NO MODEL ID SITS IN THE MASTER LIBRARY’S `id-` NAMESPACE', () => {
    // The confusion this whole change exists to end: five model names are also real
    // template titles. Sharing a namespace as well would make a model and a template
    // indistinguishable by identifier too, and a future master export could allocate
    // the very number we had invented.
    shipped().models.forEach((m) => {
      expect(m.id.indexOf('id-')).toBe(-1)
    })
  })

  it('no model id collides with an id the real master library already uses', () => {
    const { getOrgTemplates } = require('../../server/utils/templates')
    const libraryIds = new Set(getOrgTemplates(null, null).map(t => t && t.link).filter(Boolean))
    shipped().models.forEach((m) => {
      expect(libraryIds.has(m.id)).toBe(false)
    })
  })
})
