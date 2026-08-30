'use strict'

// ─────────────────────────────────────────────────────────────────────────────
// THE THIRTEEN METHOD GUIDES (item 4.16 F, 2026-08-17).
//
// Approved artefact: design/METHOD-GUIDES-SCREEN.md · design/mockups/method-guides.html
//
// 🔴 THE FIRST TEST HERE IS THE POINT OF THE WHOLE ITEM, and it is written as a
// MEASUREMENT rather than as a list of expected strings. Before this build, each
// guide had a hand-written formatter that named the fields it emitted one by one,
// so a field authored into the JSON afterwards was silently never mentioned again.
// 116 of the 954 authored lines across the thirteen reached no prompt at all —
// including the discussion questions authored against every one of Dashboard
// Discussions' twelve metrics, and the `causes` behind each of Working Capital
// Cycle's three problem types.
//
// A test that listed the missing 116 by name would pass forever and catch the
// NEXT one never. This one reads the files, finds every authored string, and
// fails if any of them is absent from the rendered prompt — so a field added to
// any of the thirteen tomorrow is covered without anybody remembering to add it
// here. That is the only shape of test that would have caught the original fault.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs')
const path = require('path')

const {
  GUIDES,
  GUIDE_BY_ID,
  walkGuide,
  formatGuideForPrompt,
  guidesForDomain,
  sparseOverride,
  validateGuideOverride,
  loadGuideBase,
  formatEngagementTypeForPrompt
} = require('../../server/utils/methodGuides')

const { OPEN, CLOSE } = require('../../server/utils/promptSafety')

/**
 * Every authored string in a guide worth checking: over 25 characters, excluding
 * housekeeping.
 *
 * `hide` is the guide's own machine-key list (the registry's `hide` field) and is
 * passed in rather than hardcoded, so this stays a measurement of AUTHORED content.
 * A key on that list names the record for the engine — `designNote.id` is
 * `domain-heuristic-vs-client-readiness`, long enough to look like prose and not a
 * line anybody wrote for an advisor to read. The list is asserted separately, below,
 * so nothing can be hidden quietly to make this test pass.
 */
function authoredStrings (value, out, key, hide) {
  const hidden = hide || []
  if (typeof value === 'string') {
    if (key !== 'version' && !hidden.includes(key) && value.trim().length > 25) { out.push(value.trim()) }
  } else if (Array.isArray(value)) {
    for (const v of value) { authoredStrings(v, out, key, hidden) }
  } else if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) {
      if (hidden.includes(k)) { continue }
      authoredStrings(value[k], out, k, hidden)
    }
  }
  return out
}

function readGuideFile (guide) {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'data', guide.file), 'utf8'))
}

describe.each(GUIDES)('method guide — $id', (guide) => {
  test('its data file is present and readable', () => {
    expect(loadGuideBase(guide.id)).toBeTruthy()
  })

  test('EVERY authored line reaches the prompt — the 116 that did not, and the next one', () => {
    const authored = authoredStrings(readGuideFile(guide), [], undefined, guide.hide)
    const rendered = formatGuideForPrompt(guide.id)
    const missing = authored.filter(s => !rendered.includes(s))
    // Named in the failure message so a break says WHICH line went quiet, not just
    // that a count moved.
    expect({ guide: guide.id, missing }).toEqual({ guide: guide.id, missing: [] })
    expect(authored.length).toBeGreaterThan(20)
  })

  test('opens with the heading it has always opened with', () => {
    // Pinned because it is what a firm searching a rendered prompt for their own
    // edit will look for, and what tests/unit/learnReferenceFormatters.test.js
    // asserts from the other side.
    expect(formatGuideForPrompt(guide.id).startsWith(guide.heading)).toBe(true)
  })

  test('walks into sections the screen can render', () => {
    const sections = walkGuide(loadGuideBase(guide.id))
    expect(sections.length).toBeGreaterThan(0)
    for (const s of sections) {
      expect(['text', 'fixed', 'list', 'group', 'items']).toContain(s.kind)
      expect(typeof s.label).toBe('string')
      expect(s.label.length).toBeGreaterThan(0)
      expect(Array.isArray(s.path)).toBe(true)
    }
  })

  test('every material row it claims exists in that domain file', () => {
    for (const row of guide.rows) {
      const file = path.resolve(process.cwd(), 'data', `${row.domain}-domain-support.json`)
      expect(fs.existsSync(file)).toBe(true)
      const names = (JSON.parse(fs.readFileSync(file, 'utf8')).materials || []).map(m => m.name)
      // The mapping is authored by hand in methodGuides.js because nothing in the
      // data can derive it. This is what stops a hand-authored line rotting quietly
      // when a domain file is re-authored.
      expect(names).toContain(row.material)
    }
  })
})

