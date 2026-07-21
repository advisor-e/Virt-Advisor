/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const EbitdaDcfIntake = require('~/components/EbitdaDcfIntake.vue').default

/**
 * Component tests for the EBITDA & DCF intake — the R11/R13/R14/R23 cases logged as
 * TEST-GAP in design/ACTIONS.md.
 *
 * This screen carries more risk than the Quick Position intake for one reason: it is a
 * 24-row × up-to-5-year grid, so a single cleared cell is easy to miss on screen and
 * lands in a valuation the advisor presents as a number. R23 exists because that cell
 * used to fall through to a sample default on the backend.
 */

const FROM_FILE = 'report.ebitdaDcf.confirm.fromFile'
const ENTERED = 'report.ebitdaDcf.confirm.entered'

/** Build a File whose reported size can exceed what we want to allocate. */
function fakeFile (name, sizeBytes) {
  const file = new File(['x'], name)
  Object.defineProperty(file, 'size', { value: sizeBytes || 1024 })
  return file
}

/**
 * A confirmed payload as the report screen hands it back. Only the rows the exports can
 * seed carry `file`; everything else is the advisor's, exactly as the intake builds it.
 * @param {number} years - how many year columns.
 */
function restorePayload (years) {
  const n = years || 3
  const cell = source => Array.from({ length: n }, (_, i) => ({ value: (i + 1) * 1000, source }))
  return {
    years: Array.from({ length: n }, (_, i) => 2021 + i),
    figures: {
      sales: cell('file'),
      costOfSales: cell('file'),
      operatingExpenses: cell('file'),
      otherIncome: cell('entered'),
      interestReceived: cell('entered'),
      dividendsReceived: cell('entered'),
      badDebtsRecovered: cell('entered'),
      managementFees: cell('entered'),
      loanInterestPaid: cell('file'),
      consentCosts: cell('entered'),
      extraordinaryItems: cell('entered'),
      establishmentCosts: cell('entered'),
      shareholderSalaries: cell('entered'),
      insuranceRetirement: cell('entered'),
      ownersVehicles: cell('entered'),
      leaseholdImprovements: cell('entered'),
      assetUpgrades: cell('entered'),
      other3: cell('entered'),
      other4: cell('entered'),
      other5: cell('entered'),
      fmSalaries: cell('entered'),
      fmInsuranceRetirement: cell('entered'),
      fmVehicles: cell('entered'),
      fmFringeBenefits: cell('entered')
    },
    companyName: 'Sample Trading Ltd'
  }
}

/** Mount on step 2 (the confirm grid). */
function mountConfirm (restore) {
  return mountWithBuefy(EbitdaDcfIntake, {
    propsData: { step: 2, restore: restore || restorePayload() }
  })
}

/** Mount on step 1 (the drop zone). */
function mountDrop () {
  return mountWithBuefy(EbitdaDcfIntake, { propsData: { step: 1 } })
}

/** The badge for a named row — the grid has no ids, so find by its row label. */
function badgeForRow (wrapper, row) {
  const label = 'report.ebitdaDcf.confirm.row.' + row
  const tr = wrapper.findAll('tbody tr').wrappers
    .find(r => r.find('td').exists() && r.find('td').text() === label)
  return tr.find('.src')
}

/** The input for a named row's first display column (the LATEST year — columns reverse). */
function firstCellInput (wrapper, row) {
  const label = 'report.ebitdaDcf.confirm.row.' + row
  const tr = wrapper.findAll('tbody tr').wrappers
    .find(r => r.find('td').exists() && r.find('td').text() === label)
  return tr.findAll('input[type="number"]').at(0)
}

