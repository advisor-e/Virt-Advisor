<template lang="pug">
.mol
  p.subtitle.is-6.has-text-grey.mb-4 {{ $t('outcomeLearning.header') }}

  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  b-message(v-else-if="loadError" type="is-danger" size="is-small") {{ loadError }}

  template(v-else)
    //- ── How to use this page (Mike, 2026-09-11; hub-page-guidance.html) ─────
    hub-guide-panel(storage-key="outcome-learning" :intro="$t('outcomeLearning.guide.intro')" :points="guidePoints")

    //- ── The summary strip ────────────────────────────────────────────────────
    .columns.is-multiline.mb-2
      .column.is-3
        .box.mol-tile
          .mol-tile-l {{ $t('outcomeLearning.tileFirms') }}
          .mol-tile-v {{ page.firms }}
      .column.is-3
        .box.mol-tile
          .mol-tile-l {{ $t('outcomeLearning.tileReviews') }}
          .mol-tile-v {{ page.cases }}
      .column.is-3
        .box.mol-tile
          .mol-tile-l {{ $t('outcomeLearning.tileLive') }}
          .mol-tile-v {{ counts.live }}
          .mol-tile-s {{ $t('outcomeLearning.tileLiveSub', counts) }}
      .column.is-3
        .box.mol-tile
          .mol-tile-l {{ $t('outcomeLearning.tileRecomputed') }}
          .mol-tile-v.mol-tile-v-small {{ page.lastRecomputeAt ? dateTimeWords(page.lastRecomputeAt) : $t('outcomeLearning.justNow') }}
          //- The page recomputes every time it opens (Mike's ruling, no schedule). The
          //- button is for a mentor who has had it open a while; it is the one load that
          //- PERSISTS, so a row that just fell below the floor is recorded at that moment.
          b-button.mt-1(size="is-small" outlined type="is-primary" :loading="recomputing" @click="recomputeNow")
            | {{ $t('outcomeLearning.recomputeNow') }}

    b-message(v-if="actionError" type="is-danger" size="is-small") {{ actionError }}

    //- ── What this is telling you (Mike, 2026-09-11) ───────────────────────────
    //- The model reads the rows and figures on this page and nothing else; the
    //- backend stores the reading with the counts it was read from. Not shown on an
    //- empty pool — there is nothing to read. It decides nothing.
    hub-reading-card(v-if="!isEmpty" :reading="page.reading" :stale="page.readingStale" :loading="readingLoading" :error="readingError" :from-now="readingFromNow" :from-then="readingFromThen" :caveat="$t('outcomeLearning.readingCaveat')" @read="readPage")

    //- ── The empty page ───────────────────────────────────────────────────────
    //- Spec FR-013: a young pool is said in the two numbers that explain it, never
    //- shown as a broken page.
    .box(v-if="isEmpty")
      p.mol-lede
        b {{ $t('outcomeLearning.emptyHeading') }}
        |  {{ $tc('outcomeLearning.emptyFirms', page.firms) }} {{ $tc('outcomeLearning.emptyReviews', page.cases) }}
        |  {{ $t('outcomeLearning.emptyFloor', { firms: page.floor.minFirms, cases: page.floor.minCases }) }}
      p.is-size-7.has-text-grey {{ $t('outcomeLearning.emptyNote') }}

    //- ── What the pool has learned ────────────────────────────────────────────
    //- 🔴 NOTHING ON THIS PAGE CHANGES A RECOMMENDATION UNTIL THE MENTOR PRESSES ACCEPT. A
    //- proposed row is a finding, not an action. One row is one template in ONE situation
    //- (Mike's ruling); the arithmetic is the backend's and a person can check every figure
    //- by hand from the two counts, which the line under the table says how to do.
    .box(v-if="page.adjustments.length")
      .is-flex.is-justify-content-space-between.is-align-items-baseline.mb-3
        h4.title.is-6.mb-0 {{ $t('outcomeLearning.tableHeading') }}
        b-tag(type="is-info" size="is-small") {{ $t('outcomeLearning.floorPill', { firms: page.floor.minFirms, cases: page.floor.minCases }) }}

      .table-container
        table.table.is-fullwidth.is-narrow
          thead
            tr
              th {{ $t('outcomeLearning.colTemplate') }}
              th {{ $t('outcomeLearning.colSituation') }}
              th.has-text-right {{ $t('outcomeLearning.colDelivered') }}
              th.has-text-right {{ $t('outcomeLearning.colDidntLand') }}
              th {{ $t('outcomeLearning.colHoldBack') }}
              th.has-text-right {{ $t('outcomeLearning.colFirms') }}
              th {{ $t('outcomeLearning.colState') }}
              th
          tbody
            tr(v-for="a in page.adjustments" :key="a.id" :class="{ 'mol-dim': a.state === 'below_floor' || a.state === 'rejected' }")
              td
                span.has-text-weight-semibold {{ a.template }}
              td.mol-sit
                | {{ $t('outcomeLearning.dim.' + a.dimension) }}
                b  {{ situationWords(a) }}
              td.has-text-right.mol-num {{ a.delivered }}
              td.has-text-right.mol-num
                | {{ a.less }}
                .mol-sub {{ percent(a.less, a.delivered) }}
              td
                span.mol-hb(:class="{ 'is-zero': a.holdBack === 0 }") {{ a.holdBack === 0 ? '0' : '−' + a.holdBack }}
              td.has-text-right.mol-num {{ a.firms }}
              td
                b-tag(:type="stateType(a.state)" size="is-small") {{ $t('outcomeLearning.state.' + a.state) }}
                .mol-sub {{ stateSub(a) }}
              td
                .buttons.are-small.mol-acts
                  //- Accept is offered only where the backend would take it: above the
                  //- floor and in the library. The route refuses anyway; this avoids
                  //- offering a button that can only fail.
                  b-button(v-if="canAccept(a)" type="is-primary" size="is-small" :loading="deciding === a.id" @click="decide(a, 'live')")
                    | {{ $t('outcomeLearning.accept') }}
                  b-button(v-if="canHold(a)" size="is-small" :loading="deciding === a.id" @click="decide(a, 'held')")
                    | {{ $t('outcomeLearning.hold') }}
                  b-button(v-if="canReject(a)" type="is-danger" outlined size="is-small" @click="openReject(a)")
                    | {{ $t('outcomeLearning.reject') }}

      p.is-size-7.has-text-grey.mt-3
        b {{ $t('outcomeLearning.checkHeading') }}
        |  {{ $t('outcomeLearning.checkBody', { cap: page.capMax }) }}

    //- ── Rejecting (Screen B) ─────────────────────────────────────────────────
    //- A reason is REQUIRED to reject, optional to hold (Mike, 2026-09-10). The button is
    //- disabled without one and the backend refuses without one.
    .box.mol-dlg(v-if="rejecting")
      p.mb-1
        b {{ $t('outcomeLearning.rejectTitle', { template: rejecting.template, situation: situationWords(rejecting) }) }}
      p.is-size-7.has-text-grey.mb-3 {{ $t('outcomeLearning.rejectBody') }}
      b-field(:label="$t('outcomeLearning.rejectWhy')" label-position="on-border")
        b-input(v-model="rejectReason" type="textarea" rows="3" maxlength="500")
      b-message(v-if="rejectError" type="is-danger" size="is-small") {{ rejectError }}
      .buttons
        b-button(type="is-danger" :disabled="!rejectReason.trim()" :loading="deciding === rejecting.id" @click="confirmReject")
          | {{ $t('outcomeLearning.rejectConfirm') }}
        b-button(outlined @click="closeReject") {{ $t('outcomeLearning.rejectKeep') }}

    //- ── The two benches (Screen C) ───────────────────────────────────────────
    //- The run happens on the button, never on page open: it replays every pooled review
    //- through the engine twice. Past the page rule the backend hands back a job and this
    //- polls it, so the button reads "Running…" and the figures arrive when it finishes.
    .box(v-if="!isEmpty")
      .is-flex.is-justify-content-space-between.is-align-items-baseline.mb-3
        h4.title.is-6.mb-0 {{ $t('outcomeLearning.benchHeading') }}
        b-button(size="is-small" outlined type="is-primary" :loading="runningBenches" :disabled="runningBenches" @click="runBenches")
          | {{ runningBenches ? $t('outcomeLearning.benchRunning') : $t('outcomeLearning.benchRun') }}
      b-message(v-if="benchError" type="is-danger" size="is-small") {{ benchError }}
      template(v-if="benchFixed || benchOutcome")
        .columns
          .column(v-if="benchFixed")
            .mol-bench
              h5.mol-bench-h {{ $t('outcomeLearning.benchFixed') }}
              p.is-size-7.has-text-grey {{ $t('outcomeLearning.benchFixedDesc') }}
              .mol-bfig
                span.mol-bn
                  | {{ percentOf(benchFixed.before) }}
                  small {{ $t('outcomeLearning.benchWithout') }}
                span.has-text-grey →
                span.mol-bn
                  | {{ percentOf(benchFixed.after) }}
                  small {{ $tc('outcomeLearning.benchWith', liveCount(benchFixed)) }}
          .column(v-if="benchOutcome")
            .mol-bench
              h5.mol-bench-h {{ $t('outcomeLearning.benchOutcome') }}
              p.is-size-7.has-text-grey {{ $t('outcomeLearning.benchOutcomeDesc') }}
              .mol-bfig
                span.mol-bn
                  | {{ percentOf(benchOutcome.before) }}
                  small {{ $t('outcomeLearning.benchWithout') }}
                span.has-text-grey →
                span.mol-bn
                  | {{ percentOf(benchOutcome.after) }}
                  small {{ $tc('outcomeLearning.benchWith', liveCount(benchOutcome)) }}
        p.is-size-7.has-text-grey.mt-2
          template(v-if="benchRanAt")  {{ $tc('outcomeLearning.benchLastRun', liveCount(benchOutcome || benchFixed), { when: dateTimeWords(benchRanAt) }) }}
          |  {{ $t('outcomeLearning.benchHonesty') }}
      p.is-size-7.has-text-grey(v-else) {{ $t('outcomeLearning.benchNotRun') }}

    //- ── History (Screen D) ───────────────────────────────────────────────────
    //- Every decision, then every saved version with a restore. A restore brings back the
    //- whole decisions row as it was — the store's version history, which is why FR-009
    //- costs nothing here.
    .box(v-if="decisionRows.length || restorable.length")
      .is-flex.is-justify-content-space-between.is-align-items-baseline.mb-3
        h4.title.is-6.mb-0 {{ $t('outcomeLearning.historyHeading') }}
        b-tag(type="is-info" size="is-small") {{ $t('outcomeLearning.historyPill') }}

      .mol-hist(v-for="d in decisionRows" :key="'d-' + d.id")
        span.mol-hist-when {{ dateWords(d.at) }}
        span.mol-hist-who
          | {{ $t('outcomeLearning.past.' + d.state) }} — {{ d.template }} {{ $t('outcomeLearning.in') }} {{ situationWords(d) }} — {{ d.by || $t('outcomeLearning.unnamed') }}
          template(v-if="d.reason")  — "{{ d.reason }}"

      template(v-if="restorable.length")
        p.is-size-7.has-text-grey.mt-3.mb-1 {{ $t('outcomeLearning.versionsLede') }}
        .mol-hist(v-for="v in restorable" :key="'v-' + v.id")
          span.mol-hist-when {{ dateTimeWords(v.created_at) }}
          span.mol-hist-who {{ $t('outcomeLearning.versionRow', { version: v.version, by: v.saved_by || $t('outcomeLearning.unnamed') }) }}
          b-button(size="is-small" outlined :loading="restoring === v.id" @click="restore(v)")
            | {{ $t('outcomeLearning.restore') }}

    //- ── Orphans ──────────────────────────────────────────────────────────────
    //- A notice, not a row: there is nothing to accept or reject on a template that has
    //- left the library. It is not applied and cannot be.
    b-message(v-if="page.orphaned.length" type="is-warning" size="is-small")
      b {{ $tc('outcomeLearning.orphanHeading', page.orphaned.length) }}
      ul.mol-orphans
        li(v-for="o in page.orphaned" :key="o.id")
          i {{ o.template }}
          |  {{ $t('outcomeLearning.in') }} {{ situationWords(o) }}
          template(v-if="o.decision && o.decision.at")  — {{ $t('outcomeLearning.past.' + o.decision.state) }} {{ dateWords(o.decision.at) }}
      p.mt-1 {{ $t('outcomeLearning.orphanBody') }}
