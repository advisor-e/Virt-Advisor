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
    .columns.is-variable.is-3
      .column
        b-field(label="What kind of meeting?" label-position="on-border")
          b-select(v-model="scenarioId" expanded)
            option(v-for="s in scenarios" :key="s.id" :value="s.id") {{ s.name }}
      .column
        //- The business-entity level (2026-09-10): the same register the recorder reads, the
        //- same default. With nobody picked this is the screen it always was.
        b-field(label="Who is this meeting with?" label-position="on-border")
          b-select.mpre-client(v-model="clientId" expanded)
            option(value="") Nobody in particular
            option(v-for="c in clients" :key="c.id" :value="c.id") {{ c.name }}
    p.is-size-7.has-text-grey.mb-3
      | Pick a client to see, and change, what you check on with them in particular. Leave it
      |  as it is and you see your usual list.
    p.is-size-7.has-text-danger.mb-3(v-if="clientsError") {{ clientsError }}

    .box.mt-2(v-if="current")
      h3.title.is-5.mb-1 What is this meeting for?
      p.is-size-7.has-text-grey.mb-4(v-if="clientId")
        | This is what you are checked on in a meeting of this kind with
        |  #[strong {{ clientName }}]. Read it before you go in — that is most of the value,
        |  before anything is recorded at all.
      p.is-size-7.has-text-grey.mb-4(v-else)
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
            b-field(:label="reminderLabel" label-position="on-border")
              b-input(v-model="editText" :maxlength="300" type="textarea" rows="2")
            //- The checkbox gates the hint field, exactly as the manager's screen does
            //- (FirmMeetingObservations.vue) — hint phrases are read ONLY for a point carrying
            //- this flag, so offering them without it is a field nothing can reach.
            b-checkbox.mt-2(v-model="editCannotHear" size="is-small")
              | This cannot be heard on a recording
            b-field.mt-2(
              v-if="editCannotHear"
              label="Words that hint it happened (optional)"
              label-position="on-border")
              b-input(v-model="editHints" placeholder="how are things at home · outside the business")
            .buttons.mt-2
              b-button(type="is-primary" size="is-small" :loading="saving" @click="saveEdit(p)") Save
              b-button(type="is-light" size="is-small" @click="cancelEdit") Cancel
          template(v-else)
            span {{ p.text }}
            //- Question 4 (2026-09-08, and again 2026-09-10 for the client level): EVERY
            //- point, always. A client-level label already carries the name of who set it.
            .mpre-src(:class="'is-' + p.sourceTier") {{ p.sourceLabel }}
        .mpre-acts(v-if="editingId !== p.id")
          //- Only a point written at THIS level can be edited or removed here. Rewriting an
          //- inherited point would be editing the level above — P14. Inside a client's list the
          //- advisor's own points are theirs alone and are edited on their own list.
          template(v-if="p.sourceTier === editableTier")
            b-button(size="is-small" type="is-text" @click="startEdit(p)") Edit
            b-button(size="is-small" type="is-text" :loading="saving" @click="removeOwn(p)") Remove
          b-button(
            v-else-if="canSetAside(p)"
            size="is-small" type="is-text" :loading="saving" @click="setAside(p, true)"
          ) {{ setAsideVerb }}

      //- Shown rather than hidden, for the reason the manager's screen already carries:
      //- somebody who cannot see what they set aside cannot put it back, and would read the
      //- shorter list as the whole list.
      .mpre-off.mt-4(v-if="current.setAside.length")
        p.is-size-7.has-text-weight-semibold.mb-2 {{ setAsideVerb }}
        .mpre-pt(v-for="p in current.setAside" :key="p.id")
          span.mpre-box.is-off
          .mpre-body
            span.has-text-grey {{ p.text }}
            .mpre-src(:class="'is-' + p.sourceTier") {{ p.sourceLabel }} · {{ clientId ? p.setAsideLabel : 'off for you only' }}
          .mpre-acts
            b-button(size="is-small" type="is-text" :loading="saving" @click="setAside(p, false)") Put it back

      .mpre-add.mt-5
        template(v-if="adding")
          b-field(:label="reminderLabel" label-position="on-border")
            b-input(
              v-model="newText" :maxlength="300" type="textarea" rows="2"
              :placeholder="clientId ? 'The succession question was raised again, gently — last time it closed the conversation.' : 'I asked what had changed at home, not just in the business.'"
            )
          b-checkbox.mt-2(v-model="newCannotHear" size="is-small")
            | This cannot be heard on a recording
          b-field.mt-2(
            v-if="newCannotHear"
            label="Words that hint it happened (optional)"
            label-position="on-border")
            b-input(v-model="newHints" placeholder="how are things at home · outside the business")
          .notification.is-light.is-size-7.mt-2(v-if="clientId")
            | This is for meetings with this client only. Whoever in your firm meets them will
            |  see it, and your firm's list is not changed.
          .notification.is-light.is-size-7.mt-2(v-else)
            | This is for your meetings only. Your firm's list is not changed, and nobody else
            |  sees this.
          .buttons.mt-2
            b-button(type="is-primary" :loading="saving" @click="addOwn") Add this point
            b-button(type="is-light" @click="cancelAdd") Cancel
        b-button(v-else type="is-light" @click="startAdd") {{ clientId ? 'Add a point for this client' : 'Add a point of my own' }}
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
 *      advisor's own level, and as **"Add a point for this client"**, built 2026-09-10 at the
 *      client's. ⚠ Neither is the same thing the original drawing meant — that objective
 *      belonged to ONE MEETING. A per-meeting objective is still unbuilt.
 *   3. **No firm reference material.** The drawing puts the firm's script one tap away.
 *      The upload exists (`uploadDocument`); the join between a document and a set of
 *      observation points does not, and the drawing's own note calls that join the actual
 *      new work.
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
 * 🔴 **ONE DEVIATION FROM THE APPROVED DRAWING, ruled by Mike 2026-09-08 and deliberate.**
 * The mockup has no "This cannot be heard on a recording" checkbox; this screen does, above
 * the hint field and gating it, with the manager's own approved wording reused rather than new
 * words invented. It is here because Q5's field did nothing without it: hint phrases are read
 * only by `meetingReports.cannotHearFindings`, which sees only points carrying that flag, and
 * they never reach the model at all — they are a local transcript search that ASKS the advisor
 * to confirm. Marking their own point un-hearable serves Q5's reasoning better than feeding
 * the model would: the point is not judged rather than judged badly, and the finding stays the
 * advisor's confirmation (his rule of 2026-09-01) instead of a guess they were able to tune.
 *
 * ✅ THE BUSINESS-ENTITY LEVEL — "how I run meetings with THIS client" — IS BUILT (2026-09-10),
 * from `design/mockups/meeting-preset-client-level.html`, all five questions ruled by Mike the
 * same day. It is the bottom of the cascade. A second picker asks who the meeting is with, from
 * the same register the recorder reads; with a client picked the list is that relationship's,
 * resolved firm → this advisor's own layer → the client's, on the backend. 🔴 ONE SHARED LIST
 * PER CLIENT, edited by any advisor in the firm and naming who set each entry (Q1, Q3, Q4);
 * it can only set aside or add, never put back a point the advisor set aside for themselves
 * (Q2); and there is NO MANAGER SCREEN for it (Q5) — a firm manager opens this one, in Mike's
 * words: *"it's the PARTNER or firm manager that owns the client data base - NOT the advisor.
 * WHY are we building two levels of this??"*.
 *
 * Vue 2 Options API, Pug, Buefy.
 */

