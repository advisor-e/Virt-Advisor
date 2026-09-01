<template lang="pug">
.mpre
  //- The "not built yet" banner that stood here was REMOVED in slice 3, because every one of
  //- the three things it named as still to come is now built: recording (slice 2), the client
  //- summary and the coaching notes (slice 3). A banner that is no longer true is worse than
  //- no banner — it tells an advisor a working feature is missing.

  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  b-message(v-else-if="loadError" type="is-danger" size="is-small")
    | {{ loadError }}
    br
    | Nothing was loaded, so this page is empty for a reason rather than because there is
    |  nothing to show.

  template(v-else)
    b-field(label="What kind of meeting?" label-position="on-border")
      b-select(v-model="scenarioId" expanded)
        option(v-for="s in scenarios" :key="s.id" :value="s.id") {{ s.name }}

    .box.mt-4(v-if="current")
      h3.title.is-5.mb-1 What is this meeting for?
      p.is-size-7.has-text-grey.mb-4
        | This is what your firm checks on in a meeting of this kind. Read it before you go
        |  in — that is most of the value, before anything is recorded at all.

      p.is-size-6.has-text-grey.py-4(v-if="!current.points.length")
        | Your firm has not set anything for this kind of meeting yet. Your manager can add
        |  points on the Meeting Review tab.

      .mpre-pt(v-for="p in current.points" :key="p.id")
        span.mpre-box
        span {{ p.text }}
</template>

<script>
/**
 * MeetingPreset — what an advisor is checked on, shown BEFORE the meeting.
 *
 * Design `design/features/meeting-review.md` §3; artefact
 * `design/mockups/meeting-review.html` **Stage B1**, approved by Mike 2026-09-01.
 *
 * 🔴 WHY THIS EXISTS BEFORE ANY RECORDING DOES. The Brief §3 says the list "is then shown
 * to them before they walk in, which is the first place this feature pays, before a word is
 * recorded" — and `MEETING-CONSENT-WORDING.md` §4 relies on the same thing: when a client
 * declines to be recorded, "the meeting then proceeds unrecorded, and the pre-set
 * observation list is still shown, because it is useful on its own". So this screen is not
 * a stub waiting for the rest; it is the half that works with nothing else built.
 *
 * ⚠ THREE DELIBERATE DIFFERENCES FROM THE APPROVED DRAWING, named rather than left to be
 * discovered (`CLAUDE.md`, Save the Artefact):
 *
 *   1. **No "Start the meeting" button.** ⚠ SUPERSEDED IN PART: when this was written there
 *      was no recording, transcript or report in the repository, so a button would have
 *      started nothing. All three now exist (slices 2 and 3). The button is still absent
 *      because recording begins on `/meeting-record`, where the consent screen is — starting
 *      a recording from a page that does not show the consent wording would defeat P1.
 *   2. **No "Add an objective", and no tick boxes that record anything.** An objective an
 *      advisor adds belongs to ONE MEETING, and meetings do not exist yet — storing it
 *      against the firm's standing list would change what every advisor here is checked
 *      on. The squares are list markers, as they are in the drawing.
 *   3. **No firm reference material.** The drawing puts the firm's script one tap away.
 *      The upload exists (`uploadDocument`); the join between a document and a set of
 *      observation points does not, and the drawing's own note calls that join the actual
 *      new work.
 *
 * The banner at the top says all of this in an advisor's language, because a screen that
 * quietly shows half a feature is how somebody concludes the feature is broken.
 *
 * READ-ONLY BY CONSTRUCTION. The backend has no advisor write route at all — one advisor
 * editing this list would change what every advisor in the firm is measured against.
 *
 * Vue 2 Options API, Pug, Buefy.
 */
export default {
  name: 'MeetingPreset',

  props: {
    /** The caller's bearer token; the backend re-checks authorisation on every call. */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: true,
      loadError: '',
      scenarios: [],
      scenarioId: ''
    }
  },

  computed: {
    /** The scenario on screen. */
    current () {
      return this.scenarios.filter(s => s.id === this.scenarioId)[0] || null
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /**
     * Read every meeting type with the points in force for this advisor's firm.
     *
     * A failure is SHOWN, never swallowed into an empty page — `advisor-progression.md` §1
     * and Brief P11: a tidy page of nothing must not be what a failure looks like.
     */
    async load () {
      this.loading = true
      this.loadError = ''
      try {
        const res = await fetch('/api/meeting/observations', {
          headers: { Authorization: `Bearer ${this.apiToken}` }
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error((err.error && err.error.message) || res.statusText)
        }
        const data = await res.json()
        this.scenarios = data.scenarios || []
        if (this.scenarios.length) { this.scenarioId = this.scenarios[0].id }
      } catch (err) {
        this.loadError = 'Your meeting checklist could not be loaded: ' + err.message
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.mpre-pt {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid #f0f3f7;
}
.mpre-pt:last-child { border-bottom: 0; }
.mpre-box {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  margin-top: 0.2rem;
  border: 1.5px solid #c8d2df;
  border-radius: 3px;
}
</style>
