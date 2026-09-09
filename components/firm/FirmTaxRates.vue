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
        }
      ]
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
        basis: Object.assign({ basis: 'invoice', label: '' }, source())
      }
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
      return Boolean(String(f.label || '').trim())
    },

    /**
     * Build the payload — only the figures that name a document, because a figure that cannot
     * be sourced cannot be approved.
     *
     * @returns {object|null} the figures to send, or null when something was refused
     */
    buildFigures () {
      const orphan = ['companyTax', 'gst', 'filing', 'basis'].find(k => this.hasOrphanValue(k))
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
</style>
