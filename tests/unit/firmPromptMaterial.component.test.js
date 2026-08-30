/**
 * @jest-environment jsdom
 */
'use strict'

// The panel a level types its own prompt material into — item 4.31, Lane B.
//
// 🔴 WHAT THIS HOLDS THAT A PERSON IN UAT CANNOT SEE:
//
//   1. THE PANEL COMPILES. Nothing else renders this component, so a Pug slip would first
//      surface during `nuxt build` on the master team's side.
//   2. AN EDIT TO INHERITED MATERIAL GOES TO THE EDIT ROUTE, NOT THE ADD ROUTE. Both
//      produce a row on screen that looks identical; only one of them keeps the link to
//      the row above, which is what makes a later change from above noticeable.
//   3. A REFUSAL IS SHOWN IN THE PASTE BOX'S OWN WORDS, and a refusal shape this build
//      cannot describe says the save failed rather than drawing an empty red box.

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmPromptMaterial = require('../../components/firm/FirmPromptMaterial.vue').default

const INHERITED = { id: 'pc-1', title: 'Platform method', text: 'The mentor way.', source: 'inherited' }
const OWN = { id: 'fc-1', title: 'Our method', text: 'Our way.', source: 'added-here' }
const EDITED = { id: 'pc-2', title: 'Ours', text: 'Our version.', source: 'edited-here' }

const LIMITS = { maxInForce: 3, maxTitle: 120, maxText: 6000 }

function payload (extra) {
  return Object.assign({
    resolved: [],
    inherited: [],
    declinedIds: [],
    changedAbove: [],
    limits: LIMITS
  }, extra || {})
}

/** Mount with the backend answering the same body to every call. */
function mountPanel (body) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(body) }))
  return mountWithBuefy(FirmPromptMaterial, { propsData: { apiToken: 'test-token' } })
}

async function settled (wrapper) {
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
  return wrapper
}

function lastCall () {
  const calls = global.fetch.mock.calls
  return calls[calls.length - 1]
}

afterEach(() => { delete global.fetch })

