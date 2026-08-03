<template lang="pug">
section.decision-logic
  h1.dl-title {{ $t('firmDecisionLogic.title') }}
  p.dl-lede
    | {{ $t('firmDecisionLogic.lede') }}
    strong.ml-1 {{ $t('firmDecisionLogic.ledeBold') }}

  b-message(v-if="error" type="is-danger" has-icon :closable="false") {{ error }}
  b-loading(:is-full-page="false" :active="loading")

  template(v-if="levers")
    //- ═══ 1. THE THREE ═══════════════════════════════════════════════════
    section.band
      h2.band-heading {{ $t('firmDecisionLogic.threeHeading') }}

      .levers
        //- Order fixed by Mike: domain support · logic tables · Advisory
        //- Distinctions. The first SHAPES the wording and selects nothing; the
        //- other two SELECT templates — which is what the colour of the top
        //- edge carries, so the difference is readable without reading a label.
        .lever.shapes
          span.lname {{ $t('firmDecisionLogic.dsName') }}
          span.ljob {{ $t('firmDecisionLogic.dsJob') }}
          p.lcount {{ $t('firmDecisionLogic.dsCount', { count: levers.domainSupport.documents }) }}
          p.lbody
            | {{ $t('firmDecisionLogic.dsBodyA') }}
            b {{ $t('firmDecisionLogic.dsBodyB') }}
            | {{ $t('firmDecisionLogic.dsBodyC') }}
            b {{ $t('firmDecisionLogic.dsBodyD') }}
            | {{ $t('firmDecisionLogic.dsBodyE') }}
          p.lmeasure
            | {{ $t('firmDecisionLogic.dsMeasureA') }}
            b {{ $t('firmDecisionLogic.dsMeasureB') }}
            | {{ $t('firmDecisionLogic.dsMeasureC') }}
            b {{ $t('firmDecisionLogic.dsMeasureD') }}
            | {{ $t('firmDecisionLogic.dsMeasureE') }}
            b {{ $t('firmDecisionLogic.dsMeasureF') }}
          p.laction {{ $t('firmDecisionLogic.dsAction') }}

        .lever.selects
          span.lname {{ $t('firmDecisionLogic.ltName') }}
          span.ljob {{ $t('firmDecisionLogic.ltJob') }}
          p.lcount
            | {{ $t('firmDecisionLogic.ltCount', { tables: levers.logicTables.tables, hints: levers.logicTables.withTemplateHints }) }}
          p.lbody
            | {{ $t('firmDecisionLogic.ltBodyA') }}
            b {{ $t('firmDecisionLogic.ltBodyB', { boost: treeBoost }) }}
            | {{ $t('firmDecisionLogic.ltBodyC') }}
          //- Inline interpolation, not stacked `|` lines: Pug emits NO whitespace
          //- between a bare `|` and a following tag, which ran the tag into the
          //- number as "measured3 cases" (found 2026-08-03).
          p.lmeasure
            | {{ $t('firmDecisionLogic.ltMeasureA') }}
            b {{ $t('firmDecisionLogic.ltMeasureB', { boost: treeBoost }) }}
            | {{ $t('firmDecisionLogic.ltMeasureC') }} #[span.tag-il {{ $t('firmDecisionLogic.tagMeasured') }}] #[b {{ $t('firmDecisionLogic.ltMeasureD', { count: measured.turnedOnTablesAlone }) }}]{{ $t('firmDecisionLogic.ltMeasureE', { total: measured.caseCount }) }}
          p.laction {{ $t('firmDecisionLogic.ltAction') }}

        .lever.selects
          span.lname {{ $t('firmDecisionLogic.adName') }}
          span.ljob {{ $t('firmDecisionLogic.adJob') }}
          p.lcount {{ $t('firmDecisionLogic.adCount', { count: levers.distinctions.count }) }}
          p.lbody
            | {{ $t('firmDecisionLogic.adBodyA') }}
            b {{ $t('firmDecisionLogic.adBodyB') }}
            | {{ $t('firmDecisionLogic.adBodyC') }}
            b {{ $t('firmDecisionLogic.adBodyD', { boost: distinctionBoost }) }}
            | {{ $t('firmDecisionLogic.adBodyE') }}
          p.lmeasure
            | {{ $t('firmDecisionLogic.adMeasureA') }} #[span.tag-il {{ $t('firmDecisionLogic.tagMeasured') }}]{{ $t('firmDecisionLogic.adMeasureB') }}
            b {{ $t('firmDecisionLogic.adMeasureC', { margin: marginLabel }) }}
            | {{ $t('firmDecisionLogic.adMeasureD') }}
            b {{ $t('firmDecisionLogic.adMeasureE', { boost: distinctionBoost }) }}
            | {{ $t('firmDecisionLogic.adMeasureF') }} #[b {{ $t('firmDecisionLogic.adMeasureG', { count: measured.turnedOnDistinctionsAlone }) }}]{{ $t('firmDecisionLogic.adMeasureH', { total: measured.caseCount }) }}
          p.laction {{ $t('firmDecisionLogic.adAction') }}

      //- Said out loud rather than left to be assumed: quiz banks are absent
      //- from the row above because they change nothing about a recommendation.
      p.footnote
        b {{ $t('firmDecisionLogic.quizFootA') }}
        | {{ $t('firmDecisionLogic.quizFootB', { banks: levers.quizBanks.banks, questions: levers.quizBanks.questions }) }}

    //- ═══ 2. THE ROUTER ══════════════════════════════════════════════════
    section.band
      h2.band-heading {{ $t('firmDecisionLogic.routerHeading') }}
      p.band-sub {{ $t('firmDecisionLogic.routerSub') }}

      .router
        .rrow
          div
            p.rsym {{ $t('firmDecisionLogic.r1Sym') }}
            p.rwhy {{ $t('firmDecisionLogic.r1Why') }}
          .rgo
            button.rlever(type="button" @click="$emit('go-to', 'distinctions')")
              | {{ $t('firmDecisionLogic.r1Lever') }}
            p.rnote
              | {{ $t('firmDecisionLogic.r1NoteA') }}
              b {{ $t('firmDecisionLogic.r1NoteB', { count: measured.turnedOnDistinctionsAlone }) }}
              | {{ $t('firmDecisionLogic.r1NoteC') }}

        .rrow
          div
            p.rsym {{ $t('firmDecisionLogic.r2Sym') }}
            p.rwhy {{ $t('firmDecisionLogic.r2Why') }}
          .rgo
            button.rlever.is-shape(type="button" @click="$emit('go-to', 'domain-support')")
              | {{ $t('firmDecisionLogic.r2Lever') }}
            p.rnote
              | {{ $t('firmDecisionLogic.r2NoteA') }}
              em {{ $t('firmDecisionLogic.r2NoteB') }}
              | {{ $t('firmDecisionLogic.r2NoteC') }}

        .rrow
          div
            p.rsym {{ $t('firmDecisionLogic.r3Sym') }}
            p.rwhy {{ $t('firmDecisionLogic.r3Why') }}
          .rgo
            button.rlever.is-shape(type="button" @click="$emit('go-to', 'domain-support')")
              | {{ $t('firmDecisionLogic.r3Lever') }}
            p.rnote {{ $t('firmDecisionLogic.r3Note') }}

        .rrow
          div
            p.rsym {{ $t('firmDecisionLogic.r4Sym') }}
            p.rwhy {{ $t('firmDecisionLogic.r4Why') }}
          .rgo
            button.rlever(type="button" @click="$emit('go-to', 'logic-tables')")
              | {{ $t('firmDecisionLogic.r4Lever') }}
            p.rnote
              | {{ $t('firmDecisionLogic.r4NoteA') }}
              b {{ $t('firmDecisionLogic.r4NoteB') }}
              | {{ $t('firmDecisionLogic.r4NoteC') }}

        .rrow
          div
            p.rsym {{ $t('firmDecisionLogic.r5Sym') }}
            p.rwhy {{ $t('firmDecisionLogic.r5Why') }}
          .rgo
            //- The ANSWER to this row opens in place — it is not a section of
            //- its own, because it only means anything as the reply to "I wrote
            //- a distinction and it never fires".
            //- $tc, not $t: with one row the plural form reads "1 of yours are
            //- filed", and a page arguing for careful wording cannot ship that.
            button.rlever.rlever-btn(v-if="nearMissRows.length" type="button" @click="showNearMiss = !showNearMiss")
              | {{ showNearMiss ? $t('firmDecisionLogic.r5Hide') : $tc('firmDecisionLogic.r5Button', nearMissRows.length, { count: nearMissRows.length }) }}
            p.rnote {{ $t('firmDecisionLogic.r5Note') }}

            //- Empty states say what was looked at. "Nothing found" and "nothing
            //- to look at" are different answers and must not read alike.
            p.nm-empty(v-if="nearMisses.unavailable") {{ $t('firmDecisionLogic.nmUnavailable') }}
            p.nm-empty(v-else-if="!nearMisses.basisCaseCount") {{ $t('firmDecisionLogic.nmNoCases') }}
            p.nm-empty(v-else-if="!nearMissRows.length")
              | {{ $t('firmDecisionLogic.nmNone', { count: nearMisses.basisCaseCount }) }}

            .nearmiss(v-if="showNearMiss && nearMissRows.length")
              .nm-row(v-for="row in nearMissRows" :key="rowKey(row)" :class="{ 'is-done': !!settled[rowKey(row)] }")
                p.nm-what
                  b “{{ row.description }}”
                  | {{ $t('firmDecisionLogic.nmRowA') }}
                  i {{ domainLabel(row.filedDomain) }}
                  | {{ $t('firmDecisionLogic.nmRowB') }}
                  b {{ row.count }}
                  | {{ $t('firmDecisionLogic.nmRowC') }}
                  i {{ domainLabel(row.matchedDomain) }}
                  | {{ $t('firmDecisionLogic.nmRowD') }}
                  b {{ $t('firmDecisionLogic.nmRowE') }}
                  | {{ $t('firmDecisionLogic.nmRowF') }}

                .nm-acts(v-if="!settled[rowKey(row)]")
                  button.nm-btn.is-do(
                    type="button"
                    :disabled="busyKey === rowKey(row)"
                    @click="moveRow(row)"
                  ) {{ $t('firmDecisionLogic.nmMove', { domain: domainLabel(row.matchedDomain) }) }}
                  button.nm-btn(
                    type="button"
                    :disabled="busyKey === rowKey(row)"
                    @click="copyRow(row)"
                  ) {{ $t('firmDecisionLogic.nmCopy') }}
                  button.nm-btn.is-off(
                    type="button"
                    :disabled="busyKey === rowKey(row)"
                    @click="leaveRow(row)"
                  ) {{ $t('firmDecisionLogic.nmLeave') }}
                p.nm-done(v-else) {{ settled[rowKey(row)] }}

              //- What the count rests on. A number that looks like every
              //- conversation, when it is only the shared ones, is the kind of
              //- confident half-truth this page exists to stop.
              p.nm-basis
                | {{ $t('firmDecisionLogic.nmBasis', { traced: nearMisses.tracedCaseCount, total: nearMisses.basisCaseCount }) }}
              p.nm-basis(v-if="nearMisses.staleDropped")
                | {{ $t('firmDecisionLogic.nmStale', { count: nearMisses.staleDropped }) }}

    //- ═══ 4 + 5. THE DIAGNOSTIC AND THE IDEAS ════════════════════════════
    //- The diagnostic writes (the attach button), and the Advisory Distinctions
    //- tab is a sibling that only loads on mount — so the event is carried up to
    //- the hub, which re-reads. Nothing is passed with it: the hub asks the
    //- server rather than being told, so no screen can hold a version the store
    //- does not have.
    decision-logic-diagnostic(
      :api-token="apiToken"
      :domain-labels="domainLabels"
      :measured="measured"
      :margin-label="marginLabel"
      :distinction-boost="distinctionBoost"
      :tree-boost="treeBoost"
      @distinctions-changed="$emit('distinctions-changed')"
    )