describe('the fifteen as a whole', () => {
  test('there are fifteen, not twelve', () => {
    // The build spec said twelve: `powerful-seminars.json` is not named
    // `*-reference.json`, so a file-pattern sweep missed it. A count taken from a
    // filename pattern is a count of filenames.
    // The fourteenth is The 3 Engagement Types (item 4.16 D) and the fifteenth is
    // Productive Habits (item 4.35), both 2026-08-23.
    expect(GUIDES).toHaveLength(15)
    expect(GUIDE_BY_ID.public_speaking.file).toBe('powerful-seminars.json')
  })

  test('three are standing, in the order Mike asked for them', () => {
    const standing = GUIDES.filter(g => g.standing)
    // 🔴 ORDER IS THE RULING. Mike, 2026-08-23: the engagement types are their OWN
    // page listed UNDER Facilitation 101 — not something reached by opening it — and
    // Productive Habits is a separate page again, under both. The rail renders
    // standing guides in this order, so this array IS the on-screen order.
    expect(standing.map(g => g.id)).toEqual(['facilitation_101', 'engagement_types', 'productive_habits'])
    // None has a material row anywhere, and inventing one would file it under a
    // single domain when it is true of all of them.
    for (const g of standing) { expect(g.rows).toEqual([]) }
  })

  test('every non-standing guide has at least one row, and no guide is placed by guesswork', () => {
    for (const g of GUIDES) {
      if (g.standing) { continue }
      expect(g.rows.length).toBeGreaterThan(0)
    }
  })

  test('a guide shown on two domains is ONE document, so an edit reaches both', () => {
    const shared = GUIDES.filter(g => g.rows.length > 1)
    expect(shared.map(g => g.id).sort()).toEqual(
      ['capacity_capability_opportunity', 'demings_volatility', 'public_speaking']
    )
    for (const g of shared) {
      for (const row of g.rows) {
        // Both pages resolve the SAME guide id, which is what makes the on-screen
        // "an edit here changes it there too" line true rather than a hope.
        expect(guidesForDomain(row.domain).some(x => x.id === g.id)).toBe(true)
      }
    }
  })

  test('guidesForDomain names the other pages a shared guide appears on', () => {
    const onStrategy = guidesForDomain('strategy').find(g => g.id === 'capacity_capability_opportunity')
    expect(onStrategy.alsoUsedBy).toEqual(['get-positioning'])
    const onProfit = guidesForDomain('profit').find(g => g.id === 'trial_fit')
    expect(onProfit.alsoUsedBy).toEqual([])
  })

  test('an unknown guide id renders nothing rather than guessing', () => {
    expect(formatGuideForPrompt('no_such_guide')).toBe('')
    expect(guidesForDomain('no-such-domain')).toEqual([])
  })
})

describe('a section nobody anticipated', () => {
  // The reason the walk is generic: 35% of the 155,000 characters sits in blocks
  // unique to a single guide, and a renderer with a fixed set of boxes would leave
  // most of Dashboard Discussions, Working Capital Cycle and Ratio Analysis
  // invisible — this item's own fault, one level down.
  test('renders in full, at any depth, with no code naming it', () => {
    const invented = {
      version: '1.0',
      description: 'A guide with a shape nobody wrote code for.',
      objective: 'Prove the walker does not need to know the field names in advance.',
      a_block_invented_today: {
        description: 'A section that did not exist when the renderer was written.',
        deeply: {
          nested: {
            questions: [
              { type: 'disturb', text: 'A question buried four levels down the document.' },
              { type: 'affirm', text: 'A second question beside it, also four levels down.' }
            ]
          }
        }
      }
    }
    const sections = walkGuide(invented)
    const flat = JSON.stringify(sections)
    expect(flat).toContain('A section that did not exist when the renderer was written.')
    expect(flat).toContain('A question buried four levels down the document.')
    expect(flat).toContain('A second question beside it, also four levels down.')
    // `version` is housekeeping and `description` is the guide's own subtitle,
    // surfaced separately — neither is walked as a content section.
    expect(sections.map(s => s.key)).not.toContain('version')
    expect(sections.map(s => s.key)).not.toContain('description')
  })
})