describe('EbitdaDcfIntake — row-level provenance (R11)', () => {
  it('tags a row "from file" while any year in it came from an export', () => {
    const wrapper = mountConfirm()
    expect(badgeForRow(wrapper, 'sales').text()).toBe(FROM_FILE)
    expect(badgeForRow(wrapper, 'sales').classes()).toContain('src-file')
    expect(badgeForRow(wrapper, 'shareholderSalaries').text()).toBe(ENTERED)
  })

  it('keeps the row "from file" while OTHER years in it are still file figures', async () => {
    // The row rule is deliberately per-row, not per-cell: editing one year of a
    // three-year row must not disown the two years that did come from the export.
    const wrapper = mountConfirm()
    await firstCellInput(wrapper, 'sales').setValue('123')
    expect(badgeForRow(wrapper, 'sales').text()).toBe(FROM_FILE)
  })

  it('flips the row to "entered" once every year in it has been edited', async () => {
    const wrapper = mountConfirm(restorePayload(2))
    const label = 'report.ebitdaDcf.confirm.row.sales'
    const tr = wrapper.findAll('tbody tr').wrappers
      .find(r => r.find('td').exists() && r.find('td').text() === label)

    const inputs = tr.findAll('input[type="number"]')
    await inputs.at(0).setValue('11')
    await inputs.at(1).setValue('22')

    expect(badgeForRow(wrapper, 'sales').text()).toBe(ENTERED)
  })

  it('columns run latest-year-first, so an edit lands on the year the advisor clicked', async () => {
    // displayIndex() reverses the columns. If it were wrong, a figure typed under 2023
    // would be stored against 2021 — silently, and only visible in the valuation.
    const wrapper = mountConfirm(restorePayload(3)) // years 2021, 2022, 2023
    await firstCellInput(wrapper, 'sales').setValue('999')

    expect(wrapper.vm.figures.sales[2].value).toBe(999) // oldest-first array, last = 2023
    expect(wrapper.vm.figures.sales[0].value).toBe(1000) // 2021 untouched
  })
})

describe('EbitdaDcfIntake — a cleared cell can never become a sample number (R23)', () => {
  it('blocks the build, flags that one cell and shows the message', async () => {
    const wrapper = mountConfirm(restorePayload(3))
    await firstCellInput(wrapper, 'sales').setValue('')

    await wrapper.find('.drop-actions button').trigger('click')

    expect(wrapper.emitted('confirmed')).toBeUndefined()
    expect(wrapper.vm.invalidCells).toEqual(['sales:2'])
    expect(wrapper.find('.confirm-error').text()).toBe('report.ebitdaDcf.confirm.incomplete')
    expect(wrapper.findAll('.cell-invalid')).toHaveLength(1)
  })

  it('clears the block once the cell is supplied, and then builds', async () => {
    const wrapper = mountConfirm(restorePayload(3))
    await firstCellInput(wrapper, 'sales').setValue('')
    await wrapper.find('.drop-actions button').trigger('click')
    expect(wrapper.emitted('confirmed')).toBeUndefined()

    await firstCellInput(wrapper, 'sales').setValue('4000')
    expect(wrapper.find('.confirm-error').exists()).toBe(false)

    await wrapper.find('.drop-actions button').trigger('click')
    expect(wrapper.emitted('confirmed')).toHaveLength(1)
  })

  it('emits exactly as many cells per row as there are years — never a padded sample slot', async () => {
    // R23 residual: the grid must send what it shows. A 3-year seed that emitted 5
    // cells would push two invisible sample figures into the valuation.
    const wrapper = mountConfirm(restorePayload(3))
    await wrapper.find('.drop-actions button').trigger('click')

    const payload = wrapper.emitted('confirmed')[0][0]
    expect(payload.years).toHaveLength(3)
    Object.keys(payload.figures).forEach((row) => {
      expect(payload.figures[row]).toHaveLength(3)
    })
    expect(payload.companyName).toBe('Sample Trading Ltd')
  })
})

describe('EbitdaDcfIntake — the "minimum two years" promise (R23 residual)', () => {
  it('leaves the Read button disabled with one file staged', async () => {
    const wrapper = mountDrop()
    await wrapper.find('.drop-zone').trigger('drop', {
      dataTransfer: { files: [fakeFile('2024.xlsx')] }
    })

    expect(wrapper.vm.staged).toHaveLength(1)
    expect(wrapper.find('.drop-actions button').attributes('disabled')).toBeDefined()
  })

  it('enables it at two', async () => {
    const wrapper = mountDrop()
    await wrapper.find('.drop-zone').trigger('drop', {
      dataTransfer: { files: [fakeFile('2023.xlsx'), fakeFile('2024.xlsx')] }
    })

    expect(wrapper.find('.drop-actions button').attributes('disabled')).toBeUndefined()
  })
})