</template>

<script>
import DecisionLogicDiagnostic from '~/components/firm/DecisionLogicDiagnostic.vue'
// `require`, matching FirmManagerHub — distinctionMove is CommonJS, and this is
// the import form already proven through this project's webpack build.
const { buildMoveRequest, buildCopyRequest } = require('~/utils/distinctionMove')

/**
 * Decision Logic — the Firm Manager Hub tab named "Logic-Lab".
 *
 * THE SPEC IS THE ARTEFACT: design/mockups/decision-logic-map-mockup.html,
 * approved by Mike 2026-08-02 (ACTIONS #logic-lab-decision-logic-build). Wording
 * and section order are transcribed from it, never paraphrased — the whole point
 * of saving the artefact is that this file can be put beside it and compared.
 *
 * WHAT IT IS FOR, in Mike's words: "a separate page that showed all the mechanics
 * / pathways that help determine a template in a read only page so firm managers
 * could understand what influences the template selection … to allow users to
 * learn what makes the best difference across all variable inputs."
 *
 * THREE THINGS THIS PAGE MUST KEEP DOING:
 *
 *  1. EVERY ROW ENDS IN AN ACTION. Plan A — listing every lever the engine has —
 *     was rejected: it would expose the protected IP and it teaches a manager
 *     what they are NOT allowed to touch. Only the deliberately-editable blocks
 *     appear here.
 *  2. IT READS THE FIRM'S OWN LIVE CONFIGURATION. Every count comes from the
 *     summary route, which resolves this firm's edits — never the platform
 *     defaults with their work missing ("of course it needs to be accurate for
 *     them — always").
 *  3. LEVERAGE IS NEVER A SHARE OF SCORE. It is whether a nudge crosses the gap
 *     between the top two candidates, and that average margin is what the cards
 *     state. The same data reads as worthless or powerful depending on the
 *     number chosen, which is exactly the risk Mike raised.
 *
 * The page is read-only with ONE exception, and it is deliberate: the near-miss
 * rows offer Move / Copy / Leave, because a line that is a decision and not an
 * observation is the whole reason that section was approved. Those actions reuse
 * the existing distinction endpoints and confirm before writing.
 */
