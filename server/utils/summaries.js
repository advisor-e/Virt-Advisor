/**
 * Content summaries loader — detailed per-template guidance extracted from
 * the Advisor-e content Google Doc. Covers 97 templates across 8 sections.
 *
 * Every Do the Job template already has a purpose field in data/templates.json.
 * For templates not yet in content-summaries.json, that purpose field is read
 * directly so all Do the Job templates are visible to scoring and the AI narrative
 * context. The data was always there — it just wasn't connected to this loader.
 */

const { readFileSync } = require('fs')
const { resolve } = require('path')
const { STOP_WORDS } = require('./stop-words')

let _rich = null
let _seed = null
let _sectionDescriptions = null

/**
 * 🔴 WHICH LIBRARY, item 7.29. A firm, or a tier above it, may upload its own template
 * library (`templateLibrary.loadEffectiveTemplates`). The summaries the AI is shown are
 * titled from, and topped up from, THAT library — or a template the firm's export renamed
 * reaches the AI under its old name, the fault 7.18 fixed. Every reader below takes the
 * library in force as an optional last argument; leaving it out, or passing null for "no
 * tier has uploaded", reads the committed data/templates.json.
 *
 * One build per library, dropped with the library: templateLibrary hands out the same
 * array for a minute at a time, so a WeakMap keyed on it rebuilds once per upload.
 */
const _builds = new WeakMap()

/** content-summaries.json, read once. The same for every library. */
function _loadRich () {
  if (_rich) { return _rich }
  try {
    _rich = JSON.parse(readFileSync(resolve(process.cwd(), 'data/content-summaries.json'), 'utf8'))
  } catch (err) {
    console.error('[summaries] Failed to load content-summaries.json:', err.message)
    _rich = []
  }
  return _rich
}

/** The committed seed, read once. An unreadable file is an empty library, said loudly. */
function _seedLibrary () {
  if (_seed) { return _seed }
  try {
    _seed = JSON.parse(readFileSync(resolve(process.cwd(), 'data/templates.json'), 'utf8'))
  } catch (err) {
    console.error('[summaries] Failed to read templates.json:', err.message)
    _seed = []
  }
  return _seed
}

/**
 * The summaries, and every title, for one library.
 * @param {Array<object>|null} [library] - the library in force; null or empty for the seed
 * @returns {{summaries: object[], titles: Set<string>}}
 */
function _buildFor (library) {
  const rows = (Array.isArray(library) && library.length > 0) ? library : _seedLibrary()
  const hit = _builds.get(rows)
  if (hit) { return hit }

  const rich = _loadRich().slice()

  // Build fallback entries from the library for any template not already covered.
  // Uses the purpose field so every Do the Job template is visible to the AI copy layer.
  // NOTE: this deliberately does NOT gate on includedInClient. That field only governs
  // whether a CLIENT self-serving in Advisor-e can see the template — not whether an
  // advisor may recommend it with a client. It was removed here to stay consistent with
  // the recommendation engine (see templateResolver.js), so the ~77 advisor-with-client
  // templates that are now recommendable also get their purpose-based copy.
  const richNames = new Set(rich.map(s => s.name))
  // Also check alias targets so we don't duplicate aliased entries
  const aliasTargets = new Set(Object.values(TEMPLATE_SUMMARY_ALIASES))
  const richNamesWithAliases = new Set([...richNames, ...aliasTargets])

  for (const t of rows) {
    if (
      t && t.section === 'Do the Job' &&
      t.purpose &&
      t.purpose.trim() &&
      !richNames.has(t.title) &&
      !richNamesWithAliases.has(t.title)
    ) {
      rich.push({
        name: t.title,
        section: t.subSection || '',
        purpose: t.purpose.trim(),
        indicators: t.topic || '',
        helpsOwner: '',
        helpsAdvisor: ''
      })
    }
  }

  const titles = new Set()
  const build = { summaries: withLibraryTitles(rich, rows, titles), titles }
  _builds.set(rows, build)
  return build
}

/**
 * @param {Array<object>|null} [library] - the library in force (item 7.29); the seed if absent
 * @returns {object[]}
 */
