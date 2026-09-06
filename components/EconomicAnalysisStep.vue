<template lang="pug">
.ea
  //- ── The tick. Step 5 opens on this line and nothing else ──────────────────
  .ea-card
    .ticker(:class="{ 'is-open': enabled }")
      input#ea-enable.ea-check(type="checkbox" v-model="enabled" @change="onEnableChange")
      label.ea-tickbody(for="ea-enable")
        .tl
          | {{ $t('report.threeWayForecast.economicAnalysis.title') }}
          span.opt2 {{ $t('report.threeWayForecast.economicAnalysis.optional') }}
        .ts {{ $t('report.threeWayForecast.economicAnalysis.tickWhy') }}

    template(v-if="enabled")
      //- ── The brief ──────────────────────────────────────────────────────────
      .ea-group(v-if="!hasResearch && !isRunning")
        .ea-glabel
          span.ea-dot
          h2.ea-h2 {{ $t('report.threeWayForecast.economicAnalysis.briefHeading') }}
        textarea.brief(
          v-model="brief"
          :maxlength="MAX_BRIEF"
          :placeholder="$t('report.threeWayForecast.economicAnalysis.briefPlaceholder')")
        ul.hintlist
          li {{ $t('report.threeWayForecast.economicAnalysis.hint1') }}
          li {{ $t('report.threeWayForecast.economicAnalysis.hint2') }}
          li {{ $t('report.threeWayForecast.economicAnalysis.hint3') }}
          li {{ $t('report.threeWayForecast.economicAnalysis.hint4') }}

      //- ── Mike's privacy ruling, drawn: the exact words, repeated not summarised ──
      .ea-group(v-if="!hasResearch && !isRunning")
        .sendbox
          .sendhead {{ $t('report.threeWayForecast.economicAnalysis.sendHead') }}
          .sendbody(v-if="trimmedBrief") {{ trimmedBrief }}
          .sendbody.is-empty(v-else) {{ $t('report.threeWayForecast.economicAnalysis.sendEmpty') }}
          .sendfoot {{ $t('report.threeWayForecast.economicAnalysis.sendFoot') }}

      .ea-group(v-if="!hasResearch && !isRunning")
        .ea-actions
          button.ea-cta(type="button" :disabled="!canResearch || starting" @click="startResearch")
            | {{ starting ? $t('report.threeWayForecast.economicAnalysis.starting') : $t('report.threeWayForecast.economicAnalysis.research') }}
          span.ea-foot(v-if="briefTooShort") {{ $t('report.threeWayForecast.economicAnalysis.briefTooShort') }}
          span.ea-foot(v-else) {{ $t('report.threeWayForecast.economicAnalysis.aboutTwoMinutes') }}

      //- ── Running ────────────────────────────────────────────────────────────
      .waiting(v-if="isRunning")
        span.pulse
        .waiting-body
          .wt {{ $t('report.threeWayForecast.economicAnalysis.running') }}
          .ws {{ $t('report.threeWayForecast.economicAnalysis.runningWhy') }}
          //- DEVIATION from the drawing, recorded in slice 1: the API does not say which
          //- output section a search belongs to, so the model's OWN phrases are shown.
          ul.searches(v-if="searches.length")
            li(v-for="(q, i) in searches" :key="i")
              span.mk ›
              | {{ q }}
          .ws.searchcount(v-if="searchCount") {{ $tc('report.threeWayForecast.economicAnalysis.searchCount', searchCount, { count: searchCount }) }}

      //- ── It failed ──────────────────────────────────────────────────────────
      .ea-group(v-if="error")
        .ea-error
          b {{ $t('report.threeWayForecast.economicAnalysis.failedHeading') }}
          p {{ error }}
          button.ea-cta.is-ghost(type="button" @click="reset") {{ $t('report.threeWayForecast.economicAnalysis.tryAgain') }}

      //- ── The research ───────────────────────────────────────────────────────
      template(v-if="hasResearch")
        .ea-group.ea-rhead
          div
            h2.ea-h2 {{ $t('report.threeWayForecast.economicAnalysis.title') }}
            .ea-sub
              | {{ $t('report.threeWayForecast.economicAnalysis.runMeta', { run: runNumber, date: researchedOn, sources: research.sources.length, words: research.wordCount }) }}
              provenance-badge(
                source="ai"
                :file-label="$t('report.threeWayForecast.economicAnalysis.badge')"
                :entered-label="$t('report.threeWayForecast.economicAnalysis.badge')"
                :ai-label="$t('report.threeWayForecast.economicAnalysis.badge')"
                size="sm"
                :spaced="true")
          .ea-actions
            button.ea-cta.is-ghost(type="button" @click="researchAgain") {{ $t('report.threeWayForecast.economicAnalysis.researchAgain') }}

        .doc
          //- §5 carries the warning colour on purpose: it is the most valuable part of the
          //- document and the easiest to skim past. A lender who reads what could not be
          //- found believes what was.
          .doc-section(v-for="s in research.sections" :key="s.n" :class="{ 'is-gaps': s.n === 5 }")
            p.doc-p(v-for="(para, pi) in paragraphsOf(s.body)" :key="pi" :class="{ 'is-heading': para.heading }")
              template(v-for="(tok, ti) in para.tokens")
                b(v-if="tok.t === 'bold'" :key="ti") {{ tok.s }}
                a.cite(
                  v-else-if="tok.t === 'link'"
                  :key="ti"
                  :href="tok.url"
                  target="_blank"
                  rel="noopener noreferrer") {{ tok.s }}
                span(v-else :key="ti") {{ tok.s }}

        .srcs(v-if="research.sources.length")
          .sh {{ $tc('report.threeWayForecast.economicAnalysis.sourceCount', research.sources.length, { count: research.sources.length }) }}
          .pills
            a.pill(
              v-for="(src, i) in research.sources"
              :key="i"
              :href="src.url"
              target="_blank"
              rel="noopener noreferrer") {{ hostOf(src.url) }}

        //- ── The second tick, which IS the approval gate ──────────────────────
        .ticker.ea-include
          input#ea-include.ea-check(type="checkbox" v-model="include" :disabled="includeBusy" @change="onIncludeChange")
          label.ea-tickbody(for="ea-include")
            .tl {{ $t('report.threeWayForecast.economicAnalysis.includeLabel') }}
            .ts {{ $t('report.threeWayForecast.economicAnalysis.includeWhy') }}
        .ea-group(v-if="includeError")
          .ea-error
            p {{ includeError }}
        .ea-group(v-if="approval")
          .ea-approved {{ approvedLine }}

        //- ── How it reaches the lender ────────────────────────────────────────
        .ea-group
          .ea-edu
            .ea-edu-h
              span.ea-lead {{ $t('report.threeWayForecast.economicAnalysis.inPackLead') }}
              | {{ $t('report.threeWayForecast.economicAnalysis.title') }}
            p.ea-edu-p {{ $t('report.threeWayForecast.economicAnalysis.inPackBody') }}
            p.ea-edu-p {{ $t('report.threeWayForecast.economicAnalysis.inPackTag') }}
