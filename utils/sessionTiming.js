/**
 * @file A strategy session's run sheet — the clock times worked out from one start time and
 *   the minutes on each concept.
 * @module utils/sessionTiming
 *
 * Item 8.4, slice 3. Screen 7 of `design/mockups/strategy-session-recording.html`, approved for
 * build by Mike on 2026-09-28, modelled on his *Team Workshop Run Sheet*: one typed start, minutes
 * per row, each row starting when the one before finishes. His rulings:
 *   - the time sits on each CONCEPT, and a step is their SUBTOTAL — *"make it fit each concept -
 *     almost like sub totals of time per section"*;
 *   - a BREAK can sit between any two concepts, even mid-step; its minutes run the clock but join
 *     no step's subtotal;
 *   - a "Day 2 starts" row carries that day's own start time.
 *
 * Pure: no Vue, no DOM, no fetch — Build session and Run session read the same arithmetic.
 */

/** A break row's key in a step's `items`. */
export const BREAK_PREFIX = 'break-'

/** A "Day N starts" row's key in a step's `items`. */
export const DAY_PREFIX = 'day-'

const DAY_MINUTES = 24 * 60

/** @param {string} key @returns {boolean} */
export function isBreakKey (key) {
  return typeof key === 'string' && key.indexOf(BREAK_PREFIX) === 0
}

/** @param {string} key @returns {boolean} */
export function isDayKey (key) {
  return typeof key === 'string' && key.indexOf(DAY_PREFIX) === 0
}

/**
 * A fresh key for a break or day row — unique enough within one session's steps.
 * @param {string} prefix - BREAK_PREFIX or DAY_PREFIX
 * @param {function(): number} [random] - injected in tests
 * @returns {string}
 */
export function newRowKey (prefix, random) {
  const r = typeof random === 'function' ? random : Math.random
  return prefix + Math.floor(r() * 0xFFFFFF).toString(16).padStart(6, '0')
}

/**
 * `HH:MM` as minutes past midnight, or null when it is not a clock time.
 * @param {*} clock
 * @returns {number|null}
 */
export function parseClock (clock) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(clock || ''))
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/**
 * Minutes past midnight as the drawing prints a time: `9:20`, or `10:45 am` with the suffix.
 * A session running past midnight wraps rather than printing 25:10.
 *
 * @param {number|null} minutes
 * @param {boolean} [withSuffix]
 * @returns {string} empty when there is no time to print
 */
export function formatClock (minutes, withSuffix) {
  if (typeof minutes !== 'number' || !isFinite(minutes)) { return '' }
  const within = ((Math.round(minutes) % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES
  const h24 = Math.floor(within / 60)
  const mm = String(within % 60).padStart(2, '0')
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return h12 + ':' + mm + (withSuffix ? (h24 < 12 ? ' am' : ' pm') : '')
}

/** A whole number of minutes, never negative; anything else is none. */
function minutesOf (timing, key) {
  const n = timing && timing.minutes ? timing.minutes[key] : undefined
  return Number.isInteger(n) && n > 0 ? n : 0
}

/**
 * Work the whole run sheet out.
 *
 * ⚠ A KEY THAT IS NOT A CARD, A BREAK OR A DAY IS SKIPPED, and takes no time: a concept can be
 * unticked after it was placed, and the step keeps its key until the next save (the step
 * builder's own rule). Counting it would move every later time for a row nobody can see.
 *
 * ⚠ NO START TIME MEANS NO CLOCK TIMES, NOT MIDNIGHT. Minutes and subtotals still add up; the
 * times stay empty until the advisor types a start — a plan starting at 12:00 am because a box
 * was left blank would read as a real plan.
 *
 * @param {object} args
 * @param {Array<{items: string[]}>} args.steps - in the session's order
 * @param {{startsAt: (string|null), minutes: Object<string, number>, days: Object<string, string>}|null} args.timing
 * @param {function(string): boolean} args.isCard - whether a key names a placed, scoped card
 * @returns {{rows: Object<string, {kind: string, minutes: number, start: (number|null),
 *   end: (number|null), day: number}>, steps: Array<{minutes: number, start: (number|null),
 *   end: (number|null)}>, conceptMinutes: number, breakMinutes: number,
 *   finishesAt: (number|null), days: number}}
 */
export function computeTiming (args) {
  const steps = (args && Array.isArray(args.steps)) ? args.steps : []
  const timing = (args && args.timing) || null
  const isCard = (args && typeof args.isCard === 'function') ? args.isCard : () => false

  let clock = parseClock(timing && timing.startsAt)
  let day = 1
  let conceptMinutes = 0
  let breakMinutes = 0
  const rows = {}

  const stepTimes = steps.map((step) => {
    const items = Array.isArray(step && step.items) ? step.items : []
    let subtotal = 0
    let start = null
    let end = null

    items.forEach((key) => {
      if (isDayKey(key)) {
        day += 1
        clock = parseClock(timing && timing.days ? timing.days[key] : null)
        rows[key] = { kind: 'day', minutes: 0, start: clock, end: clock, day }
        return
      }
      const kind = isBreakKey(key) ? 'break' : (isCard(key) ? 'card' : null)
      if (!kind) { return }

      const minutes = minutesOf(timing, key)
      const rowStart = clock
      const rowEnd = clock === null ? null : clock + minutes
      rows[key] = { kind, minutes, start: rowStart, end: rowEnd, day }
      if (kind === 'card') {
        subtotal += minutes
        conceptMinutes += minutes
      } else {
        breakMinutes += minutes
      }
      if (start === null) { start = rowStart }
      end = rowEnd
      clock = rowEnd
    })

    return { minutes: subtotal, start, end }
  })

  return { rows, steps: stepTimes, conceptMinutes, breakMinutes, finishesAt: clock, days: day }
}