describe('EbitdaDcfIntake — pre-upload file checks (R13/R14)', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = jest.fn()
    global.fetch = fetchMock
  })

  afterEach(() => { delete global.fetch })

  it('refuses a wrong file type and stages nothing', async () => {
    const wrapper = mountDrop()
    await wrapper.find('.drop-zone').trigger('drop', {
      dataTransfer: { files: [fakeFile('accounts.pdf')] }
    })

    expect(wrapper.find('.file-error').text()).toBe('report.fileCheck.wrongType')
    expect(wrapper.vm.staged).toHaveLength(0)
  })

  it('stages the good files from a mixed drop and names the problem', async () => {
    const wrapper = mountDrop()
    await wrapper.find('.drop-zone').trigger('drop', {
      dataTransfer: { files: [fakeFile('2023.xlsx'), fakeFile('notes.pdf'), fakeFile('2024.csv')] }
    })

    expect(wrapper.vm.staged.map(f => f.name)).toEqual(['2023.xlsx', '2024.csv'])
    expect(wrapper.find('.file-error').text()).toBe('report.fileCheck.wrongType')
  })

  it('caps the batch at five files', async () => {
    const wrapper = mountDrop()
    const six = Array.from({ length: 6 }, (_, i) => fakeFile(`y${i}.xlsx`))
    await wrapper.find('.drop-zone').trigger('drop', { dataTransfer: { files: six } })

    expect(wrapper.vm.staged).toHaveLength(5)
    expect(wrapper.find('.file-error').text()).toBe('report.ebitdaDcf.drop.tooMany')
  })

  it('refuses a batch over 5 MB IN TOTAL before uploading (R14 — the cap is per request)', async () => {
    const wrapper = mountDrop()
    // Each file is under the individual limit; together they exceed the request cap.
    await wrapper.find('.drop-zone').trigger('drop', {
      dataTransfer: { files: [fakeFile('a.xlsx', 3 * 1024 * 1024), fakeFile('b.xlsx', 3 * 1024 * 1024)] }
    })
    expect(wrapper.vm.staged).toHaveLength(2)

    await wrapper.find('.drop-actions button').trigger('click')

    expect(wrapper.find('.file-error').text()).toBe('report.fileCheck.tooBigTotal')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uploads a valid batch as ONE request to the intake route', async () => {
    const wrapper = mountDrop()
    fetchMock.mockResolvedValue({ json: () => Promise.resolve({ success: false, error: { message: 'stop here' } }) })

    await wrapper.find('.drop-zone').trigger('drop', {
      dataTransfer: { files: [fakeFile('2023.xlsx'), fakeFile('2024.xlsx')] }
    })
    await wrapper.find('.drop-actions button').trigger('click')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/report/ebitda-dcf/intake')
  })

  it('removing a staged file drops it back below the two-year minimum', async () => {
    const wrapper = mountDrop()
    await wrapper.find('.drop-zone').trigger('drop', {
      dataTransfer: { files: [fakeFile('2023.xlsx'), fakeFile('2024.xlsx')] }
    })
    expect(wrapper.find('.drop-actions button').attributes('disabled')).toBeUndefined()

    await wrapper.findAll('.staged .remove').at(0).trigger('click')

    expect(wrapper.vm.staged).toHaveLength(1)
    expect(wrapper.find('.drop-actions button').attributes('disabled')).toBeDefined()
  })
})

describe('EbitdaDcfIntake — year assignment when the files could not state a year', () => {
  /** Drive the component to the years step with backend results that carry no year. */
  function mountYears (files) {
    const wrapper = mountDrop()
    wrapper.setData({ phase: 'years', parsedFiles: files })
    return wrapper
  }

  it('refuses to continue while a year is missing', async () => {
    const wrapper = mountYears([
      { companyName: 'A', reportDate: '31 March 2024', year: 2024, figures: {} },
      { companyName: 'A', reportDate: null, year: null, figures: {} }
    ])
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.yearsResolved).toBe(false)
    expect(wrapper.find('.drop-actions button').attributes('disabled')).toBeDefined()
  })

  it('refuses two files claiming the SAME year', async () => {
    // Duplicates would collapse two years of trading into one column and quietly
    // change every growth figure in the valuation.
    const wrapper = mountYears([
      { companyName: 'A', reportDate: null, year: 2024, figures: {} },
      { companyName: 'A', reportDate: null, year: 2024, figures: {} }
    ])
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.yearsResolved).toBe(false)
    expect(wrapper.find('.drop-actions button').attributes('disabled')).toBeDefined()
  })

  it('accepts distinct years and orders the columns oldest-first', async () => {
    const wrapper = mountYears([
      { companyName: 'A', reportDate: null, year: 2024, figures: { sales: { value: 500 } } },
      { companyName: 'A', reportDate: null, year: 2022, figures: { sales: { value: 100 } } }
    ])
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.yearsResolved).toBe(true)

    await wrapper.find('.drop-actions button').trigger('click')

    expect(wrapper.vm.years).toEqual([2022, 2024])
    expect(wrapper.vm.figures.sales[0].value).toBe(100)
    expect(wrapper.vm.figures.sales[0].source).toBe('file')
    expect(wrapper.vm.figures.sales[1].value).toBe(500)
    expect(wrapper.emitted('step')).toEqual([[2]])
  })
})