describe('the panel a manager opens', () => {
  it('renders, and says plainly when there is nothing yet', async () => {
    const wrapper = await settled(mountPanel(payload()))
    expect(wrapper.vm.loading).toBe(false)
    expect(wrapper.vm.resolved).toEqual([])
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('draws one row per piece of material in force', async () => {
    const wrapper = await settled(mountPanel(payload({ resolved: [INHERITED, OWN] })))
    expect(wrapper.findAll('.pm-row').length).toBe(2)
  })

  it('badges a row by where it came from', async () => {
    const wrapper = await settled(mountPanel(payload()))
    expect(wrapper.vm.badgeFor(INHERITED).label).not.toBe(wrapper.vm.badgeFor(OWN).label)
    expect(wrapper.vm.badgeFor(EDITED).label).not.toBe(wrapper.vm.badgeFor(INHERITED).label)
  })

  it('will not save without both a name and some wording', async () => {
    const wrapper = await settled(mountPanel(payload()))
    expect(wrapper.vm.canSave).toBe(false)
    wrapper.vm.form = { title: 'Ours', text: '   ' }
    expect(wrapper.vm.canSave).toBe(false)
    wrapper.vm.form = { title: 'Ours', text: 'Our way.' }
    expect(wrapper.vm.canSave).toBe(true)
  })

  it('says on the screen what saving actually does', async () => {
    // The one thing a manager must not be able to miss: this reaches their advisers.
    const wrapper = await settled(mountPanel(payload()))
    expect(wrapper.find('.pm-warn').exists()).toBe(true)
  })
})

describe('adding and editing', () => {
  it('adds through the add route', async () => {
    const wrapper = await settled(mountPanel(payload()))
    wrapper.vm.form = { title: 'Ours', text: 'Our way.' }
    await wrapper.vm.save()

    const [url, opts] = global.fetch.mock.calls[1]
    expect(url).toBe('/api/firm-manager/prompt-contributions')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toEqual({ title: 'Ours', text: 'Our way.' })
  })

  it('🔴 edits INHERITED material through the edit route, keyed to the row above', async () => {
    // Adding a near-copy instead would leave the level above's row still in force and
    // break every later comparison against it.
    const wrapper = await settled(mountPanel(payload({ resolved: [INHERITED] })))
    wrapper.vm.startEdit(INHERITED)
    wrapper.vm.form = { title: 'Ours', text: 'Our way.' }
    await wrapper.vm.save()

    const [url, opts] = global.fetch.mock.calls[1]
    expect(url).toBe('/api/firm-manager/prompt-contributions/pc-1')
    expect(opts.method).toBe('PUT')
  })

  it('loads the row into the form when editing starts, and clears it on cancel', async () => {
    const wrapper = await settled(mountPanel(payload({ resolved: [OWN] })))
    wrapper.vm.startEdit(OWN)
    expect(wrapper.vm.form).toEqual({ title: 'Our method', text: 'Our way.' })
    expect(wrapper.vm.editingId).toBe('fc-1')

    wrapper.vm.cancelEdit()
    expect(wrapper.vm.editingId).toBe('')
    expect(wrapper.vm.form).toEqual({ title: '', text: '' })
  })
})

describe('switching material off and back on', () => {
  it('switches an inherited row off through its own route', async () => {
    const wrapper = await settled(mountPanel(payload({ resolved: [INHERITED] })))
    await wrapper.vm.switchOff(INHERITED)

    const [url, opts] = global.fetch.mock.calls[1]
    expect(url).toBe('/api/firm-manager/prompt-contributions/pc-1/off')
    expect(JSON.parse(opts.body)).toEqual({ off: true })
  })

  it('switches one back on', async () => {
    const wrapper = await settled(mountPanel(payload()))
    await wrapper.vm.switchBackOn('pc-1')
    expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({ off: false })
  })

  it('🔴 shows what has been switched off, rather than hiding the decision', async () => {
    const wrapper = await settled(mountPanel(payload({
      inherited: [INHERITED],
      declinedIds: ['pc-1'],
      resolved: []
    })))
    expect(wrapper.vm.switchedOff.map(r => r.id)).toEqual(['pc-1'])
    expect(wrapper.find('.pm-off').exists()).toBe(true)
  })
})

describe('🔴 a change made above an edit of ours', () => {
  const changed = payload({ resolved: [EDITED], changedAbove: ['pc-2'] })

  it('is said on the row it affects', async () => {
    const wrapper = await settled(mountPanel(changed))
    expect(wrapper.vm.hasChanged('pc-2')).toBe(true)
    expect(wrapper.find('.pm-changed-row').exists()).toBe(true)
  })

  it('offers both answers, and neither is taken automatically', async () => {
    const wrapper = await settled(mountPanel(changed))
    // Nothing was sent by simply rendering the notice.
    expect(global.fetch).toHaveBeenCalledTimes(1)

    // Every action posts and then reads the whole state back, so the ACTION is the call
    // after the initial load and the refetch is the one after that.
    await wrapper.vm.adopt('pc-2')
    expect(global.fetch.mock.calls[1][0]).toBe('/api/firm-manager/prompt-contributions/pc-2/adopt')
    expect(lastCall()[0]).toBe('/api/firm-manager/prompt-contributions')
  })

  it('keeping mine goes to its own route', async () => {
    const wrapper = await settled(mountPanel(changed))
    await wrapper.vm.keepMine('pc-2')
    expect(global.fetch.mock.calls[1][0]).toBe('/api/firm-manager/prompt-contributions/pc-2/keep-mine')
  })
})

describe('when material is refused', () => {
  it('shows the refusal in the paste box\'s own words', async () => {
    const wrapper = await settled(mountPanel(payload()))
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        saved: false,
        refused: true,
        refusal: { kind: 'link', variant: 'web', line: 3, quote: 'https://example.com/x' }
      })
    })

    wrapper.vm.form = { title: 'Ours', text: 'See https://example.com/x' }
    await wrapper.vm.save()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.view).not.toBeNull()
    expect(wrapper.vm.view.tone).toBe('is-stop')
    expect(wrapper.find('.pm-blocked').exists()).toBe(true)
  })

  it('🔴 says the save failed rather than drawing a refusal it cannot describe', async () => {
    const wrapper = await settled(mountPanel(payload()))
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ saved: false, refused: true, refusal: { kind: 'something-new' } })
    })

    wrapper.vm.form = { title: 'Ours', text: 'x' }
    await wrapper.vm.save()

    expect(wrapper.vm.view).toBeNull()
    expect(wrapper.vm.saveError).toBeTruthy()
  })

  it('keeps the manager\'s words in the box so they can fix them', async () => {
    const wrapper = await settled(mountPanel(payload()))
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        saved: false,
        refused: true,
        refusal: { kind: 'link', variant: 'web', line: 1, quote: 'https://example.com/x' }
      })
    })

    wrapper.vm.form = { title: 'Ours', text: 'See https://example.com/x' }
    await wrapper.vm.save()
    expect(wrapper.vm.form.text).toBe('See https://example.com/x')
  })
})

describe('when the backend cannot answer', () => {
  it('says so instead of showing an empty panel', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('network down')))
    const wrapper = await settled(mountWithBuefy(FirmPromptMaterial, { propsData: { apiToken: 't' } }))
    expect(wrapper.vm.loadError).toBe(true)
    expect(wrapper.vm.loading).toBe(false)
  })

  it('says so when a save fails, and stops spinning', async () => {
    const wrapper = await settled(mountPanel(payload()))
    global.fetch.mockRejectedValue(new Error('network down'))
    wrapper.vm.form = { title: 'Ours', text: 'Our way.' }
    await wrapper.vm.save()

    expect(wrapper.vm.saveError).toBeTruthy()
    expect(wrapper.vm.busy).toBe(false)
  })
})
