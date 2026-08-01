<template lang="pug">
.coc-root
  report-header(
    :back-label="$t('modelLibrary.backToLibrary')"
    :eyebrow="$t('report.eyebrow')"
    :title="$t('report.costOfCapital.title')"
    :client="$t('report.preparedFor')"
  )
  //- Decision class: seeded with the workbook sample until the advisor types the
  //- client's own figures. No "Illustrative" badge — these become real numbers.
  sample-notice(:text="$t('report.sampleFigures')")

  //- Full-width headline band (owner ruling 2026-07-27): a direct child of the root,
  //- above the two-column layout — never inside the results column.
  template(v-if="data")
    //- A failed recompute must never sit silently behind live-looking figures (R9)
    stale-banner(
      v-if="error"
      :title="$t('report.staleTitle')"
      :message="$t('report.calcUnreachable')"
      :retry-label="$t('report.retry')"
      @retry="recompute"
    )

    hero-strip(:columns="4" :stale="!!error")
      //- Deliberately no `tone`: a WACC is neither good nor bad on its own, and
      //- colouring it would assert a judgement the model cannot make. The judgement
      //- belongs to the hurdle test below, which has a specific investment to judge
      //- against — and that is the only toned element on this screen.
      hero-figure(
        :label="$t('report.costOfCapital.hero.wacc')"
        :value="pct(data.wacc.wacc, 2)"
        :sub="$t('report.costOfCapital.hero.waccSub')"
      )
      hero-figure(
        :label="$t('report.costOfCapital.hero.costOfEquity')"
        :value="pct(data.wacc.costOfEquity, 2)"
        :sub="$t('report.costOfCapital.hero.costOfEquitySub')"
      )
      hero-figure(
        :label="$t('report.costOfCapital.hero.costOfDebt')"
        :value="pct(data.wacc.costOfDebtAfterTax, 2)"
        :sub="$t('report.costOfCapital.hero.costOfDebtSub', { rate: pct(data.wacc.inputs.borrowRate, 2) })"
      )
      hero-figure(
        :label="$t('report.costOfCapital.hero.fundedByEquity')"
        :value="pct(data.wacc.equityRatio, 1)"
        :sub="$t('report.costOfCapital.hero.fundedByEquitySub', { rate: pct(data.wacc.debtRatio, 1) })"
      )

  //- House two-column layout: inputs left, results right; one column below 860px.
  .coc-layout
    aside.coc-inputs
      .coc-card
        h2 {{ $t('report.costOfCapital.market.title') }}
        .coc-field
          label {{ $t('report.costOfCapital.market.riskFree') }}
          b-input(v-model.number="form.riskFreeRatePct" type="number" step="any" size="is-small")
        .coc-field
          label {{ $t('report.costOfCapital.market.marketReturn') }}
          b-input(v-model.number="form.marketRatePct" type="number" step="any" size="is-small")
        .coc-field
          .coc-labels
            label {{ $t('report.costOfCapital.market.beta') }}
            p.coc-help {{ $t('report.costOfCapital.market.betaHelp') }}
            //- Provenance: shown only while the figure IS the adopted one. Typing over
            //- it clears the note, so it can never credit a suggestion for a number the
            //- advisor chose themselves.
            p.coc-provenance(v-if="betaSourceLabel") {{ betaSourceLabel }}
          b-input(v-model.number="form.beta" type="number" step="any" size="is-small")

      .coc-card
        h2 {{ $t('report.costOfCapital.company.title') }}
        .coc-field
          label {{ $t('report.costOfCapital.company.tax') }}
          b-input(v-model.number="form.taxRatePct" type="number" step="any" size="is-small")

      .coc-card
        h2 {{ $t('report.costOfCapital.funding.title') }}
        .coc-field
          label {{ $t('report.costOfCapital.funding.equity') }}
          b-input(v-model.number="form.equity" type="number" step="any" size="is-small")
        .coc-field
          label {{ $t('report.costOfCapital.funding.debt') }}
          b-input(v-model.number="form.debt" type="number" step="any" size="is-small")
        .coc-field
          label {{ $t('report.costOfCapital.funding.borrowRate') }}
          b-input(v-model.number="form.borrowRatePct" type="number" step="any" size="is-small")

      //- The hurdle test. Both fields start EMPTY, not seeded from the sample: the
      //- workbook proposes no investment, and a made-up one would be read as the
      //- client's own. Until both are filled the verdict card does not appear at all.
      .coc-card
        h2 {{ $t('report.costOfCapital.hurdle.title') }}
        .coc-field
          label {{ $t('report.costOfCapital.hurdle.investmentCost') }}
          b-input(
            :value="form.investmentCost"
            type="number"
            step="any"
            size="is-small"
            @input="v => onMoneyInput('investmentCost', v)"
          )
        .coc-field
          label {{ $t('report.costOfCapital.hurdle.annualReturn') }}
          b-input(
            :value="form.annualReturn"
            type="number"
            step="any"
            size="is-small"
            @input="v => onMoneyInput('annualReturn', v)"
          )

    section.coc-results
      template(v-if="data")
        //- The whole build-up, line by line, so an advisor can walk a client down it.
        .coc-card
          h2 {{ $t('report.costOfCapital.build.title') }}
          table.coc-mini
            tr
              td {{ $t('report.costOfCapital.build.costOfEquity') }}
              td {{ pct(data.wacc.costOfEquity, 4) }}
            tr
              td.indent {{ $t('report.costOfCapital.build.timesEquityShare', { rate: pct(data.wacc.equityRatio, 1) }) }}
              td
            tr.is-total
              td {{ $t('report.costOfCapital.build.equityShare') }}
              td {{ pct(data.wacc.equityComponent, 4) }}

            tr.is-gap
              td {{ $t('report.costOfCapital.build.borrowRate') }}
              td {{ pct(data.wacc.inputs.borrowRate, 4) }}
            tr
              td.indent {{ $t('report.costOfCapital.build.timesDebtShare', { rate: pct(data.wacc.debtRatio, 1) }) }}
              td {{ pct(data.wacc.debtComponentPreTax, 4) }}
            tr
              td.indent {{ $t('report.costOfCapital.build.lessTax', { rate: pct(data.wacc.inputs.taxRate, 0) }) }}
              td −{{ pct(data.wacc.debtTaxShield, 4) }}
            tr.is-total
              td {{ $t('report.costOfCapital.build.debtShare') }}
              td {{ pct(data.wacc.debtComponent, 4) }}

            tr.is-gap.is-total
              td {{ $t('report.costOfCapital.build.wacc') }}
              td {{ pct(data.wacc.wacc, 4) }}
          p.coc-note {{ $t('report.costOfCapital.build.note') }}

        //- The hurdle test — the WACC turned into the decision it exists to serve.
        //- Absent entirely until the backend returns one: an advisor mid-typing is not
        //- an advisor in error, and a half-filled test has no honest answer to show.
        //- This is the ONLY figure on the screen allowed a tone. The headline WACC has
        //- none by deliberate ruling — a cost of capital is neither good nor bad on its
        //- own — but a verdict genuinely is one or the other.
        .coc-card(v-if="data.hurdle")
          h2 {{ $t('report.costOfCapital.hurdle.title') }}
          p.coc-verdict(:class="'is-' + verdictTone") {{ verdictText }}
          table.coc-mini
            tr
              td {{ $t('report.costOfCapital.hurdle.returnRate') }}
              td {{ pct(data.hurdle.returnRate, 2) }}
            tr
              td {{ $t('report.costOfCapital.hurdle.costOfCapital') }}
              td {{ pct(data.hurdle.hurdleRate, 2) }}
            tr
              td {{ $t('report.costOfCapital.hurdle.needsToEarn') }}
              td {{ requiredAnnualReturnText }}
            tr.is-total(v-if="marginLabel")
              td {{ marginLabel }}
              td {{ marginAmountText }}
          p.coc-note {{ $t('report.costOfCapital.hurdle.note') }}

        //- Which figure is actually driving the answer. One input moves per line —
        //- stated on screen, because a reader who assumes the lines add up would badly
        //- overestimate the effect of changing two things at once.
        .coc-card(v-if="data.sensitivity && data.sensitivity.length")
          h2 {{ $t('report.costOfCapital.sensitivity.title') }}
          table.coc-mini.is-sens
            thead
              tr
                th {{ $t('report.costOfCapital.sensitivity.ifRises') }}
                th {{ $t('report.costOfCapital.sensitivity.newWacc') }}
                th {{ $t('report.costOfCapital.sensitivity.change') }}
            tbody
              tr(v-for="s in data.sensitivity" :key="s.key")
                td {{ $t('report.costOfCapital.sensitivity.item.' + s.key) }}
                td {{ pct(s.wacc, 2) }}
                td.coc-delta(:class="s.change < 0 ? 'is-down' : 'is-up'") {{ signedPoints(s.change) }}
          p.coc-note {{ $t('report.costOfCapital.sensitivity.note') }}

        //- The Beta helper. Periods run DOWN the page, not across: twelve columns of
        //- seven-figure shareholders' equity will not fit the results column; twelve
        //- rows do. It OFFERS two betas and shows the one actually in use beside them.
        .coc-card
          h2 {{ $t('report.costOfCapital.helper.title') }}
          p.coc-note.is-lede {{ $t('report.costOfCapital.helper.lede') }}
          .coc-series-scroll
            table.coc-series
              thead
                tr
                  th {{ $t('report.costOfCapital.helper.period') }}
                  th {{ $t('report.costOfCapital.helper.indexValue') }}
                  th {{ $t('report.costOfCapital.helper.shareholdersEquity') }}
                  th {{ $t('report.costOfCapital.helper.sharesIssued') }}
              tbody
                tr(v-for="i in periods" :key="'period-' + i")
                  td.coc-series-n {{ i + 1 }}
                  td
                    b-input(
                      :value="form.indexValues[i]"
                      type="number"
                      step="any"
                      size="is-small"
                      @input="v => setSeries('indexValues', i, v)"
                    )
                  td
                    b-input(
                      :value="form.equityValues[i]"
                      type="number"
                      step="any"
                      size="is-small"
                      @input="v => setSeries('equityValues', i, v)"
                    )
                  td
                    b-input(
                      :value="form.sharesIssued[i]"
                      type="number"
                      step="any"
                      size="is-small"
                      @input="v => setSeries('sharesIssued', i, v)"
                    )
          p.coc-note {{ $t('report.costOfCapital.helper.blankNote') }}

          //- Guard-rails. The workbook offered betas of −11.12 and 7.61 with no hint
          //- either was absurd; the engine returns CODES and the wording lives here.
          ul.coc-warnings(v-if="data.beta.warnings.length")
            li(v-for="w in data.beta.warnings" :key="w") {{ $t('report.costOfCapital.warn.' + w) }}

          .coc-beta
            .coc-beta-box
              .coc-beta-k {{ $t('report.costOfCapital.helper.betaFromGrowth') }}
              .coc-beta-v {{ num(data.betaSuggestions.roi, 2) }}
              .coc-beta-s {{ $t('report.costOfCapital.helper.betaFromGrowthSub') }}
              button.coc-adopt(type="button" @click="adoptBeta('roi')") {{ $t('report.costOfCapital.helper.useThisBeta') }}
            .coc-beta-box
              .coc-beta-k {{ $t('report.costOfCapital.helper.betaFromVolatility') }}
              .coc-beta-v {{ num(data.betaSuggestions.volatility, 2) }}
              .coc-beta-s {{ $t('report.costOfCapital.helper.betaFromVolatilitySub') }}
              button.coc-adopt(type="button" @click="adoptBeta('volatility')") {{ $t('report.costOfCapital.helper.useThisBeta') }}
            .coc-beta-box.is-inuse
              .coc-beta-k {{ $t('report.costOfCapital.helper.betaInUse') }}
              .coc-beta-v {{ num(data.betaSuggestions.inUse, 2) }}
              .coc-beta-s {{ $t('report.costOfCapital.helper.betaInUseSub') }}

      .coc-card(v-if="!data && error")
        h2 {{ $t('report.calcFailedTitle') }}
        p.coc-note {{ $t('report.calcUnreachable') }}
        b-button(type="is-primary" @click="recompute") {{ $t('report.retry') }}
      .coc-card(v-else-if="!data")
        p.coc-note {{ $t('report.loading') }}
