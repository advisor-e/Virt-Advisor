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
      //- 🔴 THE BANNER, and it is not decoration. When the distinction classifier
      //- fails, everything below was ranked WITHOUT the firm's biggest lever — so
      //- the sheet is not the ranking a working engine produces. The sheet is still
      //- shown (Mike's ruling, 2026-08-03, Decision 0 option A: the deterministic
      //- half is true and worth reading), but never without this line above it.
      //- Wording S4 — design/WORDING-DISTINCTION-AI-FAILURE.md
      b-message.mt-4(v-if="distinctionsAiFailed" type="is-warning" has-icon :closable="false")
        | {{ $t('firmDecisionLogic.dxDistAiFailed') }}

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
          //- Two different faults, two different sentences: dxDistUnavailable is the
          //- firm's saved distinctions failing to LOAD; dxDistAiFailed is the AI that
          //- reads them failing to ANSWER. Whoever has to fix one needs to know which.
          span.dim(v-if="!result.distinctionsAvailable") {{ $t('firmDecisionLogic.dxDistUnavailable') }}
          span.dfault(v-else-if="distinctionsAiFailed") {{ $t('firmDecisionLogic.dxDistAiFailed') }}
          span.dim(v-else-if="probeDistinctions.reason") {{ probeDistinctions.reason }}
          template(v-else-if="matchedDistinctions.length")
            .dline(v-for="d in matchedDistinctions" :key="d.id")
              strong {{ d.description }}
              span.dim  +{{ d.boost }}
          span.dim(v-else) {{ $t('firmDecisionLogic.dxDistNone', { count: probeDistinctions.considered || 0 }) }}

        //- ── Yours, filed somewhere it is never read ──────────────────────
        //- The commonest answer to "I wrote one and it didn't fire", and the
        //- page could not say it until now: distinctions are only ever scored
        //- inside the detected area, so a row filed elsewhere is invisible no
        //- matter how well it describes the situation. Mike hit exactly this on
        //- 2026-08-03 and was shown a PLATFORM row instead.
        template(v-if="elsewhereRows.length")
          dt {{ $t('firmDecisionLogic.dxLabelElsewhere') }}
          dd
            .dline.elsewhere(v-for="d in elsewhereRows" :key="'e' + d.id")
              strong “{{ d.description }}”
              |
              span {{ $t('firmDecisionLogic.dxElsewhereA') }}
              strong {{ domainLabelFor(d.filedDomain) }}
              span {{ $t('firmDecisionLogic.dxElsewhereB') }}
              strong {{ detectedDomainLabel }}
              span {{ $t('firmDecisionLogic.dxElsewhereC') }}

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
                  //- "+0" is a measured contribution of nothing. With the classifier
                  //- down nothing was measured, so the chip states the absence
                  //- instead of a number it cannot stand behind (S5).
                  span.reason.r-none(v-if="isExpectedRow(row) && distinctionsAiFailed")
                    | {{ $t('firmDecisionLogic.dxChipDistNotChecked') }}
                  span.reason.r-none(v-else-if="isExpectedRow(row) && !distinctionReasons(row).length")
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

          //- With the classifier down, none of the three gap sentences below can be
          //- said: each asserts what did or did not reach the expected template, and
          //- the biggest lever was never read. The instruction is suppressed with
          //- them — "write a distinction" would send a manager to solve a problem
          //- that may not exist, which was the most harmful of the eight (S6).
          //- Only when there IS a gap: with the expected template already top there
          //- is no shortfall to explain, and the banner above has said the rest.
          p.gap-body.gap-fault(v-if="distinctionsAiFailed && result.gap > 0") {{ $t('firmDecisionLogic.dxGapAiFailed') }}

          template(v-else-if="result.gap > 0")
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
                strong “{{ chosenDistinction.description }}”
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

            //- ── The button that DELIVERS ────────────────────────────────────
            //- Mike, 2026-08-03: "All I want is that if my adviser uses that
            //- phrase, I want them to get their template." So it appears the
            //- moment a template has been named — it does not depend on which
            //- of his distinctions happened to match, because the fix never
            //- did. The area and the strength are worked out server-side and
            //- the result is PROVED by re-running the phrase before it reports
            //- success. See server/utils/logicLabAccept.js.
            template(v-if="idea.key === 'distinction'")
              .i-act(v-if="canDeliver")
                b-button(
                  type="is-primary"
                  size="is-small"
                  :loading="delivering"
                  :disabled="delivering"
                  @click="confirmDeliver"
                ) {{ $t('firmDecisionLogic.llDeliverButton', { template: attachTemplateTitle }) }}
                p.i-note {{ $t('firmDecisionLogic.llDeliverNote') }}
              p.i-done(v-if="deliveredLabel") {{ deliveredLabel }}
              p.i-failed(v-if="deliverFailedLabel") {{ deliverFailedLabel }}
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
 * IT WRITES IN EXACTLY ONE PLACE, and it is deliberate: the distinction idea card
 * carries an attach button when — and only when — the change is fully determined
 * (a distinction of theirs matched, they named a template, it is not already on
 * it). Nothing is authored on the firm's behalf. The other two ideas describe and
 * stop there: writing a new distinction is the firm's IP, and domain support's own
 * card says editing it changes no recommendation.
 * See design/LOGIC-LAB-ACCEPT-AND-PUSH.md; ACTIONS #logic-lab-accept-and-push.
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
      showIdeas: false,
      /** Which matched distinction the card names; null = the first. */
      attachTargetId: null,
      delivering: false,
      /** The past-tense line shown once the template really does come first. */
      deliveredLabel: '',
      /** Shown when the engine could NOT be made to deliver it. */
      deliverFailedLabel: ''
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

    /**
     * The distinction an attach would change. Defaults to the first match, which
     * is what the card already named — but once the manager has picked, that
     * choice drives BOTH the wording and the write, so the sentence can never
     * describe one row while the button changes another.
     * @returns {Object} the chosen matched distinction, or an empty row
     */
    chosenDistinction () {
      const rows = this.matchedDistinctions
      if (rows.length === 0) { return {} }
      if (this.attachTargetId === null) { return rows[0] }
      return rows.find(r => String(r.id) === String(this.attachTargetId)) || rows[0]
    },

    /**
     * The template the DIAGNOSIS ran against — not whatever is in the picker now.
     * The two drift apart the moment a manager edits the box without re-running,
     * and attaching a template the score sheet above was never about would be a
     * change made on evidence that is not on the screen.
     * @returns {string|null}
     */
    attachTemplateTitle () {
      return (this.expected && this.expected.title) || null
    },

    /**
     * Can this phrase be delivered? Only two things are needed: a phrase, and a
     * template named. It deliberately does NOT depend on which distinction
     * matched — that dependency is what made the first build useless, since the
     * fix never involved the matched row at all.
     * @returns {boolean}
     */
    canDeliver () {
      if (this.deliveredLabel) { return false }
      if (!this.text.trim()) { return false }
      return !!this.attachTemplateTitle
    },

    probe () { return (this.result && this.result.probe) || {} },
    probeDomains () { return this.probe.domains || [] },
    probeTables () { return this.probe.tables || [] },
    probeDistinctions () { return this.probe.distinctions || {} },
    matchedDistinctions () { return this.probeDistinctions.matched || [] },

    /**
     * The firm's OWN distinctions, filed in another area, that these words would
     * have matched. Empty is the normal case; when it is not empty it is usually
     * the actual answer to "why didn't mine fire?".
     * @returns {Array<Object>}
     */
    elsewhereRows () {
      return (this.probeDistinctions.elsewhere && this.probeDistinctions.elsewhere.rows) || []
    },

    /**
     * Did the AI that reads the firm's distinctions fail to answer? Distinct from
     * `result.distinctionsAvailable`, which reports the firm's saved distinctions
     * failing to LOAD — a different fault with a different fix.
     *
     * Everything on this page that speaks about distinctions branches on this,
     * because an empty `matched` list means either "read, and none applied" or
     * "never read", and the page exists to tell a firm which is which.
     * @returns {boolean}
     */
    distinctionsAiFailed () { return !!this.probeDistinctions.aiFailed },

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
        // Marks the ONE card that carries the attach button. Matched on a key
        // rather than on position, so re-ordering the ideas can never move the
        // button onto an idea that is not fully determined.
        key: 'distinction',
        lever: t('ideaDistinction'),
        worth: this.$t('firmDecisionLogic.worthPoints', { points: this.distinctionBoost }),
        body: distCount === 0
          ? [
              { text: t('ideaDistBodyNoneA') },
              { text: expectedName, bold: true },
              { text: t('ideaDistBodyNoneB') }
            ]
          : [
              { text: this.chosenDistinction.description, bold: true },
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
        // The lede used to read the same empty list two ways round: with the
        // classifier down, distCount is 0 and it told a manager "no distinction of
        // yours matched — that is the biggest thing you can change", sending them
        // to write one to fix a problem nobody had measured (S6).
        lede: this.distinctionsAiFailed
          ? t('dxGapAiFailed')
          : (distCount === 0 ? t('ideasLedeNoDist') : t('ideasLedeDist')),
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
      // advice attached to a new answer — including anything already accepted,
      // whose past-tense line would otherwise sit under a different question.
      this.showIdeas = false
      this.attachTargetId = null
      this.deliveredLabel = ''
      this.deliverFailedLabel = ''
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
     * Human label for a domain id — never show a manager a database key. Falls
     * back to the id rather than a blank, which would read as "filed nowhere".
     * @param {string} id
     * @returns {string}
     */
    domainLabelFor (id) { return this.domainLabels[id] || id || '—' },

    /**
     * Escape the firm's own text before it goes into a Buefy dialog.
     *
     * `$buefy.dialog.confirm` renders `message` AS HTML. A distinction's wording
     * and a template's title are firm-authored free text, so interpolating them
     * raw would put stored content into the DOM unescaped — the same class of
     * hole the app closes with isomorphic-dompurify wherever it uses v-html.
     * Escaping is the fix here because the dialog offers no plain-text mode.
     * @param {string} s
     * @returns {string}
     */
    escapeHtml (s) {
      return String(s === null || s === undefined ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    },

    /**
     * Ask before writing, naming what will happen — the same pattern the
     * near-miss Move/Copy rows use, and required for every push
     * (design/LOGIC-LAB-ACCEPT-AND-PUSH.md).
     */
    confirmDeliver () {
      const template = this.attachTemplateTitle
      if (!template) { return }
      this.$buefy.dialog.confirm({
        title: this.$t('firmDecisionLogic.llDeliverConfirmTitle'),
        message: this.$t('firmDecisionLogic.llDeliverConfirm', {
          template: this.escapeHtml(template),
          domain: this.escapeHtml(this.detectedDomainLabel)
        }),
        confirmText: this.$t('firmDecisionLogic.llDeliverConfirmOk'),
        type: 'is-warning',
        onConfirm: () => this.deliver(template)
      })
    },

    /**
     * File a distinction of the firm's own that makes this phrase return this
     * template, and report only what the server PROVED by re-running it.
     *
     * `delivered: false` is a real answer, not an error: the engine was changed,
     * checked, found not to deliver, and put back. Reporting that as success is
     * the failure this whole page exists to prevent.
     *
     * @param {string} template the template title to deliver
     */
    async deliver (template) {
      this.delivering = true
      this.deliverFailedLabel = ''
      try {
        const res = await this.api('POST', '/api/firm-manager/logic-lab/accept', {
          text: this.text.trim(),
          templateTitle: template,
          // Descriptive only — the server re-resolves everything that decides
          // the write. This is what turns a stored change into a record of what
          // the manager was TRYING to do, for the mentor rollup.
          context: {
            sentence: this.text.trim(),
            problem: this.problem,
            domain: this.result && this.result.domain,
            gap: this.result && this.result.gap,
            tablesOpened: this.probeTables.map(t => t.name || t.id),
            phrasesMatched: this.probeTables.reduce((all, t) => all.concat(t.matched || []), []),
            distinctionsMatched: this.matchedDistinctions.map(d => d.description)
          }
        })
        if (res.delivered) {
          this.deliveredLabel = this.$t('firmDecisionLogic.llDeliverDone', {
            template,
            domain: this.detectedDomainLabel
          })
          // The Advisory Distinctions tab loads once when the hub mounts, so it
          // would otherwise show this firm's list without the row just written.
          this.$emit('distinctions-changed')
        } else {
          this.deliverFailedLabel = this.$t('firmDecisionLogic.llDeliverImpossible', {
            template,
            top: res.topTemplate || '—'
          })
        }
      } catch (err) {
        this.$buefy.toast.open({
          message: this.$t('firmDecisionLogic.llDeliverFailed'),
          type: 'is-danger'
        })
      } finally {
        this.delivering = false
      }
    },

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
/* A fault is not a dim note. `.dim` is what this page uses for ordinary "nothing
   here" results, and the whole defect was a fault wearing that costume. */
.dfault { color: #9a3412; font-weight: 600; }

/* Amber, like every other "this is the thing to act on" block on the page: a row
   of the firm's own that never got read is a finding, not a footnote. */
.elsewhere {
  border-left: 3px solid #ffb870; background: #fffaf3;
  padding: 0.45rem 0.65rem; border-radius: 4px; margin-bottom: 0.35rem;
}

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
.gap-fault { color: #9a3412; font-weight: 600; }
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

/* The attach control. Set apart from the card's prose by a rule, because it is
   the one thing on this page that changes the firm's live configuration. */
.i-pick { margin: 0.85rem 0 0; max-width: 32rem; }
.i-act { margin: 0.85rem 0 0; padding-top: 0.85rem; border-top: 1px solid #eef1f5; }
.i-done {
  margin: 0.85rem 0 0; padding-top: 0.85rem; border-top: 1px solid #eef1f5;
  font-size: 0.8rem; color: #1f7a45; font-weight: 700;
}
.i-note { font-size: 0.75rem; color: #7a869a; margin: 0.45rem 0 0; }
.i-failed {
  margin: 0.85rem 0 0; padding-top: 0.85rem; border-top: 1px solid #eef1f5;
  font-size: 0.8rem; color: #b35309; font-weight: 700;
}
</style>
