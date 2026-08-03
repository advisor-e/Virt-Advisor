'use strict'

/**
 * courseSliceCopy — the words a sliced course is described with.
 *
 * `courseEffort.planSessions` deliberately returns STRUCTURE and no wording:
 * activity, part, parts, minutes. Something still has to turn that into the
 * sentence an advisor reads, and this is the one place it happens.
 *
 * WHY THIS IS ON THE BACKEND rather than in the screen, where the slicer's own
 * note says phrasing belongs. The sliced outline is SAVED — a course is stored
 * with its session titles, re-read months later, copied to a teammate when the
 * course is shared, and fed to the tutor prompt as `sessionContext`. If the
 * screen composed the titles, the saved record would hold none, and the tutor
 * would be told "Session 3" with no idea it is running part 2 of 3 of a
 * reading. Composing once, here, means the advisor and the tutor are looking at
 * the same words.
 *
 * WHY NONE OF IT IS GENERATED. Every string below is either fixed English
 * written for this file, or content authored in the master export and passed
 * through untouched (the template's own objective). The AI chooses the material
 * and nothing else; it does not name the sessions, and it does not say what
 * they are for.
 *
 * The wording here is the wording in design/COURSE-SLICED-SESSION-WORDING.md
 * and design/mockups/sliced-course-outline.html. Those two files are what Mike
 * approved — change them together with this one, never one alone.
 */

const { templateEffort, indexByTitle, SOURCE_DEFAULT } = require('./courseEffort')

/**
 * What each activity is called at the front of a session title (D1).
 * Instructions rather than categories — Mike's own words in the approved model.
 * 'model' is a revenue/feasibility model, which has no authored split and so is
 * one indivisible block of work rather than watch/read/rehearse (D3).
 */
const ACTIVITY_LABEL = {
  video: 'Watch',
  reading: 'Read',
  rehearsal: 'Rehearse',
  model: 'Work through'
}

/**
 * The line underneath the title (D4) — what the session actually asks for.
 * A part after the first says so, because "picking up where you left off" is
 * the honest description of a split reading: the app is not claiming to know
 * where the document's own sections begin and end.
 */
const ACTIVITY_FOCUS = {
  video: 'Watch the tutorial video for this template.',
  reading: 'Read through the template.',
  rehearsal: 'Rehearse the template with a colleague.',
  model: 'Work through the model with your own figures.'
}

const ACTIVITY_FOCUS_STEM = {
  video: 'Watch the tutorial video',
  reading: 'Read through the template',
  rehearsal: 'Rehearse the template with a colleague',
  model: 'Work through the model with your own figures'
}

/**
 * A session's title: `Read: E.O.Y Meeting (part 2 of 3)`.
 *
 * The part suffix appears only on material that was actually split — a
 * 12-minute video that fits whole is not labelled "part 1 of 1".
 *
 * @param {{resource: string, activity: string, part: number, parts: number}} slice
 * @returns {string}
 */
function sliceTitle (slice) {
  const label = ACTIVITY_LABEL[slice.activity] || 'Work through'
  const suffix = slice.parts > 1 ? ` (part ${slice.part} of ${slice.parts})` : ''
  return `${label}: ${slice.resource}${suffix}`
}

/**
 * A session's focus line.
 *
 * @param {{activity: string, part: number, parts: number}} slice
 * @returns {string}
 */
function sliceFocus (slice) {
  const whole = ACTIVITY_FOCUS[slice.activity] || ACTIVITY_FOCUS.model
  if (slice.parts <= 1 || slice.part === 1) { return whole }
  const stem = ACTIVITY_FOCUS_STEM[slice.activity] || ACTIVITY_FOCUS_STEM.model
  return `${stem} — part ${slice.part} of ${slice.parts}, picking up where you left off.`
}

/**
 * Whole minutes as an advisor would say them: "45 minutes", "1 hour",
 * "1 hour 10 minutes". Spelled out rather than "1h 10m" because these strings
 * appear inside sentences the AI streams, not in a badge.
 *
 * @param {number} mins
 * @returns {string} '' when there is nothing to say
 */