</template>

<script>
import ReportHeader from '~/components/base/ReportHeader'
import HeroStrip from '~/components/base/HeroStrip'
import HeroFigure from '~/components/base/HeroFigure'
import StaleBanner from '~/components/base/StaleBanner'
import SampleNotice from '~/components/base/SampleNotice.vue'
import currencyMixin from '~/mixins/currencyMixin'
import reportRecompute from '~/mixins/reportRecompute'

/**
 * CostOfCapital — the Cost of Capital (WACC) model screen (Valuation · Decision class).
 *
 * One live-recomputing screen in the house two-column grid: the advisor types the market
 * rates, company figures and funding mix in the LEFT column, and the RIGHT column shows
 * the blended cost of the money funding the business, built up line by line, plus the
 * Beta helper.
 *
 * Decision class — NO "Illustrative" badge (real client numbers). Seeded with the
 * workbook sample and flagged by SampleNotice until the advisor types their own.
 *
 * All calculation is backend-only (POST /api/report/cost-of-capital); every figure
 * rendered comes back from the model. Rates are held in display form (3.9, not 0.039)
 * and converted to decimals in the payload.
 *
 * ── Two behaviours worth knowing about ──
 *
 * 1. THERE IS NO INFLATION OR GROWTH FIELD, deliberately. The source workbook applied
 *    both on top of the CAPM cost of equity; the owner ruled them out on 2026-07-29 as
 *    indefensible (inflation is already inside the nominal bond and index rates, and a
 *    company's own growth is not a component of its discount rate — see correction (4)
 *    in server/report/costOfCapitalModel.js). The fields went with them: an input that no
 *    longer moves the answer is worse than no input, because an advisor would type into
 *    it, watch nothing happen, and reasonably conclude the screen was broken.
 *
 * 2. BETA IS NOT ADOPTED AUTOMATICALLY. The helper offers two candidate betas; the
 *    calculation uses the one typed on the left. That is the workbook's own design
 *    (`WACC Calcs!E8` is hand-entered, "be guided by your Beta calcs") and it earned its
 *    keep — the human's 0.52 sits between the helper's 0.47 and 0.36. The helper is now
 *    purely advisory in both directions: nothing it derives reaches the WACC by itself.
 *
 * A blank period in the helper's series is `null`, deliberately distinct from a typed 0:
 * a period with no figures is absent, not a company briefly worth nothing. Conflating the
 * two is the source defect that made the spreadsheet publish 1.62% instead of 6.16%
 * (see server/report/costOfCapitalModel.js).
 */