</template>

<script>
import ProvenanceBadge from '~/components/base/ProvenanceBadge.vue'
const { paragraphsOf, tokensOf, hostOf } = require('~/utils/researchText')

/**
 * EconomicAnalysisStep — step 5 of the Three-Way Forecast: optional AI market research,
 * for a lender to read alongside the forecast.
 *
 * Item **4.66**, Mike's request of 2026-09-03: *"an option to tick 'economic analysis'
 * which then charges AI to conduct global and local market research … since the majority
 * of 3 way forecasts are used to support funding requests"*. Slice 2, built on his
 * instruction of 2026-09-06, against
 * `design/mockups/three-way-forecast-economic-analysis.html`.
 *
 * 🔴 THE APP SENDS NOTHING ABOUT THE CLIENT ON ITS OWN — his privacy ruling, 2026-09-06.
 * The whole client-derived payload is `brief`, typed by the advisor, and the blue box
 * repeats it **verbatim** rather than summarising it: a summary would be the app deciding
 * what to disclose. Not the client's name, not a figure from the forecast, not the file
 * they uploaded. That is why this feature needs no PII exception — there is no PII for the
 * app to strip, because the app never assembles any.
 *
 * ⚠ The one residual risk is not closed in code and cannot be: an advisor may type a
 * client's name into the brief. A filter that half-worked would be worse than an honest
 * warning, so the control is that they read the exact words back before pressing the
 * button.
 *
 * 🔴 THE SECOND TICK IS THE APPROVAL GATE. The standards require `isApproved: true` before
 * AI output is committed for financial work, and an advisor reading the research and
 * deciding it is fit for a lender IS that approval — so there is no separate Approve
 * button. What there is, is a record: who, when, and which run of how many. Re-running
 * clears it, so unread research can never ride in on a tick set against something else.
 *
 * ⚠ NO MARKDOWN IS RENDERED AS HTML HERE, deliberately. The model's text is parsed into
 * plain tokens (`paragraphsOf`) and rendered through Vue's own text interpolation, so
 * there is no `v-html` on this screen and nothing to sanitise. The standards' rule about
 * `v-html` is satisfied by not needing it.
 *
 * @example
 *   economic-analysis-step(:api-token="apiToken" :client-ref="clientRef")
 */
