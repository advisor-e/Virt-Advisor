<template lang="pug">
.ptr
  .notification.is-info.is-light.mb-4
    p.is-size-7
      | {{ $t('firmPropertyTaxRules.intro.lead') }}
      b {{ $t('firmPropertyTaxRules.intro.product') }}
      | {{ $t('firmPropertyTaxRules.intro.rest') }}

  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  template(v-else)
    //- Where each value comes from, said once at the top rather than assumed.
    .mb-4
      b-tag(v-if="hasOwn" type="is-info is-light" size="is-medium") {{ $t('firmPropertyTaxRules.badges.someSetHere') }}
      b-tag(v-else type="is-light" size="is-medium") {{ $t('firmPropertyTaxRules.badges.allInherited') }}

    .box
      .ptr-row(v-for="f in fields" :key="f.key")
        .ptr-label
          label.label.is-small {{ f.label }}
          p.is-size-7.has-text-grey(v-if="f.help") {{ f.help }}
        .ptr-control
          b-select(v-if="f.type === 'choice'" v-model="form[f.key]" size="is-small" expanded)
            option(v-for="o in f.options" :key="o.value" :value="o.value") {{ o.label }}
          b-input(
            v-else
            v-model.number="form[f.key]"
            type="number"
            step="any"
            size="is-small")
        .ptr-source
          b-tag(v-if="isOwn(f.key)" type="is-info is-light" size="is-small") {{ $t('firmPropertyTaxRules.badges.setHere') }}
          b-tag(v-else type="is-light" size="is-small") {{ $t('firmPropertyTaxRules.badges.inherited') }}

      //- The phasing schedule is one setting, not five: a schedule half from one country
      //- and half from another is a schedule nobody has ever written.
      .ptr-row.ptr-row-phasing(v-if="form.interestDeductibility === 'Phasing'")
        .ptr-label
          label.label.is-small {{ $t('firmPropertyTaxRules.phasing.label') }}
          p.is-size-7.has-text-grey {{ $t('firmPropertyTaxRules.phasing.help') }}
        .ptr-control
          .ptr-phasing
            b-input(
              v-for="(v, i) in form.phasingPct"
              :key="'ph' + i"
              v-model.number="form.phasingPct[i]"
              type="number"
              step="any"
              size="is-small")
        .ptr-source
          b-tag(v-if="isOwn('phasingTable')" type="is-info is-light" size="is-small") {{ $t('firmPropertyTaxRules.badges.setHere') }}
          b-tag(v-else type="is-light" size="is-small") {{ $t('firmPropertyTaxRules.badges.inherited') }}

    b-message(v-if="saveError" type="is-danger" size="is-small") {{ saveError }}

    .buttons
      b-button(type="is-primary" :loading="saving" @click="save") {{ $t('firmPropertyTaxRules.buttons.save') }}
      b-button(type="is-light" :disabled="!hasOwn || saving" @click="confirmReset") {{ $t('firmPropertyTaxRules.buttons.reset') }}
      b-button(type="is-text" @click="toggleHistory") {{ showHistory ? $t('firmPropertyTaxRules.buttons.hideHistory') : $t('firmPropertyTaxRules.buttons.showHistory') }}

    .box(v-if="showHistory")
      p.has-text-weight-semibold.mb-2 {{ $t('firmPropertyTaxRules.history.heading') }}
      p.is-size-7.has-text-grey(v-if="!history.length") {{ $t('firmPropertyTaxRules.history.empty') }}
      table.table.is-fullwidth.is-narrow(v-else)
        tbody
          tr(v-for="h in history" :key="h.id")
            td {{ $t('firmPropertyTaxRules.history.version', { version: h.version }) }}
            td.is-size-7.has-text-grey {{ h.created_by }}
            td.is-size-7.has-text-grey {{ h.created_at }}
            td.has-text-right
              b-button(size="is-small" type="is-light" @click="restore(h.id)") {{ $t('firmPropertyTaxRules.history.restore') }}
</template>

