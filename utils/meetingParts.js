/**
 * A meeting recorded in 20-minute parts, as the recorder's parts row shows it — item 8.4,
 * `design/mockups/meeting-review-long-recording.html`, approved by Mike 2026-10-01.
 *
 * 🔴 EVERY TIME IS ON THE MEETING'S OWN CLOCK, counted from when part 1 started, so "Part 2 ·
 * 20:00–40:00" names the same minutes the joined transcript and the reports use
 * (`server/utils/meetingSegments.js` joinTranscripts shifts each part by the same origin).
 *
 * Pure: it reads the server's view of the segments (`publicSegments`) and touches nothing.
 */

/** A part is shown only once there is a second one (Decision D). */
const MIN_PARTS_SHOWN = 2

/**
 * mm:ss, minutes unbounded — "67:12" an hour in, as the recorder's own clock prints it.
 * @param {number} seconds
 * @returns {string}
 */
export function clockOf (seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0')
}

/**
 * Each part with where it has got to and the minutes it covers.
 *
 * @param {Array<{n: number, state: string, startedAt: (string|null), closedAt: (string|null)}>} segments
 * @returns {Array<{n: number, status: ('recording'|'working'|'ready'|'failed'), from: string,
 *   to: string}>} - `to` is '' while a part is still recording; empty below two parts
 */
export function describeParts (segments) {
  const rows = (Array.isArray(segments) ? segments : []).slice().sort((a, b) => a.n - b.n)
  if (rows.length < MIN_PARTS_SHOWN) { return [] }
  const origin = Date.parse(rows[0].startedAt)
  const at = (iso) => {
    const t = Date.parse(iso)
    return isFinite(t) && isFinite(origin) ? clockOf((t - origin) / 1000) : ''
  }
  return rows.map(s => ({
    n: s.n,
    status: statusOf(s.state),
    from: at(s.startedAt),
    to: s.closedAt ? at(s.closedAt) : ''
  }))
}

/**
 * The parts that could not be turned into text — what the recorder warns about during the
 * meeting and names as missing afterwards (Decision E). Shown even for a single part.
 *
 * @param {Array<object>} segments
 * @returns {Array<{n: number, from: string, to: string}>}
 */
export function failedParts (segments) {
  const rows = (Array.isArray(segments) ? segments : []).slice().sort((a, b) => a.n - b.n)
  const origin = rows.length ? Date.parse(rows[0].startedAt) : NaN
  const at = (iso) => {
    const t = Date.parse(iso)
    return isFinite(t) && isFinite(origin) ? clockOf((t - origin) / 1000) : ''
  }
  return rows
    .filter(s => s.state === 'failed')
    .map(s => ({ n: s.n, from: at(s.startedAt), to: at(s.closedAt) }))
}

/** The four things a part can be doing, from the server's segment states. */
function statusOf (state) {
  if (state === 'recording') { return 'recording' }
  if (state === 'failed') { return 'failed' }
  if (state === 'done' || state === 'empty') { return 'ready' }
  return 'working'
}