describe('what the screen may and may not offer as a box to type in', () => {
  // Found by opening the real conflict guide on the running app, not by reading
  // the code: a stage number was rendered as an editable field, and saving one
  // would have been refused by validateGuideOverride. A screen that offers an edit
  // the save rejects is worse than one that shows the value plainly.
  test('a stage number is `fixed`, and its name is `text`', () => {
    const stages = walkGuide(loadGuideBase('conflict_meeting')).find(s => s.key === 'stages')
    const stageOne = stages.children[0]
    const byKey = Object.fromEntries(stageOne.children.map(c => [c.key, c.kind]))
    expect(byKey.stage).toBe('fixed')
    // A firm may reword a stage's NAME — that is words, and the validator allows it.
    expect(byKey.name).toBe('text')
    expect(validateGuideOverride('Understanding Conflict Psychology', 'Our name for stage one', []).ok).toBe(true)
    expect(validateGuideOverride(1, 2, []).ok).toBe(false)
  })

  test('an item is headed by the name its author gave it, not by its position', () => {
    // The conflict guide's three facilitator pillars are `{ pillar, guidance }` —
    // no `name` key — and were headed "1", "2", "3" with "The Person" buried inside.
    const framework = walkGuide(loadGuideBase('conflict_meeting')).find(s => s.key === 'facilitator_framework')
    const pillars = framework.children.find(c => c.key === 'pillars')
    expect(pillars.children.map(c => c.label)).toEqual(['The Person', 'The Method', 'The Outcome'])
  })

  test('a long first string is not mistaken for a name', () => {
    const long = 'A guidance paragraph far too long to be anybody’s idea of a heading, running well past sixty characters.'
    const sections = walkGuide({ items: [{ guidance: long }] })
    expect(sections[0].children[0].label).toBe('1')
  })
})

describe("a firm's own wording", () => {
  const guideId = 'trial_fit'

  test('reaches the prompt, and reaches it FENCED', () => {
    const base = loadGuideBase(guideId)
    const overrides = { [guideId]: { objective: 'Our own objective, in our own words, authored by the firm.' } }
    const out = formatGuideForPrompt(guideId, overrides)

    expect(out).toContain('Our own objective, in our own words, authored by the firm.')
    // Firm-authored text is untrusted input reaching a prompt: the model must read
    // it as data, never as instructions (CLAUDE.md → Security).
    expect(out).toContain(OPEN)
    expect(out).toContain(CLOSE)
    // The heading stays OUTSIDE the fence — it is platform text, and it is what a
    // reader searches the prompt for.
    expect(out.startsWith(GUIDE_BY_ID[guideId].heading)).toBe(true)
    // Everything they did NOT touch still comes through.
    expect(out).toContain(base.core_principle)
  })

  test('is not fenced when nobody has edited it — behaviour is unchanged for every firm today', () => {
    const out = formatGuideForPrompt(guideId, null)
    expect(out).not.toContain(OPEN)
    expect(out).not.toContain(CLOSE)
  })

  test('is stored as the smallest override that reproduces it', () => {
    const base = loadGuideBase(guideId)
    const edited = JSON.parse(JSON.stringify(base))
    edited.objective = 'Reworded.'
    const sparse = sparseOverride(base, edited)
    // One sentence changed, one sentence stored — so a later platform correction to
    // any other line still reaches this firm.
    expect(sparse).toEqual({ objective: 'Reworded.' })
    expect(sparseOverride(base, JSON.parse(JSON.stringify(base)))).toBeUndefined()
  })

  test('an edited array is stored WHOLE, because deepMerge replaces arrays', () => {
    const base = loadGuideBase(guideId)
    const edited = JSON.parse(JSON.stringify(base))
    edited.stages[0].coaching_points[0] = 'Our version of the first coaching point.'
    const sparse = sparseOverride(base, edited)
    // A sparse array would silently drop every point the firm did not touch.
    expect(sparse.stages).toHaveLength(base.stages.length)
    expect(sparse.stages[0].coaching_points).toHaveLength(base.stages[0].coaching_points.length)
  })
})

