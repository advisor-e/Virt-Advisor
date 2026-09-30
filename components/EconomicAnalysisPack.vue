<template lang="pug">
section.eap(v-if="show")
  //- ── The section header ────────────────────────────────────────────────────
  .eap-head
    .eap-h1
      | {{ $t('report.threeWayForecast.economicAnalysis.title') }}
      provenance-badge(
        source="ai"
        :file-label="badgeLabel"
        :entered-label="badgeLabel"
        :ai-label="badgeLabel"
        size="sm"
        :spaced="true")
    .eap-meta {{ runLine }}
    .eap-meta {{ approvedLine }}

  //- ── The opening headline and key indicators (item 44.4) ──────────────────
  //- Each tile's figure was found in §§1–3 and its source is the citation beside it there
  //- (server/report/economicAnalysis/researchResult.js → keyFiguresOf); none is the model's
  //- own claim. A run that gave none shows neither, and opens on section 1 as before.
  .eap-lead(v-if="headline || keyFigures.length")
    .eap-headline(v-if="headline")
      .eap-hk {{ $t('report.threeWayForecast.economicAnalysis.inShort') }}
      p {{ headline }}
    template(v-if="keyFigures.length")
      .eap-sh {{ $t('report.threeWayForecast.economicAnalysis.keyIndicators') }}
      .eap-inds
        .eap-ind(v-for="(k, i) in keyFigures" :key="i")
          .eap-ik {{ k.what }}
          .eap-iv {{ k.figure }}
          .eap-is {{ k.date ? k.host + ' · ' + k.date : k.host }}

  //- ── The five sections, in the model's own words ───────────────────────────
  //- §5 keeps the warning ground it has on screen. It is "what could not be sourced" —
  //- the most valuable part of the document and the easiest to skim past, and a funding
  //- pack that hides its own gaps is worse than one that names them.
  .eap-section(
    v-for="s in sections"
    :key="s.n"
    :class="{ 'is-gaps': s.n === GAPS_SECTION, 'is-later': s.n > 1 }")
    .eap-tag
      provenance-badge(
        source="ai"
        :file-label="badgeLabel"
        :entered-label="badgeLabel"
        :ai-label="badgeLabel"
        size="sm")
    //- No anchor and no `v-html`: a printed citation cannot be clicked, so the source name
    //- is what a reader needs beside the figure (`print` below). That leaves nothing on
    //- this component carrying a URL the model wrote.
    template(v-for="(para, pi) in paragraphsOf(s.body)")
      table.eap-table(v-if="para.table" :key="pi")
        thead
          tr
            th(v-for="(cell, ci) in para.table.head" :key="ci")
              research-tokens(:tokens="cell" :print="true")
        tbody
          tr(v-for="(row, ri) in para.table.rows" :key="ri")
            td(v-for="(cell, ci) in row" :key="ci")
              research-tokens(:tokens="cell" :print="true")
      component.eap-list(v-else-if="para.list" :is="para.ordered ? 'ol' : 'ul'" :key="pi")
        li(v-for="(item, li) in para.list" :key="li")
          research-tokens(:tokens="item" :print="true")
      p.eap-p(v-else :key="pi" :class="{ 'is-heading': para.heading }")
        research-tokens(:tokens="para.tokens" :print="true")

  //- ── Every source, in full, as text a reader can type back in ──────────────
  .eap-sources(v-if="sources.length")
    .eap-tag
      provenance-badge(
        source="ai"
        :file-label="badgeLabel"
        :entered-label="badgeLabel"
        :ai-label="badgeLabel"
        size="sm")
    .eap-sh {{ $tc('report.threeWayForecast.economicAnalysis.packSources', sources.length, { count: sources.length }) }}
    ol.eap-srclist
      li.eap-src(v-for="(src, i) in sources" :key="i")
        span.eap-srct(v-if="src.title") {{ src.title }}
        span.eap-srcu {{ src.url }}
</template>

<script>
import ProvenanceBadge from '~/components/base/ProvenanceBadge.vue'
import ResearchTokens from '~/components/base/ResearchTokens.vue'
const { paragraphsOf } = require('~/utils/researchText')
const { intlLocaleFor } = require('~/utils/dateLocale')