export default {
  name: 'FirmDecisionLogic',

  components: { DecisionLogicDiagnostic },

  props: {
    /** Bearer token for the firm-manager API (the server re-checks every call). */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: false,
      error: '',
      /** The three levers with this firm's real counts. */
      levers: null,
      /** { rows, basisCaseCount, tracedCaseCount, staleDropped }. */
      nearMisses: { rows: [], basisCaseCount: 0, tracedCaseCount: 0, staleDropped: 0 },
      domains: [],
      showNearMiss: false,
      /** rowKey → the past-tense line shown once a row has been decided. */
      settled: {},
      busyKey: null
    }
  },

  computed: {
    /** The Scenario Lab figures, carried on the payload with their provenance. */
    measured () {
      return (this.levers && this.levers.measured) || {
        caseCount: 0, turnedOnTablesAlone: 0, turnedOnDistinctionsAlone: 0, averageTopTwoMargin: 0
      }
    },

    /** What a distinction is worth in THIS firm's configuration. */
    distinctionBoost () {
      return (this.levers && this.levers.distinctions.boost) || 5
    },

    /** What a logic-table hint is worth, read from the engine's own constant. */
    treeBoost () {
      return (this.levers && this.levers.logicTables.boost) || 3
    },

    /**
     * The average top-two margin, to one decimal. JavaScript prints 3.0 as "3",
     * and this is the figure the whole "+3 versus +5" argument rests on — a
     * margin stated as a whole number reads as a rounder, cruder measurement
     * than it is.
     * @returns {string}
     */
    marginLabel () {
      return Number(this.measured.averageTopTwoMargin || 0).toFixed(1)
    },

    nearMissRows () { return this.nearMisses.rows || [] },

    /**
     * Domain id → label, so no screen ever shows a manager a database key.
     * @returns {Object<string, string>}
     */
    domainLabels () {
      const map = {}
      for (const d of this.domains) { map[d.id] = d.label }
      return map
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /**
     * Read the firm's live configuration. A failure is shown and the page stays
     * empty: half a map, silently, is worse than no map — every number here is
     * meant to be acted on.
     */
    async load () {
      this.loading = true
      this.error = ''
      try {
        const data = await this.api('GET', '/api/firm-manager/logic-lab/summary')
        this.levers = data.levers
        this.nearMisses = data.nearMisses || this.nearMisses
        this.domains = data.domains || []
      } catch (err) {
        this.error = this.$t('firmDecisionLogic.loadFailed')
        this.levers = null
      } finally {
        this.loading = false
      }
    },

    /**
     * A near-miss is identified by the distinction AND the area it kept reaching
     * — the same key the server aggregates on, so one row settling never marks
     * another as done.
     * @param {Object} row
     * @returns {string}
     */
    rowKey (row) { return `${row.id}::${row.matchedDomain}` },

    /**
     * Human label for a domain id (falls back to the id rather than to a blank,
     * which would read as "filed under nothing").
     * @param {string} id
     * @returns {string}
     */
    domainLabel (id) { return this.domainLabels[id] || id || '—' },

    /**
     * Move the distinction into the area it keeps matching. It stops being
     * considered where it is now — which is why this asks first.
     * @param {Object} row a near-miss row
     */
    moveRow (row) {
      const to = this.domainLabel(row.matchedDomain)
      const from = this.domainLabel(row.filedDomain)
      this.$buefy.dialog.confirm({
        title: this.$t('firmDecisionLogic.nmMoveConfirmTitle'),
        message: this.$t('firmDecisionLogic.nmMoveConfirm', { from, to }),
        confirmText: this.$t('firmDecisionLogic.nmMove', { domain: to }),
        type: 'is-warning',
        onConfirm: () => this.runAction(
          row,
          buildMoveRequest(row, row.matchedDomain),
          this.$t('firmDecisionLogic.nmMoved', { domain: to })
        )
      })
    },

    /**
     * Copy it into the area it keeps matching, leaving the original alone — the
     * answer when the situation genuinely arises in both.
     * @param {Object} row a near-miss row
     */
    copyRow (row) {
      const to = this.domainLabel(row.matchedDomain)
      const from = this.domainLabel(row.filedDomain)
      this.$buefy.dialog.confirm({
        title: this.$t('firmDecisionLogic.nmCopyConfirmTitle'),
        message: this.$t('firmDecisionLogic.nmCopyConfirm', { from, to }),
        confirmText: this.$t('firmDecisionLogic.nmCopy'),
        type: 'is-warning',
        onConfirm: () => this.runAction(
          row,
          buildCopyRequest(row, row.matchedDomain),
          this.$t('firmDecisionLogic.nmCopied', { domain: to })
        )
      })
    },

    /**
     * Leave it. Nothing is written — the row is simply marked as decided so the
     * page stops asking. It returns on the next load, because nothing changed.
     * @param {Object} row a near-miss row
     */
    leaveRow (row) {
      this.$set(this.settled, this.rowKey(row), this.$t('firmDecisionLogic.nmLeft'))
    },

    /**
     * Send one near-miss decision and record the outcome on the row.
     * @param {Object} row the near-miss row
     * @param {{method: string, path: string, body: Object}} request
     * @param {string} doneLabel the past-tense line to show on success
     */
    async runAction (row, request, doneLabel) {
      const key = this.rowKey(row)
      this.busyKey = key
      try {
        await this.api(request.method, request.path, request.body)
        this.$set(this.settled, key, doneLabel)
        // The distinction count in the card above has changed; re-read rather
        // than adjusting it here, so the page can never disagree with the store.
        this.load()
        // ...and so does the Advisory Distinctions tab, which this page cannot
        // reload itself. Move and Copy shipped without this on 2026-08-03 and had
        // the same defect the attach button was found to have: the write lands,
        // the sibling tab keeps showing what it fetched when the hub mounted.
        this.$emit('distinctions-changed')
      } catch (err) {
        this.$buefy.toast.open({
          message: this.$t('firmDecisionLogic.nmActionFailed'),
          type: 'is-danger'
        })
      } finally {
        this.busyKey = null
      }
    },

    /**
     * Thin authenticated fetch — mirrors the other firm components so this one
     * can be mounted and tested alone; the backend re-checks authorisation on
     * every call regardless of what the browser sends.
     * @param {string} method HTTP verb
     * @param {string} path same-origin API path (proxied to Restify)
     * @param {Object} [body] JSON body
     * @returns {Promise<Object>} parsed JSON
     */
    async api (method, path, body) {
      const opts = { method, headers: { Authorization: `Bearer ${this.apiToken}` } }
      if (body) {
        opts.headers['Content-Type'] = 'application/json'
        opts.body = JSON.stringify(body)
      }
      const res = await fetch(path, opts)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err.error && err.error.message) || err.message || res.statusText)
      }
      return res.json()
    }
  }
}
</script>

