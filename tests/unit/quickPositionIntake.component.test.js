/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const QuickPositionIntake = require('~/components/QuickPositionIntake.vue').default

/**
 * Component tests for the Quick Position intake — the R1/R2/R12/R13 cases logged as
 * TEST-GAP in design/ACTIONS.md on 2026-07-19. Each fix below shipped without a test
 * because the component-test toolchain did not exist yet; these hold them down.
 *
 * The provenance badge is not decoration. It is the intake contract's promise (§4.4)
 * that the advisor can tell, in a client meeting, which figures came out of the
 * accounting export and which a human typed. A wrong badge is a lie on a report.
 */

const FIGURE_KEYS = ['cash', 'debtors', 'stock', 'creditors', 'wagesDue', 'fixedAssets']
const FROM_FILE = 'report.quickPosition.confirm.fromFile'
const ENTERED = 'report.quickPosition.confirm.entered'

/** A confirmed payload as the report screen hands it back when the advisor steps back. */
function restorePayload (overrides) {
  const figures = {}
  FIGURE_KEYS.forEach((key, i) => { figures[key] = { value: (i + 1) * 1000, source: 'file' } })
  return Object.assign({
    figures,
    serviceBusiness: false,
    expenseLines: [{ label: 'Rent', value: 24000 }],
    incomeTotal: 480000,
    companyName: 'Sample Trading Ltd'
  }, overrides)
}

/** Mount already on step 2 (the confirm table) with figures in place. */
function mountConfirm (restore) {
  return mountWithBuefy(QuickPositionIntake, {
    propsData: { step: 2, restore: restore || restorePayload() }
  })
}

/** The confirm table's rows, in `visibleFigureKeys` order. */
function rows (wrapper) {
  return wrapper.findAll('tbody tr')
}

/** Build a File whose reported size can exceed what we want to allocate. */
function fakeFile (name, sizeBytes) {
  const file = new File(['x'], name)
  Object.defineProperty(file, 'size', { value: sizeBytes })
  return file
}

describe('QuickPositionIntake — provenance badges (R1)', () => {
  it('keeps the "from file" badge on a figure the export supplied', () => {
    const wrapper = mountConfirm()
    expect(rows(wrapper).at(0).find('.src').text()).toBe(FROM_FILE)
    expect(rows(wrapper).at(0).find('.src').classes()).toContain('src-file')
  })

  it('flips that badge to "entered" as soon as the advisor edits the figure', async () => {
    // The shipped bug: an edited figure kept claiming it came from the file, so a
    // hand-adjusted number read as an accounting fact.
    const wrapper = mountConfirm()
    const cashRow = rows(wrapper).at(0)
    expect(cashRow.find('.src').text()).toBe(FROM_FILE)

    await cashRow.find('input[type="number"]').setValue('4321')

    expect(rows(wrapper).at(0).find('.src').text()).toBe(ENTERED)
    expect(rows(wrapper).at(0).find('.src').classes()).toContain('src-hand')
    expect(wrapper.vm.figures.cash.value).toBe(4321)
  })

  it('leaves the other rows untouched when one figure is edited', async () => {
    const wrapper = mountConfirm()
    await rows(wrapper).at(0).find('input[type="number"]').setValue('99')

    const badges = rows(wrapper).wrappers.map(r => r.find('.src').text())
    expect(badges).toEqual([ENTERED, FROM_FILE, FROM_FILE, FROM_FILE, FROM_FILE, FROM_FILE])
  })
})