function loadSummaries (library) {
  return _buildFor(library).summaries
}

/**
 * Give every summary the master library titles it describes (item 7.18).
 *
 * content-summaries.json was extracted from a Google Doc, so 67 of its headings are the
 * doc's own ("4 Part Business Plan", "Advance.6. Organisational Review & Org Chart") and
 * match no template. The AI repeats whatever heading it is shown, so it offered advisors
 * templates that do not exist. Only the library — the master export, as uploaded for this
 * firm or committed as data/templates.json (item 7.29) — may name a template: a heading that
 * is already a title keeps it; otherwise the titles come from the summary's page links and
 * the alias map. A summary that reaches no title gets an empty list and is never shown to
 * the AI as a template.
 *
 * @param {object[]} rich - the loaded summaries
 * @param {object[]} library - the template library in force
 * @param {Set<string>} known - filled with every title the library holds
 * @returns {object[]} the same entries, each with `titles: string[]`
 */
function withLibraryTitles (rich, library, known) {
  const byPage = new Map()
  for (const t of library) {
    if (!t || !t.title) { continue }
    known.add(t.title)
    if (t.page) { byPage.set(t.page, (byPage.get(t.page) || []).concat(t.title)) }
  }
  const aliasTitles = {}
  Object.keys(TEMPLATE_SUMMARY_ALIASES).forEach((title) => {
    const target = TEMPLATE_SUMMARY_ALIASES[title]
    if (known.has(title)) { aliasTitles[target] = (aliasTitles[target] || []).concat(title) }
  })
  return rich.map((s) => {
    if (known.has(s.name)) { return { ...s, titles: [s.name] } }
    const linked = [].concat(s.page || [], s.pages || []).flatMap(p => byPage.get(p) || [])
    return { ...s, titles: [...new Set(linked.concat(aliasTitles[s.name] || []))] }
  })
}

const MAX_ALSO_SHOWN = 4
// Not "/" or ",": real titles contain both ("SWOT / PEST"). No title contains ";".
const TITLE_SEPARATOR = '; '

/**
 * The heading is ONE title. The bench (2026-10-02) found the AI copying a joined heading
 * ("E.O.Y Meeting | App Review | What's Applicable") as a single template name, so any other
 * titles a shared summary covers go on their own line below it.
 */
function alsoDescribesLine (titles) {
  const rest = titles.slice(1)
  if (rest.length === 0) { return null }
  const more = rest.length - MAX_ALSO_SHOWN
  return 'Also describes the templates: ' + rest.slice(0, MAX_ALSO_SHOWN).join(TITLE_SEPARATOR) +
    (more > 0 ? ` (and ${more} more)` : '')
}

/**
 * Filter summaries by relevance to a query, returning up to maxResults.
 * Matches against purpose, indicators, helpsOwner, and helpsAdvisor fields.
 *
 * @param {string} query
 * @param {number} [maxResults=15]
 * @param {Array<object>|null} [library] - the library in force (item 7.29); the seed if absent
 * @returns {object[]}
 */
