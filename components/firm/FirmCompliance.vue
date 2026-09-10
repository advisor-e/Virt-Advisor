<template lang="pug">
.fcm
  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  b-message(v-else-if="loadError" type="is-danger" size="is-small") {{ loadError }}

  template(v-else)
    //- ── What this page is, and what it is not ────────────────────────────────
    //- 🔴 THE ALL-CARE BASIS, IN MIKE'S OWN WORDS (2026-09-10) AND APPROVED IN THE
    //- DRAWING. Nothing on this page is legal advice and nothing here says a firm is
    //- compliant. Advice is SUGGESTED and required nowhere — no screen and no route
    //- checks whether a firm took it, which is his ruling: "we can't dictate or make
    //- it a condition for firms to seek legal advice".
    .box.fcm-note(v-if="!isMentor")
      h5.is-size-7.has-text-weight-semibold.mb-2 WHAT THIS PAGE IS, AND WHAT IT IS NOT
      p.is-size-7
        | Advisor-e supplies this software on an all-care basis. We identify best practice
        |  and set out our assessment below.
        b  You remain responsible for meeting your own legal obligations and for what you do with the information here.
        |  Nothing on this page is legal advice, and it is not a statement that your firm is
        |  compliant.
        b  We strongly suggest taking your own legal advice on it
        |  — we do not require it, and nothing here checks whether you have.

    .box.fcm-note.fcm-note-mentor(v-else)
      h5.is-size-7.has-text-weight-semibold.mb-2 THIS IS WHERE YOU SHARE NEW INFORMATION DOWNWARDS
      p.is-size-7
        | Publish an item here and every tier beneath you receives it and is told it is new.
        |  A global group manager or group manager can add items of their own for their country
        |  or brand — those cascade down from that level, never sideways and never up.

    //- ── Where each item came from ────────────────────────────────────────────
    .fcm-cascade.mb-4(v-if="cascadeCounts.length")
      span.fcm-cascade-item(v-for="c in cascadeCounts" :key="c.tier")
        | {{ c.count }} {{ c.count === 1 ? 'item' : 'items' }} from {{ c.label }}

    //- ── Published to you ─────────────────────────────────────────────────────
    //- 🔴 READ-ONLY, AND THERE IS DELIBERATELY NO EDIT CONTROL AND NO HIDE CONTROL.
    //- Two rulings of Mike's, 2026-09-10 — "never edit ours", and hiding asked
    //- separately and refused. Every other cascading block on this hub offers accept /
    //- edit / switch off / add; this one must not, and the backend refuses it as well
    //- as this screen omitting it (server/routes/compliance.js).
    .box(v-if="inheritedItems.length")
      h4.title.is-6.mb-1 Published to you
      p.is-size-7.has-text-grey.mb-4
        | You can read anything published to you and add your own material beside it. You
        |  cannot change or remove what a tier above you published — it carries their name,
        |  not yours.

      .fcm-doc(v-for="item in inheritedItems" :key="item.ref")
        .fcm-doc-main
          .fcm-doc-title
            span.fcm-dot(v-if="isNew(item)" title="New since you last declared")
            span.is-sr-only(v-if="isNew(item)") New.
            | {{ item.title }}
          .fcm-doc-sub
            | Version {{ item.version }} · published {{ dateWords(item.publishedAt) }}
            |  by {{ item.originTierLabel }}
          p.is-size-7.has-text-grey.mt-1(v-if="item.summary") {{ item.summary }}
        b-tag(v-if="isNew(item)" type="is-warning") New
        b-button.fcm-read(size="is-small" outlined @click="toggle(item.ref)")
          | {{ open[item.ref] ? 'Close' : 'Read it' }}

        .fcm-body(v-if="open[item.ref]") {{ item.body }}

    p.is-size-7.has-text-grey.mb-4(v-else-if="!isMentor")
      | Nothing has been published to your firm yet.

    //- ── The firm's own compliance evidence ───────────────────────────────────
    //- 🔴 THE FIRM TIER ALONE, AND THAT IS A JUDGEMENT STATED RATHER THAN ASSUMED.
    //- The drawing calls this "Your firm's compliance evidence", and the completeness
    //- check that reads it (slice 4) checks a FIRM's obligations. A tier above may
    //- publish and may declare; if one ever needs a pack of its own that is one line
    //- here, not a rebuild.
    //- 🔴 THE ZONE TAKES THE FIRM'S OWN EVIDENCE, NEVER THE TEXT OF THE LAW — Mike
    //- agreed on 2026-09-10 that uploading statutes for the AI to read would put our
    //- software in the place of their lawyer.
    .box(v-if="isFirm")
      .is-flex.is-justify-content-space-between.is-align-items-baseline.mb-1
        h4.title.is-6.mb-0 Your firm's compliance evidence
        b-tag(type="is-success" size="is-small") Held by your firm only

      p.is-size-7.has-text-grey.mb-4
        | These are your documents — what you did, and the advice you took. Advisor-e can see
        |  that a document exists and when it was added;
        b  we do not read them and they are never shown to another firm.

      .fcm-drop
        b-upload(v-model="evidenceFile" accept="application/pdf" drag-drop expanded)
          .has-text-centered.py-5
            p.is-size-6.has-text-weight-semibold Drop a compliance document here
            p.is-size-7.has-text-grey
              | Your lawyer's opinion · your privacy statement · client engagement terms ·
              |  staff consultation record · your breach process
            p.is-size-7.has-text-grey.mt-2 PDF, up to {{ maxFileMb }} MB

        .mt-3(v-if="evidenceFile")
          p.is-size-7.mb-2 {{ evidenceFile.name }}
          .buttons
            b-button(type="is-primary" size="is-small" :loading="uploading" @click="addEvidence") Add it
            b-button(size="is-small" @click="evidenceFile = null") Cancel

      b-message.mt-3(v-if="evidenceError" type="is-danger" size="is-small") {{ evidenceError }}

      .mt-4
        p.is-size-7.has-text-grey.py-3(v-if="!evidence.length")
          | Your pack is empty. Nothing is blocked by that — an empty pack stops nothing, and
          |  Advisor-e does not judge whether your firm is compliant.

        .fcm-doc(v-for="doc in evidence" :key="doc.fileId")
          .fcm-doc-main
            .fcm-doc-title {{ doc.name }}
            .fcm-doc-sub
              | Added {{ dateWords(doc.addedAt) }}
              |  by {{ doc.addedBy || 'someone at your firm' }} · {{ sizeWords(doc.sizeBytes) }}
          b-button.fcm-read(size="is-small" outlined @click="openEvidence(doc)") Open
          b-button.fcm-read(
            size="is-small"
            outlined
            type="is-danger"
            :loading="removing === doc.fileId"
            @click="removeEvidence(doc)") Remove

    //- ── What is missing from your pack ───────────────────────────────────────
    //- 🔴 A COMPLETENESS CHECK, NOT A LEGAL OPINION, AND IT GATES NOTHING. If an
    //- incomplete pack closed the recorder, Advisor-e would be deciding when a firm is
    //- compliant enough to proceed — the responsibility the all-care basis puts on them.
    //- 🔴 IT READS DOCUMENT NAMES, NEVER CONTENTS. The artefact says so three times.
    //- 🔴 ON A BUTTON, NEVER AUTOMATICALLY — his ruling, and item 4.82 is the reason:
    //- nothing caps how many paid readings a user can set off. A screen that re-checked
    //- on load would have undone that ruling.
    .box(v-if="isFirm")
      .is-flex.is-justify-content-space-between.is-align-items-baseline.mb-1
        h4.title.is-6.mb-0 What is missing from your pack
        span.is-size-7.has-text-grey(v-if="check")
          | Checked {{ dateWords(check.checkedAt) }} · {{ check.covered }} of {{ check.total }} covered

      .fcm-note.mb-4
        p.is-size-7
          b This is a completeness check, not a legal opinion.
          |  We look at what your documents are called and say which of the eight points each
          |  one appears to address.
          b  We do not tell you what the law requires, we do not read your documents, and
          b  nothing inside one is ever sent anywhere.
          |  A tick means a document appears to address that point, never that it addresses it
          |  adequately. Only your lawyer can say that.

      b-message(v-if="checkError" type="is-danger" size="is-small") {{ checkError }}

      ul.fcm-chk(v-if="check")
        li(v-for="p in check.points" :key="p.id")
          span.fcm-chk-mark(:class="p.covered ? 'is-yes' : 'is-no'") {{ p.covered ? '✓' : '!' }}
          span.fcm-chk-text
            span(:class="{ 'has-text-weight-semibold': !p.covered }") {{ p.title }}
            .fcm-chk-why(v-if="p.covered") Covered by: {{ p.coveredBy.join('; ') }}
            .fcm-chk-why(v-else) {{ p.why }}

      p.is-size-7.has-text-grey.py-3(v-else)
        | Your pack has not been checked yet.

      .fcm-note.mt-4
        p.is-size-7
          b The ninth point is not on this list, and that is deliberate.
          |  That the firm has read and understands the law as it applies to it is the
          |  declaration below, not a document.
          b  It is the only one we ask for, and the only one that changes anything.
          |  Nothing in this software checks whether you took legal advice.

      .buttons.mt-4
        b-button(type="is-primary" :loading="checking" @click="runCheck")
          | {{ check ? 'Check my pack again' : 'Check my pack' }}
      p.is-size-7.has-text-grey
        | This sends the names of your documents — never the documents — to be matched against
        |  the eight points. It runs only when you press the button.

    //- ── The declaration ──────────────────────────────────────────────────────
    //- 🔴 THE TICK IS THE GATE — Mike's ruling, 2026-09-10: "they have to tick a box
    //- before the feature becomes active." It reversed a recommendation of ours against
    //- gating, and the objection that recommendation rested on does not apply to what he
    //- ruled: gating on the EVIDENCE PACK would make Advisor-e the judge of a firm's
    //- compliance; gating on the firm's OWN declaration judges nothing.
    //- 🔴 THE WORDING IS HIS, VERBATIM, AND COMES FROM THE BACKEND so no screen holds a
    //- second copy of a pinned sentence. No session rewords it.
    //- ⚠ EVERY TIER BELOW THE MENTOR, because the dot counts against a declaration and a
    //- tier that could never make one could never clear it. Only a FIRM's declaration
    //- opens Meeting Review — that is the only tier whose advisors record anything.
    .box(v-if="!isMentor")
      .is-flex.is-justify-content-space-between.is-align-items-baseline.mb-1
        h4.title.is-6.mb-0 Your firm's declaration
        b-tag(v-if="isFirm" :type="declaration ? 'is-success' : 'is-danger'")
          | {{ declaration ? 'Meeting Review is active for your firm' : 'Meeting Review is not active' }}

      .fcm-note.mb-4(v-if="isFirm")
        p.is-size-7
          b Meeting Review does not switch on until this is recorded.
          |  Until a firm manager records the declaration below, no advisor at your firm can
          |  open the meeting recorder.
          b  This is the only thing that gates it.
          |  Your evidence pack above is for your own benefit — an empty pack blocks nothing,
          |  and Advisor-e does not judge whether your firm is compliant.

      .fcm-ack
        .fcm-ack-line
          b-checkbox(v-model="ticked" :disabled="saving")
            b {{ declarationWording }}

        p.is-size-7.has-text-grey.mt-2.mb-3
          | We strongly suggest taking your own legal advice before recording a client. We do
          |  not require it and we do not ask you to tell us whether you have.

        //- A published update NOTIFIES and never suspends — his ruling of 2026-09-10. The
        //- advisors keep recording; this asks the manager to read and declare again.
        b-message(v-if="declaration && newCount" type="is-warning" size="is-small")
          | {{ newCount === 1 ? 'One published item is' : newCount + ' published items are' }}
          |  new since you last declared.
          b  Your advisors can keep recording
          |  — this is a notification, not a suspension. Read it and record your declaration
          |  again, and the dot clears.

        b-message(v-if="declareError" type="is-danger" size="is-small") {{ declareError }}

        b-button(
          type="is-primary"
          :disabled="!ticked"
          :loading="saving"
          @click="recordDeclaration") Record this declaration

        p.is-size-7.has-text-grey.mt-3(v-if="declaration")
          b Recorded by:
          |  {{ declaration.declaredBy }} · {{ dateWords(declaration.declaredAt) }}
          |  · against {{ declaration.against.length }}
          |  {{ declaration.against.length === 1 ? 'published item' : 'published items' }}

    //- ── What you publish ─────────────────────────────────────────────────────
    .box
      .is-flex.is-justify-content-space-between.is-align-items-baseline.mb-1
        h4.title.is-6.mb-0 What you publish
        b-button(
          v-if="!publishing"
          size="is-small"
          type="is-primary"
          @click="startNew") Publish a new item

      p.is-size-7.has-text-grey.mb-4
        | Everything here is sent down to every tier beneath you. Publishing again as a new
        |  version tells them there is something to re-read.

      p.is-size-7.has-text-grey.py-3(v-if="!ownItems.length && !publishing")
        | You have published nothing yet.

      .fcm-doc(v-for="item in ownItems" :key="item.ref")
        .fcm-doc-main
          .fcm-doc-title {{ item.title }}
          .fcm-doc-sub
            | Version {{ item.version }} · published {{ dateWords(item.publishedAt) }}
            |  by {{ item.publishedBy || 'your firm' }}
          p.is-size-7.has-text-grey.mt-1(v-if="item.summary") {{ item.summary }}
        b-button.fcm-read(size="is-small" outlined @click="toggle(item.ref)")
          | {{ open[item.ref] ? 'Close' : 'Read it' }}
        b-button.fcm-read(size="is-small" outlined @click="startEdit(item)") Publish a new version

        .fcm-body(v-if="open[item.ref]") {{ item.body }}

      //- ── Publishing one ─────────────────────────────────────────────────────
      .fcm-form.mt-4(v-if="publishing")
        p.is-size-7.has-text-grey.mb-3(v-if="form.id")
          | This replaces
          b  {{ form.title }}
          |  with a new version. Everyone beneath you is told it has changed.

        b-field(label="What is it called?" label-position="on-border")
          b-input(v-model="form.title" :maxlength="limits.title")

        b-field(label="What is it, in one line?" label-position="on-border")
          b-input(v-model="form.summary" :maxlength="limits.summary")

        b-field(label="The material itself" label-position="on-border")
          b-input(v-model="form.body" type="textarea" rows="12" :maxlength="limits.body")

        b-message(v-if="formError" type="is-danger" size="is-small") {{ formError }}

        .buttons
          b-button(type="is-primary" :loading="saving" @click="submit")
            | {{ form.id ? 'Publish this version' : 'Publish it' }}
          b-button(@click="cancel") Cancel

    //- ── Who has recorded what ────────────────────────────────────────────────
    //- 🔴 STATUS ONLY, NEVER THEIR DOCUMENTS. A firm's legal opinion and its policies are
    //- the firm's. This shows that a document exists and how many; it does not show the
    //- document, and nobody at Advisor-e reads one.
    //- ⚠ ONE REASON, BECAUSE THERE IS ONLY ONE. A firm that cannot record has not
    //- declared — never because its pack is thin. The drawing states it in terms.
    .box(v-if="!isFirm && firms.length")
      .is-flex.is-justify-content-space-between.is-align-items-baseline.mb-1
        h4.title.is-6.mb-0 Who has recorded what
        b-tag(type="is-info" size="is-small") Status only — never their documents

      p.is-size-7.has-text-grey.mb-4
        | You see whether a firm has done it, never what they wrote.
        b  Neither the AI nor anyone at Advisor-e reads their documents.

      table.table.is-fullwidth.is-narrow
        thead
          tr
            th Firm
            th Declaration
            th Meeting Review
            th Documents held
        tbody
          tr(v-for="f in firms" :key="f.id")
            td {{ f.name || f.id }}
            td
              template(v-if="f.declaredAt")
                | {{ dateWords(f.declaredAt) }} · {{ f.declaredBy }}
              b(v-else) Never recorded
            td
              b-tag(:type="f.active ? 'is-success' : 'is-danger'")
                | {{ f.active ? 'Active' : 'Not active' }}
            td {{ f.documentsHeld }}

      b-message(type="is-warning" size="is-small" v-if="blockedFirms.length")
        | {{ blockedNames }}
        |  cannot record a client meeting, and this is the only reason:
        b  the declaration has not been made.
        |  An empty evidence pack is not why — a firm records on an empty pack. If they ask
        |  why the recorder is closed to them, the answer is one tick by a firm manager.