<script>
/**
 * FirmPropertyTaxRules — the tab a group or a firm sets the property model's tax rules on.
 *
 * RULED BY MIKE, 2026-08-17 (`design/MULTIPLE-PROPERTY-ASSESSMENT.md` §8 Q6): a GROUP —
 * normally a country — sets these, a FIRM may correct them, and an ADVISOR types over
 * them on the report screen for one client. The advisor half is deliberately not here and
 * is not stored anywhere: *"type over per client if desired"*.
 *
 * 🔴 IT SHOWS WHERE EVERY VALUE CAME FROM, not just what it is. A level holds only its
 * changes (`tier-cascade.md` P3), so a setting reading "inherited" keeps receiving the
 * level above's corrections and one reading "set here" is protected from them. Without
 * the two badges a manager cannot tell the difference between a decision they made and a
 * value that happens to agree with the level above — and those are not the same thing.
 *
 * Rates are held and edited as display percentages (15, not 0.15) and converted on the
 * way to the backend, matching every other screen in the app. The backend refuses a rate
 * above 1 outright rather than clamping it, so a unit mistake fails loudly.
 *
 * Every label here is the one Mike ruled in §8 Q5, so the tab and the report screen say
 * the same words about the same setting — EXCEPT ONE.
 *
 * ⚠ `Maximum Loan to Value Ratio (%)` IS NOT HIS WORDING, and this note is the record.
 * On 2026-08-20 he ruled the lending ceiling *"needs to be an editable input"*, was
 * offered a drawing of this tab with the field on it before it was built, and declined
 * it — *"no, just add it as a field - I'm sure you can do it"*. So the label, its help
 * text and its placement are ours. That is his call to make and it is written here
 * rather than left to look like a ruling, because §10 of the artefact exists precisely
 * to stop a build quietly acquiring authority it was never given.
 *
 * ⚠ It is also a LENDING rule sitting on a tab called Tax Rules. It shares the block
 * because it cascades, corrects and overrides identically, and a second Hub tab would
 * buy nothing but a tab — Mike having already said the hub was getting overwhelming.
 * The intro sentence says "tax and lending" so the tab does not misdescribe itself.
 */
