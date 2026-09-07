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

      b-message(v-if="saveError" type="is-danger" size="is-small") {{ saveError }}

      p.is-size-6.has-text-grey.py-4(v-if="!current.points.length && !current.setAside.length")
        | Your firm has not set anything for this kind of meeting yet. Your manager can add
        |  points on the Meeting Review tab.

      .mpre-pt(v-for="p in current.points" :key="p.id")
        span.mpre-box
        .mpre-body
          template(v-if="editingId === p.id")
            b-field(label="What you want to be reminded of" label-position="on-border")
              b-input(v-model="editText" :maxlength="300" type="textarea" rows="2")
            b-field(label="Words that hint it happened (optional)" label-position="on-border")
              b-input(v-model="editHints" placeholder="how are things at home · outside the business")
            .buttons.mt-2
              b-button(type="is-primary" size="is-small" :loading="saving" @click="saveEdit(p)") Save
              b-button(type="is-light" size="is-small" @click="cancelEdit") Cancel
          template(v-else)
            span {{ p.text }}
            //- Question 4, ruled by Mike 2026-09-08: EVERY point, always. A label that shows
            //- only sometimes teaches an advisor to read its absence as meaning something,
            //- and they will guess wrong.
            .mpre-src(:class="'is-' + p.sourceTier") {{ p.sourceLabel }}
        .mpre-acts(v-if="editingId !== p.id")
          //- Only a point YOU added can be edited or removed. Rewriting an inherited point
          //- would be editing your firm's words, which is the level above — P14.
          template(v-if="p.sourceTier === 'advisor'")
            b-button(size="is-small" type="is-text" @click="startEdit(p)") Edit
            b-button(size="is-small" type="is-text" :loading="saving" @click="removeOwn(p)") Remove
          b-button(
            v-else
            size="is-small" type="is-text" :loading="saving" @click="setAside(p, true)"
          ) Not for my meetings

      //- Shown rather than hidden, for the reason the manager's screen already carries:
      //- somebody who cannot see what they set aside cannot put it back, and would read the
      //- shorter list as the whole list.
      .mpre-off.mt-4(v-if="current.setAside.length")
        p.is-size-7.has-text-weight-semibold.mb-2 Not for my meetings
        .mpre-pt(v-for="p in current.setAside" :key="p.id")
          span.mpre-box.is-off
          .mpre-body
            span.has-text-grey {{ p.text }}
            .mpre-src(:class="'is-' + p.sourceTier") {{ p.sourceLabel }} · off for you only
          .mpre-acts
            b-button(size="is-small" type="is-text" :loading="saving" @click="setAside(p, false)") Put it back

      .mpre-add.mt-5
        template(v-if="adding")
          b-field(label="What you want to be reminded of" label-position="on-border")
            b-input(
              v-model="newText" :maxlength="300" type="textarea" rows="2"
              placeholder="I asked what had changed at home, not just in the business."
            )
          b-field(label="Words that hint it happened (optional)" label-position="on-border")
            b-input(v-model="newHints" placeholder="how are things at home · outside the business")
          .notification.is-light.is-size-7.mt-2
            | This is for your meetings only. Your firm's list is not changed, and nobody else
            |  sees this.
          .buttons.mt-2
            b-button(type="is-primary" :loading="saving" @click="addOwn") Add this point
            b-button(type="is-light" @click="cancelAdd") Cancel
        b-button(v-else type="is-light" @click="startAdd") Add a point of my own
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
 *   2. **No tick boxes that record anything, and the squares are list markers** — as they
 *      are in the drawing. ✅ THE OTHER HALF OF THIS NOTE IS NOW CLOSED: the drawing's "Add
 *      an objective" exists as **"Add a point of my own"**, built 2026-09-08 at the
 *      advisor's own level. ⚠ It is NOT the same thing the original drawing meant — that
 *      objective belonged to ONE MEETING, and this belongs to every meeting of this kind
 *      that this advisor runs. A per-meeting objective is still unbuilt.
 *   3. **No firm reference material.** The drawing puts the firm's script one tap away.
 *      The upload exists (`uploadDocument`); the join between a document and a set of
 *      observation points does not, and the drawing's own note calls that join the actual
 *      new work.
 *
 * The banner at the top says all of this in an advisor's language, because a screen that
 * quietly shows half a feature is how somebody concludes the feature is broken.
 *
 * ✅ NO LONGER READ-ONLY (2026-09-08). The advisor's own level is built, from
 * `design/mockups/meeting-preset-advisor-level.html` — drawn, all six of its questions ruled
 * by Mike, and approved to build from, all on that day. An advisor may set an inherited point
 * aside for themselves and add points of their own. 🔴 Mike's rule of 2026-09-02, "NOBODY can
 * edit a level ABOVE their own", is what permits this: the advisor's own level is BELOW the
 * firm's. What they change binds that level only — nothing here writes to the firm's standing
 * list, and no request shape can express doing so.
 *
 * 🔴 TWO OF THE SIX RULINGS CHANGED THE DRAWING RATHER THAN CONFIRMING IT, and both land on
 * this screen. Anyone comparing the build to the drawing's *recommendations* rather than its
 * *rulings* will think two things are wrong here:
 *
 *   - **Q1** — an advisor may set aside a point their FIRM set, and Mike ordered the recorded
 *     cost fixed rather than accepted: *"yes but fix the issue - build it so the manager can
 *     see"*. That is Stage C, on the manager's screen, not this one.
 *   - **Q5** — the advisor DOES get the "words that hint it happened" field. The
 *     recommendation was to withhold it (tuning what the AI listens for in your own
 *     assessment is marking your own homework); he took the argument recorded against it — a
 *     point the advisor wrote is the one the model is LEAST likely to recognise, so
 *     withholding the hints would have made their own additions the weakest entries on their
 *     own list.
 *
 * ⚠ THE BUSINESS-ENTITY LEVEL — "how I run meetings with THIS client" — is still unbuilt and
 * deliberately not drawn: it hangs off the client picker, which is empty without MySQL, and a
 * screen nobody can verify is how item 4.62's saved reports became "wired but never proven".
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
      saveError: '',
      saving: false,
      scenarios: [],
      scenarioId: '',
      /** The point being edited, and its draft. Only ever a point this advisor added. */
      editingId: '',
      editText: '',
      editHints: '',
      adding: false,
      newText: '',
      newHints: ''
    }
  },

  computed: {
    /** The scenario on screen. */
    current () {
      return this.scenarios.filter(s => s.id === this.scenarioId)[0] || null
    }
  },

  watch: {
    /**
     * Drop any half-finished edit when the advisor changes meeting type.
     *
     * Without this the draft follows them across, and "Save" writes wording meant for one
     * kind of meeting onto a point in another — the classic shared-draft fault, invisible
     * unless you edit, switch, and save.
     */
    scenarioId () {
      this.cancelEdit()
      this.cancelAdd()
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
        // `setAside` is defaulted per scenario rather than trusted from the response: the
        // template iterates it, and one scenario without it would throw during render and
        // take the whole page down — including the points that did arrive.
        this.scenarios = (data.scenarios || []).map(s => ({
          ...s,
          points: Array.isArray(s.points) ? s.points : [],
          setAside: Array.isArray(s.setAside) ? s.setAside : []
        }))
        if (this.scenarios.length && !this.scenarios.some(s => s.id === this.scenarioId)) {
          this.scenarioId = this.scenarios[0].id
        }
      } catch (err) {
        this.loadError = 'Your meeting checklist could not be loaded: ' + err.message
      } finally {
        this.loading = false
      }
    },

    // ── The advisor's own level (2026-09-08) ──────────────────────────────────────────
    //
    // 🔴 EVERY CALL BELOW SENDS NO ADVISOR ID. The backend takes it from the verified token
    // and nowhere else, so there is nothing here that could be tampered with to reach a
    // colleague's list. Do not "helpfully" add one.

    startEdit (point) {
      this.editingId = point.id
      this.editText = point.text
      this.editHints = (point.hintWords || []).join(' · ')
      this.adding = false
      this.saveError = ''
    },

    cancelEdit () {
      this.editingId = ''
      this.editText = ''
      this.editHints = ''
    },

    startAdd () {
      this.adding = true
      this.newText = ''
      this.newHints = ''
      this.cancelEdit()
      this.saveError = ''
    },

    cancelAdd () {
      this.adding = false
      this.newText = ''
      this.newHints = ''
    },

    /**
     * The hint field is one line of phrases; the backend wants a list.
     *
     * ⚠ Split on the middle dot ALONE, not on commas. A phrase the model listens for is
     * often a spoken clause — "so, what has changed at home" — and splitting on commas
     * would quietly cut it in two, leaving the model hunting for "so" in every transcript.
     *
     * @param {string} text
     * @returns {string[]}
     */
    hintsFrom (text) {
      return String(text || '')
        .split('·')
        .map(w => w.trim())
        .filter(w => w)
    },

    /**
     * Take an inherited point off MY list, or put it back.
     *
     * Mike ruled on 2026-09-08 that an advisor may set aside a point their firm set. It
     * binds this advisor's level only; the firm's list is untouched, which is what the
     * "off for you only" line on screen tells them.
     *
     * @param {object} point
     * @param {boolean} declined
     * @returns {Promise<void>}
     */
    async setAside (point, declined) {
      await this.write('POST', '/api/meeting/observations/decline', {
        scenario: this.scenarioId, pointId: point.id, declined
      })
    },

    /** Add a point only I am checked on. */
    async addOwn () {
      const ok = await this.write('POST', '/api/meeting/observations/own', {
        scenario: this.scenarioId,
        text: this.newText,
        hintWords: this.hintsFrom(this.newHints)
      })
      if (ok) { this.cancelAdd() }
    },

    /** Save an edit to a point I added. */
    async saveEdit (point) {
      const ok = await this.write('PUT', '/api/meeting/observations/own', {
        scenario: this.scenarioId,
        pointId: point.id,
        text: this.editText,
        hintWords: this.hintsFrom(this.editHints)
      })
      if (ok) { this.cancelEdit() }
    },

    /** Remove a point I added. A POST, because Restify 9 does not parse a DELETE body. */
    async removeOwn (point) {
      await this.write('POST', '/api/meeting/observations/own/remove', {
        scenario: this.scenarioId, pointId: point.id
      })
    },

    /**
     * One write, then a re-read so the screen shows what was actually stored.
     *
     * ⚠ IT RE-READS RATHER THAN PATCHING LOCAL STATE. The resolved list is computed on the
     * backend from four tiers plus this advisor's layer; guessing the result here is how a
     * screen and a store drift apart, and the advisor would be the last to know.
     *
     * @param {string} method
     * @param {string} path
     * @param {object} body
     * @returns {Promise<boolean>} true when it saved
     */
    async write (method, path, body) {
      this.saving = true
      this.saveError = ''
      let saved = false
      try {
        const res = await fetch(path, {
          method,
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error((err.error && err.error.message) || res.statusText)
        }
        saved = true
      } catch (err) {
        this.saveError = 'That could not be saved: ' + err.message
      }
      this.saving = false
      if (saved) { await this.load() }
      return saved
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
.mpre-box.is-off { border-style: dashed; }
.mpre-body { flex: 1; min-width: 0; }
.mpre-acts { flex: 0 0 auto; margin-left: auto; }
/* The source line. Colour follows the tier so a scan down the list separates the firm's
   standard from the advisor's own additions without reading every word. */
.mpre-src {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  margin-top: 0.2rem;
  color: #5b6f8a;
}
.mpre-src.is-platform { color: #5b4b9e; }
.mpre-src.is-firm { color: #002b64; }
.mpre-src.is-advisor { color: #00857a; }
</style>