export default {
  name: 'EconomicAnalysisStep',

  components: { ProvenanceBadge },

  props: {
    /** Verified login pass (JWT); all three research routes are firmAuth-guarded. */
    apiToken: { type: String, default: 'dev-local-bypass' },
    /**
     * Which forecast this research belongs to. The backend counts runs per firm, advisor
     * and clientRef, so a new client starts with a fresh allowance.
     */
    clientRef: { type: String, default: '' }
  },

  data () {
    return {
      /** The bounds the route enforces; mirrored so the button can say why it is off. */
      MIN_BRIEF: 40,
      MAX_BRIEF: 2000,
      enabled: false,
      brief: '',
      starting: false,
      runId: '',
      runNumber: 0,
      state: 'idle',
      searches: [],
      searchCount: 0,
      research: null,
      error: '',
      include: false,
      includeBusy: false,
      includeError: '',
      approval: null,
      /**
       * When the research came back. Taken on THIS machine at the moment the run completed,
       * which is what it means — the payload carries no date of its own, and inventing one
       * from the model's text would be reading a date out of prose.
       */
      researchedAt: null,
      /** Poll handle. Cleared in beforeDestroy so a torn-down screen stops polling. */
      timer: null
    }
  },

  computed: {
    trimmedBrief () { return this.brief.trim() },
    briefTooShort () {
      return this.trimmedBrief.length > 0 && this.trimmedBrief.length < this.MIN_BRIEF
    },
    canResearch () {
      const n = this.trimmedBrief.length
      return n >= this.MIN_BRIEF && n <= this.MAX_BRIEF
    },
    isRunning () { return this.state === 'researching' },
    hasResearch () { return this.state === 'done' && Boolean(this.research) },
    /** The research date, formatted by the locale rather than assembled here. */
    researchedOn () {
      return this.researchedAt ? this.$d(this.researchedAt, 'long') : ''
    },

    /**
     * Who accepted this research, and which run of how many.
     *
     * 🔴 IT READS THE RECORD THE BACKEND ACTUALLY RETURNS, and that is a fix rather than a
     * preference. Until slice 3 this line read `approval.by.name` and `approval.ofRuns`,
     * neither of which exists: `approveRun` returns `approvedBy: { name, email }` and
     * `totalRuns` (`server/utils/economicAnalysisRuns.js`). Ticking the second tick
     * therefore threw on `approval.by.name` the moment the approval line rendered. The
     * unit tests missed it because their fixture had invented the same wrong shape — the
     * same fault family as the search-phrase events, where the tests encoded the code's
     * assumption instead of the API's behaviour. Found 2026-09-06 while building the pack,
     * which reads this same record.
     */
    approvedLine () {
      const by = (this.approval && this.approval.approvedBy) || {}
      return this.$t('report.threeWayForecast.economicAnalysis.approvedBy', {
        name: by.name || '',
        run: this.approval ? this.approval.runNumber : 0,
        of: this.approval ? this.approval.totalRuns : 0
      })
    }
  },

  beforeDestroy () {
    this.stopPolling()
  },

  methods: {
    /**
     * The top tick — whether this forecast has an economic analysis at all.
     *
     * A run in flight is left alone server-side; unticking only stops this screen watching
     * it. What unticking DOES do is withdraw the research from the client's pack, and that
     * is not tidiness: without it an advisor could approve the research, change their mind,
     * switch the whole feature off, and still hand a lender AI-written market research.
     * The pack is told first and the server second, so a failed write leaves the record
     * over-stating the approval rather than the pack printing something nobody wanted.
     */
    onEnableChange () {
      if (this.enabled) {
        if (this.isRunning) { this.schedulePoll() }
        return
      }
      this.stopPolling()
      if (this.include || this.approval) {
        this.include = false
        this.approval = null
        // included: the advisor accepted this run for the client's pack
        this.$emit('included', { included: false, approval: null })
        this.withdrawApproval()
      }
    },

    /**
     * Clears the approval record behind a withdrawn research run.
     *
     * Deliberately silent: the screen it would report to is closed, and the pack has
     * already been told. A failure here leaves an approval recorded for research that is
     * not printed, which is the safe direction for an audit record to be wrong in.
     */
    async withdrawApproval () {
      if (!this.runId) { return }
      try {
        await fetch(
          '/api/report/economic-analysis/' + encodeURIComponent(this.runId) + '/include',
          { method: 'POST', headers: this.authHeaders(true), body: JSON.stringify({ include: false }) }
        )
      } catch (e) {
        // Nothing to report to: the screen this belongs to is closed, and the pack has
        // already been told not to print.
      }
    },

    /**
     * Splits one section's markdown into paragraphs of plain tokens.
     *
     * 🔴 THE PARSER MOVED TO `utils/researchText.js` IN SLICE 3, and these three methods
     * are the seam onto it. The printed funding pack renders the same text, and two copies
     * of this would mean a fix here silently leaving the paper version rendering something
     * else — with the paper version being the one nobody looks at.
     *
     * @param {string} body
     * @returns {Array<{heading: boolean, tokens: Array<{t: string, s: string, url: string}>}>}
     */
    paragraphsOf (body) {
      return paragraphsOf(body)
    },

    /**
     * One paragraph into text / bold / link tokens.
     * @param {string} text
     * @returns {Array<{t: string, s: string, url: string}>}
     */
    tokensOf (text) {
      return tokensOf(text)
    },

    /**
     * The host of a source URL, for the pill list.
     * @param {string} url
     * @returns {string}
     */
    hostOf (url) {
      return hostOf(url)
    },

    /** Common headers for the three research routes. */
    authHeaders (json) {
      const headers = { Authorization: `Bearer ${this.apiToken}` }
      if (json) { headers['Content-Type'] = 'application/json' }
      return headers
    },

    /**
     * Starts a run and begins polling. A run takes 83–141 seconds, so the route returns a
     * job rather than the research — far past the 2000 ms page-render rule.
     */
    async startResearch () {
      if (!this.canResearch || this.starting) { return }
      this.starting = true
      this.error = ''
      try {
        const res = await fetch('/api/report/economic-analysis', {
          method: 'POST',
          headers: this.authHeaders(true),
          body: JSON.stringify({ brief: this.trimmedBrief, clientRef: this.clientRef })
        })
        const json = await res.json()
        if (!res.ok || !json.started) {
          this.error = (json.error && json.error.message) ||
            this.$t('report.threeWayForecast.economicAnalysis.failedGeneric')
          return
        }
        this.runId = json.runId
        this.runNumber = json.runNumber
        this.state = 'researching'
        this.searches = []
        this.searchCount = 0
        this.schedulePoll()
      } catch (e) {
        // Network failure, not an HTTP error — both must say something an advisor can act on.
        this.error = this.$t('report.threeWayForecast.economicAnalysis.failedNetwork')
      } finally {
        this.starting = false
      }
    },

    /** One poll every 4 seconds while a run is in flight. */
    schedulePoll () {
      this.stopPolling()
      this.timer = setInterval(this.poll, 4000)
    },

    stopPolling () {
      if (this.timer) { clearInterval(this.timer); this.timer = null }
    },

    /** Reads where the run has got to, and stops polling once it settles. */
    async poll () {
      if (!this.runId) { return }
      try {
        const res = await fetch('/api/report/economic-analysis/' + encodeURIComponent(this.runId), {
          headers: this.authHeaders(false)
        })
        const json = await res.json()
        if (!res.ok) {
          this.stopPolling()
          this.state = 'failed'
          this.error = (json.error && json.error.message) ||
            this.$t('report.threeWayForecast.economicAnalysis.failedGeneric')
          return
        }
        this.searchCount = json.searchCount || 0
        this.searches = json.searches || []
        if (json.state === 'done') {
          this.stopPolling()
          this.research = json.research
          this.researchedAt = new Date()
          this.state = 'done'
          // research: the validated run this screen now shows, for the printed pack.
          // `research: null` means there is none — a re-run, or a failure.
          this.$emit('research', {
            runId: this.runId,
            runNumber: this.runNumber,
            research: this.research,
            researchedAt: this.researchedAt
          })
        } else if (json.state === 'failed') {
          this.stopPolling()
          this.state = 'failed'
          this.error = (json.error && json.error.message) ||
            this.$t('report.threeWayForecast.economicAnalysis.failedGeneric')
        }
      } catch (e) {
        // A single failed poll is not a failed run — the run continues on the server, and
        // the next tick may well succeed. Only an explicit failure state stops this.
      }
    },

    /**
     * Back to the brief, keeping what was typed so the commonest reason to re-run — a brief
     * that forgot something — is one edit rather than a retype.
     *
     * 🔴 IT CLEARS THE APPROVAL, AND IT TELLS THE PACK. Research the advisor has not read
     * must never be included on a tick that was set against a previous run — and from slice
     * 3 that promise has a second half, because the page holds a copy for the printed pack.
     * Clearing here and not there would leave the previous run printing for a lender while
     * the screen showed an empty brief.
     */
    researchAgain () {
      this.stopPolling()
      this.research = null
      this.researchedAt = null
      this.state = 'idle'
      this.runId = ''
      this.searches = []
      this.searchCount = 0
      this.include = false
      this.approval = null
      this.includeError = ''
      this.error = ''
      this.$emit('research', { runId: '', runNumber: 0, research: null, researchedAt: null })
      // included: the advisor accepted this run for the client's pack
      this.$emit('included', { included: false, approval: null })
    },

    /** After a failure: back to the brief with everything else cleared. */
    reset () {
      this.researchAgain()
    },

    /**
     * The second tick. Records the approval, or clears it — and puts the tick back if the
     * write did not happen, so the screen never shows an approval the server does not hold.
     */
    async onIncludeChange () {
      const wanted = this.include
      this.includeBusy = true
      this.includeError = ''
      try {
        const res = await fetch(
          '/api/report/economic-analysis/' + encodeURIComponent(this.runId) + '/include',
          { method: 'POST', headers: this.authHeaders(true), body: JSON.stringify({ include: wanted }) }
        )
        const json = await res.json()
        if (!res.ok) {
          this.include = !wanted
          this.includeError = (json.error && json.error.message) ||
            this.$t('report.threeWayForecast.economicAnalysis.includeFailed')
          return
        }
        this.approval = json.approval || null
        // included: the advisor accepted this run for the client's pack
        this.$emit('included', { included: Boolean(json.included), approval: this.approval })
      } catch (e) {
        this.include = !wanted
        this.includeError = this.$t('report.threeWayForecast.economicAnalysis.failedNetwork')
      } finally {
        this.includeBusy = false
      }
    }
  }
}
</script>