</template>

<script>
/**
 * Compliance — what a tier publishes about a firm's legal obligations, and what every tier
 * beneath it receives. Item 4.83, slice 1.
 *
 * Design: `design/mockups/compliance-pages.html`, drawn 2026-09-10 and approved by Mike the
 * same day with all nine of its questions ruled. Asked for in his own words, naming all four
 * manager tiers: *"i want these compliance pages to show in the mentor, global manager, group
 * manager and firm manager hubs - again, cascading"*.
 *
 * 🔴 SCREEN A AND SCREEN B ARE THE SAME SCREEN — the drawing says so in terms, and it is Mike's
 * standing ruling of 2026-07-30 that a tier above the firm is the same functionality re-scoped.
 * Only two things differ by tier here: the opening note (a firm is told what this page is not;
 * the mentor is told what publishing does), and whether anything was published to you at all.
 *
 * 🔴 THERE IS NO EDIT CONTROL AND NO HIDE CONTROL ON AN INHERITED ITEM, and their absence is the
 * feature rather than an oversight. Two separate rulings of Mike's, 2026-09-10: *"never edit
 * ours"*, and hiding put to him separately and refused because it would clear the item's dot and
 * let a firm switch off the one signal telling them to read something new. A build reaching for
 * this hub's usual accept / edit / switch-off / add shape will offer both by habit.
 *
 * ⚠ THE BODY IS RENDERED AS TEXT, NEVER AS MARKUP. No `v-html` anywhere on this screen, so
 * published material cannot inject anything into the DOM and needs no sanitiser to be safe.
 *
 * ⚠ NOT ON THIS SCREEN YET, each a later slice of 4.83 rather than an omission: the firm's own
 * evidence pack (slice 2), the declaration and the gate it puts on Meeting Review (slice 3), and
 * the completeness check with the mentor's roll-up of who has declared (slice 4).
 */