/** The routes for each level. Client paths carry the client id; the advisor's never carry theirs. */
const PATHS = {
  advisor: {
    list: () => '/api/meeting/observations',
    decline: '/api/meeting/observations/decline',
    own: '/api/meeting/observations/own',
    remove: '/api/meeting/observations/own/remove'
  },
  client: {
    list: id => '/api/meeting/observations/client/' + encodeURIComponent(id),
    decline: '/api/meeting/observations/client/decline',
    own: '/api/meeting/observations/client/own',
    remove: '/api/meeting/observations/client/own/remove'
  }
}

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
      /** The firm's client register — names only, as `/api/clients` returns them. */
      clients: [],
      clientsError: '',
      /** The client this meeting is with; empty means the advisor's usual list. */
      clientId: '',
      /** The point being edited, and its draft. Only ever a point written at this level. */
      editingId: '',
      editText: '',
      editHints: '',
      editCannotHear: false,
      adding: false,
      newText: '',
      newHints: '',
      newCannotHear: false
    }
  },

  computed: {
    /** The scenario on screen. */
    current () {
      return this.scenarios.filter(s => s.id === this.scenarioId)[0] || null
    },
    /** Which level this screen is editing: the client's when one is picked, else the advisor's. */
    level () {
      return this.clientId ? 'client' : 'advisor'
    },
    /** The tier whose points may be edited or removed here. */
    editableTier () {
      return this.level
    },
    clientName () {
      const c = this.clients.filter(x => x.id === this.clientId)[0]
      return c ? c.name : ''
    },
    /** The set-aside verb and section heading, which carry the level in the label. */
    setAsideVerb () {
      return this.clientId ? 'Not with this client' : 'Not for my meetings'
    },
    reminderLabel () {
      return this.clientId
        ? 'What you want to be reminded of, with ' + this.clientName
        : 'What you want to be reminded of'
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
    },
    /** A different client is a different list: drop drafts and re-read. */
    clientId () {
      this.cancelEdit()
      this.cancelAdd()
      this.load()
    }
  },

  mounted () {
    this.load()
    this.loadClients()
  },

  methods: {
    /**
     * Read every meeting type with the points in force — for this advisor's firm, or for
     * meetings with the picked client.
     *
     * A failure is SHOWN, never swallowed into an empty page — `advisor-progression.md` §1
     * and Brief P11: a tidy page of nothing must not be what a failure looks like.
     */
    async load () {
      this.loading = true
      this.loadError = ''
      try {
        const res = await fetch(PATHS[this.level].list(this.clientId), {
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

    /**
     * The firm's client register, for the picker. A failure leaves the picker on "Nobody in
     * particular" and says so in one line — the usual list still loads.
     */
    async loadClients () {
      this.clientsError = ''
      try {
        const res = await fetch('/api/clients', {
          headers: { Authorization: `Bearer ${this.apiToken}` }
        })
        if (!res.ok) { throw new Error(res.statusText || 'request failed') }
        const data = await res.json()
        this.clients = (data.clients || []).filter(c => c && c.id && c.name)
      } catch (err) {
        this.clients = []
        this.clientsError = "Your firm's client list could not be loaded, so a client cannot be picked here: " + err.message
      }
    },

    /**
     * Whether "Not with this client" / "Not for my meetings" is offered for a point.
     *
     * At the advisor's level every inherited point may be set aside. Inside a client's list
     * the advisor's OWN points are not offered: they are one person's, invisible to every
     * colleague, and are edited on that advisor's own list — a judgement stated, not assumed.
     */
    canSetAside (point) {
      if (point.sourceTier === this.editableTier) { return false }
      if (this.clientId && point.sourceTier === 'advisor') { return false }
      return true
    },

    // ── Editing at this level ─────────────────────────────────────────────────────────
    //
    // 🔴 EVERY CALL BELOW SENDS NO ADVISOR ID. The backend takes it from the verified token
    // and nowhere else, so there is nothing here that could be tampered with to reach a
    // colleague's list — or to sign a colleague's name to a client-level entry. Do not
    // "helpfully" add one. The CLIENT id is sent, and the backend checks it against the
    // firm's own register before every read and write.

    startEdit (point) {
      this.editingId = point.id
      this.editText = point.text
      this.editHints = (point.hintWords || []).join(' · ')
      this.editCannotHear = Boolean(point.cannotHear)
      this.adding = false
      this.saveError = ''
    },

    cancelEdit () {
      this.editingId = ''
      this.editText = ''
      this.editHints = ''
      this.editCannotHear = false
    },

    startAdd () {
      this.adding = true
      this.newText = ''
      this.newHints = ''
      this.newCannotHear = false
      this.cancelEdit()
      this.saveError = ''
    },

    cancelAdd () {
      this.adding = false
      this.newText = ''
      this.newHints = ''
      this.newCannotHear = false
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

    /** The body every write carries: the scenario, and the client when one is picked. */
    scope () {
      return this.clientId
        ? { scenario: this.scenarioId, clientId: this.clientId }
        : { scenario: this.scenarioId }
    },

    /**
     * Take an inherited point off this level's list, or put it back.
     *
     * At the advisor's level it binds that advisor only ("off for you only"). At the client's
     * it binds everyone in the firm who meets that client, and the entry names who did it.
     *
     * @param {object} point
     * @param {boolean} declined
     * @returns {Promise<void>}
     */
    async setAside (point, declined) {
      await this.write('POST', PATHS[this.level].decline, { ...this.scope(), pointId: point.id, declined })
    },

    /** Add a point at this level. */
    async addOwn () {
      const ok = await this.write('POST', PATHS[this.level].own, {
        ...this.scope(),
        text: this.newText,
        // Sent even when false, for the reason the manager's screen sends it: a dropped false
        // leaves an earlier true standing while the box shows unticked.
        cannotHear: this.newCannotHear,
        hintWords: this.newCannotHear ? this.hintsFrom(this.newHints) : []
      })
      if (ok) { this.cancelAdd() }
    },

    /** Save an edit to a point written at this level. */
    async saveEdit (point) {
      const ok = await this.write('PUT', PATHS[this.level].own, {
        ...this.scope(),
        pointId: point.id,
        text: this.editText,
        cannotHear: this.editCannotHear,
        // Unticking clears the phrases rather than leaving them stored where nothing reads them.
        hintWords: this.editCannotHear ? this.hintsFrom(this.editHints) : []
      })
      if (ok) { this.cancelEdit() }
    },

    /** Remove a point written at this level. A POST, because Restify 9 does not parse a DELETE body. */
    async removeOwn (point) {
      await this.write('POST', PATHS[this.level].remove, { ...this.scope(), pointId: point.id })
    },

    /**
     * One write, then a re-read so the screen shows what was actually stored.
     *
     * ⚠ IT RE-READS RATHER THAN PATCHING LOCAL STATE. The resolved list is computed on the
     * backend from four tiers plus the advisor's layer plus the client's; guessing the result
     * here is how a screen and a store drift apart, and the advisor would be the last to know.
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
   standard, the advisor's own additions and the client's from one another without reading
   every word. Amber for the client is the drawing's hue. */
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
.mpre-src.is-client { color: #b56200; }
</style>
