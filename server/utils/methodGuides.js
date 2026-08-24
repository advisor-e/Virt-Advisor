'use strict'

/**
 * @file The thirteen method guides — ONE walk of each guide's own shape, read by
 *   both the AI prompt and the Firm Manager screen.
 * @module server/utils/methodGuides
 *
 * To-do item 4.16 F. Approved artefact: design/METHOD-GUIDES-SCREEN.md and
 * design/mockups/method-guides.html (wording and tiers ruled by Mike 2026-08-17).
 *
 * 🔴 WHY THIS REPLACES THIRTEEN HAND-WRITTEN FORMATTERS RATHER THAN JOINING THEM.
 * Until now each guide had its own `format*ReferenceForPrompt` function in
 * logicTrees.js that named the fields it emitted ONE BY ONE. A field authored into
 * the JSON afterwards was never mentioned again — silently, with nothing to notice.
 * Measured 2026-08-17 by rendering each block and searching it for every authored
 * string over 25 characters: **116 of 954 authored lines reached no prompt at all**
 * (62 in dashboard-discussions, 29 in working-capital-cycle, 20 in ratio-analysis).
 * Every one of Dashboard Discussions' twelve metrics carries the
 * `discussion_questions` an advisor puts to the client, and its `tactical_options`;
 * neither was emitted. Working Capital Cycle emitted each problem type's trigger and
 * dropped its `causes` — the symptom without the diagnosis.
 *
 * The 4.16 sweep counted all thirteen as reaching the prompt BECAUSE THE FORMATTER
 * EXISTED. That is true of the file and false of its contents.
 *
 * So the fix is not thirteen patches — the next authored field would defeat those
 * too. It is one walker over the document's own structure, which cannot skip a field
 * because it never names one. `walkGuide` is that walker; `renderGuideSections`
 * turns its output into prompt text and the route turns the same output into the
 * screen. **Screen and prompt read one structure, so they cannot disagree.**
 *
 * ⚠ THE SHAPES ARE NOT ALIKE, AND THAT IS WHY THE WALK IS GENERIC. Measured across
 * all 155,000 characters: only 21% sits in the four fields all thirteen share, 44%
 * in a staged sequence called `stages` / `steps` / `application_steps` /
 * `step_by_step` / `pillars` depending on the guide, and **35% in blocks unique to a
 * single guide** — 86% of Dashboard Discussions, 73% of Working Capital Cycle, 69%
 * of Ratio Analysis. A renderer with a fixed set of boxes would leave most of those
 * three invisible, which is this item's own fault one level down.
 *
 * ⚠ STRUCTURE IS FIXED; WORDS ARE EDITABLE. A firm may reword any line and may not
 * add or remove a stage — `validateGuideOverride` enforces exactly that. Editing the
 * shape is authoring a method, and that is the mentor's work in the data file.
 */

const { readFileSync } = require('fs')
const { resolve } = require('path')
const { deepMerge } = require('./deepMerge')
const { fenceUntrusted } = require('./promptSafety')

