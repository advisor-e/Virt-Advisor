/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const VolatilityReport = require('~/components/VolatilityReport.vue').default
const { computeVolatility, DEFAULT_INPUTS } = require('~/server/report/volatilityModel')

/**
 * The Volatility Report screen.
 *
 * Approved artefact: design/mockups/volatility-report.html (wording approved 2026-08-31).
 *
 * The shared frame, banner, stale behaviour and badge are already covered by the five report
 * guards, and the arithmetic by volatilityModel.test.js. What is tested HERE is the wiring
 * only this screen has, and only where it could be wrong without anybody seeing it:
 *
 *   1. The window control resizes the typed months and asks the backend for the new window.
 *      Getting this wrong would measure twelve months while the screen says twenty-four.
 *   2. An emptied input becomes zero, never NaN. One NaN blanks the average, every band and
 *      the dial at once, and the screen would simply go empty.
 *   3. A floored band is not drawn as a line on the chart, because at zero it would sit on
 *      the baseline and assert a boundary that is not real.
 *
 * The NEEDLE'S ANGLE moved to volatilityDial.component.test.js on 2026-09-03, with the dial
 * itself — it is now a shared component, because Mike ruled it onto the Three-Way Forecast's
 * step 3 as well. The guard did not go away; it follows the code it guards.
 *
 * Deliberately NOT tested: labels, headings, CSS classes and the presence of files — a
 * person in UAT sees all of those in five seconds (CLAUDE.md, "What a test must earn").
 * Assertions use i18n KEYS, not English (tests/helpers/mountComponent.js).
 */

/** Mount with the backend answering, and let the first result land. */
async function mountWith (data) {
  global.fetch = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({ success: true, data })
  }))
  const wrapper = mountWithBuefy(VolatilityReport, { propsData: {} })
  for (let i = 0; i < 3; i++) {
    await wrapper.vm.$nextTick()
    await Promise.resolve()
  }
  return wrapper
}

const sample = window => computeVolatility({ sales: DEFAULT_INPUTS.sales, window })

afterEach(() => { delete global.fetch; jest.clearAllMocks() })