function spellMinutes (mins) {
  if (!mins || !Number.isFinite(mins) || mins <= 0) { return '' }
  const hours = Math.floor(mins / 60)
  const rest = Math.round(mins % 60)
  const hourPart = hours ? `${hours} hour${hours > 1 ? 's' : ''}` : ''
  const minPart = rest ? `${rest} minute${rest > 1 ? 's' : ''}` : ''
  return [hourPart, minPart].filter(Boolean).join(' ')
}

/** "15–20 minutes", or "30 minutes" when both ends are the same. */
function spellBudget (budget) {
  if (!budget) { return '' }
  return budget.min === budget.max
    ? `${budget.min} minutes`
    : `${budget.min}–${budget.max} minutes`
}

/** "6 sessions", or "4–6 sessions" when they gave a range. */
function spellCount (count) {
  if (!count) { return '' }
  if (count.min === count.max) {
    return `${count.min} session${count.min > 1 ? 's' : ''}`
  }
  return `${count.min}–${count.max} sessions`
}

/**
 * Name → https page link, gathered from every session of the grounded outline.
 *
 * A sliced session holds one resource, and its link has to come with it (CB-25)
 * or the advisor loses the click-through the AI's grouping gave them.
 *
 * @param {object} outline - a grounded outline.
 * @returns {Object<string, string>}
 */
function resourceLinkMap (outline) {
  const map = {}
  for (const s of ((outline && outline.sessions) || [])) {
    const links = s && s.resourceLinks
    if (!links || typeof links !== 'object') { continue }
    for (const name of Object.keys(links)) {
      if (typeof links[name] === 'string' && !map[name]) { map[name] = links[name] }
    }
  }
  return map
}

/**
 * Turn a plan into the outline the screen renders, the store saves and the
 * tutor is briefed from.
 *
 * The AI's session grouping, titles, focus lines and objectives are all gone by
 * this point — it chose the curriculum, not the timetable. What survives from
 * its reply is the course title, the topic, the intensity and the material.
 *
 * @param {object} base - the grounded, validated outline the AI produced.
 * @param {{sessions: Array<object>, totalMinutes: number, unknown: string[]}} plan
 *   - the output of `planSessions`.
 * @param {Array<object>|Map<string, object>} templates - the firm's templates.
 * @param {{min: number, max: number}} budget - the length it was cut to.
 * @returns {object} an outline in the same shape the rest of the app already
 *   handles, with `slice` added per session and `sessionBudget` on the course.
 */
function buildSlicedOutline (base, plan, templates, budget) {
  const index = indexByTitle(templates)
  const links = resourceLinkMap(base)
  const objectiveOf = new Map()

  const estimatedOf = new Map()

  const sessions = plan.sessions.map((slice, i) => {
    if (!objectiveOf.has(slice.resource)) {
      const effort = templateEffort(slice.resource, index)
      objectiveOf.set(slice.resource, effort.objective || '')
      // Costed by the standard allowance rather than a published time, so the
      // screen can say the length is an estimate. An allowance shown as though
      // it were authored is the same defect as the AI's echoed 30 minutes.
      estimatedOf.set(slice.resource, effort.source === SOURCE_DEFAULT)
    }
    const objective = objectiveOf.get(slice.resource)
    const session = {
      id: i + 1,
      title: sliceTitle(slice),
      focus: sliceFocus(slice),
      // The template's own authored line, carried on every session of that
      // template: the screen shows it once, the tutor is told it every time.
      objectives: objective ? [objective] : [],
      resources: [slice.resource],
      estimatedMinutes: slice.minutes,
      // Shaped exactly like `sessionEffort` so every existing reader of a
      // session's length keeps working, sliced course or not.
      sessionEffort: {
        minutes: slice.minutes,
        video: slice.activity === 'video' ? slice.minutes : 0,
        reading: slice.activity === 'reading' ? slice.minutes : 0,
        rehearsal: slice.activity === 'rehearsal' ? slice.minutes : 0,
        modelMinutes: slice.activity === 'model' ? slice.minutes : 0,
        unknown: []
      },
      slice: {
        resource: slice.resource,
        activity: slice.activity,
        part: slice.part,
        parts: slice.parts
      }
    }
    if (links[slice.resource]) { session.resourceLinks = { [slice.resource]: links[slice.resource] } }
    if (estimatedOf.get(slice.resource)) { session.estimatedTime = true }
    return session
  })

  const outline = {
    ...base,
    sessions,
    totalSessions: sessions.length,
    sessionBudget: { min: budget.min, max: budget.max }
  }
  // Material the export never timed cannot be placed in a timetable at all. It
  // is named on screen (D8) rather than dropped in silence or counted as zero.
  if (plan.unknown.length) { outline.unknownResources = plan.unknown.slice() }
  return outline
}