/**
 * The thirteen guides, and the framework row on the Domain Support tab each one
 * opens from.
 *
 * 🔴 THIS MAPPING EXISTS NOWHERE ELSE AND IS AUTHORED HERE IN THE OPEN, on purpose.
 * The guides are keyed to a LOGIC TABLE, and those thirteen tables carry no domain
 * at all — so nothing in the code can work out which domain page a guide belongs on.
 * Guessing it at run time is the failure this whole item exists to close, so a guide
 * with no row here renders nowhere rather than being placed by guesswork.
 *
 * ⚠ EVERY `material` STRING BELOW WAS CHECKED AGAINST THE DATA (2026-08-17) and is
 * an exact `materials[].name` in that domain's support file. The approval artefact
 * proposed five guides serving two domains; only THREE of those second rows exist:
 *
 *   - `capacity_capability_opportunity` → get-positioning carries the same framework
 *     under "Capacity, Capability, Opportunity (CCO)" — the abbreviation, same thing.
 *   - `demings_volatility` → org-board-pack carries "Deming's Volatility Principles
 *     in Governance" — the same theory applied to governance.
 *   - `public_speaking` → get-seminar and sales-marketing both carry "Powerful
 *     Seminars" verbatim.
 *
 * The other two the artefact listed are NOT mapped, because the rows it named do not
 * exist and the rows that are there are different artefacts rather than different
 * names for this one:
 *   - org-firm-strategy has "Growth Curve Checklist", not the Revealing the Growth
 *     Curve method — a checklist derived from it, for the firm's own strategy.
 *   - get-sales-tracker has "Stats to Date Dashboard", a tracker screen, not the
 *     Dashboard Discussions facilitation method.
 * Attaching a guide to either would put a client-conversation method behind a firm
 * admin row and quietly claim they are the same document. See METHOD-GUIDES-SCREEN.md §3.
 *
 * `heading` is the EXACT prompt heading each guide has always opened with. It is
 * pinned by tests/unit/learnReferenceFormatters.test.js and is what a firm searching
 * a rendered prompt for their own edit will find, so it is preserved verbatim.
 *
 * @type {Array<{id: string, file: string, label: string, heading: string,
 *   standing: boolean, rows: Array<{domain: string, material: string}>}>}
 */