export default {
  name: 'FirmCompliance',

  props: {
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: true,
      loadError: '',
      saving: false,
      formError: '',
      publishing: false,
      /** Every item published to this scope, newest first, each naming the tier that sent it. */
      items: [],
      /** This scope's declaration record, or null when it has never made one. */
      declaration: null,
      /** When this scope last declared, or null. */
      declaredAt: null,
      /**
       * 🔴 MIKE'S OWN WORDS, PINNED, AND SENT FROM THE BACKEND. Empty here on purpose: a
       * fallback string in this file would be a second copy of a sentence a firm manager is
       * held to, and the two could drift without anything failing.
       */
      declarationWording: '',
      /** Published to this scope since it last declared — the dot's number, kept for the card. */
      newCount: 0,
      ticked: false,
      declareError: '',
      /** The firms beneath this tier and whether each has declared. Status only. */
      firms: [],
      /**
       * The last completeness check, or null. The eight points travel WITH it, so this screen
       * renders what was actually checked rather than holding its own copy of the list.
       */
      check: null,
      checking: false,
      checkError: '',
      tier: '',
      /** Which item bodies are open, by `ref`. */
      open: {},
      form: { id: '', title: '', summary: '', body: '' },
      /** The firm's own compliance documents — held by us, read by nobody here. */
      evidence: [],
      evidenceFile: null,
      evidenceError: '',
      uploading: false,
      /** The fileId currently being removed, so one row's button spins and not all of them. */
      removing: '',
      /**
       * How long each field may be, as the STORE decides it — sent with the answer rather than
       * written down again here. A second copy of a limit in a Vue file is a copy that drifts,
       * so these start EMPTY rather than at a plausible number: the form is not rendered until
       * the load has finished, and an unset maxlength is a limit the server still enforces.
       */
      limits: { title: null, summary: null, body: null, fileBytes: 0 }
    }
  },

  computed: {
    /** @returns {boolean} true at the top of the tree, where nothing is published to you */
    isMentor () {
      return this.tier === 'mentor'
    },

    /**
     * @returns {boolean} true at the firm, the one tier that holds an evidence pack —
     *   a judgement stated in the template rather than assumed.
     */
    isFirm () {
      return this.tier === 'firm_manager'
    },

    /** @returns {Array<object>} firms beneath this tier whose recorder is closed */
    blockedFirms () {
      return this.firms.filter(f => !f.active)
    },

    /** @returns {string} those firms, named, so a manager can act rather than count */
    blockedNames () {
      const names = this.blockedFirms.map(f => f.name || f.id)
      if (names.length === 1) { return names[0] }
      return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]
    },

    /** @returns {number} the per-file limit in whole megabytes, as the platform sets it */
    maxFileMb () {
      return Math.round((this.limits.fileBytes || 0) / (1024 * 1024))
    },

    /** @returns {Array<object>} what arrived from a tier above — read-only, always */
    inheritedItems () {
      return this.items.filter(i => !i.isOwn)
    },

    /** @returns {Array<object>} what this scope published itself */
    ownItems () {
      return this.items.filter(i => i.isOwn)
    },

    /**
     * How many items came from each tier, in the order the chain gave them.
     *
     * The drawing's cascade strip. It answers the question a manager actually has on opening
     * the page — is any of this ours? — without them counting rows.
     *
     * @returns {Array<{tier: string, label: string, count: number}>}
     */
    cascadeCounts () {
      const seen = []
      const by = {}
      this.items.forEach((item) => {
        const key = item.originScopeId
        if (!by[key]) {
          by[key] = { tier: key, label: item.isOwn ? 'you' : item.originTierLabel, count: 0 }
          seen.push(by[key])
        }
        by[key].count += 1
      })
      return seen
    }
  },

  async mounted () {
    await this.refresh()
  },

  methods: {
    /**
     * Load everything published to this scope.
     *
     * Emits `new-count` so the hub's left-hand menu can carry the dot without a second call —
     * this panel is mounted at every tier that shows the tab, open or not.
     *
     * @returns {Promise<void>}
     */
    async refresh () {
      this.loading = true
      this.loadError = ''
      try {
        const data = await this.api('GET', '/api/firm-manager/compliance')
        this.items = data.items || []
        this.declaredAt = data.declaredAt || null
        this.declaration = data.declaration || null
        this.declarationWording = data.declarationWording || ''
        this.tier = data.tier || ''
        this.newCount = Number(data.newCount) || 0
        this.check = data.check || null
        if (data.limits) { this.limits = data.limits }
        // Payload: the number of items published to this scope since it last declared.
        this.$emit('new-count', this.newCount)

        if (this.isFirm) {
          await this.loadEvidence()
        } else {
          await this.loadFirms()
        }
      } catch (e) {
        this.loadError = e.message
      }
      this.loading = false
    },

    /**
     * Ask for a fresh completeness check.
     *
     * 🔴 ONLY FROM THIS BUTTON. Never on upload, never on load — Mike's ruling, and item 4.82
     * is the reason: every reading is paid for and nothing caps how many one person can set
     * off. A failed check leaves the previous result on screen rather than blanking it.
     *
     * @returns {Promise<void>}
     */
    async runCheck () {
      this.checkError = ''
      this.checking = true
      try {
        const data = await this.api('POST', '/api/firm-manager/compliance/check')
        this.check = data.check || this.check
      } catch (e) {
        this.checkError = e.message
      }
      this.checking = false
    },

    /**
     * Which firms beneath this tier have declared.
     *
     * ⚠ NOT FATAL TO THE PAGE if it fails, and empty is a legitimate answer rather than a
     * fault: which firms a middle tier can see depends on membership data that is Advisor-e's
     * to supply, and until it arrives every firm resolves under the mentor.
     *
     * @returns {Promise<void>}
     */
    async loadFirms () {
      try {
        const data = await this.api('GET', '/api/firm-manager/compliance/firms')
        this.firms = data.firms || []
      } catch (_e) {
        this.firms = []
      }
    },

    /**
     * Record the declaration.
     *
     * 🔴 THE ONE THING THAT OPENS MEETING REVIEW FOR A FIRM. The tick travels as
     * `confirmed: true` and the route refuses without it, so a screen cannot record a
     * declaration nobody made. The signer's name is taken from the token, never sent.
     *
     * @returns {Promise<void>}
     */
    async recordDeclaration () {
      if (!this.ticked) { return }
      this.declareError = ''
      this.saving = true
      try {
        const data = await this.api('POST', '/api/firm-manager/compliance/declaration', {
          confirmed: true
        })
        this.declaration = data.declaration || null
        this.declaredAt = this.declaration ? this.declaration.declaredAt : null
        this.newCount = Number(data.newCount) || 0
        this.ticked = false
        this.$emit('new-count', this.newCount)
      } catch (e) {
        this.declareError = e.message
      }
      this.saving = false
    },

    /**
     * The firm's own compliance pack.
     *
     * ⚠ A FAILURE HERE IS DELIBERATELY NOT FATAL to the page. An empty pack blocks nothing —
     * it is the declaration that gates and never this — so a manager who cannot load their
     * documents can still read what was published to them and still declare.
     *
     * @returns {Promise<void>}
     */
    async loadEvidence () {
      this.evidenceError = ''
      try {
        const data = await this.api('GET', '/api/firm-manager/compliance/evidence')
        this.evidence = data.documents || []
      } catch (e) {
        this.evidenceError = 'Your compliance documents could not be loaded: ' + e.message
      }
    },

    /**
     * Add the chosen PDF to the firm's pack.
     * @returns {Promise<void>}
     */
    async addEvidence () {
      if (!this.evidenceFile) { return }
      this.evidenceError = ''
      this.uploading = true
      try {
        const body = new FormData()
        body.append('file', this.evidenceFile)
        // Multipart, so no Content-Type header of our own — the browser sets the boundary.
        const res = await fetch('/api/firm-manager/compliance/evidence', {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.apiToken}` },
          body
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error((data.error && data.error.message) || 'That document could not be added.')
        }
        this.evidenceFile = null
        await this.loadEvidence()
      } catch (e) {
        this.evidenceError = e.message
      }
      this.uploading = false
    },

    /**
     * Take one document out of the firm's pack.
     *
     * 🔴 A FIRM'S OWN UPLOADS STAY THEIRS TO REMOVE — the other half of the ruling that a
     * firm may not hide what a tier ABOVE published. Only what arrives from above is fixed.
     *
     * @param {object} doc
     * @returns {Promise<void>}
     */
    async removeEvidence (doc) {
      this.evidenceError = ''
      this.removing = doc.fileId
      try {
        await this.api('DELETE', `/api/firm-manager/compliance/evidence/${encodeURIComponent(doc.fileId)}`)
        await this.loadEvidence()
      } catch (e) {
        this.evidenceError = e.message
      }
      this.removing = ''
    },

    /**
     * Open one of the firm's own documents.
     *
     * Fetched with the bearer token and handed to the browser as a blob, because a plain
     * link carries no Authorization header — the same route and the same pattern the
     * document library uses.
     *
     * @param {object} doc
     * @returns {Promise<void>}
     */
    async openEvidence (doc) {
      this.evidenceError = ''
      try {
        const params = new URLSearchParams({
          fileId: doc.fileId,
          fileName: doc.name,
          source: 'firm'
        })
        const res = await fetch(`/api/firm-manager/documents/download?${params.toString()}`, {
          headers: { Authorization: `Bearer ${this.apiToken}` }
        })
        if (!res.ok) { throw new Error('That document could not be opened.') }
        const url = URL.createObjectURL(await res.blob())
        const a = document.createElement('a')
        a.href = url
        a.setAttribute('download', doc.name)
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (e) {
        this.evidenceError = e.message
      }
    },

    /**
     * A file size in the words a manager reads, never bytes.
     * @param {number} bytes
     * @returns {string}
     */
    sizeWords (bytes) {
      const kb = Number(bytes) / 1024
      if (!Number.isFinite(kb) || kb <= 0) { return '' }
      return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`
    },

    /**
     * Is this item new since the scope last declared?
     *
     * 🔴 NEW MEANS "SINCE YOU LAST DECLARED", NOT "SINCE YOU LAST LOOKED" — Mike's wording of
     * 2026-09-10. Opening the page does not clear it; recording a declaration does. Until slice
     * 3 writes one, everything published to you is new, which is the right answer for a firm
     * that has declared nothing.
     *
     * @param {object} item
     * @returns {boolean}
     */
    isNew (item) {
      if (item.isOwn) { return false }
      if (!this.declaredAt) { return true }
      return Date.parse(item.publishedAt) > Date.parse(this.declaredAt)
    },

    /**
     * Show or hide one item's material.
     * @param {string} ref
     */
    toggle (ref) {
      // Replaced rather than mutated: Vue 2 does not see a key added to an object in place.
      this.open = Object.assign({}, this.open, { [ref]: !this.open[ref] })
    },

    /** Open an empty form for a new item. */
    startNew () {
      this.form = { id: '', title: '', summary: '', body: '' }
      this.formError = ''
      this.publishing = true
    },

    /**
     * Open the form on an item this scope already owns, to publish a new version of it.
     * @param {object} item
     */
    startEdit (item) {
      this.form = {
        id: item.id,
        title: item.title,
        summary: item.summary || '',
        body: item.body
      }
      this.formError = ''
      this.publishing = true
    },

    /** Close the form, keeping nothing. */
    cancel () {
      this.publishing = false
      this.formError = ''
    },

    /**
     * Publish the form — a new item, or a new version of one this scope owns.
     * @returns {Promise<void>}
     */
    async submit () {
      this.formError = ''
      if (!this.form.title.trim()) {
        this.formError = 'Give it a name first.'
        return
      }
      if (!this.form.body.trim()) {
        this.formError = 'There is nothing to publish yet — add the material itself.'
        return
      }

      this.saving = true
      try {
        const data = await this.api('POST', '/api/firm-manager/compliance', {
          id: this.form.id || undefined,
          title: this.form.title,
          summary: this.form.summary,
          body: this.form.body
        })
        this.items = data.items || []
        this.$emit('new-count', Number(data.newCount) || 0)
        this.publishing = false
      } catch (e) {
        this.formError = e.message
      }
      this.saving = false
    },

    /**
     * A date in the words the rest of this hub uses.
     * @param {string} iso
     * @returns {string}
     */
    dateWords (iso) {
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) { return '' }
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    },

    /**
     * One backend call. Both an HTTP error and a network failure arrive as an Error with a
     * message a manager can act on, per the house error rule.
     *
     * @param {string} method
     * @param {string} path
     * @param {object} [body]
     * @returns {Promise<object>}
     */
    async api (method, path, body) {
      let res
      try {
        res = await fetch(path, {
          method,
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: body ? JSON.stringify(body) : undefined
        })
      } catch (e) {
        throw new Error('The server could not be reached. Check your connection and try again.')
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const err = new Error((data.error && data.error.message) || 'That could not be done.')
        err.status = res.status
        throw err
      }
      return data
    }
  }
}
</script>