describe('Volatility Report screen', () => {
  it('resizes the typed months and asks the backend for the new window', async () => {
    const wrapper = await mountWith(sample(12))
    expect(wrapper.vm.form.sales).toHaveLength(12)

    wrapper.vm.setWindow(24)
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.form.window).toBe(24)
    expect(wrapper.vm.form.sales).toHaveLength(24)
    // Growing keeps the months already on screen as the most recent ones.
    expect(wrapper.vm.form.sales.slice(12)).toEqual(DEFAULT_INPUTS.sales.slice(12))

    wrapper.vm.setWindow(12)
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.form.sales).toHaveLength(12)
    expect(wrapper.vm.form.sales).toEqual(DEFAULT_INPUTS.sales.slice(12))
  })

  it('sends the typed months and the window to the backend', async () => {
    const wrapper = await mountWith(sample(12))
    const req = wrapper.vm.recomputeRequest()
    expect(req.url).toBe('/api/report/volatility')
    expect(req.body.window).toBe(12)
    expect(req.body.sales).toEqual(DEFAULT_INPUTS.sales.slice(12))
  })

  it('turns an emptied box into zero, never NaN', async () => {
    const wrapper = await mountWith(sample(12))
    wrapper.vm.setMonth(0, '')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.form.sales[0]).toBe(0)
    expect(wrapper.vm.form.sales.every(v => Number.isFinite(v))).toBe(true)

    // The sample notice states what is ON SCREEN, so one edit does not clear it — eleven
    // workbook months are still showing. It used to go on the first keystroke, which left
    // eleven demo figures in a client's report with nothing saying so.
    expect(wrapper.vm.isSample).toBe(true)
    for (let i = 1; i < 12; i++) { wrapper.vm.setMonth(i, String(1000 + i)) }
    expect(wrapper.vm.isSample).toBe(false)
  })

  it('draws no chart line for a band the zero floor moved', async () => {
    // At 12 months the third lower band computes to -9,421.65 and is floored to 0. Drawing
    // it would put a labelled "3rd deviation" line on the baseline, asserting a boundary
    // that is not real.
    const wrapper = await mountWith(sample(12))
    const lines = wrapper.vm.chart.bandLines

    expect(lines.filter(l => l.k === 3 && l.side === 'down')).toHaveLength(0)
    expect(lines.filter(l => l.k === 3 && l.side === 'up')).toHaveLength(1)
    // The bands that were not floored keep both edges.
    expect(lines.filter(l => l.k === 1)).toHaveLength(2)
    expect(wrapper.vm.flooredBand.k).toBe(3)
  })

  it('names the months from the chosen start, wrapping past December', async () => {
    // Mike, 2026-08-31: "the advisor enters the name of the month and it fills the
    // remaining months selected thereafter". The wrap is the part worth testing — it is
    // right for most start months and wrong only for the late ones, which is exactly the
    // shape of bug that survives a look at the screen.
    const wrapper = await mountWith(sample(12))

    // The default is September, where the workbook's own series begins.
    expect(wrapper.vm.startMonth).toBe('sep')
    expect(wrapper.vm.monthLabels).toEqual([
      'report.volatility.monthShort.sep', 'report.volatility.monthShort.oct',
      'report.volatility.monthShort.nov', 'report.volatility.monthShort.dec',
      'report.volatility.monthShort.jan', 'report.volatility.monthShort.feb',
      'report.volatility.monthShort.mar', 'report.volatility.monthShort.apr',
      'report.volatility.monthShort.may', 'report.volatility.monthShort.jun',
      'report.volatility.monthShort.jul', 'report.volatility.monthShort.aug'
    ])

    wrapper.setData({ startMonth: 'jan' })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.monthLabels[0]).toBe('report.volatility.monthShort.jan')
    expect(wrapper.vm.monthLabels[11]).toBe('report.volatility.monthShort.dec')

    // Year on Year's header is the SECOND year of a 24-month series, so it indexes past
    // the end of the window and must wrap the same way.
    expect(wrapper.vm.monthLabel(12)).toBe('report.volatility.monthShort.jan')
    expect(wrapper.vm.monthLabel(25)).toBe('report.volatility.monthShort.feb')
  })

  it('does not call the backend when only the month NAME changes', async () => {
    // A label change moves no figure. If startMonth were inside `form`, the deep watcher
    // would queue a recompute on every selection — a request for nothing, and one nobody
    // would ever notice was happening.
    const wrapper = await mountWith(sample(12))
    const before = global.fetch.mock.calls.length

    wrapper.setData({ startMonth: 'mar' })
    await wrapper.vm.$nextTick()
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(global.fetch.mock.calls.length).toBe(before)
    expect(wrapper.vm.monthLabels[0]).toBe('report.volatility.monthShort.mar')
  })

  it('renders nothing rather than crashing before the first result lands', () => {
    global.fetch = jest.fn(() => new Promise(() => {}))
    const wrapper = mountWithBuefy(VolatilityReport, { propsData: {} })
    expect(wrapper.vm.data).toBeNull()
    expect(wrapper.vm.chart.dots).toEqual([])
    expect(wrapper.vm.rangeText).toBe('')
    expect(wrapper.vm.outsideMonths).toEqual([])
  })

  it('survives a month series the chart cannot scale', async () => {
    // All-zero sales give a top of zero. Without a guard every y would be Infinity and the
    // SVG would silently render nothing at all.
    const wrapper = await mountWith(computeVolatility({ sales: new Array(12).fill(0), window: 12 }))
    expect(wrapper.vm.chart.dots).toEqual([])
    expect(wrapper.vm.chart.points).toBe('')
  })
})

/**
 * The accounts upload (item 4.54).
 *
 * Again only the wiring that could be wrong invisibly. The three that matter: the window
 * must never be set wider than the months actually read (that would pad a client's report
 * with workbook sample figures under a "from file" heading); a month the advisor overtypes
 * must stop claiming it came from the file; and restoring a set-aside month must shift the
 * whole window by one rather than splicing a hole into the series.
 */