const GUIDES = [
  {
    id: 'trial_fit',
    file: 'trial-fit-reference.json',
    label: 'Trial Fit Method',
    heading: '## Trial Fit Method — Detailed Coaching Reference',
    standing: false,
    rows: [{ domain: 'profit', material: 'Trial Fit Method' }]
  },
  {
    id: 'cautious_reveal',
    file: 'cautious-reveal-reference.json',
    label: 'Cautious Reveal Method',
    heading: '## Cautious Reveal Method — Detailed Coaching Reference',
    standing: false,
    rows: [{ domain: 'profit', material: 'Cautious Reveal Method' }]
  },
  {
    id: 'eoy_meeting',
    file: 'eoy-reference.json',
    label: 'End of Year Meeting',
    heading: '## End of Year Meeting — Detailed Coaching Reference',
    standing: false,
    rows: [{ domain: 'eoy', material: 'EOY Meeting Agenda' }]
  },
  {
    id: 'conflict_meeting',
    file: 'conflict-meeting-reference.json',
    label: 'Framing a Conflict Meeting',
    heading: '## Framing a Conflict Meeting — Detailed Coaching Reference',
    standing: false,
    rows: [{ domain: 'conflict', material: 'Force Field Analysis — The 6-Step Conflict Meeting' }]
  },
  {
    id: 'heald_matrix',
    file: 'heald-matrix-reference.json',
    label: 'The Heald Matrix',
    heading: '## The Heald Matrix — Detailed Coaching Reference',
    standing: false,
    rows: [{ domain: 'strategy', material: 'The Heald Matrix' }]
  },
  {
    id: 'ratio_analysis',
    file: 'ratio-analysis-reference.json',
    label: 'Ratio Analysis',
    heading: '## Ratio Analysis — Detailed Coaching Reference',
    standing: false,
    rows: [{ domain: 'data-systems', material: 'Ratio Analysis Deck — the Advisory Staircase' }]
  },
  {
    id: 'reveal_growth_curve',
    file: 'growth-curve-reveal-reference.json',
    label: 'Revealing the Growth Curve',
    heading: '## Revealing the Growth Curve — Detailed Coaching Reference',
    standing: false,
    rows: [{ domain: 'strategy', material: 'Revealing the Growth Curve' }]
  },
  {
    id: 'capacity_capability_opportunity',
    file: 'capacity-capability-opportunity-reference.json',
    label: 'Capacity, Capability, Opportunity',
    heading: '## Capacity, Capability, Opportunity — Detailed Coaching Reference',
    standing: false,
    rows: [
      { domain: 'strategy', material: 'Capacity, Capability, Opportunity' },
      { domain: 'get-positioning', material: 'Capacity, Capability, Opportunity (CCO)' }
    ]
  },
  {
    id: 'demings_volatility',
    file: 'demings-volatility-reference.json',
    label: "Deming's Theory of Volatility",
    heading: "## Deming's Theory of Volatility — Detailed Coaching Reference",
    standing: false,
    rows: [
      { domain: 'data-systems', material: "Deming's Theory of Volatility" },
      { domain: 'org-board-pack', material: "Deming's Volatility Principles in Governance" }
    ]
  },
  {
    id: 'dashboard_discussions',
    file: 'dashboard-discussions-reference.json',
    label: 'Dashboard Discussions',
    heading: '## Dashboard Discussions — Detailed Coaching Reference',
    standing: false,
    rows: [{ domain: 'data-systems', material: 'Dashboard Discussions' }]
  },
  {
    id: 'working_capital_cycle',
    file: 'working-capital-cycle-reference.json',
    label: 'Working Capital Cycle',
    heading: '## Working Capital Cycle — Detailed Coaching Reference',
    standing: false,
    rows: [{ domain: 'forecasting', material: 'Working Capital Cycle — Money in Movement' }]
  },
  {
    id: 'public_speaking',
    file: 'powerful-seminars.json',
    label: 'Powerful Seminars',
    heading: '## Powerful Seminars Reference — Detailed Coaching Content',
    standing: false,
    rows: [
      { domain: 'get-seminar', material: 'Powerful Seminars' },
      { domain: 'sales-marketing', material: 'Powerful Seminars' }
    ]
  },
  {
    // 🔴 THE ONE THAT IS NOT A DOMAIN'S. Its own description: "the universal
    // 3-stage entry protocol for introducing ANY advisory concept or template to a
    // client." There is no material row for it in any of the 30 domain files, and
    // inventing one under an arbitrary domain would file it where nobody would look.
    // Ruled by Mike 2026-08-17 (§6d option A): its own entry above the domains.
    id: 'facilitation_101',
    file: 'facilitation-reference.json',
    label: 'Facilitation 101',
    heading: '## Facilitation 101 — Detailed Coaching Reference',
    standing: true,
    rows: []
  },
  {
    // 🔴 THE 3 ENGAGEMENT TYPES — ITS OWN PAGE, listed under Facilitation 101.
    // Ruled by Mike 2026-08-23, after being asked for three times: it is NOT reached
    // from Facilitation 101 and is not a material row on any domain. It is a second
    // standing entry beside it.
    //
    // This is item 4.16 D, the one the sweep called "the only one with no page" and
    // "genuinely homeless": 3 types x 6 authored fields that reached NO screen at any
    // tier and NO prompt at all — advisorEngine emitted a hardcoded three-line
    // paraphrase in their place. It sits above the domains for the same reason
    // Facilitation 101 does: it is how the advisor works with the client, which is
    // true of every domain, so filing it under one would hide it from the rest.
    id: 'engagement_types',
    file: 'engagement-types.json',
    label: 'The 3 Engagement Types',
    heading: '## The 3 Engagement Types — Detailed Coaching Reference',
    standing: true,
    rows: [],
    // ⚠ MACHINE KEYS, HIDDEN FROM SCREEN AND PROMPT ALIKE. `id` and `type` name the
    // record for the engine (strategyResolver keys on types[].id) and
    // `defaultEngagement` is engine configuration, not advisory wording. Rendered,
    // they would offer an edit that changes nothing and read as noise beside the six
    // fields that are the point of the page. Hidden here rather than in the walker so
    // screen and prompt still see ONE document — the guarantee this module exists for.
    hide: ['id', 'type', 'defaultEngagement']
  },
  {
    // 🔴 PRODUCTIVE HABITS — the third standing page, listed under the other two.
    // Item 4.35, asked for by Mike 2026-08-23: "the drivers of human performance,
    // reaction to learning and 5 steps in making a new habit ... as a separate
    // editable page ... showing under the facilitation 101 page and the engagement
    // types pages."
    //
    // WHY IT BELONGS BESIDE THEM RATHER THAN INSIDE EITHER. Facilitation 101 says
    // how to introduce a concept; The 3 Engagement Types says which relationship the
    // work is. Both rest on the same psychology — how a person reacts to learning at
    // all, and what turns a decision into a habit afterwards. The AI was being asked
    // to deliver both while that psychology was named in the template and held
    // nowhere in this repo, so it improvised the part that decides whether a client
    // accepts the concept.
    //
    // ⚠ SOURCE: transcribed from 'Productive Habits.pdf' (the master app's own
    // template, data/templates.json index 27), NOT authored from general knowledge —
    // the item says so in terms. The PDF's ligatures are dropped by its font subset
    // ("e ectiveness", "Re ections"); those are repaired and nothing else is changed.
    // Two slides are deliberately not transcribed: the session housekeeping slide and
    // the blank worksheet, neither of which is content the AI can use.
    //
    // 🔴 THIS FILE IS THE SOURCE OF THE FIVE DRIVERS, AND CODE NOW ENFORCES THAT.
    // data/staff-domain-support.json's "5 Drivers of Human Output — Performance
    // Diagnosis" row used to paraphrase these definitions in its own words, so both
    // reached the AI and either could be corrected without the other. Mike ruled on
    // 2026-08-25 that this file is the source (item 4.37). The row now declares
    // `definitions_from` and domainSupport.formatDefinitionsFrom reads the block
    // below, so there is one copy rather than two kept level by hand. Editing the
    // drivers here changes what the diagnosis row tells the AI.
    id: 'productive_habits',
    file: 'productive-habits.json',
    // ⚠ THE ID AND THE FILENAME KEEP THE OLD NAME ON PURPOSE. `id` is the storage
    // key a firm's saved wording is filed under; renaming it would orphan every
    // override written before the rename, silently. The page is called Learning
    // Psychology (Mike, 2026-08-23); the record it is stored as is not renamed with it.
    label: 'Learning Psychology',
    heading: '## Learning Psychology — Detailed Coaching Reference',
    standing: true,
    rows: []
  }
]

