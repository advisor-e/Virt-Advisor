<template lang="pug">
.mcon
  //- ── Step one: before recording starts ────────────────────────────────
  template(v-if="step === 1")
    h3.title.is-5.mb-2 {{ $t('meetingConsent.step1Heading') }}
    p.is-size-7.has-text-grey.mb-4 {{ $t('meetingConsent.step1Lede') }}

    .mcon-spoken
      p.mcon-who {{ $t('meetingConsent.approvedNote') }}
      q.mcon-line {{ $t('meetingConsent.spokenLine') }}

    p.is-size-7.mt-4(v-if="retentionPhrase") {{ retentionSentence }}
    b-message.mt-4(v-else type="is-warning" size="is-small")
      | How long your firm keeps transcripts could not be read, so this screen cannot tell
      |  your client. Recording is unavailable until it can.

    .buttons.mt-4
      b-button(
        type="is-primary"
        :disabled="!retentionPhrase"
        :loading="busy"
        @click="$emit('start')") {{ $t('meetingConsent.step1Start') }}
      b-button(type="is-light" @click="$emit('cancel')") {{ $t('meetingConsent.step1Cancel') }}

  //- ── Step two: recording is already running ───────────────────────────
  template(v-else)
    .mcon-bar
      span.mcon-blip
      span.mcon-clock {{ clock }}
      span.mcon-say {{ $t('meetingConsent.step2Bar') }}

    h3.title.is-5.mb-2 {{ $t('meetingConsent.step2Heading') }}

    .mcon-spoken
      p.mcon-who {{ $t('meetingConsent.repeatNote') }}
      q.mcon-line {{ $t('meetingConsent.spokenLine') }}

    h4.title.is-6.mt-4.mb-2 {{ $t('meetingConsent.step2Question') }}
    .buttons
      b-button(type="is-primary" :loading="busy" @click="$emit('agree')") {{ $t('meetingConsent.step2Yes') }}
      b-button(type="is-danger" :loading="busy" @click="$emit('refuse')") {{ $t('meetingConsent.step2No') }}
</template>

<script>
/**
 * MeetingConsentPanel — the two consent steps, in the approved words.
 *
 * Artefact: `design/MEETING-CONSENT-WORDING.md` (the words) and
 * `design/mockups/meeting-review.html` Stage **B2** and **B3** (the screens), both approved
 * by Mike 2026-09-01. Design `design/features/meeting-review.md` P1.
 *
 * 🔴 THIS COMPONENT RENDERS AND EMITS. IT RECORDS NOTHING. All capture, upload and deletion
 * live in `MeetingRecorder.vue`. The separation is deliberate: these are the only words in
 * the application that are a promise made aloud to somebody outside the firm, and they are
 * easier to keep correct in a file that does nothing else.
 *
 * 🔴 THE ORDER IS RECORD → SPEAK → CONFIRM, AND STEP TWO IS SHOWN WHILE RECORDING RUNS.
 * An earlier draft of this screen was a single panel whose tick read "I have read the consent
 * line aloud" — past tense, which puts the client's agreement OUTSIDE the audio. Mike caught
 * it while checking the flow back. The words did not change; where they sit did. A future
 * change that merges these two steps back into one re-introduces that fault, and every screen
 * would still look right.
 *
 * 🔴 THE WORDS COME FROM `$t()`, AND A FIRM MAY NOT EDIT THEM. One lawyer-checked version per
 * market (Mike, 2026-09-01) — there is no firm-level override and no prop that carries
 * wording. ⚠ The other seven locales are deliberately NOT filled in yet: the wording page §5
 * requires a translator competent in the local law, because the law on recording a private
 * conversation is not uniform across the eight markets and Germany treats it under criminal
 * law rather than data-protection law.
 *
 * 🔴 THE RETENTION FIGURE IS A PROP, NEVER A LITERAL. P8 lets a firm move its own clock and
 * this sentence quotes the figure back to the client out loud. Typing "18 months" into the
 * string would have advisors saying something untrue the day a firm changes the dial, with
 * nothing on screen to show it. If the figure could not be read, the panel says so and
 * refuses to start — an unknown number is not something to guess at in front of a client.
 *
 * Vue 2 Options API, Pug, Buefy.
 */
export default {
  name: 'MeetingConsentPanel',

  props: {
    /** Which step is on screen: 1 before recording, 2 while it runs. */
    step: {
      type: Number,
      required: true,
      validator: v => v === 1 || v === 2
    },
    /** The firm's retention period, already worded — e.g. "18 months". Empty when unknown. */
    retentionPhrase: { type: String, default: '' },
    /** Seconds captured so far, shown on step 2's bar. */
    elapsedSeconds: { type: Number, default: 0 },
    /** True while a request is in flight, so a button cannot be pressed twice. */
    busy: { type: Boolean, default: false }
  },

  computed: {
    /** The approved retention sentence with this firm's figure substituted. */
    retentionSentence () {
      return this.$t('meetingConsent.step1Retention').replace('{months}', this.retentionPhrase)
    },

    /** mm:ss, as the drawing shows it. */
    clock () {
      const total = Math.max(0, Math.floor(this.elapsedSeconds))
      const mins = Math.floor(total / 60)
      const secs = total % 60
      return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0')
    }
  }

  // Events emitted, with their payloads:
  //   start  — no payload. Begin capture, then show step 2.
  //   cancel — no payload. Leave without recording.
  //   agree  — no payload. Everyone present agreed; keep recording.
  //   refuse — no payload. Stop and destroy everything captured.
}
</script>

<style scoped>
/* The spoken line is set apart because it is read aloud verbatim, not skimmed. */
.mcon-spoken {
  border-left: 3px solid #00857a; /* BRAND-TOKENS.md § Journey stages — Teal, the live stage */
  background: #f2f9f8;
  padding: 0.9rem 1rem;
  border-radius: 4px;
}
.mcon-who {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #00857a;
  margin-bottom: 0.4rem;
}
.mcon-line {
  display: block;
  font-size: 1.02rem;
  line-height: 1.55;
  color: #16202c;
}
.mcon-bar {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.6rem 0.85rem;
  border-radius: 4px;
  background: #fff2f2;
  margin-bottom: 1rem;
}
/* Danger red, and nothing else on this page uses it — so "recording" reads at a glance. */
.mcon-blip {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff0000;
}
.mcon-clock {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: #ff0000;
}
.mcon-say {
  font-size: 0.78rem;
  color: #6b7785;
}
</style>