<style scoped>
.fcm-note {
  border-left: 3px solid #0070c0;
}
.fcm-note-mentor {
  border-left-color: #4ca52d;
}
.fcm-cascade {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1.2rem;
  font-size: 0.75rem;
  color: #5b6f8a;
}
.fcm-doc {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.9rem 0;
  border-bottom: 1px solid #eef3f8;
}
.fcm-doc:last-child { border-bottom: 0; }
.fcm-doc-main {
  flex: 1;
  min-width: 14rem;
}
.fcm-doc-title {
  font-weight: 600;
  font-size: 0.95rem;
}
.fcm-doc-sub {
  font-size: 0.75rem;
  color: #5b6f8a;
  margin-top: 0.15rem;
}
/* The notification dot, in the Handbook's own red. Never the only signal that an item is
   new — the tag beside it and the screen-reader line say the same thing in words. */
.fcm-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #e00000;
  margin-right: 0.45rem;
  vertical-align: middle;
}
.fcm-read { flex: 0 0 auto; }
.fcm-drop >>> .upload-draggable {
  border: 2px dashed #b9d3e8;
  border-radius: 12px;
  background: #f1f6fb;
  width: 100%;
}
.fcm-body {
  flex-basis: 100%;
  margin-top: 0.75rem;
  padding: 0.9rem 1rem;
  background: #f1f6fb;
  border-radius: 6px;
  font-size: 0.8rem;
  line-height: 1.55;
  white-space: pre-wrap;
  max-height: 28rem;
  overflow-y: auto;
}
.fcm-form {
  border-top: 1px solid #eef3f8;
  padding-top: 1rem;
}
.fcm-ack {
  background: #f1f6fb;
  border: 1px solid #d5e1ee;
  border-radius: 12px;
  padding: 1rem 1.1rem;
}
.fcm-ack-line {
  font-size: 0.85rem;
  line-height: 1.5;
}
.fcm-chk {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.85rem;
}
.fcm-chk li {
  display: flex;
  gap: 0.7rem;
  align-items: flex-start;
  padding: 0.6rem 0;
  border-bottom: 1px solid #eef3f8;
}
.fcm-chk li:last-child { border-bottom: 0; }
/* The mark carries a character as well as a colour — the same rule the rest of this hub
   follows: a colour alone says nothing to a reader who cannot see it. */
.fcm-chk-mark {
  flex: 0 0 auto;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  margin-top: 0.1rem;
}
.fcm-chk-mark.is-yes {
  background: rgba(76, 165, 45, 0.1);
  color: #2f7d32;
  border: 1px solid rgba(76, 165, 45, 0.35);
}
.fcm-chk-mark.is-no {
  background: rgba(255, 153, 0, 0.1);
  color: #8a5a00;
  border: 1px solid rgba(255, 153, 0, 0.35);
}
.fcm-chk-text { flex: 1; }
.fcm-chk-why {
  font-size: 0.75rem;
  color: #5b6f8a;
  margin-top: 0.15rem;
}
</style>