describe('Volatility Report — the accounts upload', () => {
  /** An intake payload: `n` usable months ending at Nov 2026, plus what was set aside. */
  function intake (n, setAside) {
    const base = 2026 * 12 + 10 - (n - 1) // Nov 2026 back n months
    return {
      files: [{ companyName: 'Kinetic Test Ltd', reportDate: null, monthsRead: 12, monthsComplete: n, range: 'Apr 2025 – Mar 2026', warnings: [] }],
      series: [],
      usable: Array.from({ length: n }, (_, i) => ({ label: 'M' + i, ordinal: base + i, value: 40000 + i * 100 })),
      setAside: setAside || [],
      warnings: []
    }
  }

  it('takes the widest window the complete months can fill, and never wider', async () => {
    const wrapper = await mountWith(sample(12))

    wrapper.vm.applyIntake(intake(24))
    expect(wrapper.vm.form.window).toBe(24)

    wrapper.vm.applyIntake(intake(20))
    expect(wrapper.vm.form.window).toBe(18) // 20 months cannot honestly fill 24

    wrapper.vm.applyIntake(intake(13))
    expect(wrapper.vm.form.window).toBe(12)
  })

  it('fills every measured month from the file and marks it so', async () => {
    const wrapper = await mountWith(sample(12))
    wrapper.vm.applyIntake(intake(12))

    expect(wrapper.vm.form.sales).toEqual(intake(12).usable.map(m => m.value))
    expect(wrapper.vm.sources).toEqual(new Array(12).fill('file'))
    expect(wrapper.vm.fromFileCount).toBe(12)
    expect(wrapper.vm.isSample).toBe(false)
  })

  it('a file that cannot fill the shortest window changes NOTHING', async () => {
    // This test replaces one that asserted the opposite. The old behaviour applied the
    // eight months it had and left four WORKBOOK figures in the other slots with the
    // sample notice switched off — a client report, part demo data, silently. Found by
    // Mike on 2026-08-31 when the screen showed him a £125,463 month he had never seen.
    const wrapper = await mountWith(sample(12))
    const before = wrapper.vm.form.sales.slice()

    wrapper.vm.applyIntake(intake(8))

    expect(wrapper.vm.form.sales).toEqual(before)
    expect(wrapper.vm.fromFileCount).toBe(0)
    expect(wrapper.vm.isSample).toBe(true) // the notice stays up
    expect(wrapper.vm.uploadError).toContain('report.volatility.accounts.short')
  })

  it('THE INVARIANT: a workbook figure is never on screen without the sample notice', async () => {
    const wrapper = await mountWith(sample(12))
    wrapper.vm.applyIntake(intake(12))

    expect(wrapper.vm.isSample).toBe(false)
    // Twelve real months cannot fill 24, and the missing twelve would have to be invented.
    expect(wrapper.vm.windowAllowed(24)).toBe(false)
    expect(wrapper.vm.windowAllowed(18)).toBe(false)

    wrapper.vm.setWindow(24) // refused, not silently padded
    expect(wrapper.vm.form.window).toBe(12)
    expect(wrapper.vm.form.sales).toHaveLength(12)
    expect(wrapper.vm.sources).toEqual(new Array(12).fill('file'))

    // With 24 months from the file it is allowed, and still no workbook figure.
    wrapper.vm.applyIntake(intake(24))
    expect(wrapper.vm.windowAllowed(24)).toBe(true)
    wrapper.vm.setWindow(24)
    expect(wrapper.vm.sources).toEqual(new Array(24).fill('file'))
    expect(wrapper.vm.isSample).toBe(false)
  })

  it('an overtyped month stops crediting the accounts file', async () => {
    const wrapper = await mountWith(sample(12))
    wrapper.vm.applyIntake(intake(12))
    wrapper.vm.setMonth(3, '99999')

    expect(wrapper.vm.sources[3]).toBe('entered')
    expect(wrapper.vm.fromFileCount).toBe(11)
  })

  it('restoring the oldest set-aside month shifts the window by exactly one', async () => {
    const wrapper = await mountWith(sample(12))
    wrapper.vm.applyIntake(intake(12, [
      { label: 'Dec 2026', ordinal: 2026 * 12 + 11, value: 31000, reason: 'partial' },
      { label: 'Jan 2027', ordinal: 2027 * 12, value: 0, reason: 'empty' }
    ]))
    const before = wrapper.vm.form.sales.slice()

    wrapper.vm.restoreSetAside(0, '52000')

    expect(wrapper.vm.form.sales).toHaveLength(12) // still twelve — one in, one out
    expect(wrapper.vm.form.sales[11]).toBe(52000) // the restored month is now the newest
    expect(wrapper.vm.form.sales.slice(0, 11)).toEqual(before.slice(1)) // the oldest dropped
    expect(wrapper.vm.setAside).toHaveLength(1) // and it is no longer set aside
  })

  it('a later set-aside month cannot jump the queue and leave a hole', async () => {
    const wrapper = await mountWith(sample(12))
    wrapper.vm.applyIntake(intake(12, [
      { label: 'Dec 2026', ordinal: 2026 * 12 + 11, value: 31000, reason: 'partial' },
      { label: 'Jan 2027', ordinal: 2027 * 12, value: 0, reason: 'empty' }
    ]))
    const before = wrapper.vm.form.sales.slice()

    wrapper.vm.restoreSetAside(1, '48000') // the SECOND one — December is still missing

    expect(wrapper.vm.form.sales).toEqual(before) // series untouched
    expect(wrapper.vm.setAside).toHaveLength(2)
    expect(wrapper.vm.setAside[1].value).toBe(48000) // the typed figure is kept, just not applied
  })

  it('an intake with no usable months changes no figure', async () => {
    const wrapper = await mountWith(sample(12))
    const before = wrapper.vm.form.sales.slice()
    wrapper.vm.applyIntake(intake(0))

    expect(wrapper.vm.form.sales).toEqual(before)
    expect(wrapper.vm.uploadError).toBe('report.volatility.accounts.noMonths')
  })

  it('reset clears the accounts as well as the figures', async () => {
    const wrapper = await mountWith(sample(12))
    wrapper.vm.applyIntake(intake(12, [{ label: 'Dec 2026', ordinal: 2026 * 12 + 11, value: 0, reason: 'empty' }]))
    wrapper.vm.files = [{ name: 'export.xlsx' }]

    wrapper.vm.resetToSample()

    // Leaving a filename above sample figures would credit that client's accounts for
    // numbers that came from the workbook.
    expect(wrapper.vm.files).toEqual([])
    expect(wrapper.vm.sources).toEqual(new Array(12).fill('sample'))
    expect(wrapper.vm.setAside).toEqual([])
    expect(wrapper.vm.isSample).toBe(true)
  })

  it('the checklist never reads finished while a month is still set aside', async () => {
    const wrapper = await mountWith(sample(12))
    wrapper.vm.files = [{ name: 'export.xlsx' }]
    wrapper.vm.applyIntake(intake(12, [
      { label: 'Dec 2026', ordinal: 2026 * 12 + 11, value: 0, reason: 'empty' }
    ]))

    const state = k => wrapper.vm.steps.find(s => s.key === k).state
    expect(state('uploaded')).toBe('done')
    expect(state('matched')).toBe('done')
    expect(state('checked')).toBe('now') // a month is still waiting to be looked at
    expect(state('review')).toBe('todo')

    wrapper.vm.restoreSetAside(0, '52000')
    expect(state('checked')).toBe('done')
    expect(state('review')).toBe('now')
  })

  /** A fake <input type="file"> change event carrying `names`. */
  function chooseEvent (names) {
    return { target: { files: names.map(n => ({ name: n, size: 1000 })), value: 'x' } }
  }

  it('one box takes both years at once, and a second year added later', async () => {
    const wrapper = await mountWith(sample(12))
    wrapper.vm.uploadAccounts = jest.fn()

    wrapper.vm.onFileChosen(chooseEvent(['a.csv']))
    expect(wrapper.vm.files.map(f => f.name)).toEqual(['a.csv'])

    wrapper.vm.onFileChosen(chooseEvent(['b.xlsx']))
    expect(wrapper.vm.files.map(f => f.name)).toEqual(['a.csv', 'b.xlsx'])
    expect(wrapper.vm.uploadAccounts).toHaveBeenCalledTimes(2)

    wrapper.vm.files = []
    wrapper.vm.onFileChosen(chooseEvent(['a.csv', 'b.xlsx']))
    expect(wrapper.vm.files).toHaveLength(2) // both in a single go
  })

  it('a third file is refused before anything is sent', async () => {
    const wrapper = await mountWith(sample(12))
    wrapper.vm.uploadAccounts = jest.fn()
    wrapper.vm.files = [{ name: 'a.csv' }, { name: 'b.csv' }]

    wrapper.vm.onFileChosen(chooseEvent(['c.csv']))

    expect(wrapper.vm.files).toHaveLength(2) // unchanged
    expect(wrapper.vm.uploadAccounts).not.toHaveBeenCalled()
    expect(wrapper.vm.uploadError).toContain('report.volatility.accounts.tooMany')
  })

  it('removing the last file returns the screen to typed entry', async () => {
    const wrapper = await mountWith(sample(12))
    wrapper.vm.uploadAccounts = jest.fn()
    wrapper.vm.files = [{ name: 'a.csv' }]
    wrapper.vm.applyIntake(intake(12, [{ label: 'Dec 2026', ordinal: 2026 * 12 + 11, value: 0, reason: 'empty' }]))

    wrapper.vm.removeFile(0)

    // Nothing may still claim to have come from a file that is no longer loaded.
    expect(wrapper.vm.files).toEqual([])
    expect(wrapper.vm.sources).toEqual(new Array(12).fill('sample'))
    expect(wrapper.vm.setAside).toEqual([])
    expect(wrapper.vm.fromFileCount).toBe(0)
    expect(wrapper.vm.uploadAccounts).not.toHaveBeenCalled()
  })

  it('removing one of two re-reads the remaining file', async () => {
    const wrapper = await mountWith(sample(12))
    wrapper.vm.uploadAccounts = jest.fn()
    wrapper.vm.files = [{ name: 'a.csv' }, { name: 'b.csv' }]

    wrapper.vm.removeFile(0)

    expect(wrapper.vm.files.map(f => f.name)).toEqual(['b.csv'])
    // The join changes when a file goes, so the series must be rebuilt, not trimmed.
    expect(wrapper.vm.uploadAccounts).toHaveBeenCalledTimes(1)
  })

  it('month labels carry the year once a file supplies one, so a 24-month window is readable', async () => {
    // Without the year every month name appears TWICE in an 18 or 24-month window, three
    // boxes to a row, with nothing telling Sep 2024 from Sep 2025. Mike read a figure
    // against the wrong year on 2026-08-31 and the screen gave him no way to notice.
    const wrapper = await mountWith(sample(12))
    wrapper.vm.applyIntake({
      files: [],
      series: [],
      usable: Array.from({ length: 24 }, (_, i) => ({
        label: 'M', ordinal: 2024 * 12 + 8 + i, value: 1000 + i
      })).map((m, i) => Object.assign(m, {
        label: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'][i % 12] +
          ' ' + (2024 + Math.floor((8 + i) / 12))
      })),
      setAside: [],
      warnings: []
    })

    expect(wrapper.vm.form.window).toBe(24)
    expect(wrapper.vm.startYear).toBe(2024)
    expect(wrapper.vm.monthLabel(0)).toBe('report.volatility.monthShort.sep 24')
    expect(wrapper.vm.monthLabel(12)).toBe('report.volatility.monthShort.sep 25') // the second Sep
    expect(wrapper.vm.monthLabel(13)).toBe('report.volatility.monthShort.oct 25')

    // Typed entry has no year to show, so it keeps the bare month rather than inventing one.
    wrapper.vm.resetToSample()
    expect(wrapper.vm.startYear).toBeNull()
    expect(wrapper.vm.monthLabel(0)).toBe('report.volatility.monthShort.sep')
  })

  it('the Starting month picker is locked while the file supplies the dates', async () => {
    // The picker RENAMES the boxes without moving the figures. While the months come from
    // a file, a change here can only make the labels disagree with the data beside them —
    // and nothing on screen shows the disagreement. Mike hit this on 2026-08-31: his
    // export's period opens on 20 August, so setting the picker to August looked correct,
    // and it shifted all 24 labels back a month. £21,000 read as September, not October.
    const wrapper = await mountWith(sample(12))
    expect(wrapper.vm.datesFromFile).toBe(false) // typed entry keeps the picker

    wrapper.vm.applyIntake({
      files: [],
      series: [],
      usable: Array.from({ length: 12 }, (_, i) => ({
        label: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'][i] +
          ' ' + (i < 4 ? 2024 : 2025),
        ordinal: 2024 * 12 + 8 + i,
        value: 1000 + i
      })),
      setAside: [],
      warnings: []
    })
    expect(wrapper.vm.datesFromFile).toBe(true)

    // …and it unlocks again the moment the figures are no longer the file's.
    wrapper.vm.resetToSample()
    expect(wrapper.vm.datesFromFile).toBe(false)
  })

  it('the checklist stays hidden on the typed path', async () => {
    const wrapper = await mountWith(sample(12))
    expect(wrapper.vm.hasAccountsFile).toBe(false)
  })

  it('narrowing the window keeps provenance aligned with the months it keeps', async () => {
    const wrapper = await mountWith(sample(12))
    wrapper.vm.applyIntake(intake(24))
    wrapper.vm.setMonth(0, '1') // the oldest month becomes hand-entered
    expect(wrapper.vm.sources[0]).toBe('entered')

    wrapper.vm.setWindow(12) // drops the oldest twelve, including that one

    expect(wrapper.vm.sources).toHaveLength(12)
    expect(wrapper.vm.sources).toEqual(new Array(12).fill('file'))
  })
})
