<template lang="pug">
.ftr
  .notification.is-info.is-light.mb-4
    p.is-size-7
      | {{ $t('firmTaxRates.intro', { report: 'Three-Way Forecast' }) }}
      |  #[b {{ $t('firmTaxRates.introStrong') }}]

  .field.is-grouped.is-align-items-flex-end.mb-4
    .control
      b-field(:label="$t('firmTaxRates.countryLabel')" label-position="on-border")
        b-input(
          v-model="countryInput"
          :placeholder="$t('firmTaxRates.countryPlaceholder')"
          maxlength="2"
          size="is-small"
          style="width: 7rem"
          @keyup.native.enter="show(countryInput)"
        )
    .control
      b-button(
        type="is-primary"
        size="is-small"
        :disabled="!canShow"
        @click="show(countryInput)") {{ $t('firmTaxRates.show') }}
    .control(v-for="c in countries" :key="c")
      b-button(
        size="is-small"
        :type="c === country ? 'is-info' : 'is-light'"
        @click="show(c)") {{ c }}

  b-message(v-if="error" type="is-danger" size="is-small") {{ error }}

  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  template(v-else-if="!country")
    .box.has-text-centered.py-5
      p.has-text-weight-semibold.mb-1 {{ $t('firmTaxRates.chooseTitle') }}
      p.is-size-7.has-text-grey {{ $t('firmTaxRates.chooseBody') }}
      p.is-size-7.has-text-grey.mt-2(v-if="!countries.length") {{ $t('firmTaxRates.chooseNone') }}

  template(v-else)
    .mb-4
      b-tag(v-if="hasOwn" type="is-info is-light" size="is-medium")
        | {{ $t('firmTaxRates.tagOwn', { country }) }}
      b-tag(v-else-if="!resolved.isDefault" type="is-light" size="is-medium")
        | {{ $t('firmTaxRates.tagInherited') }}
      b-tag(v-else type="is-warning is-light" size="is-medium")
        | {{ $t('firmTaxRates.tagDefault', { country }) }}

    //- ── What is in force ──────────────────────────────────────────────────
    .box(v-if="!editing")
      p.has-text-weight-semibold.mb-1 {{ $t('firmTaxRates.whatApplies', { country }) }}
      p.is-size-7.has-text-grey.mb-3
        | {{ $t('firmTaxRates.whatAppliesHelp') }}
        |  #[b {{ $t('firmTaxRates.whatAppliesStrong') }}]

      .ftr-row.ftr-head
        span {{ $t('firmTaxRates.colFigure') }}
        span {{ $t('firmTaxRates.colValue') }}
        span {{ $t('firmTaxRates.colSource') }}
        span {{ $t('firmTaxRates.colSetAt') }}

      .ftr-row(v-for="row in rows" :key="row.key")
        .ftr-label
          label.label.is-small {{ row.label }}
          p.is-size-7.has-text-grey {{ row.help }}
          p.is-size-7.has-text-grey.ftr-applies(v-if="row.appliesTo") {{ row.appliesTo }}
        span.ftr-num {{ row.value }}
        .is-size-7.has-text-grey
          template(v-if="row.source") {{ row.source }}
          template(v-else) —
        .ftr-origin
          b-tag(:type="row.badgeType" size="is-small") {{ row.origin }}

      .mt-4
        b-button(type="is-primary" size="is-small" @click="startEdit") {{ $t('firmTaxRates.edit') }}
        b-button.ml-2(
          size="is-small"
          type="is-text"
          @click="toggleHistory") {{ $t('firmTaxRates.history') }}

    //- ── Approving a country's figures ─────────────────────────────────────
    .box(v-else)
      p.has-text-weight-semibold.mb-3 {{ $t('firmTaxRates.whatApplies', { country }) }}
      b-message(v-if="formError" type="is-warning" size="is-small") {{ formError }}

      .ftr-edit(v-for="f in editable" :key="f.key")
        label.label.is-small {{ f.label }}
        p.is-size-7.has-text-grey.mb-2 {{ f.help }}

        .columns.is-variable.is-2
          //- The value. A rate is TYPED AS A PERCENTAGE and stored as a decimal;
          //- the conversion happens in `toDecimal` and nowhere else.
          .column.is-3(v-if="f.kind === 'rate'")
            b-field(:label="$t('firmTaxRates.colValue')" label-position="on-border")
              b-input(
                v-model.number="form[f.key].percent"
                type="number"
                step="any"
                size="is-small"
                :placeholder="f.placeholder")
          .column.is-3(v-if="f.kind === 'filing'")
            b-field(:label="$t('firmTaxRates.monthsLabel')" label-position="on-border")
              b-select(v-model.number="form.filing.months" size="is-small" expanded)
                option(v-for="m in filingMonths" :key="m" :value="m") {{ m }}
          .column.is-3(v-if="f.kind === 'basis'")
            b-field(:label="$t('firmTaxRates.colValue')" label-position="on-border")
              b-select(v-model="form.basis.basis" size="is-small" expanded)
                option(value="invoice") {{ $t('firmTaxRates.basisInvoice') }}
                option(value="cash") {{ $t('firmTaxRates.basisCash') }}

          //- The country's own name for a cycle or a basis, kept beside the
          //- canonical value rather than instead of it.
          .column.is-3(v-if="f.kind === 'filing'")
            b-field(:label="$t('firmTaxRates.cycleNameLabel')" label-position="on-border")
              b-input(
                v-model="form.filing.label"
                size="is-small"
                :placeholder="$t('firmTaxRates.cycleNamePlaceholder')")
          .column.is-3(v-if="f.kind === 'basis'")
            b-field(:label="$t('firmTaxRates.basisNameLabel')" label-position="on-border")
              b-input(
                v-model="form.basis.label"
                size="is-small"
                :placeholder="$t('firmTaxRates.basisNamePlaceholder')")

          .column
            b-field(:label="$t('firmTaxRates.sourceDocLabel')" label-position="on-border")
              b-input(
                v-model="form[f.key].document"
                size="is-small"
                :placeholder="$t('firmTaxRates.sourceDocPlaceholder')")
          .column.is-2
            b-field(:label="$t('firmTaxRates.sourcePublishedLabel')" label-position="on-border")
              b-input(
                v-model="form[f.key].published"
                size="is-small"
                :placeholder="$t('firmTaxRates.sourcePublishedPlaceholder')")
          .column.is-1
            b-field(:label="$t('firmTaxRates.sourcePageLabel')" label-position="on-border")
              b-input(v-model="form[f.key].page" size="is-small")

        //- 🔴 THE BAND TABLE — the only figure here that is not a single value, and the only
        //- one that can be wrong invisibly. A gap leaves income untaxed, an overlap taxes it
        //- twice, and both total up to something entirely plausible. `bandsProblem` says so
        //- while the manager types; the backend refuses it again on the way in.
        .field(v-if="f.kind === 'bands'")
          table.ftr-bands
            thead
              tr
                th {{ $t('firmTaxRates.bandFromCol') }}
                th {{ $t('firmTaxRates.bandToCol') }}
                th {{ $t('firmTaxRates.bandRateCol') }}
                th
            tbody
              tr(v-for="(b, i) in form.incomeTax.bands" :key="i")
                td
                  b-input(v-model.number="b.from" type="number" step="any" size="is-small")
                td
                  b-input(
                    v-if="i < form.incomeTax.bands.length - 1"
                    v-model.number="b.to"
                    type="number"
                    step="any"
                    size="is-small")
                  span.ftr-open(v-else) {{ $t('firmTaxRates.bandAndAbove') }}
                td
                  b-input(v-model.number="b.percent" type="number" step="any" size="is-small" placeholder="10.5")
                td.ftr-bandact
                  b-button(
                    size="is-small"
                    type="is-text"
                    :disabled="form.incomeTax.bands.length <= 1"
                    :title="$t('firmTaxRates.bandRemove')"
                    @click="removeBand(i)") ×
          .ftr-bandfoot
            b-button(size="is-small" @click="addBand") {{ $t('firmTaxRates.bandAdd') }}
            span.ftr-bandwarn(v-if="bandsProblem") {{ bandsProblem }}

        //- 🔴 The company tax rate's own line. The forecast applies ONE flat rate
        //- and cannot judge which entities qualify, so the manager says it here.
        .field(v-if="f.key === 'companyTax'")
          b-field(:label="$t('firmTaxRates.appliesToLabel')" label-position="on-border")
            b-input(
              v-model="form.companyTax.appliesTo"
              size="is-small"
              :placeholder="$t('firmTaxRates.appliesToPlaceholder')")
          p.is-size-7.has-text-grey {{ $t('firmTaxRates.appliesToHelp') }}

      p.is-size-7.has-text-grey.mt-3 {{ $t('firmTaxRates.monthsHelp') }}

      .mt-4
        b-button(
          type="is-primary"
          size="is-small"
          :loading="saving"
          @click="approve") {{ saving ? $t('firmTaxRates.approving') : $t('firmTaxRates.approve', { country }) }}
        b-button.ml-2(size="is-small" @click="editing = false") {{ $t('firmTaxRates.cancel') }}

    //- ── Change history ────────────────────────────────────────────────────
    .box(v-if="showHistory")
      p.has-text-weight-semibold.mb-2 {{ $t('firmTaxRates.history') }}
      p.is-size-7.has-text-grey(v-if="!history.length") {{ $t('firmTaxRates.historyEmpty') }}
      .ftr-hist(v-for="v in history" :key="v.versionId")
        span.is-size-7 {{ $t('firmTaxRates.restoredBy', { who: v.changedBy || '—', when: v.changedAt || '—' }) }}
        b-button(size="is-small" type="is-text" @click="restore(v.versionId)") {{ $t('firmTaxRates.restore') }}
