'use strict'

/**
 * The consent wording, held against the artefact it was approved in.
 *
 * 🔴 `CLAUDE.md` SAYS NOT TO ASSERT THE WORDING OF LABELS, AND THIS FILE IS THE NAMED
 * EXCEPTION TO THAT RULE — so here is why, next to the data it protects. That rule's own
 * carve-out is *"where wording genuinely must not drift — a regulatory phrase, wording Mike
 * has explicitly approved — pin it in ONE test next to the data it protects"*. This is the
 * only text in the entire application that is **a promise made aloud to somebody outside the
 * firm**. It was approved by Mike on 2026-09-01 as candidate B, a firm may not edit it, and it
 * needs a lawyer's reading in each of the eight markets. A person in UAT reads a plausible
 * sentence on screen and cannot tell that a clause has gone.
 *
 * 🔴 AND THE CLAUSE MOST LIKELY TO BE TRIMMED IS THE ONE THAT MUST NEVER BE. The wording
 * artefact §1 constraint 6: *"It must say that software reads it. This is the clause most
 * likely to be cut for being awkward, and it is the one that must not be. 'I'm recording this
 * for my notes' is a materially different proposition from 'this is transcribed and analysed
 * by AI', and a client who later learns the difference was misled, whatever the tick-box
 * said."* So the AI clause is asserted on its own, not merely as part of the whole.
 *
 * 🔴 THE SECOND HALF IS THE RETENTION FIGURE, AND IT IS A BUILD TRAP THE ARTEFACT NAMES IN
 * BOLD. The wording is fixed; the retention period inside it is NOT — a firm may move its own
 * clock (Brief P8) and the sentence quotes that figure back to the client. A build that types
 * "18 months" into the string has advisors telling clients something untrue the day a firm
 * changes the dial, with nothing on screen to show it. So the placeholder is pinned, and the
 * strings are scanned for a hardcoded period.
 */

const fs = require('fs')
const path = require('path')

const en = require('../../locales/en.json')
const ARTEFACT = fs.readFileSync(
  path.resolve(__dirname, '../../design/MEETING-CONSENT-WORDING.md'), 'utf8'
)

/** Collapse markdown blockquote marks and wrapping so a quoted line can be compared. */
function flatten (text) {
  return text.replace(/^[\s>]*/gm, ' ').replace(/\s+/g, ' ').trim()
}

describe('the spoken line is the one in the approved artefact', () => {
  test('it appears in design/MEETING-CONSENT-WORDING.md, word for word', () => {
    // The build is checked against the ARTEFACT rather than against a paraphrase of it —
    // `CLAUDE.md`, "Save the Artefact". This is the assertion that makes that rule mechanical
    // instead of a habit somebody has to remember.
    expect(flatten(ARTEFACT)).toContain(flatten(en.meetingConsent.spokenLine))
  })

  test('it discloses that AI reads the recording', () => {
    expect(en.meetingConsent.spokenLine).toContain('transcript by AI')
  })

  test('it says the recording is deleted', () => {
    expect(en.meetingConsent.spokenLine).toContain('deleted as soon as')
  })

  test('it promises nothing leaves the firm — the sentence Brief P13 exists to protect', () => {
    // ⚠ If a future change ever sends transcripts or observations to Advisor-e, as
    // `case-reviews.md` already does for cases under a separate double consent, THIS SENTENCE
    // BECOMES A LIE TOLD TO A NAMED PERSON OUT LOUD. It is the one sentence in this feature a
    // later change can silently falsify, which is why it is promoted to a rule a developer
    // reads and pinned here as well.
    expect(en.meetingConsent.spokenLine).toContain('Nothing is shared outside our firm')
  })

  test('it invites an audible answer rather than merely informing', () => {
    // Artefact §1 constraint 4: silence is not consent. A line ending "…just so you know"
    // does not get a clear affirmative act; one ending in a question does.
    expect(en.meetingConsent.spokenLine.trim().endsWith('?')).toBe(true)
  })

  test('it covers everyone present, not only the client', () => {
    // Constraint 5: a colleague, a spouse, a business partner sitting in — each is a person
    // being recorded.
    expect(en.meetingConsent.spokenLine).toContain('everyone here')
  })
})

describe('the retention figure is rendered, never written into the words', () => {
  test('the sentence carries a placeholder', () => {
    expect(en.meetingConsent.step1Retention).toContain('{months}')
  })

  test('no consent string hardcodes a retention period', () => {
    // 🔴 THE BUILD TRAP, ASSERTED. Any "18 months", "24 months", "2 years" written into these
    // strings would survive review easily and be wrong the moment a firm moved its dial.
    const strings = Object.keys(en.meetingConsent)
      .filter(k => k !== '_note')
      .map(k => en.meetingConsent[k])
    strings.forEach((value) => {
      expect(value).not.toMatch(/\b\d+\s*(month|months|year|years)\b/i)
    })
  })
})

describe('the two-step screen, because the ORDER is the safeguard', () => {
  test('step one tells the advisor to read the line once recording starts', () => {
    // Record → speak → confirm. An earlier draft ticked "I have read the consent line aloud"
    // BEFORE recording began — past tense, which puts the client's agreement outside the
    // audio. Mike caught it while checking the flow back. The words did not change; where
    // they sit did, and this is the half of that correction a string can hold.
    expect(en.meetingConsent.step1Lede).toContain('as soon as recording starts')
  })

  test('step two asks whether everyone agreed, in the past tense, while recording runs', () => {
    expect(en.meetingConsent.step2Question).toContain('Did everyone agree')
  })

  test('the refusal option destroys rather than merely stopping', () => {
    // Artefact §4: refusing means stop AND delete — the audio and any transcript already made
    // from it. A button reading only "Stop" would leave a half-meeting the client asked to end.
    expect(en.meetingConsent.step2No.toLowerCase()).toContain('delete')
  })
})

describe('the components do not carry their own copy of any of this', () => {
  const read = f => fs.readFileSync(path.resolve(__dirname, '../../', f), 'utf8')

  test('the consent panel takes the retention figure as a prop, never a literal', () => {
    // A second copy of the number in a template is exactly how the artefact's warning comes
    // true, and it would look completely normal on screen.
    const source = read('components/MeetingConsentPanel.vue')
    const template = /<template lang="pug">([\s\S]*?)<\/template>/.exec(source)[1]
    expect(template).not.toMatch(/\b\d+\s*months?\b/i)
    expect(template).toContain('retentionPhrase')
  })

  test('the spoken line exists in no component — it comes from the locale file', () => {
    // One copy of these words in this repository. A component holding its own would drift
    // from the lawyer-checked version and nobody would see the two side by side.
    const fragment = 'Before we begin'
    expect(read('components/MeetingConsentPanel.vue')).not.toContain(fragment)
    expect(read('components/MeetingRecorder.vue')).not.toContain(fragment)
  })
})