/**
 * EconomicAnalysisPack — the Economic Analysis as it reaches a lender: a printed section
 * of the Three-Way Forecast pack, after the statements.
 *
 * Item **4.66**, slice 3, built on Mike's instruction of 2026-09-06 (*"just build slice
 * 3"*) against `design/mockups/three-way-forecast-economic-analysis.html` — Screen 6,
 * *"How it reaches the lender"*. His original request of 2026-09-03 is what this serves:
 * *"the majority of 3 way forecasts are used to support funding requests"*.
 *
 * 🔴 IT PRINTS ONLY ON AN EXPLICIT APPROVAL, AND THAT IS THE WHOLE OF `show`. The
 * standards require `isApproved: true` before AI output is committed for financial work,
 * and the advisor's second tick IS that approval (`server/utils/economicAnalysisRuns.js`
 * → `approveRun`). So this reads the approval record itself rather than a screen flag: no
 * approval, or an approval belonging to research that has since been re-run, and nothing
 * prints at all. Research nobody accepted must never reach a bank.
 *
 * 🔴 IT IS PRINT-ONLY, deliberately. The advisor's own view of the research is step 5,
 * where they read it and approve it; this is the same text laid out for paper, and
 * showing it a second time on screen would put two renderings of one thing in front of
 * the person approving it. Ctrl+P is how it is checked.
 *
 * ⚠ NO `v-html`, AND NO ANCHOR EITHER. The screen renders a citation as a clickable link;
 * paper has no clicks, so a citation here is the source's name as text and every URL is
 * listed in full at the end where a reader can type it back in. The effect is that
 * nothing on this component carries a URL the model wrote — a stronger position than the
 * screen's, and the reason a `[label](javascript:…)` cannot become anything here.
 *
 * @example
 *   economic-analysis-pack(
 *     :research="economic.research"
 *     :approval="economic.approval"
 *     :included="economic.included"
 *     :researched-at="economic.researchedAt")
 */
export default {
  name: 'EconomicAnalysisPack',

  components: { ProvenanceBadge, ResearchTokens },

  props: {
    /**
     * The validated research, exactly as `server/report/economicAnalysis/researchResult.js`
     * returns it: `{ text, wordCount, sections: [{ n, body, wordCount, citations }],
     * sources: [{ url, host, title }], citationCount }`. Null until a run completes.
     */
    research: { type: Object, default: null },
    /**
     * The approval record from `POST …/include` — `{ isApproved, runNumber, totalRuns,
     * approvedBy: { name, email }, approvedAt, … }`. Null when the advisor has not ticked
     * the second tick, and cleared by *Research again*.
     */
    approval: { type: Object, default: null },
    /** The advisor's second tick, as the screen last reported it. */
    included: { type: Boolean, default: false },
    /** When the research came back, taken on the advisor's machine as the run completed. */
    researchedAt: { type: Date, default: null }
  },

  data () {
    return {
      /** "What could not be sourced" — §5 of the approved prompt, and the one given the
       *  warning ground on screen and on paper alike. */
      GAPS_SECTION: 5
    }
  },

  computed: {
    /**
     * Whether this section prints at all.
     *
     * Three conditions, and each is load-bearing: the advisor ticked it, the approval was
     * recorded against a finished run, and there is research to print. `isApproved` is
     * read rather than assumed, because it is the field the standards name.
     * @returns {boolean}
     */
    show () {
      return Boolean(
        this.included &&
        this.approval &&
        this.approval.isApproved === true &&
        this.research &&
        Array.isArray(this.research.sections) &&
        this.research.sections.length
      )
    },

    /** @returns {Array<object>} the research sections, or an empty list before there are any. */
    sections () {
      return (this.research && this.research.sections) || []
    },

    /** @returns {string} the research's one-sentence headline, or '' when it gave none. */
    headline () { return (this.research && this.research.headline) || '' },

    /** @returns {Array<object>} the key-indicator tiles, `{ what, figure, date, host }`. */
    keyFigures () { return (this.research && Array.isArray(this.research.keyFigures)) ? this.research.keyFigures : [] },

    /** @returns {Array<object>} every distinct source behind the research. */
    sources () {
      return (this.research && this.research.sources) || []
    },

    /** The AI-research tag, in one place because it is repeated down the whole section. */
    badgeLabel () {
      return this.$t('report.threeWayForecast.economicAnalysis.badge')
    },

    /** Run, date, sources and length — the same line the advisor approved on screen. */
    runLine () {
      return this.$t('report.threeWayForecast.economicAnalysis.runMeta', {
        run: this.approval ? this.approval.runNumber : 0,
        date: this.researchedOn,
        sources: this.sources.length,
        words: (this.research && this.research.wordCount) || 0
      })
    },

    /**
     * Who accepted this research, and which run of how many they accepted.
     *
     * 🔴 THE "OF HOW MANY" IS NOT DECORATION. Re-running until the answer flatters the
     * client is the one habit this feature must not encourage, and Mike's ruling of
     * 2026-09-06 was to make it visible rather than impossible. One run reads as what it
     * is; seven runs and the friendliest chosen is on the page a lender holds.
     */
    approvedLine () {
      const by = (this.approval && this.approval.approvedBy) || {}
      return this.$t('report.threeWayForecast.economicAnalysis.approvedBy', {
        name: by.name || '',
        run: this.approval ? this.approval.runNumber : 0,
        of: this.approval ? this.approval.totalRuns : 0
      })
    },

    /**
     * The research date, formatted by the locale rather than assembled here.
     *
     * ⚠ The Intl tag, not the app locale: `en` orders dates the American way, and this line
     * prints in the same document as the model's own prose, which is day-first.
     */
    researchedOn () {
      return this.researchedAt
        ? this.$d(this.researchedAt, 'long', intlLocaleFor(this.$i18n.locale))
        : ''
    }
  },

  methods: {
    /**
     * One section's body into paragraphs of plain tokens — the shared parser, so this and
     * the advisor's screen can never render the same text two ways.
     * @param {string} body
     * @returns {Array<{heading: boolean, tokens: Array<object>}>}
     */
    paragraphsOf (body) {
      return paragraphsOf(body)
    }
  }
}
</script>