const GUIDE_BY_ID = {}
for (const g of GUIDES) { GUIDE_BY_ID[g.id] = g }

/** Platform base content, cached per process. Merged copies are NEVER cached. */
const _cache = {}

/**
 * Root keys that describe the file rather than the method. They are not walked as
 * content: `version` is housekeeping, and `description` is the guide's own one-line
 * summary, surfaced separately as the subtitle on screen and the opening line of the
 * prompt block so it is not lost either.
 */
const META_KEYS = ['version', 'description']

/**
 * Keys an item object uses to name itself, in the order they are tried. A stage
 * carries `name`; a numbered item carries `stage` or `step`; a problem type carries
 * `type`. Anything with none of them falls back to its position.
 */
const ITEM_NAME_KEYS = ['name', 'type', 'title']
const ITEM_NUMBER_KEYS = ['stage', 'step', 'number']

/**
 * How long a string may be and still serve as an item's NAME when it carries none
 * of the keys above. Found on the live screen: the conflict guide's three
 * facilitator pillars are `{ pillar, guidance }`, and with no fallback they were
 * headed "1", "2", "3" while "The Person" sat inside as a field. Rather than
 * chasing key names one guide at a time — the exact habit that lost the 116 — the
 * walk takes the first SHORT string it finds, which is a name wherever a name
 * exists and is never a paragraph of guidance.
 */
const ITEM_NAME_MAX = 60

const isPlainObject = v => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * A stored key rendered as ordinary words: `why_advisors_use_revenue_models` →
 * `Why advisors use revenue models`. Mirrors `humaniseSituation` in
 * server/utils/domainSupport.js so the two screens name a field the same way.
 *
 * camelCase is split too (`advisorDefinition` → `Advisor definition`). Twelve of the
 * fourteen guides are authored in snake_case and are unaffected; engagement-types.json
 * is camelCase because the engine reads it as data, and without this its fields read
 * as `AdvisorDefinition` on screen and in the prompt alike.
 * @param {string} key
 * @returns {string}
 */
