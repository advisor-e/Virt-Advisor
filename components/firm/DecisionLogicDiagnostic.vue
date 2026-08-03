<template lang="pug">
section.dx
  h2.band-heading {{ $t('firmDecisionLogic.dxHeading') }}
  p.band-sub {{ $t('firmDecisionLogic.dxSub') }}

  .box
    .dgrid
      .dfield.dfield-wide
        label.dlabel(for="dxSentence") {{ $t('firmDecisionLogic.dxSentenceLabel') }}
        b-input#dxSentence(
          v-model="text"
          type="textarea"
          rows="3"
          :placeholder="$t('firmDecisionLogic.dxSentencePlaceholder')"
        )

      .dfield
        label.dlabel(for="dxProblem") {{ $t('firmDecisionLogic.dxProblemLabel') }}
        b-select#dxProblem(v-model="problem" expanded)
          option(value="template") {{ $t('firmDecisionLogic.dxProblemTemplate') }}
          option(value="explain") {{ $t('firmDecisionLogic.dxProblemExplain') }}
          option(value="understand") {{ $t('firmDecisionLogic.dxProblemUnderstand') }}
          option(value="distinction") {{ $t('firmDecisionLogic.dxProblemDistinction') }}

      //- Naming the expected template is what turns "here is what happened" into
      //- "here is how far short you were", so it is only offered for that one
      //- problem. Hidden rather than removed, so the grid does not reflow.
      //- An autocomplete, not a plain select: the library runs to hundreds of
      //- templates and scrolling the whole list to find one is not a picker, it
      //- is a haystack.
      .dfield(:style="{ visibility: showExpected ? 'visible' : 'hidden' }")
        label.dlabel(for="dxExpected") {{ $t('firmDecisionLogic.dxExpectedLabel') }}
        b-autocomplete#dxExpected(
          v-model="expectedSearch"
          :data="filteredTitles"
          :loading="loadingTitles"
          :placeholder="$t('firmDecisionLogic.dxExpectedNone')"
          open-on-focus
          clearable
          expanded
          @select="onExpectedSelect"
        )
          template(#empty) {{ $t('firmDecisionLogic.dxExpectedNoMatch') }}

    .dactions
      b-button(
        type="is-primary"
        :loading="running"
        :disabled="!text.trim() || running"
        @click="run"
      ) {{ $t('firmDecisionLogic.dxRun') }}
      span.dstatus(v-if="running") {{ $t('firmDecisionLogic.dxRunning') }}

    b-message.mt-4(v-if="error" type="is-danger" has-icon :closable="false") {{ error }}

    div(v-if="result")
      //- ── What actually happened. Real: the engine's own probe. ────────────
      h3.dh
        | {{ $t('firmDecisionLogic.dxDidHeading') }}
        span.tag-il.ml-2 {{ $t('firmDecisionLogic.tagLive') }}
      dl.dfacts
        dt {{ $t('firmDecisionLogic.dxLabelDomain') }}
        dd
          span(v-if="probeDomains.length") {{ domainLine }}
          span.dim(v-else) {{ $t('firmDecisionLogic.dxNoDomain') }}

        dt {{ $t('firmDecisionLogic.dxLabelTables') }}
        dd
          span.dim(v-if="!probeTables.length") {{ $t('firmDecisionLogic.dxNoTables') }}
          template(v-else)
            .dline(v-for="t in probeTables" :key="t.id")
              strong {{ t.name || t.id }}
              //- Inline interpolation so a real space survives: `.ml-1` only
              //- adds a CSS margin, which looks right on screen but vanishes the
              //- moment the text is copied out — as it did in Mike's test thread.
              span.dim(v-if="t.matched && t.matched.length")
                |  {{ $t('firmDecisionLogic.dxOpenedOn') }} #[span(v-for="p in t.matched" :key="p") “{{ p }}” ]

        dt {{ $t('firmDecisionLogic.dxLabelDistinctions') }}
        dd
          span.dim(v-if="!result.distinctionsAvailable") {{ $t('firmDecisionLogic.dxDistUnavailable') }}
          span.dim(v-else-if="probeDistinctions.reason") {{ probeDistinctions.reason }}
          template(v-else-if="matchedDistinctions.length")
            .dline(v-for="d in matchedDistinctions" :key="d.id")
              strong {{ d.description }}
              span.dim  +{{ d.boost }}
          span.dim(v-else) {{ $t('firmDecisionLogic.dxDistNone', { count: probeDistinctions.considered || 0 }) }}

      //- ── The gap. ─────────────────────────────────────────────────────────
      p.no-scoring(v-if="!result.scored") {{ $t('firmDecisionLogic.dxNoScoring') }}

      template(v-else)
        h3.dh {{ $t('firmDecisionLogic.dxWhyHeading') }}
        .table-scroll
          table.score
            thead
              tr
                th {{ $t('firmDecisionLogic.dxColRank') }}
                th {{ $t('firmDecisionLogic.dxColTemplate') }}
                th {{ $t('firmDecisionLogic.dxColReasons') }}
                th.num {{ $t('firmDecisionLogic.dxColScore') }}
            tbody
              tr(
                v-for="row in sheetRows"
                :key="row.rank + '::' + row.title"
                :class="{ winner: row.rank === 1, expected: isExpectedRow(row) }"
              )
                td {{ row.rank }}
                td.tname {{ row.title }}
                td
                  span.reason.r-dist(v-for="(r, i) in distinctionReasons(row)" :key="'d' + i")
                    | {{ distinctionChip(row, r) }}
                  span.reason.r-none(v-if="isExpectedRow(row) && !distinctionReasons(row).length")
                    | {{ $t('firmDecisionLogic.dxChipNoDistinction') }}
                  span.reason.r-tree(v-for="(r, i) in treeReasons(row)" :key="'t' + i")
                    | {{ $t('firmDecisionLogic.dxChipTree', { points: r.points }) }}
                  span.reason.r-other
                    | {{ $t('firmDecisionLogic.dxChipOther', { points: signed(row.otherFactors) }) }}
                td.score-n {{ row.score }}

        //- Three different facts, three different sentences. Collapsing them
        //- into "the engine did not rank it at all" was a real defect (found
        //- 2026-08-03): the ranking log keeps only the top 20, so a template
        //- missing from it may have scored perfectly well.
        p.not-ranked(v-if="expected && expected.outsideSheet")
          | {{ $t('firmDecisionLogic.dxOutsideSheet', { score: expected.score, shown: sheetRows.length }) }}
        p.not-ranked(v-else-if="expected && expected.unscored && expected.inLibrary")
          | {{ $t('firmDecisionLogic.dxUnscored') }}
        p.not-ranked(v-else-if="expected && expected.unscored")
          | {{ $t('firmDecisionLogic.dxNotInLibrary') }}

        .gap(v-if="gapShown")
          p.gap-head(v-if="result.gap > 0") {{ $t('firmDecisionLogic.dxGapHead', { points: result.gap }) }}
          p.gap-head(v-else) {{ $t('firmDecisionLogic.dxGapWon') }}

          template(v-if="result.gap > 0")
            //- Which sentence applies is decided by what actually reached the
            //- expected template, not by a guess about the usual case.
            p.gap-body(v-if="gapCase === 'noDistinction'")
              | {{ $t('firmDecisionLogic.dxGapNoneA') }}
              strong {{ expected.title }}
              | {{ $t('firmDecisionLogic.dxGapNoneB') }}
              strong {{ $t('firmDecisionLogic.dxGapNoneC') }}
              | {{ $t('firmDecisionLogic.dxGapNoneD') }}
            p.gap-body(v-else-if="gapCase === 'matched'")
              | {{ $t('firmDecisionLogic.dxGapMatchedA') }}
              strong {{ expected.title }}
              | {{ $t('firmDecisionLogic.dxGapMatchedB') }}
            p.gap-body(v-else)
              | {{ $t('firmDecisionLogic.dxGapNoLeverA') }}
              strong {{ expected.title }}
              | {{ $t('firmDecisionLogic.dxGapNoLeverB') }}

            //- The instruction splits on whether a distinction of theirs ALREADY
            //- matched this conversation. Telling a manager to write a new one
            //- when the fix is to attach a template to the one they have
            //- contradicted the Ideas section further down the same screen.
            p.gap-do(v-if="gapAction !== 'none'")
              template(v-if="gapAction === 'attach'")
                | {{ $t('firmDecisionLogic.dxGapAttachA') }}
                strong {{ expected.title }}
                | {{ $t('firmDecisionLogic.dxGapAttachB') }}
                strong “{{ matchedDistinctions[0].description }}”
                | {{ $t('firmDecisionLogic.dxGapAttachC') }}
              template(v-else)
                | {{ $t('firmDecisionLogic.dxGapDoA') }}
                strong {{ detectedDomainLabel }}
                | {{ $t('firmDecisionLogic.dxGapDoB') }}
                strong {{ expected.title }}
                | {{ $t('firmDecisionLogic.dxGapDoC') }}

              //- The arithmetic is DERIVED from the scores in the table above, not
              //- asserted. The artefact's fixed sentence ("either alone leaves you
              //- short") was true only for its own 7-point example and contradicted
              //- the table at a gap of 3 (found by Mike, 2026-08-03).
              | {{ $t('firmDecisionLogic.dxGapMathA') }}
              strong {{ $t('firmDecisionLogic.dxGapDoD', { distinction: distinctionBoost }) }}
              | {{ $t('firmDecisionLogic.dxGapMathB', { withDistinction: scoreWithDistinction }) }}
              strong {{ $t('firmDecisionLogic.dxGapDoF', { tree: treeBoost }) }}
              | {{ $t('firmDecisionLogic.dxGapMathC', { withTree: scoreWithTree, top: topScore }) }}
              |
              strong {{ $t('firmDecisionLogic.' + gapVerdictKey) }}

        //- Never collapsible. A limit that can be hidden is a limit that will be
        //- missed, and the third exists because this run had to fill in what a
        //- real session asks the advisor for.
        .caution
          b {{ $t('firmDecisionLogic.dxLimitsHeading') }}
          p.limit-line {{ $t('firmDecisionLogic.dxLimit1') }}
          p.limit-line {{ $t('firmDecisionLogic.dxLimit2') }}
          p.limit-line {{ $t('firmDecisionLogic.dxLimit3') }}

      //- ── Ideas: a separate, opt-in step. ──────────────────────────────────
      //- The diagnosis says what happened; this says what to do about it, in
      //- that order — which is how the page teaches itself. Behind a button so a
      //- manager who already knows is not lectured every time.
      .ideas-bar
        b-button(type="is-primary" outlined @click="toggleIdeas")
          | {{ showIdeas ? $t('firmDecisionLogic.ideasHide') : $t('firmDecisionLogic.ideasButton') }}

      div(v-if="showIdeas")
        h3.dh {{ $t('firmDecisionLogic.ideasHeading') }}
        p.ideas-lede {{ ideas.lede }}
        ol.ideas
          li.idea(v-for="(idea, i) in ideas.items" :key="i" :class="idea.cls")
            p.i-head
              span.i-lever {{ idea.lever }}
              span.i-worth {{ idea.worth }}
            //- Sentences arrive as parts so the bold runs the artefact specifies
            //- survive without v-html — nothing here goes near raw markup.
            p.i-body
              component(
                v-for="(part, j) in idea.body"
                :is="part.bold ? 'strong' : 'span'"
                :key="'b' + j"
              ) {{ part.text }}
            //- A `quote` part is the advisor's OWN sentence, quoted back mid-
            //- sentence where the artefact puts it. Nothing here drafts the
            //- firm's content: proposing wording for their IP is exactly what
            //- this app must never do.
            p.i-how
              component(
                v-for="(part, j) in idea.how"
                :is="part.bold ? 'strong' : 'span'"
                :key="'h' + j"
                :class="{ quote: part.quote }"
              ) {{ part.quote ? '“' + part.text + '”' : part.text }}
        p.ideas-foot
          | {{ $t('firmDecisionLogic.ideasFootA') }}
          strong {{ $t('firmDecisionLogic.ideasFootB', { distinction: distinctionBoost }) }}
          | {{ $t('firmDecisionLogic.ideasFootC') }}
          strong {{ $t('firmDecisionLogic.ideasFootD', { tree: treeBoost }) }}
          | {{ $t('firmDecisionLogic.ideasFootE') }}
          strong {{ $t('firmDecisionLogic.ideasFootF', { margin: marginLabel }) }}
          | {{ $t('firmDecisionLogic.ideasFootG') }}
</template>

<script>
/**
 * Sections 4 and 5 of the Decision Logic page — the diagnostic and the ideas.
 *
 * THE SPEC IS THE ARTEFACT: design/mockups/decision-logic-map-mockup.html,
 * approved by Mike 2026-08-02. Wording is transcribed, not paraphrased.
 *
 * TWO EVIDENCE SOURCES, KEPT APART. "What the engine did with those words" is
 * the live probe — the real detector and the real distinction classifier. The
 * score sheet under it is the real resolver. They are shown as separate blocks
 * with separate headings because blending them into one confident view would
 * hide which half is an AI judgement and which half is arithmetic.
 *
 * SEPARATE FROM THE PAGE SHELL because it is a separate job: the shell explains
 * the levers, this diagnoses one case. It also keeps both files inside the
 * decompose rule (Engineering Standards: one component, one responsibility).
 *
 * NOTHING HERE WRITES. The routes it calls are read-only.
 */
export default {
  name: 'DecisionLogicDiagnostic',

  props: {
    /** Bearer token for the firm-manager API (the server re-checks every call). */
    apiToken: { type: String, required: true },
    /** Domain id → label, for naming the area a distinction should be written in. */
    domainLabels: { type: Object, default: () => ({}) },
    /** The Scenario Lab figures, passed down so one copy exists on the page. */
    measured: { type: Object, required: true },
    /** The average top-two margin, already formatted to one decimal. */
    marginLabel: { type: String, default: '3.0' },
    /** What a distinction is worth in this firm's configuration. */
    distinctionBoost: { type: Number, default: 5 },
    /** What a logic-table hint is worth, read from the engine. */
    treeBoost: { type: Number, default: 3 }
  },

  data () {
    return {
      text: '',
      /** Which of the four things went wrong; drives the ideas and the picker. */
      problem: 'template',
      /** The template the firm expected, once chosen from the list. */
      expectedTitle: null,
      /** What they have typed into the picker. Separate from the chosen title so
       *  a half-typed search is never mistaken for a selection. */
      expectedSearch: '',
      titles: [],
      loadingTitles: false,
      running: false,
      error: '',
      result: null,
      showIdeas: false
    }
  },

  computed: {
    /** The expected template only means anything for the wrong-template case. */
    showExpected () { return this.problem === 'template' },

    /**
     * Titles matching what has been typed, anywhere in the name — a manager
     * looking for "Board Member Conduct" should find it by typing "board" or
     * "conduct", not only by its first word.
     * @returns {Array<string>}
     */
    filteredTitles () {
      const q = this.expectedSearch.trim().toLowerCase()
      if (!q) { return this.titles }
      return this.titles.filter(t => String(t).toLowerCase().includes(q))
    },

    probe () { return (this.result && this.result.probe) || {} },
    probeDomains () { return this.probe.domains || [] },
    probeTables () { return this.probe.tables || [] },
    probeDistinctions () { return this.probe.distinctions || {} },
    matchedDistinctions () { return this.probeDistinctions.matched || [] },

    /** Every area the words scored in, highest first — the engine acts on the first. */
    domainLine () {
      return this.probeDomains.map(d => d.label).join(' · ')
    },

    detectedDomainLabel () {
      const id = this.result && this.result.domain
      return (id && this.domainLabels[id]) ||
        (this.probeDomains[0] && this.probeDomains[0].label) || ''
    },

    sheetRows () { return (this.result && this.result.sheet) || [] },
    expected () { return (this.result && this.result.expected) || null },

    /**
     * The gap block needs an expectation carrying a real score and a number to
     * state. A template that scored zero, or placed below the sheet, still has
     * both — and that is the case where the shortfall matters most, so it must
     * not be the case where the number disappears.
     */
    gapShown () {
      return !!(this.expected && typeof this.expected.score === 'number' && this.result.gap !== null)
    },

    /**
     * Which of the three gap sentences applies, decided from what actually
     * reached the expected template rather than assumed.
     * @returns {'noDistinction'|'matched'|'noLever'}
     */
    gapCase () {
      const row = this.expected
      if (!row) { return 'noLever' }
      if (this.distinctionReasons(row).length > 0) { return 'matched' }
      if (this.treeReasons(row).length > 0) { return 'noDistinction' }
      return 'noLever'
    },

    /** The winning score, which every "would this be enough?" answer is measured against. */
    topScore () {
      return this.sheetRows.length > 0 ? this.sheetRows[0].score : 0
    },

    /** What the expected template would score with a distinction attached. */
    scoreWithDistinction () {
      const base = (this.expected && Number(this.expected.score)) || 0
      return +(base + this.distinctionBoost).toFixed(2)
    },

    /** What it would score with a logic-table hint instead. */
    scoreWithTree () {
      const base = (this.expected && Number(this.expected.score)) || 0
      return +(base + this.treeBoost).toFixed(2)
    },

    /**
     * Which lever, if any, actually clears the top score — computed from the
     * sheet's own numbers so the advice can never contradict the table above it.
     *
     * "Enough" means OVERTAKING, not drawing level: a tie is settled by scoring
     * the firm cannot see, so promising a win on a draw would be a guess dressed
     * as arithmetic.
     * @returns {string} the locale key of the verdict sentence
     */
    gapVerdictKey () {
      const top = this.topScore
      const d = this.scoreWithDistinction > top
      const t = this.scoreWithTree > top
      if (d && t) { return 'dxVerdictEither' }
      if (d) { return 'dxVerdictDistinction' }
      const base = (this.expected && Number(this.expected.score)) || 0
      if (base + this.distinctionBoost + this.treeBoost > top) { return 'dxVerdictBoth' }
      return 'dxVerdictNeither'
    },

    /**
     * Write a new distinction, or attach the template to one that already
     * matched? The second is the cheaper, more accurate move and the page was
     * previously blind to it — the gap block only ever looked at what reached
     * the expected template, so it could not see a distinction that matched the
     * conversation but pointed elsewhere.
     * @returns {'attach'|'write'|'none'}
     */
    gapAction () {
      if (!this.expected) { return 'none' }
      if (this.distinctionReasons(this.expected).length > 0) { return 'none' }
      return this.matchedDistinctions.length > 0 ? 'attach' : 'write'
    },

    /**
     * Template title → the descriptions of the firm's distinctions that name it.
     * Lets a score chip say WHICH distinction was worth those points, which the
     * reason code alone (`distinction:+5`) cannot.
     * @returns {Object<string, string[]>}
     */
    distinctionsByTemplate () {
      const map = {}
      for (const row of this.matchedDistinctions) {
        for (const title of (row.templates || [])) {
          if (!map[title]) { map[title] = [] }
          map[title].push(row.description)
        }
      }
      return map
    },

    /**
     * The ideas list — built entirely from the firm's OWN material: the sentence
     * as typed, the phrases that really matched, the area really detected.
     * Nothing is invented on the firm's behalf.
     * @returns {{lede: string, items: Array<Object>}}
     */
    ideas () {
      const t = k => this.$t('firmDecisionLogic.' + k)
      const domain = this.detectedDomainLabel
      const expectedName = this.resolvedExpectedTitle() || ''
      const matched = []
      for (const table of this.probeTables) {
        for (const phrase of (table.matched || [])) { matched.push(phrase) }
      }
      const distCount = this.matchedDistinctions.length

      if (this.problem === 'explain') {
        return {
          lede: t('ideasLedeExplain'),
          items: [{
            lever: t('ideaDomainSupport'),
            worth: t('worthNoSelection'),
            body: [
              { text: t('ideaExplainBodyA') },
              { text: domain, bold: true },
              { text: t('ideaExplainBodyB') }
            ],
            how: [{ text: this.$t('firmDecisionLogic.ideaExplainHow', { domain }) }],
            cls: 'is-shape'
          }]
        }
      }

      const items = [{
        lever: t('ideaDistinction'),
        worth: this.$t('firmDecisionLogic.worthPoints', { points: this.distinctionBoost }),
        body: distCount === 0
          ? [
              { text: t('ideaDistBodyNoneA') },
              { text: expectedName, bold: true },
              { text: t('ideaDistBodyNoneB') }
            ]
          : [
              { text: this.matchedDistinctions[0].description, bold: true },
              { text: t('ideaDistBodyMatchedA') },
              { text: expectedName, bold: true },
              { text: t('ideaDistBodyMatchedB') }
            ],
        // The quote sits INSIDE the sentence, between "worded cleverly:" and
        // "File it under …", exactly as the approved artefact has it. Rendering
        // it after the paragraph (the first build) ran those two clauses
        // together and orphaned the advisor's own words below them.
        how: [
          { text: t('ideaDistHowA') },
          { text: this.text.trim(), quote: true },
          { text: t('ideaDistHowB') },
          { text: domain, bold: true },
          { text: t('ideaDistHowC') }
        ],
        cls: ''
      }, {
        lever: t('ideaTriggers'),
        worth: this.$t('firmDecisionLogic.worthPoints', { points: this.treeBoost }),
        body: this.probeTables.length === 0
          ? [{ text: t('ideaTriggersBodyNone') }]
          : [
              // $tc: at two tables the singular form reads "Only 2 table opened".
              { text: this.$tc('firmDecisionLogic.ideaTriggersBodySomeA', this.probeTables.length, { count: this.probeTables.length }) },
              // An EXPLICIT space. vue-i18n trims each side of a `a | b` plural
              // string, so a trailing space in the locale file is silently eaten
              // and the sentence renders as "opened on“decision making”".
              { text: ' ' },
              {
                text: matched.length
                  ? '“' + matched.join('”, “') + '”'
                  : t('ideaTriggersBodySomeNoPhrase'),
                bold: true
              },
              { text: t('ideaTriggersBodySomeB') }
            ],
        how: [{ text: t('ideaTriggersHow') }],
        cls: ''
      }, {
        lever: t('ideaDomainSupport'),
        worth: t('worthNoneHere'),
        body: [{ text: t('ideaRuleOutBody') }],
        how: [{ text: t('ideaRuleOutHow') }],
        cls: 'is-shape'
      }]

      return {
        lede: distCount === 0 ? t('ideasLedeNoDist') : t('ideasLedeDist'),
        items
      }
    }
  },

  mounted () {
    this.loadTitles()
  },

  methods: {
    /**
     * Fill the "which template did you expect?" picker from the firm's own
     * library. A failure leaves the picker empty and says so — an empty dropdown
     * with no message would read as "your firm has no templates".
     */
    async loadTitles () {
      this.loadingTitles = true
      try {
        const data = await this.api('GET', '/api/firm-manager/logic-lab/templates')
        this.titles = data.titles || []
      } catch (err) {
        this.error = this.$t('firmDecisionLogic.dxFailed')
      } finally {
        this.loadingTitles = false
      }
    },

    /** Run the sentence through the real engine. Read-only. */
    async run () {
      const text = this.text.trim()
      if (!text || this.running) { return }
      this.running = true
      this.error = ''
      // A fresh diagnosis retires the previous ideas rather than leaving stale
      // advice attached to a new answer.
      this.showIdeas = false
      try {
        this.result = await this.api('POST', '/api/firm-manager/logic-lab/diagnose', {
          text,
          expectedTitle: this.showExpected ? this.resolvedExpectedTitle() : null
        })
      } catch (err) {
        this.error = this.$t('firmDecisionLogic.dxFailed')
        this.result = null
      } finally {
        this.running = false
      }
    },

    toggleIdeas () { this.showIdeas = !this.showIdeas },

    /**
     * Record a template picked from the list.
     * @param {string|null} title the chosen title, or null when cleared
     */
    onExpectedSelect (title) {
      this.expectedTitle = title || null
    },

    /**
     * The template to diagnose against. Falls back to an exact match on what was
     * typed: a manager who types the full name and presses the button without
     * clicking the suggestion has told us what they expected, and silently
     * treating that as "no expectation" would drop the whole point of the run.
     * @returns {string|null}
     */
    resolvedExpectedTitle () {
      if (this.expectedTitle) { return this.expectedTitle }
      const typed = this.expectedSearch.trim().toLowerCase()
      if (!typed) { return null }
      return this.titles.find(t => String(t).toLowerCase() === typed) || null
    },

    /**
     * The distinction levers on one score row.
     * @param {Object} row a score sheet row
     * @returns {Array<Object>}
     */
    distinctionReasons (row) {
      return (row.reasons || []).filter(r => r.kind === 'distinction')
    },

    /**
     * The logic-table levers on one score row.
     * @param {Object} row a score sheet row
     * @returns {Array<Object>}
     */
    treeReasons (row) {
      return (row.reasons || []).filter(r => r.kind === 'tree_hint')
    },

    /**
     * The distinction chip, naming the distinction where it can be identified.
     * Falls back to the unnamed form rather than guessing: two distinctions can
     * point at one template, and naming the wrong one is worse than naming none.
     * @param {Object} row a score sheet row
     * @param {{points: number}} reason
     * @returns {string}
     */
    distinctionChip (row, reason) {
      const names = this.distinctionsByTemplate[row.title] || []
      if (names.length === 1) {
        return this.$t('firmDecisionLogic.dxChipDistinctionNamed', {
          name: names[0],
          points: reason.points
        })
      }
      return this.$t('firmDecisionLogic.dxChipDistinction', { points: reason.points })
    },

    /**
     * Is this the row the firm expected? Matched on rank as well as title so a
     * library holding the same title twice cannot highlight the wrong line.
     * @param {Object} row
     * @returns {boolean}
     */
    isExpectedRow (row) {
      return !!(this.expected && this.expected.rank !== null &&
        row.title === this.expected.title && row.rank === this.expected.rank)
    },

    /**
     * Signed, because penalties are real. Printing "+" on a negative total would
     * be a lie about the engine that the reader has no way to catch.
     * @param {number} n
     * @returns {string}
     */
    signed (n) {
      const v = Number(n) || 0
      return (v < 0 ? '−' : '+') + Math.abs(v)
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
/* The approved mockup's own values. Kept literal so the build can be put beside
   design/mockups/decision-logic-map-mockup.html and compared. */
.dx { margin-top: 4rem; }
.band-heading { font-size: 1.15rem; color: #002b64; margin: 0 0 0.35rem; letter-spacing: -0.01em; font-weight: 700; }
.band-sub { color: #7a869a; font-size: 0.86rem; margin: 0 0 1.6rem; max-width: 56rem; }

.dgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.1rem 1.2rem; }
@media (max-width: 820px) { .dgrid { grid-template-columns: 1fr; } }
.dfield-wide { grid-column: 1 / -1; }
.dlabel {
  display: block; font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: #002b64; margin-bottom: 0.4rem;
}
.dactions { margin-top: 1.3rem; display: flex; align-items: center; gap: 0.9rem; }
.dstatus { font-size: 0.8rem; color: #7a869a; }

.dh {
  font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.07em;
  color: #002b64; margin: 2rem 0 0.7rem; font-weight: 700;
}
.dfacts {
  display: grid; grid-template-columns: 11rem 1fr; gap: 0.55rem 1.2rem;
  font-size: 0.85rem; margin: 0 0 0.5rem;
}
.dfacts dt { font-weight: 700; color: #4a4a4a; }
.dfacts dd { margin: 0; }
.dline { display: block; }
.dim { color: #7a869a; }

.tag-il {
  font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.07em; font-weight: 700;
  color: #b35309; background: #fffaf3; border: 1px solid #ffb870;
  border-radius: 3px; padding: 0.05rem 0.4rem;
}

/* Wide content scrolls inside its own box rather than the page. */
.table-scroll { overflow-x: auto; }
table.score { border-collapse: collapse; width: 100%; font-size: 0.83rem; }
table.score th {
  text-align: left; font-size: 0.67rem; text-transform: uppercase; letter-spacing: 0.07em;
  color: #002b64; background: #f4f6f9; padding: 0.6rem 0.7rem; border-bottom: 1px solid #d5dbe4;
}
table.score th.num { text-align: right; }
table.score td { padding: 0.7rem; border-bottom: 1px solid #eef1f5; vertical-align: top; }
tr.winner td { background: #f7fdfa; }
tr.expected td { background: #fffaf3; }
.tname { font-weight: 600; }
.score-n { font-weight: 700; text-align: right; white-space: nowrap; }

/* Colour carries the meaning: green = your distinction, amber = your logic
   table, grey = the part that stays behind the curtain. */
.reason {
  display: inline-block; font-size: 0.72rem; border-radius: 999px;
  padding: 0.12rem 0.55rem; margin: 0.15rem 0.25rem 0.15rem 0; border: 1px solid;
}
.r-dist { color: #1f7a45; background: #eefaf2; border-color: #63c48d; }
.r-tree { color: #b35309; background: #fffaf3; border-color: #ffb870; }
.r-other { color: #8a94a3; background: #f6f7f9; border-color: #d8dce3; }
.r-none { color: #b35309; background: #fffaf3; border-color: #ffb870; font-weight: 700; }

.gap {
  margin-top: 1.3rem; border: 1px solid #ffb870; background: #fffaf3;
  border-radius: 6px; padding: 1rem 1.15rem;
}
.gap-head { margin: 0; font-size: 1.05rem; color: #b35309; font-weight: 700; }
.gap-body { margin: 0.5rem 0 0; font-size: 0.86rem; }
.gap-do { margin: 0.8rem 0 0; font-size: 0.86rem; font-weight: 600; color: #002b64; }

.no-scoring, .not-ranked { font-size: 0.86rem; margin-top: 1rem; color: #b35309; }

.caution {
  font-size: 0.81rem; background: #f7f7f9; border-radius: 6px;
  padding: 0.8rem 0.95rem; color: #5a5a5a; margin-top: 1.2rem;
}
.caution b { color: #363636; display: block; margin-bottom: 0.2rem; }
.limit-line { margin: 0.25rem 0 0; }

.ideas-bar { margin-top: 1.4rem; padding-top: 1.4rem; border-top: 1px solid #eef1f5; }
.ideas-lede { font-size: 0.88rem; margin: 0 0 1rem; }
ol.ideas { list-style: none; counter-reset: idea; margin: 0; padding: 0; }
li.idea {
  counter-increment: idea; position: relative; padding: 1rem 1.1rem 1rem 3rem;
  border: 1px solid #e2e6ec; border-radius: 6px; margin-bottom: 0.7rem; background: #fff;
}
li.idea::before {
  content: counter(idea); position: absolute; left: 1rem; top: 1rem;
  width: 1.5rem; height: 1.5rem; border-radius: 999px; background: #eefaf2;
  color: #1f7a45; font-size: 0.78rem; font-weight: 700; display: flex;
  align-items: center; justify-content: center;
}
li.idea.is-shape::before { background: #f3f6fa; color: #5a6b82; }
.i-head { margin: 0; display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap; }
.i-lever { font-weight: 700; color: #002b64; font-size: 0.92rem; }
.i-worth {
  font-size: 0.72rem; font-weight: 700; padding: 0.12rem 0.55rem;
  border-radius: 999px; background: #eefaf2; color: #1f7a45;
}
li.idea.is-shape .i-worth { background: #f3f6fa; color: #5a6b82; }
.i-body { font-size: 0.85rem; margin: 0.5rem 0 0; }
.i-how { font-size: 0.82rem; margin: 0.55rem 0 0; color: #5a6b82; }
.quote {
  display: block; margin: 0.4rem 0; padding: 0.5rem 0.7rem; background: #f7f9fc;
  border-left: 3px solid #63c48d; border-radius: 4px; font-style: italic;
}
.ideas-foot { font-size: 0.8rem; color: #7a869a; margin: 1rem 0 0; }
</style>