function filterSummariesByQuery (query, maxResults, library) {
  maxResults = maxResults || 15
  // Only summaries that name a library template — these feed the AI's prompt.
  const summaries = loadSummaries(library).filter(s => s.titles.length > 0)
  const words = query.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3)
    .filter(w => !STOP_WORDS.has(w))

  if (words.length === 0) { return summaries.slice(0, maxResults) }

  const scored = summaries.map((s) => {
    const searchText = [s.name, s.purpose, s.indicators, s.helpsOwner, s.helpsAdvisor]
      .join(' ').toLowerCase()
    let score = 0
    for (const word of words) {
      if (searchText.includes(word)) { score++ }
    }
    return { summary: s, score }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .filter(s => s.score > 0)
    .slice(0, maxResults)
    .map(s => s.summary)
}

/**
 * Return ALL summaries (used when conversation history provides enough context
 * to warrant the full reference rather than keyword-filtered subset).
 */
function getAllSummaries (library) {
  return loadSummaries(library)
}

function loadSectionDescriptions () {
  if (_sectionDescriptions) { return _sectionDescriptions }
  const filePath = resolve(process.cwd(), 'data/section-descriptions.json')
  try {
    _sectionDescriptions = JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.error('[summaries] Failed to load section-descriptions.json:', err.message)
    _sectionDescriptions = []
  }
  return _sectionDescriptions
}

function formatSectionDescriptionsForPrompt () {
  const sections = loadSectionDescriptions()
  const lines = ['### Template Section Guide — Use this to match client and advisor profile to the right complexity tier\n']
  for (const s of sections) {
    lines.push(`**${s.section}** (Complexity: ${s.complexity})`)
    if (s.advisorLevelNote) { lines.push(`Advisor level: ${s.advisorLevelNote}`) }
    lines.push(`Client profile: ${s.clientProfile}`)
    lines.push(`Advisor profile: ${s.advisorProfile}`)
    lines.push(`Engagement style: ${s.engagementStyle}`)
    lines.push(`When to use: ${s.whenToUse}`)
    lines.push('')
  }
  return lines.join('\n')
}

function formatSummariesForPrompt (summaries) {
  const titled = (summaries || []).filter(s => s.titles && s.titles.length > 0)
  if (titled.length === 0) { return '' }
  return titled.map((s) => {
    const lines = [`**${s.titles[0]}** [${s.section}]`]
    const also = alsoDescribesLine(s.titles)
    if (also) { lines.push(also) }
    if (s.purpose) { lines.push(`Purpose: ${s.purpose}`) }
    if (s.indicators) { lines.push(`When to use: ${s.indicators}`) }
    if (s.helpsOwner) { lines.push(`Helps the owner: ${s.helpsOwner}`) }
    if (s.helpsAdvisor) { lines.push(`Helps the advisor: ${s.helpsAdvisor}`) }
    return lines.join('\n')
  }).join('\n\n')
}

/**
 * Static alias map: logic tree template names → content summary names.
 * Used when the fuzzy matcher can't bridge naming differences (e.g. "Nine" vs "9",
 * abbreviated section prefixes, or completely different naming conventions).
 */
const TEMPLATE_SUMMARY_ALIASES = {
  'Nine Growth Aspects': '9 Growth Aspect Questions & Graphic',
  'Growth Framework': '9 Growth Aspect Questions & Graphic',
  'Powerful Goal Setting': 'GE.SMART & FAST Goals',
  'Profit Levers & Blue Ocean': 'Advance.1. Bizz Targets & BO Expectations',
  'Business Targets': 'Advance.1. Bizz Targets & BO Expectations',
  'Orientation Part 1': 'Advance.2 & 2B. Strategic Orientation (Part 1 & 2)',
  'Orientation Part 2': 'Advance.2 & 2B. Strategic Orientation (Part 1 & 2)',
  'Planning Outcomes Review': 'ADV.0. Planning Outcomes',
  '1 pg Bizz Case': 'One Page Supposition (Accme Business Case)',
  'Alignment Statements': 'L.Suppt.Alignment',
  'Porters & Pine': "Porter's & Pine",
  'Governance Introduction': 'Governance Introduction',
  'Organisational Review': 'Advance.6. Organisational Review & Org Chart',
  'Sales & Marketing Review': 'Advance.5. Sales & Marketing Review',
  'Turnaround Behaviours': 'Cafe Turnaround Behaviours',
  'Partner Accountability': 'Annual Board Plan',
  'Mgt Annual Plan': 'Management Reporting Annual Plan (Advisory Board Plan)',
  'General Meeting Agenda': 'Agenda & Notes',
  '6 Hats': '6 Hats Thinking',
  'Customer Journey': 'The Customer Journey',
  '8 Profit Levers': 'The 8 Profit Levers',
  'Rubbish In - Rubbish Out': 'Rubbish in - Rubbish Out',
  'Debtor Protocols': 'Debtor Protocols & Business Drag Model',
  '90 Day Best Practice Accounting': '90 Day Accounting Best Practice Plan',

  'E.O.Y Meeting': 'E.O.Y Client Review Sheet - Input',
  'Capacity, Capability, Opportunity': 'Business Assessment Report',
  'Lite Fundamentals Visual Aids': 'Get.Lite Sales Prompts',
  'Lite Visuals': 'Get.Lite Sales Prompts',
  'Lite Funda Call': 'Lite Funda Call & Email',
  'EOY Approach': 'E.O.Y Approach Resources',
  'E.O.Y Approach': 'E.O.Y Approach Resources',
  'Three Pillars of Financial Management': '3 Pillars of Financial Management',
  'Growth Curve Checklist': 'Growth Curve',
  // Revenue & Feasibility industry-specific models → shared entry
  'Audio-Opto': 'Revenue & Feasibility Industry Model',
  Cafe: 'Revenue & Feasibility Industry Model',
  'Cake Shop': 'Revenue & Feasibility Industry Model',
  'Car Importer': 'Revenue & Feasibility Industry Model',
  'Childcare Ctr': 'Revenue & Feasibility Industry Model',
  Construction: 'Revenue & Feasibility Industry Model',
  'Cost per Mtr': 'Revenue & Feasibility Industry Model',
  'Earth Moving Hrs': 'Revenue & Feasibility Industry Model',
  Engineering: 'Revenue & Feasibility Industry Model',
  "Food & Remedy Product'n": 'Revenue & Feasibility Industry Model',
  'Gym & Trainer': 'Revenue & Feasibility Industry Model',
  'Home Services Feasibility': 'Revenue & Feasibility Industry Model',
  Hospitality: 'Revenue & Feasibility Industry Model',
  Hairdressing: 'Revenue & Feasibility Industry Model',
  'IT Services': 'Revenue & Feasibility Industry Model',
  Joiner: 'Revenue & Feasibility Industry Model',
  'Motel & Lodge': 'Revenue & Feasibility Industry Model',
  'Online Sales': 'Revenue & Feasibility Industry Model',
  'Production Output': 'Revenue & Feasibility Industry Model',
  'Professional Services Firm': 'Revenue & Feasibility Industry Model',
  'Rental Property': 'Revenue & Feasibility Industry Model',
  Retail: 'Revenue & Feasibility Industry Model',
  'Rural Volatility': 'Revenue & Feasibility Industry Model',
  Shop: 'Revenue & Feasibility Industry Model',
  'Tour Operators': 'Revenue & Feasibility Industry Model',
  'Tours + Shop': 'Revenue & Feasibility Industry Model',
  'Trucking/ Haulage': 'Revenue & Feasibility Industry Model',
  'Workshop / Program Sales': 'Revenue & Feasibility Industry Model',
  Physiotherapy: 'Revenue & Feasibility Industry Model',
  Dentist: 'Revenue & Feasibility Industry Model',
  'Landscaping & Maintainence': 'Revenue & Feasibility Industry Model',
  Midwife: 'Revenue & Feasibility Industry Model',
  'Homeware Sales': 'Revenue & Feasibility Industry Model',
  Manufacturing: 'Revenue & Feasibility Industry Model',
  'Baking Apple Pie': 'Revenue & Feasibility Industry Model',
  'Dry Stock Farming': 'Revenue & Feasibility Industry Model',
  'Marine Harvest': 'Revenue & Feasibility Industry Model',
  'Mussel Farm 2': 'Revenue & Feasibility Industry Model',
  'Real Estate Office': 'Revenue & Feasibility Industry Model',
  'Farm House Budget': 'Revenue & Feasibility Industry Model',
  Doctor: 'Revenue & Feasibility Industry Model',
  'Health Spa': 'Revenue & Feasibility Industry Model',
  'Support Person': 'Revenue & Feasibility Industry Model',
  'Deliver and Hire': 'Revenue & Feasibility Industry Model',
  'Mobile Services': 'Revenue & Feasibility Industry Model',
  Beverages: 'Revenue & Feasibility Industry Model',
  'Craft Production': 'Revenue & Feasibility Industry Model',
  'Raw Food': 'Revenue & Feasibility Industry Model',
  'Dress Maker': 'Revenue & Feasibility Industry Model',
  'Hard & Software Sales': 'Revenue & Feasibility Industry Model',
  'Pet Shop': 'Revenue & Feasibility Industry Model',
  'Entry Fee': 'Revenue & Feasibility Industry Model',
  'Sales Teams': 'Revenue & Feasibility Industry Model',
  'Drilling & Pumps': 'Revenue & Feasibility Industry Model',
  'Fencing Cost pr Mtr': 'Revenue & Feasibility Industry Model',
  Butcher: 'Revenue & Feasibility Industry Model',
  Cleaners: 'Revenue & Feasibility Industry Model',
  'Consultancy Pricing': 'Revenue & Feasibility Industry Model',
  'Financial Advisor': 'Revenue & Feasibility Industry Model',
  Plumber: 'Revenue & Feasibility Industry Model',
  'Landscaping & Maintenance': 'Revenue & Feasibility Industry Model',
  'Learn-from-Home': 'Revenue & Feasibility Industry Model',
  Scaffolding: 'Revenue & Feasibility Industry Model'
}

/**
 * Find the best matching summary for a given template name.
 * Tries alias map → exact match → contains match → word-overlap match.
 * Returns the summary object or null if nothing is close enough.
 */
function matchSummaryByTemplateName (summaries, templateName) {
  const nameLower = templateName.toLowerCase().trim()

  // 0. Static alias map (bridges known naming mismatches)
  const aliasTarget = TEMPLATE_SUMMARY_ALIASES[templateName]
  if (aliasTarget) {
    const aliasMatch = summaries.find(s => s.name === aliasTarget)
    if (aliasMatch) { return aliasMatch }
  }

  // 1. Exact match
  const exact = summaries.find(s => s.name.toLowerCase() === nameLower)
  if (exact) { return exact }

  // 2. Summary name contains the full template name
  const contained = summaries.find(s => s.name.toLowerCase().includes(nameLower))
  if (contained) { return contained }

  // 3. Template name contains the full summary name (guards against very short names)
  const contains = summaries.find(s => s.name.length > 6 && nameLower.includes(s.name.toLowerCase()))
  if (contains) { return contains }

  // 4. Word-overlap: at least 60% of the template's meaningful words appear in the summary name
  const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'your', 'this', 'that'])
  const templateWords = nameLower.split(/[\s&.()+,/-]+/).filter(w => w.length > 3 && !stopWords.has(w))
  if (templateWords.length === 0) { return null }

  const threshold = Math.max(1, Math.ceil(templateWords.length * 0.6))
  const candidates = summaries
    .map((s) => {
      const sLower = s.name.toLowerCase()
      const matches = templateWords.filter(w => sLower.includes(w)).length
      return { summary: s, matches }
    })
    .filter(c => c.matches >= threshold)
    .sort((a, b) => b.matches - a.matches)

  return candidates.length > 0 ? candidates[0].summary : null
}

/**
 * Given a list of template names from the logic tree terminal nodes,
 * return matching summaries using fuzzy name matching.
 * De-duplicates by summary name.
 *
 * @param {string[]} templateNames
 * @param {Array<object>|null} [library] - the library in force (item 7.29); the seed if absent
 * @returns {object[]}
 */
function getSummariesForTemplateNames (templateNames, library) {
  const { summaries, titles } = _buildFor(library)
  const byName = new Map()
  for (const name of templateNames) {
    const match = matchSummaryByTemplateName(summaries, name)
    if (!match) { continue }
    // A caller's name that IS a library title is what the AI is shown above the summary —
    // not every title a shared summary covers. A logic-tree name that is not a title falls
    // back to the summary's own library titles.
    const hit = byName.get(match.name) || { ...match, titles: [] }
    const add = titles.has(name) ? [name] : match.titles
    add.forEach((t) => { if (!hit.titles.includes(t)) { hit.titles.push(t) } })
    byName.set(match.name, hit)
  }
  return [...byName.values()]
}

module.exports = {
  filterSummariesByQuery,
  getAllSummaries,
  getSummariesForTemplateNames,
  formatSummariesForPrompt,
  formatSectionDescriptionsForPrompt
}