<style scoped>
/* Every value reads a shared report token, exactly as the drawing does. The two literals
   are the AI purple (which has no token and is the badge's own) and the send-box blue
   wash, both copied from design/mockups/three-way-forecast-economic-analysis.html. */
.ea-card, .ea { display: block; }
.ea-group { padding: 16px 18px; border-top: 1px solid var(--rs-line); }
.ea-glabel { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.ea-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rs-accent); flex: none; }
.ea-h2 { font-size: 15px; font-weight: 700; color: var(--rs-ink); margin: 0; }
.ea-sub { font-size: 12.5px; color: var(--rs-muted); margin-top: 5px; }

.ticker { display: flex; gap: 12px; align-items: flex-start; padding: 16px 18px; }
.ticker.is-open { border-bottom: 1px solid var(--rs-line); }
.ea-check { margin-top: 3px; flex: none; }
.ea-tickbody { cursor: pointer; }
.ticker .tl { font-size: 14px; font-weight: 600; color: var(--rs-ink); }
.ticker .ts { font-size: 12.5px; color: var(--rs-muted); margin-top: 4px; max-width: 78ch; }
.opt2 {
  font-size: 9.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  border-radius: 999px; padding: 2.5px 7px; color: var(--rs-muted);
  background: var(--rs-panel-2); border: 1px solid var(--rs-line); margin-left: 8px;
}