/**
 * Hurdle verdict code → the tone it wears. A lookup rather than a chain of conditionals
 * so an unrecognised code has no tone at all, instead of falling through to the last
 * branch and colouring an unknown verdict green.
 */
const VERDICT_TONE = {
  CLEARS: 'good',
  MEETS: 'level',
  SHORT: 'crit'
}

export default {
  name: 'CostOfCapital',

  components: { ReportHeader, HeroStrip, HeroFigure, StaleBanner, SampleNotice },

  mixins: [currencyMixin, reportRecompute],

  data () {
    return {
      // The workbook's own sample, rates in display form. Cell refs are documented in
      // server/report/costOfCapitalModel.js DEFAULT_INPUTS.
      form: {
        riskFreeRatePct: 3.9, //   E6
        marketRatePct: 8.99, //    E7 (and Beta Calcs F10 — the same figure)
        beta: 0.52, //             E8
        taxRatePct: 28, //         E12
        equity: 50000, //          E14
        debt: 30000, //            E15
        borrowRatePct: 6, //       E17
        // E9 (inflation) and E10 (growth) are absent by ruling — see note 1 in the
        // component doc above and correction (4) in the model.
        // Beta Calcs M10:X10 — twelve months of the market index.
        indexValues: [4393, 4463, 4730, 4703, 4653, 4731, 4883, 4891, 4846, 4691, 4546, 4394],
        // Beta Calcs M40:X40 — ELEVEN filled and a deliberate trailing blank, the
        // sample's own shape and the shape that broke the workbook.
        equityValues: [
          2569800, 2580507.5, 2591259.615, 2602056.53, 2612898.432, 2623785.509,
          2634717.948, 2645695.94, 2656719.673, 2667789.338, 2678905.127, null
        ],
        // Beta Calcs M41:X41 — constant across the window.
        sharesIssued: [7650, 7650, 7650, 7650, 7650, 7650, 7650, 7650, 7650, 7650, 7650, 7650],
        // The hurdle test. NOT from the workbook and deliberately NOT seeded: an invented
        // investment would be read as the client's own. Both null = no test to run.
        investmentCost: null,
        annualReturn: null
      },
      data: null,
      // Which suggestion the beta in the field came from, or null for the advisor's own.
      // Held with the value it was adopted at, so a later edit can be told apart from it.
      betaSource: null,
      adoptedBetaValue: null
      // `error` (stale flag) is provided by the reportRecompute mixin.
    }
  },

  computed: {
    /**
     * Row indices for the helper's series table. Built with a plain loop rather than
     * `map((_, i) => i)` so no unused binding is introduced.
     * @returns {number[]}
     */
    periods () {
      const out = []
      for (let i = 0; i < this.form.indexValues.length; i++) { out.push(i) }
      return out
    },

    /**
     * The provenance note under the Beta field, or '' when the figure is the advisor's
     * own. Reads `betaSource` rather than comparing against the current suggestions:
     * editing the share figures moves those, and the note must keep describing where
     * the number in the field CAME from, not what happens to match it now.
     * @returns {string}
     */
    betaSourceLabel () {
      if (!this.betaSource) { return '' }
      const key = this.betaSource === 'roi' ? 'betaSourceRoi' : 'betaSourceVolatility'
      return this.$t('report.costOfCapital.market.' + key)
    },

    /**
     * The hurdle verdict as a sentence. The engine returns a CODE (`CLEARS`/`MEETS`/
     * `SHORT`) and the English lives in the locale file — an unknown code must therefore
     * render nothing rather than a raw `SHORT` at an advisor mid-client-meeting.
     * @returns {string}
     */
    verdictText () {
      const h = this.data && this.data.hurdle
      if (!h || !VERDICT_TONE[h.verdict]) { return '' }
      return this.$t('report.costOfCapital.hurdle.' + h.verdict, {
        margin: this.num(Math.abs(h.marginRate) * 100, 2)
      })
    },

    /**
     * Which of the three tones the verdict wears. Falls back to the neutral one so an
     * unrecognised code can never colour a decision green.
     * @returns {string} 'good' | 'crit' | 'level'
     */
    verdictTone () {
      const h = this.data && this.data.hurdle
      return (h && VERDICT_TONE[h.verdict]) || 'level'
    },

    /** What the investment must earn each year just to break even, as money. */
    requiredAnnualReturnText () {
      const h = this.data && this.data.hurdle
      if (!h) { return '' }
      return this.$t('report.costOfCapital.hurdle.perYear', {
        amount: this.money(h.requiredAnnualReturn)
      })
    },

    /**
     * "Ahead by" or "Short by" — empty when the investment lands exactly on the hurdle,
     * which hides the row rather than showing a margin of nothing.
     * @returns {string}
     */
    marginLabel () {
      const h = this.data && this.data.hurdle
      if (!h || h.verdict === 'MEETS') { return '' }
      const key = h.verdict === 'CLEARS' ? 'aheadBy' : 'shortBy'
      return this.$t('report.costOfCapital.hurdle.' + key)
    },

    /**
     * The margin in money, always positive — its direction is carried by `marginLabel`,
     * so a minus sign here would read as "short by minus $6,600".
     * @returns {string}
     */
    marginAmountText () {
      const h = this.data && this.data.hurdle
      if (!h) { return '' }
      return this.$t('report.costOfCapital.hurdle.perYear', {
        amount: this.money(Math.abs(h.marginAmount))
      })
    }
  },

  watch: {
    form: {
      deep: true,
      handler () { this.queueRecompute() }
    },

    /**
     * Typing over an adopted beta makes it the advisor's own figure again, so the
     * provenance note must go. Compared against the value it was adopted AT — clearing
     * on any change at all would drop the note when an unrelated field re-rendered.
     * @param {number} v - the beta now in the field
     */
    'form.beta' (v) {
      if (this.betaSource && v !== this.adoptedBetaValue) {
        this.betaSource = null
        this.adoptedBetaValue = null
      }
    }
  },

  mounted () {
    this.recompute()
  },

  methods: {
    /**
     * Format a decimal fraction as a percentage, e.g. 0.061627 → "6.16%".
     * Not currency, so it does not belong in currencyMixin; `num` there still owns the
     * grouping and the reader's language.
     * @param {number} v - the fraction
     * @param {number} [dp=2] - decimal places
     * @returns {string}
     */
    pct (v, dp) {
      const places = (dp === undefined || dp === null) ? 2 : dp
      const n = Number(v)
      return this.num((Number.isFinite(n) ? n : 0) * 100, places) + '%'
    },

    /**
     * Write one cell of a helper series. Uses `$set` because a direct index assignment
     * is not reactive in Vue 2 — the deep watcher would never fire and the screen would
     * silently stop recomputing.
     *
     * An empty cell becomes `null`, NOT 0: the backend treats a blank period as absent
     * and excludes it, which is the whole of the source correction.
     *
     * @param {string} key - 'indexValues' | 'equityValues' | 'sharesIssued'
     * @param {number} i - period index
     * @param {string|number} raw - the input's value
     * @returns {void}
     */
    setSeries (key, i, raw) {
      const n = Number(raw)
      const value = (raw === '' || raw === null || raw === undefined || !Number.isFinite(n)) ? null : n
      this.$set(this.form[key], i, value)
    },

    /**
     * Adopt one of the helper's suggested betas into the calculation.
     *
     * The workbook hand-enters beta and only NOTES the helper's figures, so adoption is
     * always a deliberate act — never automatic. The full-precision value is taken, not
     * the two-decimal figure on the box, so the answer matches the suggestion exactly
     * rather than the rounding of it.
     *
     * @param {string} which - 'roi' | 'volatility'
     * @returns {void}
     */
    adoptBeta (which) {
      if (!this.data || !this.data.betaSuggestions) { return }
      const value = this.data.betaSuggestions[which]
      if (!Number.isFinite(value)) { return }
      this.form.beta = value
      this.adoptedBetaValue = value
      // Set AFTER the value, so the form.beta watcher sees no source yet and cannot
      // clear the provenance it is in the middle of establishing.
      this.betaSource = which
    },

    /**
     * A change in the WACC as signed percentage points, e.g. 0.003608 → "+0.36".
     * Percentage POINTS, not a percentage: the figures being compared are themselves
     * percentages, and "+0.36%" would read as a relative change.
     * @param {number} v - the change as a decimal fraction
     * @returns {string}
     */
    signedPoints (v) {
      const n = Number(v)
      const safe = Number.isFinite(n) ? n : 0
      return (safe >= 0 ? '+' : '−') + this.num(Math.abs(safe) * 100, 2)
    },

    /**
     * Take a money figure for the hurdle test. Clearing a field stores `null`, not 0 —
     * an investment nobody has priced yet is absent, whereas one expected to earn 0 is a
     * real (and failing) investment. The backend draws the same distinction.
     *
     * @param {string} key - 'investmentCost' | 'annualReturn'
     * @param {string|number} raw - the input's value
     * @returns {void}
     */
    onMoneyInput (key, raw) {
      const n = Number(raw)
      const blank = (raw === '' || raw === null || raw === undefined || !Number.isFinite(n))
      this.form[key] = blank ? null : n
    },

    /**
     * The backend request — consumed by the reportRecompute mixin (debounce, race guard,
     * stale flag). Display percentages are converted to decimals here.
     * @returns {{ url: string, body: object }}
     */
    recomputeRequest () {
      const f = this.form
      const marketRate = (Number(f.marketRatePct) || 0) / 100
      const body = {
        riskFreeRate: (Number(f.riskFreeRatePct) || 0) / 100,
        marketRate,
        beta: Number(f.beta) || 0,
        taxRate: (Number(f.taxRatePct) || 0) / 100,
        equity: Number(f.equity) || 0,
        debt: Number(f.debt) || 0,
        borrowRate: (Number(f.borrowRatePct) || 0) / 100,
        indexValues: f.indexValues,
        equityValues: f.equityValues,
        sharesIssued: f.sharesIssued,
        // `Beta Calcs!F10` and `WACC Calcs!E7` hold the same figure in the workbook, so
        // one field drives both. Sending it explicitly also keeps it out of the
        // backend's `defaultedInputs` (R8), where it would read as a silent fallback.
        marketReturnRate: marketRate
      }
      // Sent only when actually entered. An empty field must not arrive as 0, which the
      // backend would read as a priced investment expected to earn nothing.
      if (Number.isFinite(f.investmentCost)) { body.investmentCost = f.investmentCost }
      if (Number.isFinite(f.annualReturn)) { body.annualReturn = f.annualReturn }
      return { url: '/api/report/cost-of-capital', body }
    },

    /** Apply a successful recompute — consumed by the reportRecompute mixin. */
    applyResult (data) {
      this.data = data
    }
  }
}
</script>