export default {
  name: 'FirmPropertyTaxRules',

  props: {
    /** The caller's bearer token; the backend re-checks authorisation on every call. */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: true,
      saving: false,
      saveError: '',
      showHistory: false,
      history: [],
      /** This level's OWN changes, as returned by the backend (decimal rates). */
      own: {},
      /** The resolved values, in display form, which the inputs edit. */
      form: {
        yearOneAddBack: 'setup',
        managementFeeGstPct: 15,
        depreciableAssets: 'chattels',
        depreciationMethod: 'dv',
        depreciationRateChattelsPct: 28,
        maxLvrPct: '',
        buildingDepreciationRatePct: 0,
        lossTreatment: 'ringFenced',
        interestDeductibility: 'Phasing',
        phasingPct: [100, 75, 50, 25, 0]
      }
    }
  },

  computed: {
    /** Has this level changed anything of its own? Drives the badge and the reset. */
    hasOwn () {
      return Object.keys(this.own).length > 0
    },

    /**
     * The single-value settings, in the order they appear on the report screen's Tax
     * rules card, with the labels ruled in §8 Q5.
     * @returns {Array<object>}
     */
    fields () {
      return [
        {
          key: 'yearOneAddBack',
          label: this.$t('firmPropertyTaxRules.fields.yearOneAddBack.label'),
          type: 'choice',
          options: [
            { value: 'setup', label: this.$t('firmPropertyTaxRules.fields.yearOneAddBack.setup') },
            { value: 'setupAndPurchase', label: this.$t('firmPropertyTaxRules.fields.yearOneAddBack.setupAndPurchase') },
            { value: 'none', label: this.$t('firmPropertyTaxRules.fields.yearOneAddBack.none') }
          ]
        },
        { key: 'managementFeeGstPct', ownKey: 'managementFeeGstRate', label: this.$t('firmPropertyTaxRules.fields.managementFeeGst.label') },
        {
          key: 'depreciableAssets',
          label: this.$t('firmPropertyTaxRules.fields.depreciableAssets.label'),
          type: 'choice',
          options: [
            { value: 'chattels', label: this.$t('firmPropertyTaxRules.fields.depreciableAssets.chattels') },
            { value: 'chattelsAndBuilding', label: this.$t('firmPropertyTaxRules.fields.depreciableAssets.chattelsAndBuilding') }
          ]
        },
        {
          key: 'depreciationMethod',
          label: this.$t('firmPropertyTaxRules.fields.depreciationMethod.label'),
          type: 'choice',
          options: [
            { value: 'dv', label: this.$t('firmPropertyTaxRules.fields.depreciationMethod.dv') },
            { value: 'sl', label: this.$t('firmPropertyTaxRules.fields.depreciationMethod.sl') }
          ]
        },
        { key: 'depreciationRateChattelsPct', ownKey: 'depreciationRateChattels', label: this.$t('firmPropertyTaxRules.fields.depreciationRateChattels.label') },
        {
          key: 'maxLvrPct',
          ownKey: 'maxLvr',
          label: this.$t('firmPropertyTaxRules.fields.maxLvr.label'),
          help: this.$t('firmPropertyTaxRules.fields.maxLvr.help')
        },
        {
          key: 'buildingDepreciationRatePct',
          ownKey: 'buildingDepreciationRate',
          label: this.$t('firmPropertyTaxRules.fields.buildingDepreciationRate.label'),
          help: this.$t('firmPropertyTaxRules.fields.buildingDepreciationRate.help')
        },
        {
          key: 'lossTreatment',
          label: this.$t('firmPropertyTaxRules.fields.lossTreatment.label'),
          type: 'choice',
          options: [
            { value: 'ringFenced', label: this.$t('firmPropertyTaxRules.fields.lossTreatment.ringFenced') },
            { value: 'offset', label: this.$t('firmPropertyTaxRules.fields.lossTreatment.offset') }
          ]
        },
        {
          key: 'interestDeductibility',
          label: this.$t('firmPropertyTaxRules.fields.interestDeductibility.label'),
          type: 'choice',
          options: [
            { value: 'Yes', label: this.$t('firmPropertyTaxRules.fields.interestDeductibility.yes') },
            { value: 'No', label: this.$t('firmPropertyTaxRules.fields.interestDeductibility.no') },
            { value: 'Phasing', label: this.$t('firmPropertyTaxRules.fields.interestDeductibility.phasing') }
          ]
        }
      ]
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /** Read what this level inherits, what it has changed, and the resolved result. */
    async load () {
      this.loading = true
      try {
        const data = await this.api('GET', '/api/firm-manager/property-tax-rules')
        this.own = data.own || {}
        this.applyToForm(data.resolved || {})
      } catch (err) {
        this.saveError = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Put backend values (decimal rates) into the form (display percentages).
     * @param {object} rules
     */
    applyToForm (rules) {
      const pct = v => Math.round(Number(v || 0) * 1000000) / 10000 //  0.08625 → 8.625
      if (rules.yearOneAddBack) { this.form.yearOneAddBack = rules.yearOneAddBack }
      if (rules.depreciableAssets) { this.form.depreciableAssets = rules.depreciableAssets }
      if (rules.depreciationMethod) { this.form.depreciationMethod = rules.depreciationMethod }
      if (rules.lossTreatment) { this.form.lossTreatment = rules.lossTreatment }
      if (rules.interestDeductibility) { this.form.interestDeductibility = rules.interestDeductibility }
      if (rules.managementFeeGstRate !== undefined) { this.form.managementFeeGstPct = pct(rules.managementFeeGstRate) }
      if (rules.depreciationRateChattels !== undefined) { this.form.depreciationRateChattelsPct = pct(rules.depreciationRateChattels) }
      // Blank, not 0: an unset ceiling is not a ceiling of nothing.
      this.form.maxLvrPct = rules.maxLvr === undefined || rules.maxLvr === null ? '' : pct(rules.maxLvr)
      if (rules.buildingDepreciationRate !== undefined) { this.form.buildingDepreciationRatePct = pct(rules.buildingDepreciationRate) }
      if (Array.isArray(rules.phasingTable)) { this.form.phasingPct = rules.phasingTable.map(pct) }
    },

    /**
     * Is this setting one THIS level changed, rather than one it inherits?
     * @param {string} key - the backend's own key for the setting
     * @returns {boolean}
     */
    isOwn (key) {
      const field = this.fields.find(f => f.key === key)
      const backendKey = (field && field.ownKey) || key
      return Object.prototype.hasOwnProperty.call(this.own, backendKey)
    },

    /**
     * Everything on the form, as the backend wants it. The whole set is sent rather than
     * a diff: a manager who opened this tab and pressed Save has decided every value on
     * it, including the ones that happened to match the level above.
     * @returns {object}
     */
    payload () {
      const dec = v => (Number(v) || 0) / 100
      const f = this.form
      const out = {
        yearOneAddBack: f.yearOneAddBack,
        managementFeeGstRate: dec(f.managementFeeGstPct),
        depreciableAssets: f.depreciableAssets,
        depreciationMethod: f.depreciationMethod,
        depreciationRateChattels: dec(f.depreciationRateChattelsPct),
        buildingDepreciationRate: dec(f.buildingDepreciationRatePct),
        lossTreatment: f.lossTreatment,
        interestDeductibility: f.interestDeductibility,
        phasingTable: f.phasingPct.map(dec)
      }
      // 🔴 THE ONE FIELD THAT IS OMITTED WHEN BLANK, and the exception is the point.
      // Everything else is sent whole, because a manager who pressed Save has decided
      // every value on the tab. A blank ceiling is not a decision to lend nothing — it
      // is "no limit set" — and `dec('')` would turn it into 0 and refuse every loan.
      if (f.maxLvrPct !== '' && f.maxLvrPct !== null && Number.isFinite(Number(f.maxLvrPct))) {
        out.maxLvr = dec(f.maxLvrPct)
      }
      return out
    },

    async save () {
      this.saving = true
      this.saveError = ''
      try {
        const data = await this.api('POST', '/api/firm-manager/property-tax-rules', { rules: this.payload() })
        this.own = data.own || {}
        this.applyToForm(data.resolved || {})
        this.$buefy.toast.open({ message: this.$t('firmPropertyTaxRules.toast.saved'), type: 'is-success' })
        if (this.showHistory) { await this.loadHistory() }
      } catch (err) {
        this.saveError = err.message
      } finally {
        this.saving = false
      }
    },

    /**
     * Clearing this level's changes is not undoable from the screen, and it hands every
     * setting back to the level above — so it asks first.
     */
    confirmReset () {
      this.$buefy.dialog.confirm({
        title: this.$t('firmPropertyTaxRules.resetDialog.title'),
        message: this.$t('firmPropertyTaxRules.resetDialog.message'),
        confirmText: this.$t('firmPropertyTaxRules.buttons.reset'),
        type: 'is-warning',
        onConfirm: () => this.reset()
      })
    },

    async reset () {
      this.saving = true
      this.saveError = ''
      try {
        const data = await this.api('POST', '/api/firm-manager/property-tax-rules', { rules: {} })
        this.own = {}
        this.applyToForm(data.resolved || {})
        this.$buefy.toast.open({ message: this.$t('firmPropertyTaxRules.toast.reset'), type: 'is-success' })
      } catch (err) {
        this.saveError = err.message
      } finally {
        this.saving = false
      }
    },

    async toggleHistory () {
      this.showHistory = !this.showHistory
      if (this.showHistory) { await this.loadHistory() }
    },

    async loadHistory () {
      try {
        const data = await this.api('GET', '/api/firm-manager/property-tax-rules/history')
        this.history = data.history || []
      } catch (err) {
        this.saveError = err.message
      }
    },

    async restore (versionId) {
      try {
        const data = await this.api('POST', '/api/firm-manager/property-tax-rules/restore', { versionId })
        this.applyToForm(data.resolved || {})
        await this.load()
        this.$buefy.toast.open({ message: this.$t('firmPropertyTaxRules.toast.restored'), type: 'is-success' })
      } catch (err) {
        this.saveError = err.message
      }
    },

    /**
     * Thin authenticated fetch — mirrors FirmCoachingReference's helper so this tab can
     * be mounted and tested on its own; the backend re-checks authorisation on every
     * call regardless of what the browser sends.
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
.ptr-row {
  display: grid;
  grid-template-columns: 1fr 180px 110px;
  gap: 0.75rem;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f3f7;
}
.ptr-row:last-child { border-bottom: 0; }
.ptr-label .label { margin-bottom: 0.1rem; }
.ptr-source { text-align: right; }
.ptr-phasing { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.35rem; }
/* 🔴 THE ONE ROW WITH FIVE CONTROLS INSTEAD OF ONE, and it needs its own width.
   180px is right for a single dropdown. Split five ways with four gaps it leaves
   about 31px per box, of which ~18px is the input's own padding and border — less
   than the number spinner needs on its own. The digits were pushed out of sight and
   every phasing box read as EMPTY, while holding and saving the right value.

   Found by Mike on the running screen, 2026-08-19, the first time anyone opened this
   tab. 🔴 NO TEST COULD HAVE CAUGHT IT: Jest does not lay a page out, so nothing in
   the suite can see a box too small to read. Widening it here rather than shrinking
   the boxes keeps every other row on the screen identical.

   `minmax(0, 1fr)` on the label, not `1fr`: a bare `1fr` floors at the label's own
   width, so a long label would push the row wider than the panel instead of wrapping. */
.ptr-row-phasing { grid-template-columns: minmax(0, 1fr) 420px 110px; }
@media (max-width: 768px) {
  .ptr-row { grid-template-columns: 1fr; }
  .ptr-source { text-align: left; }
}
</style>