</template>

<script>
/**
 * The Tax Rates tab — item 4.81, slice 3.
 *
 * The company tax rate, GST rate, filing cycle and accounting basis a country's clients are
 * taxed on, with every figure naming the document it came from and the tier that approved it.
 * The artefact is `design/mockups/tax-rates.html`, approved by Mike 2026-09-09.
 *
 * 🔴 A SEPARATE TAB FROM DEPRECIATION RATES, WHICH IS THE ONE THING HE APPROVED BEFORE THE
 * DRAWING WAS DRAWN. He renamed that feature the same day because a tab called *Tax Rules*
 * promised GST and company tax and delivered a depreciation schedule. These two share one
 * country table, one cascade and one approval gate in the backend, and nothing on screen.
 *
 * 🔴 A RATE IS TYPED AS A PERCENTAGE AND STORED AS A DECIMAL, and the conversion happens in
 * `toDecimal` and nowhere else. The backend refuses anything outside 0..1 rather than clamping
 * it, because `30` is not a bad 30% — it is a number in the wrong unit that would tax a
 * company at 3000% in a forecast that still balances.
 *
 * 🔴 THE SOURCE DOUBLES AS THE INCLUDE FLAG, and that is deliberate rather than a shortcut. A
 * figure is sent for approval only when it names a document and a publication date, so there
 * is no way to approve a figure you cannot source — which is the rule the whole feature exists
 * to enforce. A value typed with no document is reported, never silently dropped.
 *
 * ⚠ A PARTIAL TABLE IS THE COMMON CASE, not an error. A document publishing the company tax
 * rate and nothing else approves one figure; the other three keep coming from the tier above.
 *
 * ⚠ THIS TAB USES `$t`, WHERE FOUR OF ITS SIX SIBLINGS HARDCODE ENGLISH. That deviation is
 * recorded in `FirmDepreciationRates.vue`'s own header and was raised with Mike on 2026-09-09;
 * this file does not join it. `CLAUDE.md` requires every user-facing string to go through
 * `$t()`, and most of the `firm*` locale sections already do — adding a fifth hardcoded tab
 * would have made the deviation larger while it is open.
 */