function humaniseKey (key) {
  const words = String(key || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase()
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : ''
}

/**
 * The platform copy of one guide's content, or null when the file cannot be read.
 * A missing file is not fatal anywhere: the prompt block is simply omitted and the
 * screen shows nothing, which is what happened before this module existed.
 * @param {string} guideId
 * @returns {Object|null}
 */
/**
 * Remove a guide's machine keys, at any depth, BEFORE anything walks the document.
 *
 * Done here rather than inside the walker so that the screen, the prompt and
 * validateGuideOverride all see the same document — a key hidden from one and not
 * the others is how a screen and a prompt come to disagree, which is the fault this
 * module was built to end. A hidden key is therefore also un-editable and
 * un-storable, which is the intent: it is the engine's, not the author's.
 *
 * @param {*} value - any node of the parsed guide
 * @param {Array<string>} hide - key names to drop wherever they appear
 * @returns {*} the same shape with those keys gone
 */
function stripHidden (value, hide) {
  if (Array.isArray(value)) { return value.map(v => stripHidden(v, hide)) }
  if (isPlainObject(value)) {
    const out = {}
    for (const k of Object.keys(value)) {
      if (hide.includes(k)) { continue }
      out[k] = stripHidden(value[k], hide)
    }
    return out
  }
  return value
}

function loadGuideBase (guideId) {
  const guide = GUIDE_BY_ID[guideId]
  if (!guide) { return null }
  if (Object.prototype.hasOwnProperty.call(_cache, guideId)) { return _cache[guideId] }
  try {
    const parsed = JSON.parse(readFileSync(resolve(process.cwd(), 'data/' + guide.file), 'utf8'))
    _cache[guideId] = guide.hide ? stripHidden(parsed, guide.hide) : parsed
  } catch (err) {
    console.error('[methodGuides] Failed to load ' + guide.file + ':', err.message)
    _cache[guideId] = null
  }
  return _cache[guideId]
}

/**
 * The guide content THIS SCOPE should see: the platform base with the resolved
 * override merged over it. Built fresh on every call and never written into
 * `_cache` — that is the cross-firm isolation guarantee, and it is the same rule
 * `resolveDomainSupport` follows.
 * @param {string} guideId
 * @param {Object|null} overrides - resolved override map, keyed by guide id
 * @returns {Object|null}
 */
function resolveGuide (guideId, overrides) {
  const base = loadGuideBase(guideId)
  if (!base) { return null }
  const override = (overrides && isPlainObject(overrides)) ? overrides[guideId] : null
  if (!isPlainObject(override)) { return base }
  return deepMerge(base, override)
}

/**
 * Has any tier authored an override for this guide? Firm-authored text is untrusted
 * input reaching a prompt, so the whole block is fenced when the answer is yes —
 * the same all-or-nothing rule domainSupport.js applies per field.
 * @param {string} guideId
 * @param {Object|null} overrides
 * @returns {boolean}
 */
function guideIsOverridden (guideId, overrides) {
  return !!(overrides && isPlainObject(overrides) && isPlainObject(overrides[guideId]))
}

/**
 * Walk one guide's own structure into a uniform tree that BOTH the prompt renderer
 * and the screen read.
 *
 * This function knows nothing about any particular guide, and that is the whole
 * point: it cannot skip a field, because it never names one. Add a section to any
 * of the thirteen JSON files and it appears in the prompt and on the screen without
 * a line of code changing.
 *
 * Node kinds:
 *   - `text`   an editable string leaf.             `{ kind, key, label, path, value }`
 *   - `fixed`  a number or boolean — structure, shown but NOT editable, because
 *              validateGuideOverride refuses to store a changed one.
 *   - `list`   an array of strings.                 `{ kind, key, label, path, values }`
 *   - `group`  an object with children.             `{ kind, key, label, path, children }`
 *   - `items`  an array of objects, each a group.   `{ kind, key, label, path, children }`
 *
 * `path` is the addressable route to the value (`['stages', 0, 'key_principle']`),
 * which is what makes a firm's edit re-attachable to the right line.
 *
 * @param {Object} content - a resolved guide object
 * @returns {Array<Object>} the sections, in the document's own order
 */
function walkGuide (content) {
  if (!isPlainObject(content)) { return [] }
  return Object.keys(content)
    .filter(k => !META_KEYS.includes(k))
    .map(k => walkValue(k, content[k], [k]))
    .filter(Boolean)
}

/**
 * One value from a guide, turned into a node. Recurses for objects and arrays.
 * Numbers and booleans become text so a field authored as `3` is still shown and
 * still reaches the AI; only null / undefined / empty containers are dropped, and
 * an empty container carries nothing to lose.
 * @param {string|number} key
 * @param {*} value
 * @param {Array<string|number>} path
 * @returns {Object|null}
 */
function walkValue (key, value, path) {
  const label = typeof key === 'number' ? String(key + 1) : humaniseKey(key)

  if (typeof value === 'string') {
    return value.trim() ? { kind: 'text', key, label, path, value } : null
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    // 🔴 `fixed`, NOT `text`. A stage number is structure, not words — and
    // validateGuideOverride refuses to store a changed one. Rendering it as a box
    // somebody can type into would offer an edit the save then rejects, which is a
    // worse screen than one that simply shows the number. Found by opening the real
    // conflict guide on the running app rather than by reading the code.
    return { kind: 'fixed', key, label, path, value: String(value) }
  }
  if (Array.isArray(value)) {
    if (value.length === 0) { return null }
    // An array of plain strings is a bullet list; anything else is walked per item
    // so a mixed or object array cannot fall through the gaps.
    if (value.every(v => typeof v === 'string')) {
      return { kind: 'list', key, label, path, values: value.slice() }
    }
    const children = value
      .map((v, i) => walkValue(i, v, path.concat([i])))
      .filter(Boolean)
      .map((node, i) => Object.assign({}, node, { label: itemLabel(value[i], i) }))
    return children.length ? { kind: 'items', key, label, path, children } : null
  }
  if (isPlainObject(value)) {
    const children = Object.keys(value)
      .map(k => walkValue(k, value[k], path.concat([k])))
      .filter(Boolean)
    return children.length ? { kind: 'group', key, label, path, children } : null
  }
  return null
}

/**
 * What to call one item of an array — the document's own name for it wherever it
 * has one, so the headings on screen are the author's words rather than "Item 3".
 * @param {*} item
 * @param {number} index
 * @returns {string}
 */
function itemLabel (item, index) {
  if (!isPlainObject(item)) { return String(index + 1) }
  let name = ''
  for (const k of ITEM_NAME_KEYS) {
    if (typeof item[k] === 'string' && item[k].trim()) { name = item[k].trim(); break }
  }
  if (!name) {
    // No conventional name key. Take the first short string rather than adding a
    // fourteenth key name to the list above.
    for (const k of Object.keys(item)) {
      const v = item[k]
      if (typeof v === 'string' && v.trim() && v.trim().length <= ITEM_NAME_MAX) { name = v.trim(); break }
    }
  }
  let number = ''
  for (const k of ITEM_NUMBER_KEYS) {
    if (typeof item[k] === 'number' || (typeof item[k] === 'string' && item[k].trim())) {
      number = humaniseKey(k) + ' ' + item[k]
      break
    }
  }
  if (number && name) { return number + ': ' + name }
  return name || number || String(index + 1)
}

/** Markdown heading of a given depth, capped at six hashes. */
function hashes (depth) {
  return '#'.repeat(Math.min(6, depth))
}

/**
 * Render walked sections into prompt lines.
 *
 * Deliberately uniform. The thirteen old formatters each invented their own layout,
 * which is how a field came to be omitted from one and not another; one renderer
 * means one shape, and a new field inherits it for free.
 *
 * @param {Array<Object>} nodes
 * @param {number} depth - markdown heading depth for this level (3 = `###`)
 * @returns {Array<string>}
 */
function renderGuideSections (nodes, depth) {
  const lines = []
  for (const node of nodes) {
    if (node.kind === 'text' || node.kind === 'fixed') {
      lines.push('**' + node.label + ':** ' + node.value)
    } else if (node.kind === 'list') {
      lines.push('**' + node.label + ':**')
      for (const v of node.values) { lines.push('- ' + v) }
      lines.push('')
    } else {
      lines.push(hashes(depth) + ' ' + node.label)
      lines.push('')
      for (const line of renderGuideSections(node.children, depth + 1)) { lines.push(line) }
      lines.push('')
    }
  }
  return lines
}

/**
 * The full prompt block for one guide — the same text the screen shows, rendered
 * from the same walk.
 *
 * @param {string} guideId - a logic-tree id present in GUIDES
 * @param {Object|null} [overrides] - resolved override map, keyed by guide id
 * @returns {string} the block, or '' when the guide is unknown or unreadable
 */
function formatGuideForPrompt (guideId, overrides) {
  const guide = GUIDE_BY_ID[guideId]
  if (!guide) { return '' }
  const content = resolveGuide(guideId, overrides)
  if (!content) { return '' }

  const body = []
  if (typeof content.description === 'string' && content.description.trim()) {
    body.push(content.description.trim())
    body.push('')
  }
  for (const line of renderGuideSections(walkGuide(content), 3)) { body.push(line) }

  // Firm-authored guide text is untrusted input reaching a prompt: fenced so the
  // model reads it as data, never as instructions (CLAUDE.md → Security). The
  // heading stays OUTSIDE the fence — it is platform text, and it is what a reader
  // searches the prompt for.
  const text = body.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return guide.heading + '\n\n' + (guideIsOverridden(guideId, overrides) ? fenceUntrusted(text) : text)
}

/**
 * The platform order of the three engagement types, for id -> position lookup.
 *
 * 🔴 WHY POSITION AND NOT ID. `types[].id` is a machine key and is stripped from the
 * guide before anything reads it (see the `hide` list on the registry row), so the
 * resolved document a firm may have reworded no longer carries one. Position is safe
 * to key on because validateGuideOverride refuses an override that adds or removes
 * an item: a firm may reword the three types, never reorder or replace them.
 * @returns {Array<string>} the ids, in file order
 */
let _engagementOrder = null
function engagementTypeOrder () {
  if (_engagementOrder === null) {
    try {
      const raw = JSON.parse(readFileSync(resolve(process.cwd(), 'data/engagement-types.json'), 'utf8'))
      _engagementOrder = (raw.types || []).map(t => (t && t.id) || '')
    } catch (err) {
      console.error('[methodGuides] Failed to read engagement-types order:', err.message)
      _engagementOrder = []
    }
  }
  return _engagementOrder
}

/**
 * The authored wording for ONE engagement type, as the prompt should carry it.
 *
 * Item 4.16 D. Until 2026-08-23 advisorEngine emitted a hardcoded three-line
 * paraphrase here and the six authored fields per type reached nothing. This reads
 * the same document the screen edits, through the same tier-resolved overrides, so
 * a firm that rewords "delivery guidance" changes what the model is told.
 *
 * @param {string} typeId - 'education' | 'facilitation' | 'advice'
 * @param {Object|null} [overrides] - resolved override map, keyed by guide id
 * @returns {string} the block, or '' when the type or the file is unreadable
 */
function formatEngagementTypeForPrompt (typeId, overrides) {
  const index = engagementTypeOrder().indexOf(typeId)
  if (index < 0) { return '' }
  const content = resolveGuide('engagement_types', overrides)
  const type = (content && Array.isArray(content.types)) ? content.types[index] : null
  if (!isPlainObject(type)) { return '' }
  const nodes = walkGuide(type)
  if (!nodes.length) { return '' }
  const text = renderGuideSections(nodes, 4).join('\n').replace(/\n{3,}/g, '\n\n').trim()
  // Firm-authored text reaching a prompt is fenced as data, never instructions -
  // the same all-or-nothing rule formatGuideForPrompt applies to a whole guide.
  return guideIsOverridden('engagement_types', overrides) ? fenceUntrusted(text) : text
}

/**
 * The guides that open from a given domain's material rows.
 * @param {string} domainId
 * @returns {Array<{id: string, label: string, material: string, alsoUsedBy: Array<string>}>}
 */
function guidesForDomain (domainId) {
  const out = []
  for (const guide of GUIDES) {
    const row = guide.rows.find(r => r.domain === domainId)
    if (!row) { continue }
    out.push({
      id: guide.id,
      label: guide.label,
      material: row.material,
      // The other domains this same document is shown on. The screen says so where
      // the edit happens (Mike's wording, §6c) rather than letting a firm discover
      // afterwards that they changed a second page.
      alsoUsedBy: guide.rows.filter(r => r.domain !== domainId).map(r => r.domain)
    })
  }
  return out
}

/**
 * Reduce an edited guide to the smallest override that reproduces it.
 *
 * Arrays are stored WHOLE when anything inside them changed, because deepMerge
 * replaces arrays wholesale — a sparse array override would silently drop every
 * element the firm did not touch. Everything else is stored key by key, so a firm
 * that rewords one sentence stores one sentence and keeps inheriting the rest.
 *
 * @param {*} base - the platform value
 * @param {*} edited - the value as the firm wants it
 * @returns {*} the sparse override, or undefined when nothing changed
 */
function sparseOverride (base, edited) {
  if (Array.isArray(base) && Array.isArray(edited)) {
    return JSON.stringify(base) === JSON.stringify(edited) ? undefined : edited
  }
  if (isPlainObject(base) && isPlainObject(edited)) {
    const out = {}
    let any = false
    for (const k of Object.keys(edited)) {
      const diff = sparseOverride(base[k], edited[k])
      if (diff !== undefined) { out[k] = diff; any = true }
    }
    return any ? out : undefined
  }
  return base === edited ? undefined : edited
}

/**
 * Is this override something a firm is allowed to store?
 *
 * 🔴 STRUCTURE IS FIXED; WORDS ARE EDITABLE — this is where that rule is enforced
 * rather than merely stated. An override may reword any string the platform already
 * authored. It may not add a key, remove one, change a value's type, or change the
 * length of an array. Editing the shape is authoring a method, which is the mentor's
 * work in the data file, and a firm-shaped guide would also break the walk both the
 * screen and the prompt depend on.
 *
 * @param {*} base - the platform value at this position
 * @param {*} override - the candidate override at this position
 * @param {Array<string|number>} [path] - for the error message
 * @returns {{ok: true}|{ok: false, reason: string}}
 */
function validateGuideOverride (base, override, path) {
  const where = (path || []).join('.') || '(root)'

  if (typeof base === 'string') {
    if (typeof override !== 'string') { return { ok: false, reason: `${where} must stay text` } }
    return { ok: true }
  }
  if (Array.isArray(base)) {
    if (!Array.isArray(override)) { return { ok: false, reason: `${where} must stay a list` } }
    if (override.length !== base.length) {
      return { ok: false, reason: `${where} must keep its ${base.length} entries — a firm may reword them, not add or remove them` }
    }
    for (let i = 0; i < base.length; i++) {
      const r = validateGuideOverride(base[i], override[i], (path || []).concat([i]))
      if (!r.ok) { return r }
    }
    return { ok: true }
  }
  if (isPlainObject(base)) {
    if (!isPlainObject(override)) { return { ok: false, reason: `${where} must stay a section` } }
    for (const k of Object.keys(override)) {
      if (!Object.prototype.hasOwnProperty.call(base, k)) {
        return { ok: false, reason: `${where}.${k} is not part of this guide` }
      }
      const r = validateGuideOverride(base[k], override[k], (path || []).concat([k]))
      if (!r.ok) { return r }
    }
    return { ok: true }
  }
  // Numbers and booleans are structural (a stage number, a step index) and are not
  // editable text; an override may only repeat them.
  if (base === override) { return { ok: true } }
  return { ok: false, reason: `${where} is not editable` }
}

module.exports = {
  GUIDES,
  GUIDE_BY_ID,
  loadGuideBase,
  resolveGuide,
  guideIsOverridden,
  walkGuide,
  renderGuideSections,
  formatGuideForPrompt,
  formatEngagementTypeForPrompt,
  guidesForDomain,
  sparseOverride,
  validateGuideOverride,
  humaniseKey
}