/**
 * The two choices, worded for the drop-tab the advisor picks from.
 *
 * WHY A DROP-TAB AND NOT A TYPED ANSWER. This app's own design rule
 * (design/virt-advisor-system-design.md) puts a choice between defined options
 * on a constrained selector — "advisor picks from defined options, no
 * interpretation needed" — and names Session Length as one of them. A typed
 * answer has to be parsed, and the parsing is where the app either guesses or
 * nags. Picking removes the failure mode instead of handling it.
 *
 * Each option carries the BUDGET that builds it, so honouring the answer is a
 * re-slice at a length already proven to produce the plan named on the label.
 *
 * @param {object} options - the return of `courseEffort.fitOptions`.
 * @returns {Array<{id: string, label: string, sessions: number,
 *   budget: {min: number, max: number}}>} both options, always — an advisor
 *   offered one option has not been asked anything.
 */
function fitChoiceOptions (options) {
  const keepLength = {
    id: 'keep-length',
    // Mike's approved wording, unchanged: "Keep your session length — 15–20
    // minutes each, and the course becomes 11 sessions".
    label: `Keep your session length — ${spellBudget(options.budget)} each, and the course becomes ${options.keepLength.sessions} sessions`,
    sessions: options.keepLength.sessions,
    budget: { min: options.budget.min, max: options.budget.max }
  }

  // The second option follows the direction the plan actually missed in. It
  // used to assume the alternative was always a SHORTER course, and so told
  // Mike that seven sessions was "as short as possible" beside an option of
  // four — the plan had too FEW sessions for what he asked, not too many.
  const alt = options.keepCount
  let altLabel
  if (alt.reachable) {
    altLabel = `Keep your ${options.target} sessions — each one up to ${spellMinutes(alt.longestMinutes)}`
  } else if (options.direction === 'fewer') {
    altLabel = `Keep the course as short as possible — ${alt.sessions} sessions, the longest ${spellMinutes(alt.longestMinutes)}`
  } else {
    altLabel = `Split it as far as it will go — ${alt.sessions} sessions of up to ${spellMinutes(alt.longestMinutes)}`
  }

  return [
    keepLength,
    { id: 'keep-count', label: altLabel, sessions: alt.sessions, budget: { min: alt.max, max: alt.max } }
  ]
}

/**
 * The question itself — design/COURSE-SESSION-PLANNING.md, approved 2026-08-03.
 *
 * The opening and closing sentences are Mike's approved wording verbatim. The
 * middle sentence is added only when the count they asked for cannot be built
 * at any length, because offering a different number under their own heading
 * without saying why is how the original defect read.
 *
 * "Cover less material" was proposed and REJECTED. It is not a third option and
 * must not be reintroduced.
 *
 * @param {object} options - the return of `courseEffort.fitOptions`.
 * @returns {string} the message text streamed to the advisor.
 */
function fitQuestionText (options) {
  const total = spellMinutes(options.totalMinutes)
  const asked = `${spellCount(options.requestedCount)} of ${spellBudget(options.budget)}`
  const lines = [
    `The material I've picked for this comes to ${total} of work in total — watching, reading and rehearsing.`,
    ''
  ]
  if (options.keepCount.reachable) {
    lines.push(`That doesn't fit ${asked}, so one of the two needs to give.`)
  } else if (options.direction === 'fewer') {
    lines.push(
      `That doesn't fit ${asked}. Each piece of work has to finish before the next one starts, ` +
      `so the fewest this material can be is ${options.keepCount.sessions} sessions.`
    )
  } else {
    // The other direction: they wanted MORE sessions than this material makes.
    lines.push(
      `That doesn't fit ${asked}. There is only so far this material divides, ` +
      `so the most it can be split into is ${options.keepCount.sessions} sessions.`
    )
  }
  lines.push('', 'Which would you rather?')
  return lines.join('\n')
}