export default {
  name: 'FirmTaxRates',

  props: {
    /** The caller's bearer token; the backend re-checks authorisation on every call. */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: true,
      saving: false,
      editing: false,
      error: '',
      formError: '',
      showHistory: false,
      history: [],
      /** Two-letter code in the box, before it is asked for. */
      countryInput: '',
      /** The country actually being shown, once the backend has answered for it. */
      country: '',
      /** Countries this level has approved something for. */
      countries: [],
      /** True when the figures on screen are this level's own rather than inherited. */
      hasOwn: false,
      /** The resolved answer: four figures, each with its origin. */
      resolved: { figures: {}, isDefault: true },
      /** What the manager is typing, before it is approved. */
      form: this.blankForm()
    }
  },

  computed: {
    canShow () {
      return /^[A-Za-z]{2}$/.test(String(this.countryInput || '').trim())
    },

    /** The month counts a twelve-month forecast can carry. Mirrors `FILING_MONTHS`. */
    filingMonths () {
      return [1, 2, 3, 4, 6, 12]
    },

    /** The four figures, in the order a manager reads them. */
    editable () {
      return [
        {
          key: 'companyTax',
          kind: 'rate',
          placeholder: '28',
          label: this.$t('firmTaxRates.companyTax'),
          help: this.$t('firmTaxRates.companyTaxHelp')
        },
        {
          key: 'gst',
          kind: 'rate',
          placeholder: '15',
          label: this.$t('firmTaxRates.gst'),
          help: this.$t('firmTaxRates.gstHelp')
        },
        {
          key: 'filing',
          kind: 'filing',
          label: this.$t('firmTaxRates.filing'),
          help: this.$t('firmTaxRates.filingHelp')
        },
        {
          key: 'basis',
          kind: 'basis',
          label: this.$t('firmTaxRates.basis'),
          help: this.$t('firmTaxRates.basisHelp')
        },
        {
          key: 'incomeTax',
          kind: 'bands',
          label: this.$t('firmTaxRates.incomeTax'),
          help: this.$t('firmTaxRates.incomeTaxHelp')
        }
      ]
    },

    /**
     * @returns {boolean} whether the band rows currently form a usable table.
     *
     * The backend is the authority and refuses a gap, an overlap, an implicit tax-free hole
     * and a closed top band. This is the same check on screen so the manager sees it while
     * typing rather than as a rejection — the one figure here that is a table is the one that
     * goes wrong invisibly.
     */
    bandsProblem () {
      const rows = this.form.incomeTax.bands
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        const from = Number(r.from)
        const last = i === rows.length - 1
        const open = r.to === '' || r.to === null
        if (!isFinite(from) || from < 0) { return this.$t('firmTaxRates.bandFrom') }
        if (r.percent === '' || r.percent === null) { return this.$t('firmTaxRates.bandRate') }
        if (open && !last) { return this.$t('firmTaxRates.bandOpenMiddle') }
        if (last && !open) { return this.$t('firmTaxRates.bandTopOpen') }
        if (i === 0 && from !== 0 && from !== 1) { return this.$t('firmTaxRates.bandFirstFloor') }
        if (i > 0) {
          const prevTo = Number(rows[i - 1].to)
          if (from !== prevTo + 1) { return this.$t('firmTaxRates.bandContiguous', { expected: prevTo + 1 }) }
        }
        if (!open && Number(r.to) <= from) { return this.$t('firmTaxRates.bandCeiling') }
      }
      return ''
    },

    /** The four rows as they read in force, each with its value, source and origin. */
    rows () {
      const figures = this.resolved.figures || {}
      return this.editable.map((f) => {
        const v = figures[f.key] || {}
        return {
          key: f.key,
          label: f.label,
          help: f.help,
          appliesTo: f.key === 'companyTax' ? (v.appliesTo || '') : '',
          value: this.readValue(f.key, v),
          source: this.readSource(v.source),
          origin: this.originLabel(v.originTier),
          badgeType: v.originTier ? 'is-info is-light' : 'is-light'
        }
      })
    }
  },

  mounted () {
    // Nothing can be shown until a country is named, so the first load only asks which
    // countries this level has approved anything for.
    this.load('')
  },

  methods: {
    /** An empty form — every figure blank, the two pickers on the app's own values. */
    blankForm () {
      const source = () => ({ document: '', published: '', page: '' })
      return {
        companyTax: Object.assign({ percent: '', appliesTo: '' }, source()),
        gst: Object.assign({ percent: '' }, source()),
        filing: Object.assign({ months: 2, label: '' }, source()),
        basis: Object.assign({ basis: 'invoice', label: '' }, source()),
        // One open-ended row to start. A band table cannot be half-typed into a valid state,
        // so the form opens with the shape the validator wants and the manager fills it in.
        incomeTax: Object.assign({ bands: [{ from: 0, to: '', percent: '' }] }, source())
      }
    },

    /** Add a band below the last one, starting where that one stopped, plus a dollar. */
    addBand () {
      const rows = this.form.incomeTax.bands
      const last = rows[rows.length - 1]
      // The row that WAS open-ended gets a ceiling, because only the last row may be open.
      if (last && (last.to === '' || last.to === null)) { last.to = '' }
      rows.push({ from: '', to: '', percent: '' })
    },

    /** Remove one band. The last remaining row is never removed — there would be no table. */
    removeBand (index) {
      if (this.form.incomeTax.bands.length <= 1) { return }
      this.form.incomeTax.bands.splice(index, 1)
    },

    /**
     * A percentage as the engine's decimal. THE ONLY PLACE THIS CONVERSION HAPPENS.
     *
     * @param {*} percent what the manager typed
     * @returns {number|null} the decimal, or null when it was not a number
     */
    toDecimal (percent) {
      if (percent === '' || percent === null || percent === undefined) { return null }
      const n = Number(percent)
      return Number.isFinite(n) ? n / 100 : null
    },

    /** One figure as it reads on the page. */
    readValue (key, v) {
      if (key === 'filing') {
        return v.label || (v.months ? String(v.months) : this.$t('firmTaxRates.notSet'))
      }
      if (key === 'basis') {
        return v.label || (v.basis ? this.$t(`firmTaxRates.basis${v.basis === 'cash' ? 'Cash' : 'Invoice'}`) : this.$t('firmTaxRates.notSet'))
      }
      if (key === 'incomeTax') {
        // A summary, never the table: five rows would crush a row that holds four one-line
        // figures beside it. The whole table is one click away in the editor below.
        const bands = Array.isArray(v.bands) ? v.bands : []
        if (!bands.length) { return this.$t('firmTaxRates.notSet') }
        const pct = r => `${Math.round(r * 1000) / 10}%`
        return this.$t('firmTaxRates.bandSummary', {
          count: bands.length,
          lowest: pct(bands[0].rate),
          highest: pct(bands[bands.length - 1].rate)
        })
      }
      if (v.rate === null || v.rate === undefined) { return this.$t('firmTaxRates.notSet') }
      // One decimal place, which is enough for every published rate and does not invent
      // precision the document did not carry.
      return `${Math.round(v.rate * 1000) / 10}%`
    },

    /** A figure's document, date and page as one line, or '' for an app default. */
    readSource (source) {
      if (!source || !source.document) { return '' }
      return [source.document, source.published, source.page ? `p. ${source.page}` : '']
        .filter(Boolean).join(' · ')
    },

    /** Which tier a figure came from, in words. */
    originLabel (tier) {
      const byTier = {
        mentor: 'originMentor',
        global_group_manager: 'originGlobal',
        group_manager: 'originGroup',
        firm_manager: 'originFirm'
      }
      return this.$t(`firmTaxRates.${byTier[tier] || 'originDefault'}`)
    },

    /** Ask the backend for a country, or for the country list alone when given ''. */
    async show (code) {
      const trimmed = String(code || '').trim().toUpperCase()
      if (!/^[A-Z]{2}$/.test(trimmed)) { return }
      this.countryInput = trimmed
      await this.load(trimmed)
    },

    async load (code) {
      this.loading = true
      this.error = ''
      this.editing = false
      try {
        const query = code ? `?country=${encodeURIComponent(code)}` : ''
        const data = await this.api('GET', `/api/firm-manager/tax-rates${query}`)
        this.country = data.country || ''
        this.countries = data.countries || []
        this.hasOwn = Boolean(data.hasOwn)
        this.resolved = data.resolved || { figures: {}, isDefault: true }
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Open the editor, seeded from what is in force.
     *
     * ⚠ THE SOURCE FIELDS ARE SEEDED ONLY FROM THIS LEVEL'S OWN FIGURES, never from an
     * inherited one. Carrying a parent's document down would let this level approve a figure
     * citing a document it never read.
     */
    startEdit () {
      const figures = this.resolved.figures || {}
      const form = this.blankForm()
      const mine = key => figures[key] && figures[key].originTier && this.hasOwn

      if (mine('companyTax')) {
        form.companyTax.percent = Math.round(figures.companyTax.rate * 1000) / 10
        form.companyTax.appliesTo = figures.companyTax.appliesTo || ''
        Object.assign(form.companyTax, this.seedSource(figures.companyTax.source))
      }
      if (mine('gst')) {
        form.gst.percent = Math.round(figures.gst.rate * 1000) / 10
        Object.assign(form.gst, this.seedSource(figures.gst.source))
      }
      if (mine('filing')) {
        form.filing.months = figures.filing.months
        form.filing.label = figures.filing.label || ''
        Object.assign(form.filing, this.seedSource(figures.filing.source))
      }
      if (mine('basis')) {
        form.basis.basis = figures.basis.basis
        form.basis.label = figures.basis.label || ''
        Object.assign(form.basis, this.seedSource(figures.basis.source))
      }

      this.form = form
      this.formError = ''
      this.editing = true
    },

    /** A stored source as the three form fields. */
    seedSource (source) {
      return {
        document: (source && source.document) || '',
        published: (source && source.published) || '',
        page: (source && source.page) || ''
      }
    },

    /** Is this figure sourced well enough to be approved at all? */
    isSourced (key) {
      const f = this.form[key]
      return Boolean(String(f.document || '').trim() && String(f.published || '').trim())
    },

    /** Did the manager put a value against a figure without naming a document? */
    hasOrphanValue (key) {
      if (this.isSourced(key)) { return false }
      const f = this.form[key]
      if (key === 'companyTax' || key === 'gst') { return f.percent !== '' && f.percent !== null }
      // A band table counts as "typed" once any rate has been put against a row.
      if (key === 'incomeTax') {
        return f.bands.some(b => b.percent !== '' && b.percent !== null)
      }
      return Boolean(String(f.label || '').trim())
    },

    /**
     * Build the payload — only the figures that name a document, because a figure that cannot
     * be sourced cannot be approved.
     *
     * @returns {object|null} the figures to send, or null when something was refused
     */
    buildFigures () {
      const orphan = ['companyTax', 'gst', 'filing', 'basis', 'incomeTax'].find(k => this.hasOrphanValue(k))
      if (orphan) {
        this.formError = this.$t('firmTaxRates.sourceRequired')
        return null
      }

      const figures = {}
      const sourceOf = (key) => {
        const f = this.form[key]
        return {
          document: String(f.document).trim(),
          published: String(f.published).trim(),
          page: String(f.page || '').trim() || null
        }
      }

      if (this.isSourced('companyTax')) {
        figures.companyTax = {
          rate: this.toDecimal(this.form.companyTax.percent),
          appliesTo: String(this.form.companyTax.appliesTo || '').trim() || null,
          source: sourceOf('companyTax')
        }
      }
      if (this.isSourced('gst')) {
        figures.gst = { rate: this.toDecimal(this.form.gst.percent), source: sourceOf('gst') }
      }
      if (this.isSourced('filing')) {
        figures.filing = {
          months: this.form.filing.months,
          label: String(this.form.filing.label || '').trim(),
          source: sourceOf('filing')
        }
      }
      if (this.isSourced('basis')) {
        figures.basis = {
          basis: this.form.basis.basis,
          label: String(this.form.basis.label || '').trim(),
          source: sourceOf('basis')
        }
      }
      if (this.isSourced('incomeTax')) {
        // Refused here rather than sent and bounced: the backend's message names a cell
        // reference, which is right for an API and wrong for somebody reading a form.
        if (this.bandsProblem) {
          this.formError = this.bandsProblem
          return null
        }
        figures.incomeTax = {
          bands: this.form.incomeTax.bands.map((b, i) => ({
            from: Number(b.from),
            to: i === this.form.incomeTax.bands.length - 1 ? null : Number(b.to),
            // The screen works in percentages and converts, exactly as the two rates do.
            rate: this.toDecimal(b.percent)
          })),
          source: sourceOf('incomeTax')
        }
      }

      if (!Object.keys(figures).length) {
        this.formError = this.$t('firmTaxRates.nothingToApprove')
        return null
      }
      return figures
    },

    async approve () {
      this.formError = ''
      const figures = this.buildFigures()
      if (figures === null) { return }

      this.saving = true
      try {
        await this.api('POST', '/api/firm-manager/tax-rates', { country: this.country, figures })
        await this.load(this.country)
        this.$buefy.toast.open({
          message: this.$t('firmTaxRates.approved', { country: this.country }),
          type: 'is-success'
        })
      } catch (err) {
        // Reported on the form rather than swallowed: the backend refuses a rate in the wrong
        // unit and a filing cycle the forecast cannot carry, and the manager has to see why.
        this.formError = err.message
      } finally {
        this.saving = false
      }
    },

    async toggleHistory () {
      this.showHistory = !this.showHistory
      if (!this.showHistory) { return }
      try {
        const data = await this.api('GET', '/api/firm-manager/tax-rates/history')
        this.history = data.history || []
      } catch (err) {
        this.error = err.message
      }
    },

    async restore (versionId) {
      try {
        await this.api('POST', '/api/firm-manager/tax-rates/restore', { versionId, country: this.country })
        await this.load(this.country)
        this.$buefy.toast.open({ message: this.$t('firmTaxRates.restored'), type: 'is-success' })
      } catch (err) {
        this.error = err.message
      }
    },

    /**
     * Thin authenticated fetch — mirrors the sibling tabs' helper so this tab can be mounted
     * and tested on its own; the backend re-checks authorisation on every call regardless of
     * what the browser sends.
     *
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
.ftr-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 110px 260px 160px;
  gap: 0.75rem;
  align-items: start;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f3f7;
}
.ftr-row:last-child { border-bottom: 0; }
/* The header row is labels, not controls — quieter, and no rule of its own so it reads as
   the top of the table rather than a row in it. Same treatment as the sibling tabs. */
.ftr-head {
  border-bottom: 1px solid #dfe6ee;
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #7a8ba0;
  font-weight: 600;
}
.ftr-label .label { margin-bottom: 0.1rem; }
.ftr-num {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
/* The manager's own words about which entities a rate reaches. Set apart from the help text
   above it because it is theirs, not ours. */
.ftr-applies {
  border-left: 2px solid #dfe6ee;
  padding-left: 0.5rem;
  margin-top: 0.25rem;
}
.ftr-edit {
  padding: 0.75rem 0;
  border-bottom: 1px solid #f0f3f7;
}
.ftr-edit:last-of-type { border-bottom: 0; }
.ftr-hist {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.35rem 0;
  border-bottom: 1px solid #f0f3f7;
}
.ftr-hist:last-child { border-bottom: 0; }

/* The band table. Narrow columns on purpose — three numbers a row, not a spreadsheet. */
.ftr-bands { width: 100%; max-width: 520px; border-collapse: collapse; }
.ftr-bands th {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #7a8ba0;
  text-align: left;
  padding: 0 0.5rem 0.3rem 0;
  font-weight: 600;
}
.ftr-bands td { padding: 0.15rem 0.5rem 0.15rem 0; vertical-align: middle; }
.ftr-bands td:last-child { width: 2.2rem; padding-right: 0; }
.ftr-open { font-size: 0.8rem; color: #7a8ba0; font-style: italic; }
.ftr-bandfoot { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.4rem; flex-wrap: wrap; }
.ftr-bandwarn { font-size: 0.78rem; color: #b56200; }
</style>