</template>

<script>
/**
 * Outcome Learning — the Mentor Hub page, item 4.87 (specs/002-outcome-learning, T027).
 *
 * Design: `design/mockups/outcome-learning-mentor.html`, drawn 2026-09-10 and approved by Mike
 * the same day; its fifteen wording rows ruled 2026-09-11. Asked for in his own words: *"It
 * surfaces on the Mentor Hub first. A page shows what has been learned, from how many firms and
 * cases, each adjustment with its evidence, and the mentor accepts, holds or rejects each one
 * before it goes live, with version history and restore."*
 *
 * 🔴 THE MENTOR TIER ALONE (spec FR-014, a stated judgement). The pool is one platform-wide
 * set: a lower tier would see the same rows and could take no different decision on them.
 *
 * ⚠ NOTHING HERE DECIDES ANYTHING. The arithmetic, the floor and the decision record are the
 * backend's (`server/routes/outcomeLearning.js`); the mentor's name comes from the token. What
 * this screen guarantees is that Accept is only offered where the backend would take it, that
 * a rejection carries a reason, and that each button sends exactly the fields the route reads.
 * The bench figures are the backend's too (`server/utils/outcomeBench.js`); the fixed bench's
 * "before" is 100% by construction — the case's expected answer is the engine's own unadjusted
 * one (Mike's yes, 2026-09-11) — so "after" is the share the live adjustments left unchanged.
 *
 * The page never knows which firms are in the pool — `firms` is a count of one-way tokens.
 */