describe('structure is fixed; words are editable', () => {
  const base = loadGuideBase('trial_fit')

  test('rewording any line is allowed', () => {
    const edited = JSON.parse(JSON.stringify(base))
    edited.objective = 'Different words, same shape.'
    edited.stages[0].name = 'A renamed stage.'
    expect(validateGuideOverride(base, edited, []).ok).toBe(true)
  })

  test('adding a stage is refused — that is authoring a method', () => {
    const edited = JSON.parse(JSON.stringify(base))
    edited.stages.push({ stage: 99, name: 'A stage the firm invented', key_principle: 'x', coaching_points: [] })
    const r = validateGuideOverride(base, edited, [])
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('stages')
  })

  test('removing a stage is refused', () => {
    const edited = JSON.parse(JSON.stringify(base))
    edited.stages.pop()
    expect(validateGuideOverride(base, edited, []).ok).toBe(false)
  })

  test('adding a field the platform never authored is refused', () => {
    const edited = JSON.parse(JSON.stringify(base))
    edited.a_field_we_invented = 'Text the walker would render and nobody authored.'
    const r = validateGuideOverride(base, edited, [])
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('a_field_we_invented')
  })

  test('changing a value from text to something else is refused', () => {
    const edited = JSON.parse(JSON.stringify(base))
    edited.objective = { nested: 'no' }
    expect(validateGuideOverride(base, edited, []).ok).toBe(false)
  })
})