<style scoped>
/* 🔴 PRINT-ONLY. Nothing here is on screen: step 5 is where an advisor reads and approves
   the research, and this is the same text laid out for paper. */
.eap { display: none; }

@media print {
  .eap {
    display: block;
    /* Its own section after the statements, as the approved drawing says. */
    break-before: page;
    page-break-before: always;
    color: #000;
  }

  .eap-head { margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid #000; }
  .eap-h1 { font-size: 19px; font-weight: 700; }
  .eap-meta { font-size: 11px; margin-top: 4px; }

  /* Each of the five sections opens a page and carries the tag, which is what makes the
     approved sentence true — "every page of that section carries the AI research tag".
     ⚠ ITS LIMIT, NAMED RATHER THAN GLOSSED: a section that runs longer than one printed
     page continues onto a page with no tag on it. Repeating an element per printed page
     needs `@page` margin boxes, which no browser this app supports implements. */
  .eap-section.is-later { break-before: page; page-break-before: always; }
  .eap-section { margin-bottom: 16px; }
  .eap-tag { margin-bottom: 8px; }

  .eap-p { font-size: 12px; line-height: 1.55; margin: 0 0 9px; }
  .eap-p.is-heading { font-size: 14px; font-weight: 700; margin: 14px 0 7px; }
  .eap-lead { margin-bottom: 16px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .eap-headline { border-left: 5px solid #0070c0; background: #ebf4fa; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; }
  .eap-hk { font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #0070c0; margin-bottom: 3px; }
  .eap-headline p { margin: 0; font: 700 16px/1.35 Georgia, serif; color: #002b64; }
  /* One row across the page, as drawn, however many of the six came back. */
  .eap-inds { display: grid; grid-template-columns: repeat(auto-fit, minmax(38mm, 1fr)); gap: 10px; }
  .eap-ind { border: 1px solid #d5e1ee; border-radius: 8px; padding: 10px 12px; break-inside: avoid; }
  .eap-ik { font-size: 11.5px; font-weight: 700; color: #002b64; }
  .eap-iv { font: 700 24px/1.1 Georgia, serif; color: #002b64; margin: 5px 0 4px; }
  .eap-is { font-size: 10.5px; color: #5b6f8a; overflow-wrap: anywhere; }
  .eap-list { font-size: 12px; line-height: 1.5; margin: 0 0 9px; padding-left: 20px; }
  ul.eap-list { list-style: disc; }
  ol.eap-list { list-style: decimal; }
  .eap-list li { margin-bottom: 4px; }
  .eap-table { width: 100%; border-collapse: collapse; font-size: 10.5px; line-height: 1.45; margin: 0 0 10px; }
  .eap-table th, .eap-table td { padding: 4px 6px; border-bottom: 1px solid #999; text-align: left; vertical-align: top; }
  .eap-table th { font-weight: 700; border-bottom: 1.5px solid #000; }
  .eap-table tr { break-inside: avoid; }

  /* §5 keeps its warning ground. A lender who reads what could not be found believes
     what was. `print-color-adjust` so the border survives a browser's ink-saving. */
  .eap-section.is-gaps {
    border: 1.5px solid #000;
    border-radius: 6px;
    padding: 10px 12px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .eap-sources { break-before: page; page-break-before: always; }
  .eap-sh {
    font-size: 11px; letter-spacing: .08em; text-transform: uppercase;
    font-weight: 700; margin-bottom: 8px;
  }
  .eap-srclist { margin: 0; padding-left: 20px; }
  .eap-src { font-size: 10.5px; line-height: 1.5; margin-bottom: 6px; break-inside: avoid; }
  .eap-srct { display: block; font-weight: 700; }
  /* The address in full, and allowed to wrap: a URL a reader cannot see all of is not a
     source. */
  .eap-srcu { display: block; word-break: break-all; }
}
</style>