import DOMAINS from '~/data/domains.json'
import ENGAGEMENT from '~/data/engagement-types.json'
import HubGuidePanel from '~/components/shared/HubGuidePanel.vue'
import HubReadingCard from '~/components/shared/HubReadingCard.vue'

const DOMAIN_LABELS = {}
DOMAINS.forEach((d) => { if (d && d.id) { DOMAIN_LABELS[d.id] = d.label || d.id } })
const ENGAGEMENT_LABELS = {}
;(ENGAGEMENT.types || []).forEach((t) => { if (t && t.id) { ENGAGEMENT_LABELS[t.id] = (t.name || t.id).toLowerCase() } })

const BASE = '/api/mentor/outcome-learning'

export default {
  name: 'MentorOutcomeLearning',

  components: { HubGuidePanel, HubReadingCard },

  props: {
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: true,
      loadError: '',
      /** The route's payload, shaped so the template never reads an undefined list. */
      page: { firms: 0, cases: 0, lastRecomputeAt: null, floor: { minFirms: 0, minCases: 0 }, capMax: 0, adjustments: [], orphaned: [], benches: null, reading: null, readingStale: false },
      readingLoading: false,
      readingError: '',
      /** The decisions row's saved versions, newest first. */
      versions: [],
      recomputing: false,
      /** The id being decided on, so one row's buttons spin and not all of them. */
      deciding: '',
      actionError: '',
      /** The adjustment the reject dialog is open for, or null. */
      rejecting: null,
      rejectReason: '',
      rejectError: '',
      restoring: null,
      /** True from pressing "Run the benches" until the figures arrive or the run fails. */
      runningBenches: false,
      benchError: '',
      /** The poll timer for a long run, so leaving the page stops it. */
      benchPoll: null
    }
  },

  computed: {
    /** @returns {boolean} a young pool: nothing proposed, nothing decided, nothing orphaned */
    isEmpty () {
      return this.page.adjustments.length === 0 && this.page.orphaned.length === 0
    },

    /** @returns {{live:number, proposed:number, held:number, below:number}} for the tile */
    counts () {
      const c = { live: 0, proposed: 0, held: 0, below: 0 }
      this.page.adjustments.forEach((a) => {
        if (a.state === 'live') { c.live += 1 } else if (a.state === 'proposed') { c.proposed += 1 } else if (a.state === 'held') { c.held += 1 } else if (a.state === 'below_floor') { c.below += 1 }
      })
      return c
    },

    /** @returns {object|null} the fixed bench's before/after, when user story 4 has run it */
    benchFixed () {
      const b = this.page.benches
      return b && b.fixed && typeof b.fixed === 'object' ? b.fixed : null
    },

    /** @returns {object|null} the outcome bench's before/after, when it has run */
    benchOutcome () {
      const b = this.page.benches
      return b && b.outcome && typeof b.outcome === 'object' ? b.outcome : null
    },

    /** @returns {string[]} the four points of "How to use this page" */
    guidePoints () {
      return ['p1', 'p2', 'p3', 'p4'].map(k => this.$t('outcomeLearning.guide.' + k))
    },

    /** @returns {string} "from 5 firms, 31 reviews, 1 live adjustment", as the page stands */
    readingFromNow () {
      return this.$tc('outcomeLearning.readingFrom', this.counts.live, { firms: this.page.firms, reviews: this.page.cases, live: this.counts.live })
    },

    /** @returns {string} the same, for the counts the stored reading was made from */
    readingFromThen () {
      const f = this.page.reading && this.page.reading.from
      if (!f) { return '' }
      return this.$tc('outcomeLearning.readingFrom', f.live || 0, { firms: f.firms || 0, reviews: f.cases || 0, live: f.live || 0 })
    },

    /** @returns {string|null} when the benches last ran — both carry the same stamp */
    benchRanAt () {
      const b = this.benchOutcome || this.benchFixed
      return b && typeof b.ranAt === 'string' ? b.ranAt : null
    },

    /**
     * Every decision on the page, newest first, with what it was taken on. The record
     * carries the template and situation itself, so a decision whose evidence has since
     * gone is still shown in words (data-model §4).
     * @returns {Array<object>}
     */
    decisionRows () {
      return this.page.adjustments.concat(this.page.orphaned)
        .filter(a => a.decision && a.decision.at && a.decision.state)
        .map(a => ({
          id: a.id,
          state: a.decision.state,
          at: a.decision.at,
          by: a.decision.by,
          reason: a.decision.reason,
          template: a.template,
          dimension: a.dimension,
          value: a.value
        }))
        .sort((x, y) => Date.parse(y.at) - Date.parse(x.at))
    },

    /** @returns {Array<object>} the saved versions a mentor may go back to — not the live one */
    restorable () {
      return this.versions.filter(v => !v.is_active)
    }
  },

  async mounted () {
    await this.refresh()
  },

  beforeDestroy () {
    if (this.benchPoll) { clearTimeout(this.benchPoll) }
  },

  methods: {
    /**
     * "Run the benches". A short run answers with the figures; a long one answers with a
     * job id and this polls it every two seconds until it is done, failed, or forgotten.
     * @route POST /api/mentor/outcome-learning/bench · GET /api/mentor/outcome-learning/bench/:jobId
     * @returns {Promise<void>}
     */
    async runBenches () {
      this.benchError = ''
      this.runningBenches = true
      try {
        const data = await this.api('POST', BASE + '/bench')
        if (data.benches) {
          await this.applyBenches(data.benches)
        } else if (data.jobId) {
          this.pollBench(String(data.jobId))
        } else {
          throw new Error(this.$t('outcomeLearning.failed'))
        }
      } catch (e) {
        this.benchError = e.message
        this.runningBenches = false
      }
    },

    /** @param {string} jobId */
    pollBench (jobId) {
      this.benchPoll = setTimeout(async () => {
        this.benchPoll = null
        try {
          const data = await this.api('GET', BASE + '/bench/' + encodeURIComponent(jobId))
          if (data.status === 'done' && data.benches) {
            await this.applyBenches(data.benches)
          } else if (data.status === 'failed') {
            throw new Error(this.$t('outcomeLearning.failed'))
          } else {
            this.pollBench(jobId)
          }
        } catch (e) {
          // A 404 here is a server that restarted mid-run and forgot the job.
          this.benchError = e.status === 404 ? this.$t('outcomeLearning.benchLost') : e.message
          this.runningBenches = false
        }
      }, 2000)
    },

    /**
     * The figures are on the page, then the page is re-read so the tile, the history and
     * the saved versions all follow the backend's own row.
     * @param {object} benches
     * @returns {Promise<void>}
     */
    async applyBenches (benches) {
      this.page = Object.assign({}, this.page, { benches })
      this.runningBenches = false
      try {
        this.applyPage(await this.api('GET', BASE))
        await this.loadVersions()
      } catch (_e) {
        // The figures already shown are the backend's; a failed re-read hides nothing.
      }
    },

    /** @param {object|null} b - a bench block @returns {number} how many adjustments were live when it ran */
    liveCount (b) {
      return b && Array.isArray(b.liveIds) ? b.liveIds.length : 0
    },

    /**
     * Load the page. The backend recomputes on every call and writes nothing.
     * @route GET /api/mentor/outcome-learning · GET /api/mentor/outcome-learning/history
     * @returns {Promise<void>}
     */
    async refresh () {
      this.loading = true
      this.loadError = ''
      try {
        this.applyPage(await this.api('GET', BASE))
        await this.loadVersions()
      } catch (e) {
        this.loadError = e.message
      }
      this.loading = false
    },

    /**
     * The version list is not fatal to the page: a mentor who cannot read history can
     * still see and decide on the table.
     * @returns {Promise<void>}
     */
    async loadVersions () {
      try {
        const data = await this.api('GET', BASE + '/history')
        this.versions = Array.isArray(data.versions) ? data.versions : []
      } catch (_e) {
        this.versions = []
      }
    },

    /**
     * Take a page payload into state, defensively — an undefined list would break the
     * template, and the backend is the only party that knows these numbers.
     * @param {object} data
     */
    applyPage (data) {
      this.page = {
        firms: Number.isInteger(data.firms) ? data.firms : 0,
        cases: Number.isInteger(data.cases) ? data.cases : 0,
        lastRecomputeAt: typeof data.lastRecomputeAt === 'string' ? data.lastRecomputeAt : null,
        floor: data.floor && typeof data.floor === 'object' ? data.floor : { minFirms: 0, minCases: 0 },
        capMax: Number.isInteger(data.capMax) ? data.capMax : 0,
        adjustments: Array.isArray(data.adjustments) ? data.adjustments : [],
        orphaned: Array.isArray(data.orphaned) ? data.orphaned : [],
        benches: data.benches && typeof data.benches === 'object' ? data.benches : null,
        reading: data.reading && typeof data.reading === 'object' ? data.reading : null,
        readingStale: data.readingStale === true
      }
    },

    /**
     * "Read this for me". One call; the backend sends the model what this page shows and
     * stores the reading. A failure is a message under the button, never an empty reading.
     * @route POST /api/mentor/outcome-learning/reading
     * @returns {Promise<void>}
     */
    async readPage () {
      this.readingError = ''
      this.readingLoading = true
      try {
        const data = await this.api('POST', BASE + '/reading')
        this.page = Object.assign({}, this.page, { reading: data.reading || null, readingStale: false })
      } catch (e) {
        this.readingError = e.status === 502 ? this.$t('hubReading.failed') : e.message
      }
      this.readingLoading = false
    },

    /**
     * "Recompute now" — the one load that persists. Sends nothing.
     * @route POST /api/mentor/outcome-learning/recompute
     * @returns {Promise<void>}
     */
    async recomputeNow () {
      this.actionError = ''
      this.recomputing = true
      try {
        this.applyPage(await this.api('POST', BASE + '/recompute'))
        await this.loadVersions()
      } catch (e) {
        this.actionError = e.message
      }
      this.recomputing = false
    },

    /** @param {object} a @returns {boolean} the backend would take a `live` decision on it */
    canAccept (a) {
      return a.meetsFloor === true && a.state !== 'live' && a.state !== 'orphaned' && a.state !== 'rejected'
    },

    /** @param {object} a @returns {boolean} */
    canHold (a) {
      return a.state === 'live' || a.state === 'proposed'
    },

    /** @param {object} a @returns {boolean} */
    canReject (a) {
      return a.state === 'live' || a.state === 'proposed' || a.state === 'held'
    },

    /**
     * Accept or hold. Sends `id` and `state` and nothing else — the mentor's name is the
     * token's. A hold needs no reason (Mike, 2026-09-10).
     *
     * @route POST /api/mentor/outcome-learning/decision
     * @param {object} a
     * @param {'live'|'held'} state
     * @returns {Promise<void>}
     */
    async decide (a, state) {
      this.actionError = ''
      this.deciding = a.id
      try {
        await this.api('POST', BASE + '/decision', { id: a.id, state })
        // Re-read rather than patch: the state chip, the tile and the history all follow
        // from the backend's recompute, not from this screen's idea of what changed.
        this.applyPage(await this.api('GET', BASE))
        await this.loadVersions()
      } catch (e) {
        this.actionError = e.message
      }
      this.deciding = ''
    },

    /** Open the reject dialog. Nothing is sent. @param {object} a */
    openReject (a) {
      this.rejecting = a
      this.rejectReason = ''
      this.rejectError = ''
    },

    /** Close it, keeping the adjustment as it is. */
    closeReject () {
      this.rejecting = null
      this.rejectReason = ''
      this.rejectError = ''
    },

    /**
     * Reject, with the reason that travels into history. Refuses without one — the button
     * is disabled without one, and the backend refuses too.
     * @route POST /api/mentor/outcome-learning/decision
     * @returns {Promise<void>}
     */
    async confirmReject () {
      const reason = this.rejectReason.trim()
      if (!this.rejecting || !reason) { return }
      this.rejectError = ''
      this.deciding = this.rejecting.id
      try {
        await this.api('POST', BASE + '/decision', { id: this.rejecting.id, state: 'rejected', reason })
        this.applyPage(await this.api('GET', BASE))
        await this.loadVersions()
        this.closeReject()
      } catch (e) {
        this.rejectError = e.message
      }
      this.deciding = ''
    },

    /**
     * Restore an earlier decisions row. Sends the version id and nothing else.
     * @route POST /api/mentor/outcome-learning/restore
     * @param {object} v
     * @returns {Promise<void>}
     */
    async restore (v) {
      this.actionError = ''
      this.restoring = v.id
      try {
        await this.api('POST', BASE + '/restore', { versionId: v.id })
        this.applyPage(await this.api('GET', BASE))
        await this.loadVersions()
      } catch (e) {
        this.actionError = e.message
      }
      this.restoring = null
    },

    /**
     * The situation in words: a domain's label, an engagement type's name, a signal id
     * as words, an industry as typed. Never the raw id where the data file has a label.
     * @param {{dimension: string, value: string}} a
     * @returns {string}
     */
    situationWords (a) {
      if (a.dimension === 'domain') { return DOMAIN_LABELS[a.value] || a.value }
      if (a.dimension === 'engagementType') { return ENGAGEMENT_LABELS[a.value] || a.value }
      if (a.dimension === 'signal') { return String(a.value).replace(/_/g, ' ') }
      return a.value
    },

    /**
     * The line under the state chip.
     * @param {object} a
     * @returns {string}
     */
    stateSub (a) {
      const d = a.decision
      if (a.state === 'live' && d) { return this.$t('outcomeLearning.subAccepted', { date: this.dateWords(d.at), by: d.by || this.$t('outcomeLearning.unnamed') }) }
      if (a.state === 'held' && d) { return this.$t('outcomeLearning.subHeld', { date: this.dateWords(d.at), by: d.by || this.$t('outcomeLearning.unnamed') }) + (d.reason ? ' — "' + d.reason + '"' : '') }
      if (a.state === 'rejected' && d) { return this.$t('outcomeLearning.subRejected', { date: this.dateWords(d.at), by: d.by || this.$t('outcomeLearning.unnamed') }) + (d.reason ? ' — "' + d.reason + '"' : '') }
      if (a.state === 'proposed' && a.holdBack === 0) { return this.$t('outcomeLearning.subNothing') }
      if (a.state === 'below_floor') {
        const firms = Math.max(0, this.page.floor.minFirms - a.firms)
        const cases = Math.max(0, this.page.floor.minCases - a.cases)
        return this.$t('outcomeLearning.subNeeds', { firms: this.$tc('outcomeLearning.moreFirms', firms), cases: this.$tc('outcomeLearning.moreCases', cases) })
      }
      return ''
    },

    /** @param {string} state @returns {string} the Buefy tag type for a state chip */
    stateType (state) {
      return { live: 'is-success', proposed: 'is-warning', held: 'is-light', rejected: 'is-danger', below_floor: 'is-light' }[state] || 'is-light'
    },

    /** @param {number} part @param {number} whole @returns {string} */
    percent (part, whole) {
      if (!whole) { return '' }
      return Math.round(100 * part / whole) + '%'
    },

    /** @param {number} fraction - 0..1 @returns {string} */
    percentOf (fraction) {
      return Number.isFinite(fraction) ? Math.round(100 * fraction) + '%' : ''
    },

    /** @param {string} iso @returns {string} */
    dateWords (iso) {
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) { return '' }
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    },

    /** @param {string} iso @returns {string} */
    dateTimeWords (iso) {
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) { return '' }
      return this.dateWords(iso) + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    },

    /**
     * One backend call. Both an HTTP error and a network failure arrive as an Error with a
     * message a mentor can act on, per the house error rule.
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
        throw new Error(this.$t('outcomeLearning.unreachable'))
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const err = new Error((data.error && data.error.message) || this.$t('outcomeLearning.failed'))
        err.status = res.status
        throw err
      }
      return data
    }
  }
}
</script>

<style scoped>
.mol-tile { padding: 0.9rem 1rem; height: 100%; }
.mol-tile-l {
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #5b6f8a;
  font-weight: 600;
}
.mol-tile-v {
  font-size: 1.7rem;
  font-weight: 300;
  line-height: 1.1;
  margin-top: 0.2rem;
  font-variant-numeric: tabular-nums;
}
.mol-tile-v-small { font-size: 1rem; margin-top: 0.5rem; }
.mol-tile-s { font-size: 0.75rem; color: #5b6f8a; margin-top: 0.2rem; }
.mol-lede { font-size: 0.95rem; }
.mol-sit { font-size: 0.8rem; color: #5b6f8a; }
.mol-sit b { color: #002b64; }
.mol-num { font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; }
.mol-sub { font-size: 0.72rem; color: #5b6f8a; font-weight: 300; margin-top: 0.15rem; }
/* The hold-back carries a sign as well as a colour: never the colour alone. */
.mol-hb {
  display: inline-block;
  min-width: 2.2rem;
  text-align: center;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  border-radius: 6px;
  padding: 0.1rem 0.45rem;
  background: rgba(255, 153, 0, 0.1);
  color: #8a5a00;
  border: 1px solid rgba(255, 153, 0, 0.35);
}
.mol-hb.is-zero { background: #f1f6fb; color: #5b6f8a; border-color: #d5e1ee; }
.mol-acts { flex-wrap: nowrap; margin-bottom: 0; }
.mol-dim td { opacity: 0.6; }
.mol-dlg { max-width: 40rem; background: #f1f6fb; }
.mol-bench {
  background: #f1f6fb;
  border: 1px solid #d5e1ee;
  border-radius: 12px;
  padding: 0.9rem 1rem;
  height: 100%;
}
.mol-bench-h { font-size: 0.85rem; font-weight: 600; margin-bottom: 0.2rem; }
.mol-bfig { display: flex; gap: 1rem; align-items: baseline; margin-top: 0.5rem; }
.mol-bn { font-size: 1.5rem; font-weight: 300; font-variant-numeric: tabular-nums; }
.mol-bn small { display: block; font-size: 0.72rem; color: #5b6f8a; }
.mol-hist {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid #eef3f8;
  font-size: 0.85rem;
}
.mol-hist:last-child { border-bottom: 0; }
.mol-hist-when { color: #5b6f8a; font-size: 0.75rem; flex: 0 0 10rem; }
.mol-hist-who { flex: 1; }
.mol-orphans { margin: 0.4rem 0 0 1.1rem; font-size: 0.85rem; }
</style>
