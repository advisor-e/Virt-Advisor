/**
 * Post-processes AI response text to inject tutorial video sentences.
 * The AI picks template names; this function looks up videoMinutes from
 * templates.json and injects the sentence in code — no AI judgement involved.
 *
 * Matches bolded template names (**Template Name**) against the org's template
 * list. For each match with videoMinutes > 0, appends a video sentence after
 * that template's own description content.
 *
 * Key design decisions:
 * - ALL bold tags are used as block boundaries, not just video ones. Without
 *   this, a video sentence for template A would land after template B's content.
 * - Injection point is after the first blank line in the block (end of the
 *   template's own content), not at the end of all following prose. Without
 *   this, sentences land inside unrelated paragraphs that follow a template.
 */

const { getOrgTemplates } = require('./templates')

const VIDEO_PRESENT = /tutorial video|video available/i
const BOLD_RE = /\*\*([^*\n]+)\*\*/g

function injectVideoInfo (responseText, orgTemplateIds) {
  const templates = getOrgTemplates(orgTemplateIds || null)

  // Build lookup: normalised title → minutes (only templates with a video)
  // Normalise strips apostrophes/curly quotes so "Deming's" matches "Demings" etc.
  const normalise = s => s.toLowerCase().trim().replace(/['''`]/g, '')
  const videoMap = new Map()
  for (const t of templates) {
    if (t.videoMinutes > 0) {
      videoMap.set(normalise(t.title), t.videoMinutes)
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
