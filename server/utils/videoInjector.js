/**
 * Post-processes AI response text to inject tutorial video sentences.
 * The AI picks template names; this function looks up the video length from
 * templates.json and injects the sentence in code — no AI judgement involved.
 *
 * Matches bolded template names (**Template Name**) against the org's template
 * list. For each match carrying a tutorial video, appends a video sentence
 * after that template's own description content.
 *
 * Key design decisions:
 * - ALL bold tags are used as block boundaries, not just video ones. Without
 *   this, a video sentence for template A would land after template B's content.
 * - Injection point is after the first blank line in the block (end of the
 *   template's own content), not at the end of all following prose. Without
 *   this, sentences land inside unrelated paragraphs that follow a template.
 * - The length is read from `cpd.watchedVideo` on the template record — the
 *   authored field in the master export, and the same one cpdCatalogue reads.
 *   It used to read a `videoMinutes` field that `scripts/sync-video-minutes.js`
 *   had to copy across by hand after every export swap. That script was not
 *   re-run after the 19 May 2026 swap, so the copy disappeared while the
 *   original stayed, and the sentence was DEAD for ten weeks across 83
 *   templates with no symptom on screen. Reading the authored field directly
 *   removes the manual step, so it cannot rot again — the sync script is
 *   deleted, and nothing else ever read `videoMinutes`.
 */

const { getOrgTemplates } = require('./templates')

const VIDEO_PRESENT = /tutorial video|video available/i
const BOLD_RE = /\*\*([^*\n]+)\*\*/g

/** An allowance below a minute is not worth a sentence. Mirrors cpdCatalogue. */
const MIN_MINUTES = 1
/** A day. Nothing real approaches it; it bounds a corrupt export. */
const MAX_MINUTES = 1440

/**
 * Whole minutes of tutorial video on one template record, or 0 when there is none.
 *
 * Rounded, because the export carries fractional lengths (15.2, 24.23) and
 * "a 15.2-minute tutorial video" does not read as English. Rounding here matches
 * `cpdCatalogue.activityMinutes`, so the advice and the advisor's CPD record state
 * the same number for the same video rather than differing by a decimal.
 *
 * @param {object} template - a record from the template library.
 * @returns {number} whole minutes, or 0 when no video is claimable.
 */
function videoMinutesOf (template) {
  const cpd = template && template.cpd
  // A hidden record is not offered to an advisor, so it gets no sentence.
  if (!cpd || cpd.isHidden === true) { return 0 }
  const raw = cpd.watchedVideo
  if (typeof raw !== 'number' || !Number.isFinite(raw)) { return 0 }
  const whole = Math.round(raw)
  if (whole < MIN_MINUTES || whole > MAX_MINUTES) { return 0 }
  return whole
}

function injectVideoInfo (responseText, orgTemplateIds) {
  const templates = getOrgTemplates(orgTemplateIds || null)

  // Build lookup: normalised title → minutes (only templates with a video)
  // Normalise strips apostrophes/curly quotes so "Deming's" matches "Demings" etc.
  const normalise = s => s.toLowerCase().trim().replace(/['''`]/g, '')
  const videoMap = new Map()
  for (const t of templates) {
    const minutes = videoMinutesOf(t)
    if (minutes > 0) {
      videoMap.set(normalise(t.title), minutes)
    }
  }
  if (videoMap.size === 0) { return responseText }

  // Collect ALL bold occurrences — even non-video ones serve as block boundaries
  const allBolds = []
  let m
  BOLD_RE.lastIndex = 0
  while ((m = BOLD_RE.exec(responseText)) !== null) {
    const title = m[1].trim()
    const mins = videoMap.get(normalise(title)) || 0
    allBolds.push({ index: m.index, end: m.index + m[0].length, mins })
  }
  if (allBolds.length === 0) { return responseText }

  // Process right-to-left so earlier insertions don't shift later offsets
  let result = responseText
  for (let i = allBolds.length - 1; i >= 0; i--) {
    const bold = allBolds[i]
    if (!bold.mins) { continue } // no video — skip, but this tag served as a boundary

    // Block ends at the next bold tag (ANY bold, not just video ones)
    const blockEnd = i + 1 < allBolds.length ? allBolds[i + 1].index : responseText.length
    const block = responseText.slice(bold.end, blockEnd)

    if (VIDEO_PRESENT.test(block)) { continue } // already present

    // Inject after the template's OWN content — the first blank line in the block.
    // This stops the sentence landing inside unrelated prose that follows the template.
    const firstBlankIdx = block.indexOf('\n\n')
    const ownContent = firstBlankIdx !== -1 ? block.slice(0, firstBlankIdx) : block
    const trimmed = ownContent.trimEnd()
    if (!trimmed) { continue }

    const insertAt = bold.end + trimmed.length
    const sentence = `\nA ${bold.mins}-minute tutorial video is available in Advisor-e to help you prepare.`
    result = result.slice(0, insertAt) + sentence + result.slice(insertAt)
  }

  // Bold the standard template field labels wherever they appear at the start of a line
  result = result
    .replace(/^Why this fits your client:/gm, '**Why this fits your client:**')
    .replace(/^Why this suits you as the advisor:/gm, '**Why this suits you as the advisor:**')
    .replace(/^How to approach it:/gm, '**How to approach it:**')

  return result
}

module.exports = { injectVideoInfo }