describe('QuickPositionIntake — an empty figure can never become a sample number (R2)', () => {
  it('blocks the build, flags the row and shows the message', async () => {
    // The fabrication path: before the fix, a cleared box fell through to the model
    // default (296,155) and still carried a "from file" badge.
    const wrapper = mountConfirm()
    await rows(wrapper).at(0).find('input[type="number"]').setValue('')

    await wrapper.find('.drop-actions button').trigger('click')

    expect(wrapper.emitted('confirmed')).toBeUndefined()
    expect(wrapper.vm.invalidKeys).toEqual(['cash'])
    expect(rows(wrapper).at(0).classes()).toContain('row-invalid')
    expect(wrapper.find('.confirm-error').text()).toBe('report.quickPosition.confirm.incomplete')
  })

  it('clears the block once the figure is supplied, and then builds', async () => {
    const wrapper = mountConfirm()
    const cashInput = () => rows(wrapper).at(0).find('input[type="number"]')

    await cashInput().setValue('')
    await wrapper.find('.drop-actions button').trigger('click')
    expect(wrapper.emitted('confirmed')).toBeUndefined()

    await cashInput().setValue('5000')
    expect(wrapper.find('.confirm-error').exists()).toBe(false)

    await wrapper.find('.drop-actions button').trigger('click')
    expect(wrapper.emitted('confirmed')).toHaveLength(1)
    expect(wrapper.emitted('confirmed')[0][0].figures.cash).toEqual({ value: 5000, source: 'entered' })
  })

  it('does not block on a figure the service-business toggle has hidden', async () => {
    // Stock drops out of the table for a service business — a hidden row must not
    // hold the build hostage over a figure the advisor cannot see or fix.
    const restore = restorePayload()
    restore.figures.stock = { value: null, source: 'entered' }
    const wrapper = mountConfirm(restore)

    wrapper.setData({ serviceBusiness: true })
    await wrapper.vm.$nextTick()
    await wrapper.find('.drop-actions button').trigger('click')

    expect(wrapper.emitted('confirmed')).toHaveLength(1)
  })
})

describe('QuickPositionIntake — stepping back preserves the confirmed payload (R12)', () => {
  it('re-opens with every figure and badge as confirmed, and carries the P&L data forward', async () => {
    const restore = restorePayload()
    restore.figures.fixedAssets = { value: 30000, source: 'entered' }
    const wrapper = mountConfirm(restore)

    const badges = rows(wrapper).wrappers.map(r => r.find('.src').text())
    expect(badges).toEqual([FROM_FILE, FROM_FILE, FROM_FILE, FROM_FILE, FROM_FILE, ENTERED])

    await wrapper.find('.drop-actions button').trigger('click')

    const payload = wrapper.emitted('confirmed')[0][0]
    expect(payload.figures).toEqual(restore.figures)
    // No upload happened this time round — the prior payload's P&L data must survive.
    expect(payload.expenseLines).toEqual([{ label: 'Rent', value: 24000 }])
    expect(payload.incomeTotal).toBe(480000)
    expect(payload.companyName).toBe('Sample Trading Ltd')
  })

  it('emits a deep copy, so later edits cannot mutate what the report already holds', async () => {
    const wrapper = mountConfirm()
    await wrapper.find('.drop-actions button').trigger('click')
    const payload = wrapper.emitted('confirmed')[0][0]

    await rows(wrapper).at(0).find('input[type="number"]').setValue('7')

    expect(payload.figures.cash.value).toBe(1000)
  })
})

describe('QuickPositionIntake — pre-upload file checks (R13)', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = jest.fn()
    global.fetch = fetchMock
  })

  afterEach(() => { delete global.fetch })

  /** Mount on step 1 (the drop zones). */
  function mountDrop () {
    return mountWithBuefy(QuickPositionIntake, { propsData: { step: 1 } })
  }

  it('refuses a wrong file type without uploading anything', async () => {
    const wrapper = mountDrop()
    await wrapper.findAll('.drop-zone').at(0).trigger('drop', {
      dataTransfer: { files: [fakeFile('accounts.pdf', 1024)] }
    })

    expect(wrapper.find('.file-error').text()).toBe('report.fileCheck.wrongType')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses an oversized file without uploading anything', async () => {
    const wrapper = mountDrop()
    await wrapper.findAll('.drop-zone').at(0).trigger('drop', {
      dataTransfer: { files: [fakeFile('balance.xlsx', 6 * 1024 * 1024)] }
    })

    expect(wrapper.find('.file-error').text()).toBe('report.fileCheck.tooBig')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses several files dropped on one zone', async () => {
    const wrapper = mountDrop()
    await wrapper.findAll('.drop-zone').at(0).trigger('drop', {
      dataTransfer: { files: [fakeFile('a.xlsx', 1024), fakeFile('b.xlsx', 1024)] }
    })

    expect(wrapper.find('.file-error').text()).toBe('report.quickPosition.drop.multiDrop')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('accepts a valid file and uploads it', async () => {
    const wrapper = mountDrop()
    // Resolve with a failure body: the upload path is what's under test here, not
    // what the backend returns — a success body would drive proposal-applying too.
    fetchMock.mockResolvedValue({ json: () => Promise.resolve({ success: false, error: { message: 'stop here' } }) })

    await wrapper.findAll('.drop-zone').at(0).trigger('drop', {
      dataTransfer: { files: [fakeFile('balance.xlsx', 1024)] }
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/report/quick-position/intake')
  })
})