<style scoped>
.coc-root { display: flex; flex-direction: column; gap: 16px; }
/* Reset the shared ReportHeader's `margin: 0 auto 22px`: inside a flex column that auto
   margin shrinks the header below full width and its 22px stacks on the flex gap. Zeroing
   it here (not touching the shared component) leaves the single 16px flex gap as the only
   spacing between the header and the band. Guarded by reportHeaderFullWidth.test.js. */
.coc-root ::v-deep .rs-top { margin: 0; }
/* House two-column grid: inputs left, results right — identical to every other model. */
.coc-layout { display: grid; grid-template-columns: var(--rs-col-input) 1fr; gap: var(--rs-col-gap); align-items: start; }
@media (max-width: 860px) { .coc-layout { grid-template-columns: 1fr; } }
.coc-inputs { display: flex; flex-direction: column; gap: 16px; }
.coc-results { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
/* Card, palette, radius and title read the shared visual-standard tokens (ReportShell) —
   no colour, frame or font is declared here. The field-label ink (#223a57) has no
   standard token and stays literal, as on the other screens. */
.coc-card {
  background: var(--rs-card-bg); border: 1px solid var(--rs-card-border);
  border-top: 3px solid var(--rs-card-top);
  border-radius: var(--rs-card-radius); padding: var(--rs-card-pad);
}
.coc-card h2 {
  font-size: var(--rs-card-title-size); letter-spacing: .1em; text-transform: uppercase;
  color: var(--rs-card-title-color); font-weight: 600; margin-bottom: 12px;
}
.coc-field {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; padding: 3px 0;
}
.coc-field label { font-size: 12.5px; font-weight: 600; color: #223a57; }
.coc-labels { flex: 1 1 auto; }
.coc-help { font-size: 11px; color: var(--rs-muted); margin: 1px 0 0; font-weight: 300; }
.coc-field .control { width: 130px; flex: 0 0 auto; }
/* The hurdle verdict — the one tone-carrying element on this screen. Colour is only ever
   a second signal: the sentence says "clears" or "falls short" in words, so the verdict
   still reads correctly in greyscale, on a projector, or to a colour-blind advisor. */
.coc-verdict {
  margin: 0 0 12px; padding: 10px 12px; border-radius: 10px;
  font-size: 13.5px; font-weight: 600; border: 1px solid transparent;
}
.coc-verdict.is-good { background: var(--rs-good-soft); border-color: #4ca52d44; color: #2f6d1c; }
.coc-verdict.is-crit { background: var(--rs-crit-soft); border-color: #ff000033; color: #b32020; }
.coc-verdict.is-level { background: var(--rs-panel-2); border-color: var(--rs-line); color: var(--rs-ink); }
/* Provenance under the Beta field — quieter than the help text above it, because it
   describes where a figure came from rather than asking for one. */
.coc-provenance { font-size: 11px; color: var(--rs-accent); margin: 2px 0 0; font-weight: 600; }
/* The adopt button: the same understated link treatment as "use the calculated figure",
   so adopting a beta reads as the same kind of act as handing the growth rate back. */
.coc-adopt {
  display: inline-block; margin-top: 7px; padding: 0;
  background: none; border: 0; cursor: pointer;
  font: inherit; font-size: 11px; font-weight: 700;
  color: var(--rs-accent); text-decoration: underline;
}
.coc-adopt:hover { color: var(--rs-accent-bright); }
.coc-mini thead th {
  font-size: 10.5px; letter-spacing: .07em; text-transform: uppercase;
  color: var(--rs-muted); font-weight: 700; text-align: right;
  padding: 0 10px 7px; border-bottom: 1px solid var(--rs-line);
}
.coc-mini thead th:first-child { text-align: left; }
/* A rise and a fall are told apart by the sign first — colour is only ever the second
   signal, as on the hurdle verdict. */
/* Three columns, two of them numbers: `.coc-mini` right-aligns only its last cell, which
   would leave the WACC column ragged against the change beside it. */
.coc-mini.is-sens td:nth-child(2), .coc-mini.is-sens td:nth-child(3) { text-align: right; font-weight: 600; }
.coc-delta { white-space: nowrap; }
.coc-delta.is-up { color: #b32020; }
.coc-delta.is-down { color: #2f6d1c; }
.coc-mini { width: 100%; border-collapse: collapse; font-size: 13px; font-variant-numeric: tabular-nums; }
.coc-mini td { padding: 6px 10px; border-bottom: 1px solid var(--rs-bg); }
.coc-mini td:last-child { text-align: right; font-weight: 600; white-space: nowrap; }
.coc-mini td.indent { padding-left: 24px; color: var(--rs-muted); font-weight: 300; }
.coc-mini tr.is-total td { border-bottom: 0; border-top: 2px solid var(--rs-line); font-weight: 700; color: var(--rs-ink); }
.coc-mini tr.is-gap td { padding-top: 14px; }
.coc-note { font-size: 11.5px; color: var(--rs-muted); margin: 8px 0 0; font-weight: 300; }
.coc-note.is-lede { margin: 0 0 12px; }
/* Wide content scrolls inside its own container so the page never scrolls sideways. */
.coc-series-scroll { overflow-x: auto; }
.coc-series { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.coc-series th {
  font-size: 10.5px; letter-spacing: .07em; text-transform: uppercase;
  color: var(--rs-muted); font-weight: 700; text-align: right;
  padding: 0 6px 7px; border-bottom: 1px solid var(--rs-line); white-space: nowrap;
}
.coc-series th:first-child { text-align: left; }
.coc-series td { padding: 3px 6px; border-bottom: 1px solid var(--rs-bg); }
.coc-series td.coc-series-n {
  color: var(--rs-muted); font-weight: 600; font-size: 11.5px;
  font-variant-numeric: tabular-nums; white-space: nowrap;
}
.coc-series ::v-deep input { text-align: right; font-variant-numeric: tabular-nums; }
.coc-warnings {
  margin: 12px 0 0; padding: 10px 12px 10px 26px;
  background: var(--rs-warn-soft); border: 1px solid #ff990059; border-radius: 9px;
  font-size: 11.5px; color: #b36b00; list-style: disc;
}
.coc-warnings li + li { margin-top: 4px; }
.coc-beta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 14px; }
@media (max-width: 620px) { .coc-beta { grid-template-columns: 1fr; } }
.coc-beta-box {
  border: 1px solid var(--rs-line); border-radius: 10px;
  padding: 10px 12px; background: var(--rs-panel-2);
}
/* The beta actually used is marked out from the two that are merely offered. */
.coc-beta-box.is-inuse { background: var(--rs-accent-soft); border-color: #0070c044; }
.coc-beta-k { font-size: 10px; letter-spacing: .07em; text-transform: uppercase; color: var(--rs-muted); font-weight: 700; }
.coc-beta-v { font-size: 20px; font-weight: 700; margin-top: 4px; color: var(--rs-ink); font-variant-numeric: tabular-nums; }
.coc-beta-s { font-size: 10.5px; color: var(--rs-muted); margin-top: 3px; }
.coc-root .herostrip { margin-bottom: 0; }
@media print {
  /* On paper the inputs are dropped and the results run full width. */
  .coc-inputs { display: none !important; }
  .coc-layout { display: block; }
  .coc-card { break-inside: avoid; }
}
</style>