/**
 * What the app says once the advisor has picked.
 *
 * @param {{sessions: number}} chosen - the option they picked.
 * @param {{min: number, max: number}} budget - the length that plan is cut to.
 * @returns {string}
 */
function fitConfirmationText (chosen, budget) {
  return `Right — ${chosen.sessions} sessions of up to ${spellMinutes(budget.max)}. Here's the course.`
}

/**
 * What the app says when a second typed reply is still unclear (D7).
 *
 * Mike's ruling: an unclear answer must not be guessed at. After one re-ask it
 * stops asking — but it says which way it is going, so the advisor can see the
 * decision was made for them and undo it. Silence here would be the guess.
 *
 * @param {{sessions: number, budget: {min: number, max: number}}} chosen
 * @returns {string}
 */
function fitDefaultText (chosen) {
  return `I'll go with keeping your sessions at ${spellBudget(chosen.budget)} — that makes it ` +
    `${chosen.sessions} sessions. Use 'Request changes' if you'd rather have fewer, longer ones.`
}

/**
 * The plainer re-ask, sent once when a typed reply matches neither option
 * (CB-06's pattern). With the drop-tab on screen this is a fallback for the
 * advisor who types instead of picking; it never guesses which they meant.
 *
 * @returns {string}
 */
function fitReaskText () {
  return "Sorry — I couldn't tell which of those you'd prefer. Pick one from the list above and I'll build it."
}

/**
 * Read a typed reply for a clear signal one way or the other.
 *
 * Deliberately narrow: it recognises the two shapes an advisor actually types
 * ("keep the length" / "fewer sessions", or "first"/"second") and returns null
 * for everything else. A wrong guess here builds the wrong course silently,
 * which is worse than asking again — Mike's ruling: it must not be guessed at.
 *
 * @param {string} text - the advisor's raw typing.
 * @returns {'keep-length'|'keep-count'|null}
 */
function readFitReply (text) {
  const t = String(text || '').toLowerCase()
  if (!t.trim()) { return null }
  const keepLength = /\b(keep|same|stick with|stay)\b[^.]*\b(length|time|minutes|mins|short(er)?)\b/.test(t) ||
    /\b(short(er)? sessions|more sessions|first( one)?|option 1|number 1)\b/.test(t)
  const keepCount = /\b(keep|same|stick with|stay)\b[^.]*\b(sessions|count|number)\b/.test(t) ||
    /\b(fewer sessions|longer sessions|as short as possible|second( one)?|option 2|number 2)\b/.test(t)
  if (keepLength && !keepCount) { return 'keep-length' }
  if (keepCount && !keepLength) { return 'keep-count' }
  return null
}

/**
 * Everything the design state needs to remember while the question is open.
 *
 * The outline travels with it because the advisor's answer is honoured by
 * re-slicing the SAME material at a different length — no second call to the
 * AI, so the course they confirm is built from the material they were told
 * about. It round-trips through the browser like `pendingOutline` already does,
 * and is re-validated and re-grounded on the way back in.
 *
 * @param {object} options - the return of `courseEffort.fitOptions`.
 * @param {object} outline - the grounded outline the question is about.
 * @returns {object} the `pendingFit` state block.
 */
function pendingFitState (options, outline) {
  return {
    outline,
    budget: options.budget,
    requestedCount: options.requestedCount,
    target: options.target,
    direction: options.direction,
    totalMinutes: options.totalMinutes,
    options: fitChoiceOptions(options)
  }
}

module.exports = {
  ACTIVITY_LABEL,
  ACTIVITY_FOCUS,
  sliceTitle,
  sliceFocus,
  spellMinutes,
  spellBudget,
  spellCount,
  resourceLinkMap,
  buildSlicedOutline,
  fitChoiceOptions,
  fitQuestionText,
  fitConfirmationText,
  fitDefaultText,
  fitReaskText,
  readFitReply,
  pendingFitState
}
