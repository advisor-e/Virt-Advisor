/**
 * The "pages not read" warning for a country depreciation schedule, worded on the screen
 * (item 10.2). The backend sends the page ranges and the document's name; this puts them into
 * the reader's language, so a manager reading the hub in German no longer meets a sentence
 * the backend wrote in English.
 *
 * 🔴 ONE HOME FOR THE SENTENCE — the condition Mike attached to his second ruling on country
 * schedules: *the gap shows WHEREVER THAT TABLE IS USED*, as one sentence rather than several
 * that drift. Shared by the depreciation picker and the schedules list, the two places that
 * showed the backend's own English before; the English is the backend's, word for word.
 *
 * @param {Array<{from: number, to: number}>} ranges - the schedule's `pagesUnread`
 * @param {string} document - the schedule's document name, e.g. 'IR265'
 * @param {Function} t - the component's `$t`
 * @param {Function} tc - the component's `$tc`
 * @returns {string} the warning, or '' when every page was read
 */
export function scheduleUnreadSentence (ranges, document, t, tc) {
  if (!Array.isArray(ranges) || !ranges.length) { return '' }
  const parts = ranges.map(r => (r.from === r.to ? String(r.from) : r.from + '–' + r.to))
  const list = parts.length === 1
    ? parts[0]
    : t('countryRateSchedules.unread.lastPair', { rest: parts.slice(0, -1).join(', '), last: parts[parts.length - 1] })
  const pages = tc('countryRateSchedules.unread.pages', parts.length, { list })
  return t('countryRateSchedules.unread.sentence', { pages, document: document || '' })
}