describe('a guide whose file cannot be read', () => {
  test('serves nothing rather than a half-rendered block', () => {
    // Deliberately not mocking the filesystem: an unknown id exercises the same
    // "no base to render" branch, and a mocked fs here would test the mock.
    expect(formatGuideForPrompt('facilitation_101', { facilitation_101: { objective: 'x' } })).not.toBe('')
    expect(formatGuideForPrompt('not_a_guide', {})).toBe('')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE 3 ENGAGEMENT TYPES — item 4.16 D, built 2026-08-23.
//
// The sweep of 2026-08-16 called this "the only one with no page" and "genuinely
// homeless": three types x six authored fields that reached NO screen at any tier
// and NO prompt at all, because advisorEngine emitted a hardcoded three-line
// paraphrase in their place. Mike ruled the placement on 2026-08-23 — its OWN page,
// listed under Facilitation 101, not opened from it.
//
// These tests hold the two halves that made it a fix rather than half a fix: the
// page exists AND what a firm edits on it is what the model reads.
// ─────────────────────────────────────────────────────────────────────────────

describe('The 3 Engagement Types', () => {
  const ENGINE_KEYS = ['id', 'type', 'defaultEngagement']

  test('the machine keys are hidden from the screen and the prompt alike', () => {
    // Hidden in ONE place (loadGuideBase), so the screen and the prompt cannot
    // disagree about what the document contains — the guarantee this module exists
    // for. strategyResolver still reads the raw file, so the engine is unaffected.
    const content = loadGuideBase('engagement_types')
    for (const k of ENGINE_KEYS) { expect(Object.prototype.hasOwnProperty.call(content, k)).toBe(false) }
    for (const t of content.types) { expect(Object.prototype.hasOwnProperty.call(t, 'id')).toBe(false) }
    expect(formatGuideForPrompt('engagement_types')).not.toContain('domain-heuristic-vs-client-readiness')
  })

  test('all three types survive the hiding, with their six authored fields', () => {
    const content = loadGuideBase('engagement_types')
    expect(content.types).toHaveLength(3)
    for (const t of content.types) {
      for (const f of ['advisorDefinition', 'deliveryGuidance', 'driver', 'clientRequirement', 'advisorPosition', 'deliveryImperative']) {
        expect(typeof t[f]).toBe('string')
        expect(t[f].trim().length).toBeGreaterThan(0)
      }
    }
  })

  test('the prompt carries the authored wording, not the paraphrase it replaced', () => {
    // The exact sentence the hardcoded map used to send, so this fails if anybody
    // reinstates it, and the authored line that now goes in its place.
    const block = formatEngagementTypeForPrompt('education')
    expect(block).not.toContain('client lacks knowledge — teach and build up sequentially')
    expect(block).toContain('Client lacks the knowledge to make informed decisions.')
    expect(block).toContain('Sequential, foundational, build-up logic.')
    // camelCase keys read as words rather than as field names.
    expect(block).toContain('**Advisor definition:**')
    expect(block).not.toContain('AdvisorDefinition')
  })

  test('each type gets its OWN wording — the block is not the same for all three', () => {
    const e = formatEngagementTypeForPrompt('education')
    const f = formatEngagementTypeForPrompt('facilitation')
    const a = formatEngagementTypeForPrompt('advice')
    expect(new Set([e, f, a]).size).toBe(3)
    expect(f).toContain('Pace the reveal.')
    expect(a).toContain('Advice')
  })

  test("a firm's reworded wording reaches the model, fenced as data", () => {
    // The whole point of the page. A firm rewords delivery guidance; the model is
    // told the firm's sentence, inside the untrusted fence every overridden guide
    // gets — never as instructions it might follow.
    const overrides = { engagement_types: { types: [{ deliveryGuidance: 'Our firm teaches in ten-minute blocks.' }, {}, {}] } }
    const block = formatEngagementTypeForPrompt('education', overrides)
    expect(block).toContain('Our firm teaches in ten-minute blocks.')
    expect(block).toContain(OPEN)
    expect(block).toContain(CLOSE)
  })

  test('an unknown engagement type invents nothing', () => {
    expect(formatEngagementTypeForPrompt('nonsense')).toBe('')
    expect(formatEngagementTypeForPrompt('')).toBe('')
    expect(formatEngagementTypeForPrompt(undefined)).toBe('')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// LEARNING PSYCHOLOGY — item 4.35, built and named 2026-08-23.
//
// Mike: "the drivers of human performance, reaction to learning and 5 steps in
// making a new habit ... as a separate editable page ... showing under the
// facilitation 101 page and the engagement types pages." Named by him the same day.
//
// ⚠ THE PAGE IS "Learning Psychology"; THE RECORD IS STILL `productive_habits`.
// The id is the storage key a firm's saved wording is filed under, so it is not
// renamed with the page — doing so would orphan every override saved before the
// rename, silently. Same for data/productive-habits.json.
//
// 🔴 THE CONTENT IS TRANSCRIBED, NOT AUTHORED. The item says so in terms: these are
// the master app's own frameworks with their own wording, from 'Productive
// Habits.pdf'. These tests pin the exact source sentences, so a later edit that
// quietly rewrites the master template into something more fluent fails.
// ─────────────────────────────────────────────────────────────────────────────

describe('Learning Psychology', () => {
  const content = loadGuideBase('productive_habits')

  test('the five drivers are the template five, with the template definitions', () => {
    const drivers = content.five_drivers_of_human_output.drivers
    expect(drivers.map(d => d.name)).toEqual([
      'Knowledge',
      'Skill',
      'Resource (and Planning)',
      'Environment (internal / external)',
      'Mind Set (mental state / attitude)'
    ])
    // Verbatim from the source. Not a summary of it.
    expect(drivers[0].definition).toBe(
      'New Information that is mixed with past experience to create Self Relevance, Recognition and Comprehension.'
    )
    expect(drivers[4].definition).toContain('(self talk) dialogue')
  })

  test('the five habit steps are in order, each with the worked example', () => {
    const steps = content.five_steps_to_building_new_habits.steps
    expect(steps.map(s => s.name)).toEqual([
      'Reason', 'Trigger', 'Micro Habit', 'Effective Practice', 'Plan'
    ])
    expect(steps.map(s => s.step)).toEqual([1, 2, 3, 4, 5])
    for (const s of steps) {
      expect(typeof s.perspective).toBe('string')
      expect(s.example.trim().length).toBeGreaterThan(20)
    }
    expect(steps[2].example).toContain('2 packets per day')
  })

  test('the emotional reaction to learning keeps the line the whole idea rests on', () => {
    const e = content.emotional_reaction_to_learning
    expect(e.what_actually_happens).toContain('EMOTIONAL REACTION')
    expect(e.what_actually_happens).toContain('single biggest obstacle')
  })

  test('the learning path keeps all eleven stages, in order', () => {
    const path = content.progressive_learning_path.the_path_in_order
    expect(path).toHaveLength(11)
    expect(path[0]).toBe('Information')
    expect(path[path.length - 1]).toContain('Wisdom')
  })

  test('the ligatures the PDF font dropped are repaired, not left as holes', () => {
    // The source renders "e ectiveness", "Re ections", "sta ", " nish". A
    // transcription that shipped those would read as typos in front of a client.
    const all = JSON.stringify(content)
    for (const hole of ['e ectiveness', 'Re ection', 'sta  member', ' nish line', 'speci c']) {
      expect(all).not.toContain(hole)
    }
    expect(all).toContain('effectiveness')
    expect(all).toContain('Reflections')
  })

  test('every authored line reaches the prompt', () => {
    const rendered = formatGuideForPrompt('productive_habits')
    const authored = authoredStrings(content, [])
    expect(authored.filter(x => !rendered.includes(x))).toEqual([])
  })
})