.brief {
  width: 100%; font: inherit; font-size: 13.5px; line-height: 1.6; padding: 11px 12px;
  border: 1px solid var(--rs-line); border-radius: 10px; background: var(--rs-panel);
  color: var(--rs-ink); resize: vertical; min-height: 132px;
}
.hintlist { margin: 9px 0 0; padding-left: 18px; font-size: 12.5px; color: var(--rs-muted); }
.hintlist li { margin-bottom: 3px; }

/* The privacy ruling, drawn. */
.sendbox { border: 1px solid #0070c04d; background: #0070c00a; border-radius: 10px; padding: 13px 14px; }
.sendhead {
  display: flex; align-items: center; gap: 8px; font-size: 11px; letter-spacing: .09em;
  text-transform: uppercase; font-weight: 700; color: var(--rs-accent); margin-bottom: 9px;
}
.sendbody { font-size: 13px; line-height: 1.6; white-space: pre-wrap; color: var(--rs-ink); }
.sendbody.is-empty { color: var(--rs-muted); font-style: italic; }
.sendfoot {
  font-size: 12px; color: var(--rs-muted); margin-top: 10px; padding-top: 9px;
  border-top: 1px solid var(--rs-line);
}

.waiting { display: flex; gap: 13px; align-items: flex-start; padding: 17px 18px; }
.waiting-body { flex: 1; min-width: 0; }
.pulse {
  width: 10px; height: 10px; border-radius: 50%; background: var(--rs-accent-bright);
  flex: none; margin-top: 5px;
}
.waiting .wt { font-size: 14px; font-weight: 600; color: var(--rs-ink); }
.waiting .ws { font-size: 12.5px; color: var(--rs-muted); margin-top: 4px; }
.searches { margin: 11px 0 0; padding: 0; list-style: none; font-size: 12.5px; color: var(--rs-ink); }
.searches li { padding: 3px 0; }
.searches li .mk { display: inline-block; width: 16px; color: var(--rs-accent); font-weight: 700; }
.searchcount { margin-top: 8px; }

.ea-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.ea-cta {
  font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; border-radius: 9px;
  padding: 9px 16px; border: 1px solid var(--rs-accent); background: var(--rs-accent);
  color: var(--rs-accent-contrast);
}
.ea-cta.is-ghost { background: transparent; color: var(--rs-accent); }
.ea-cta[disabled] { opacity: .5; cursor: default; }
.ea-foot { font-size: 12.5px; color: var(--rs-muted); }

.ea-error { font-size: 13px; color: var(--rs-bad); }
.ea-error p { margin: 5px 0 9px; }
.ea-approved { font-size: 12.5px; color: var(--rs-muted); }

.ea-rhead { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; }

.doc { padding: 4px 18px 16px; }
.doc-section { margin-top: 14px; }
/* The warning ground the drawing gives section 5 — "what could not be sourced" — because it
   is the most valuable part of the document and the easiest to skim past. */
.doc-section.is-gaps {
  background: var(--rs-warn-soft, #ff99001a);
  border: 1px solid var(--rs-warn, #ff9900);
  border-radius: 10px;
  padding: 12px 14px;
}
.doc-p { font-size: 13.5px; line-height: 1.68; color: var(--rs-ink); margin: 0 0 11px; max-width: 78ch; }
.doc-p.is-heading { font-size: 15px; font-weight: 700; margin: 18px 0 8px; }
.cite { color: var(--rs-accent); font-size: 12px; text-underline-offset: 2px; }

.srcs { padding: 0 18px 16px; }
.sh {
  font-size: 11px; letter-spacing: .09em; text-transform: uppercase; font-weight: 700;
  color: var(--rs-muted); margin-bottom: 9px;
}
.pills { display: flex; flex-wrap: wrap; gap: 6px; }
.pill {
  font-size: 11.5px; padding: 3px 9px; border-radius: 999px; border: 1px solid var(--rs-line);
  background: var(--rs-panel); color: var(--rs-accent); text-decoration: none;
}
.ea-include { border-top: 1px solid var(--rs-line); }

.ea-edu { background: var(--rs-panel-2); border: 1px solid var(--rs-line); border-radius: 10px; padding: 13px 14px; }
.ea-edu-h { font-size: 13.5px; font-weight: 700; color: var(--rs-ink); margin-bottom: 7px; }
.ea-lead {
  font-size: 10.5px; letter-spacing: .09em; text-transform: uppercase; color: var(--rs-accent);
  margin-right: 8px;
}
.ea-edu-p { font-size: 12.5px; color: var(--rs-muted); line-height: 1.6; margin: 0 0 7px; max-width: 78ch; }
</style>