<style scoped>
/* The approved mockup's own values, kept literal so the build can be put beside
   design/mockups/decision-logic-map-mockup.html and compared line for line. */
/* `margin: 0 auto` is the artefact's own rule (mockup .wrap) and was dropped in
   transcription, which pinned the whole page to the left edge of a full-width
   tab. Restored 2026-08-03. */
.decision-logic { position: relative; max-width: 1060px; margin: 0 auto; color: #363636; }

.dl-title { font-size: 1.6rem; margin: 0 0 0.4rem; color: #002b64; letter-spacing: -0.01em; font-weight: 700; }
.dl-lede { color: #7a869a; font-size: 0.92rem; margin: 0; max-width: 56rem; }

/* Generous, consistent rhythm between sections. */
.band { margin-top: 4rem; }
.band-heading { font-size: 1.15rem; color: #002b64; margin: 0 0 0.35rem; letter-spacing: -0.01em; font-weight: 700; }
.band-sub { color: #7a869a; font-size: 0.86rem; margin: 0 0 1.6rem; max-width: 56rem; }

/* ── Row of three ─────────────────────────────────────────────────────── */
.levers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.1rem; }
@media (max-width: 880px) { .levers { grid-template-columns: 1fr; } }

.lever {
  background: #fff; border: 1px solid #e2e6ec; border-top-width: 5px;
  border-radius: 8px; padding: 1.35rem 1.4rem 1.5rem; display: flex; flex-direction: column;
}
.lever.selects { border-top-color: #63c48d; }
.lever.shapes { border-top-color: #b8c6d8; }

.lname { font-weight: 700; font-size: 1.05rem; color: #002b64; display: block; }
.ljob {
  display: inline-block; margin-top: 0.5rem; font-size: 0.67rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.07em; padding: 0.2rem 0.6rem; border-radius: 999px;
}
.selects .ljob { color: #1f7a45; background: #eefaf2; }
.shapes .ljob { color: #5a6b82; background: #f3f6fa; }
.lcount { font-size: 0.75rem; color: #7a869a; margin: 0.75rem 0 0; }
.lbody { font-size: 0.86rem; margin: 0.85rem 0 0; }
.lmeasure { font-size: 0.82rem; margin: 1.1rem 0 0; padding: 0.75rem 0.85rem; border-radius: 6px; }
.selects .lmeasure { background: #eefaf2; color: #14532d; }
.shapes .lmeasure { background: #f3f6fa; color: #33415c; }
.laction { font-size: 0.82rem; color: #002b64; font-weight: 600; margin-top: auto; padding-top: 1.1rem; }
.footnote { font-size: 0.8rem; color: #7a869a; margin: 1.3rem 0 0; }

.tag-il {
  font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.07em; font-weight: 700;
  color: #b35309; background: #fffaf3; border: 1px solid #ffb870;
  border-radius: 3px; padding: 0.05rem 0.4rem;
}

/* ── The router ───────────────────────────────────────────────────────── */
.router { background: #fff; border: 1px solid #ececec; border-radius: 8px; overflow: hidden; }
.rrow {
  display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 1.6rem; padding: 1.4rem 1.6rem; border-top: 1px solid #f0f2f5; align-items: start;
}
.rrow:first-child { border-top: 0; }
@media (max-width: 820px) { .rrow { grid-template-columns: 1fr; gap: 0.7rem; } }

.rsym { font-size: 0.95rem; font-weight: 600; color: #363636; margin: 0; }
.rsym::before { content: '“'; }
.rsym::after { content: '”'; }
.rwhy { font-size: 0.79rem; color: #7a869a; margin: 0.4rem 0 0; }

.rgo { margin: 0; }
.rlever {
  display: inline-block; font: inherit; font-size: 0.86rem; font-weight: 700; color: #002b64;
  background: none; border: 0; border-bottom: 2px solid #63c48d; padding: 0; cursor: pointer;
  text-align: left;
}
.rlever.is-shape { border-bottom-color: #b8c6d8; }
.rnote { font-size: 0.81rem; color: #363636; margin: 0.5rem 0 0; }

/* ── Near misses, opened from router row 5 ────────────────────────────── */
.nearmiss {
  margin-top: 1rem; border: 1px solid #e2e6ec; border-radius: 6px;
  background: #fbfcfe; padding: 0.9rem 1rem;
}
.nm-row { padding: 0.7rem 0; border-top: 1px solid #eef1f5; }
.nm-row:first-of-type { border-top: 0; padding-top: 0; }
.nm-row.is-done { opacity: 0.55; }
.nm-what { font-size: 0.84rem; margin: 0; }
.nm-acts { margin-top: 0.6rem; display: flex; gap: 0.4rem; flex-wrap: wrap; }
.nm-btn {
  font: inherit; font-size: 0.76rem; padding: 0.28rem 0.7rem; border-radius: 5px;
  border: 1px solid #e2e6ec; background: #fff; color: #363636; cursor: pointer;
}
.nm-btn[disabled] { cursor: default; opacity: 0.6; }
.nm-btn.is-do { border-color: #63c48d; background: #eefaf2; color: #1f7a45; font-weight: 700; }
.nm-btn.is-off { color: #7a869a; }
.nm-done { font-size: 0.78rem; color: #1f7a45; font-weight: 700; margin: 0.6rem 0 0; }
.nm-empty { font-size: 0.81rem; color: #7a869a; margin: 0.6rem 0 0; }
.nm-basis { font-size: 0.72rem; color: #8a94a3; margin: 0.8rem 0 0; }
</style>
