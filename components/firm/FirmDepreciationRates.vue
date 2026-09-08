<template lang="pug">
.fdr
  .notification.is-info.is-light.mb-4
    p.is-size-7
      | These are the rates the #[b Three-Way Forecast] writes assets down at, for clients in
      |  one country.
      | #[b Nothing here is any country's tax rules until a document has been loaded and approved]
      |  — until then the forecast uses the app's own six figures, which are a starting point
      |  and are marked as one.

  .field.is-grouped.is-align-items-flex-end.mb-4
    .control
      b-field(label="Country" label-position="on-border")
        b-input(
          v-model="countryInput"
          placeholder="NZ"
          maxlength="2"
          size="is-small"
          style="width: 7rem"
          @keyup.native.enter="show(countryInput)"
        )
    .control
      b-button(type="is-primary" size="is-small" :disabled="!canShow" @click="show(countryInput)") Show
    .control(v-for="c in countries" :key="c")
      b-button(
        size="is-small"
        :type="c === country ? 'is-info' : 'is-light'"
        @click="show(c)"
      ) {{ c }}

  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  template(v-else-if="!country")
    .box.has-text-centered.py-5
      p.has-text-weight-semibold.mb-1 Choose a country
      p.is-size-7.has-text-grey
        | Rates belong to the country whose tax authority publishes them, so there is nothing
        |  to show until you name one. Two letters — NZ, AU.
      p.is-size-7.has-text-grey.mt-2(v-if="!countries.length")
        | This level has not approved a table for any country yet.

  template(v-else)
    .mb-4
      b-tag(v-if="hasOwn" type="is-info is-light" size="is-medium") This level has approved its own {{ country }} table
      b-tag(v-else-if="!resolved.isDefault" type="is-light" size="is-medium") Inherited from above
      b-tag(v-else type="is-warning is-light" size="is-medium") Nobody has approved a {{ country }} table — the app's own figures apply

    .box
      p.has-text-weight-semibold.mb-1 What a {{ country }} client's forecast uses
      p.is-size-7.has-text-grey.mb-3
        | One rate for each of the forecast's six asset categories, and where each one came from.
        | #[b A rate marked as an app default is a starting point, not this country's rules.]

      .fdr-row.fdr-head
        span Category
        span Rate
        span Method
        span Where it came from

      .fdr-row(v-for="row in rows" :key="row.key")
        .fdr-label
          label.label.is-small {{ row.label }}
          p.is-size-7.has-text-grey(v-if="row.className") {{ row.className }}
        span.fdr-num {{ row.rate }}
        span.is-size-7.has-text-grey {{ row.method }}
        .fdr-origin
          b-tag(:type="row.badgeType" size="is-small") {{ row.origin }}
          p.is-size-7.has-text-grey(v-if="row.source") {{ row.source }}

    .box
      p.has-text-weight-semibold.mb-1 First-year rule
      p.is-size-7.has-text-grey.mb-3
        | Some countries let a business deduct part of a new asset's cost up front. It is
        |  #[b approved separately from the rates], because adopting a tax scheme is a
        |  different decision from confirming a rate table.

      template(v-if="rule")
        table.table.is-fullwidth.is-narrow
          tbody
            tr
              td Rule
              td
                b {{ rule.name }}
                p.is-size-7.has-text-grey(v-if="ruleSource") {{ ruleSource }}
            tr
              td Deducted in the year of purchase
              td {{ rulePercent }} of the asset's cost, as an expense
            tr
              td The rest
              td {{ ruleRemainder }} goes on the asset register and depreciates at the ordinary rate
            tr
              td Applies to assets bought on or after
              td {{ rule.startsOn }}
            tr(v-if="rule.endsOn")
              td And on or before
              td {{ rule.endsOn }}
            tr(v-if="rule.qualifies")
              td Qualifies
              td.is-size-7 {{ rule.qualifies }}
            tr(v-if="rule.excludes")
              td Does not qualify
              td.is-size-7 {{ rule.excludes }}
            tr
              td Adopted by
              td.is-size-7.has-text-grey {{ rule.approvedBy }} · {{ rule.approvedAt }}
        .notification.is-info.is-light.py-2
          p.is-size-7 This does not change the total that may be claimed — it brings it forward.
        b-button(
          type="is-light"
          size="is-small"
          :loading="saving"
          :disabled="!ownRule"
          @click="confirmWithdraw"
        ) Withdraw this rule
        p.is-size-7.has-text-grey.mt-2(v-if="rule && !ownRule")
          | Adopted at a level above this one, so it is withdrawn there rather than here.

      .content(v-else)
        p.is-size-7.has-text-grey
          | No first-year rule has been adopted for {{ country }}. Advisors see no such field
          |  on a {{ country }} client's forecast, which is the correct state for a country
          |  whose tax authority has no such scheme.

    b-message(v-if="error" type="is-danger" size="is-small") {{ error }}

    .buttons
      b-button(type="is-text" @click="toggleHistory") {{ showHistory ? 'Hide change history' : 'Change history' }}

    .box(v-if="showHistory")
      p.has-text-weight-semibold.mb-2 Change history
      p.is-size-7.has-text-grey(v-if="!history.length") Nothing has been approved at this level yet.
      table.table.is-fullwidth.is-narrow(v-else)
        tbody
          tr(v-for="h in history" :key="h.id")
            td Version {{ h.version }}
            td.is-size-7.has-text-grey {{ h.created_by }}
            td.is-size-7.has-text-grey {{ h.created_at }}
            td.has-text-right
              b-button(size="is-small" type="is-light" @click="restore(h.id)") Restore
</template>

<script>
/**
 * FirmDepreciationRates — the tab a manager sees which depreciation rates their firm's
 * forecasts use for a country, and where each one came from. Item 4.78, slice 2.
 *
 * Asked for by Mike on 2026-09-08: *"is it worth having a field in the firm manager hub where
 * tax pdfs can be loaded to be read by the AI so it can be accurate per country?"* — and
 * filed on his yes after he overturned the recommendation against it. Design:
 * `design/features/depreciation-rates.md`; the approved drawings are
 * `design/mockups/depreciation-rates-upload.html` and its two addenda.
 *
 * 🔴 WHAT THIS SLICE DELIBERATELY DOES NOT DO, so nobody reads it as unfinished. There is no
 * upload here and no AI extraction: loading a document, having it read, and approving what it
 * proposed are slice 3, and the PDF-reading question is still open. What this screen does
 * today is show a manager which rates their firm is actually on, which tier supplied each one,
 * and which are still the app's own guesses — which is the whole point of the hub-page rule
 * and is useful before a single document exists.
 *
 * 🔴 IT SHOWS WHERE EVERY RATE CAME FROM, not just what it is, and that is the feature rather
 * than decoration. A rate badged as an app default is a starting point; a rate badged with a
 * tier and a document is sourced. On a forecast a lender reads, those two look identical
 * unless something says otherwise — which is exactly the risk item 4.78 was filed against.
 *
 * ⚠ THE FIRST-YEAR RULE IS SHOWN AND WITHDRAWN SEPARATELY FROM THE RATES — Mike's ruling of
 * 2026-09-09. Two decisions, two buttons, and on the backend two routes, so approving a rate
 * table cannot adopt a tax scheme as a side effect.
 *
 * ⚠ A RULE INHERITED FROM ABOVE CANNOT BE WITHDRAWN HERE, and the screen says so rather than
 * offering a button that would fail. Nobody edits a level above their own (Mike, 2026-09-02).
 *
 * ⚠ STRINGS ARE HARDCODED ENGLISH, WHICH DEVIATES FROM THE i18n STANDARD IN `CLAUDE.md`, AND
 * THIS NOTE IS THE RECORD RATHER THAN A SILENT CHOICE. Four of the five sibling tabs in this
 * folder do the same (`FirmForecastTrendThresholds`, `FirmSellDownLadder`,
 * `FirmPropertyTaxRules`, `FirmMeetingObservations`); only `FirmAiPrompts` uses `$t`. Matching
 * the majority keeps this folder to two styles rather than three, and converting all five is
 * one job rather than five. Raised with Mike on 2026-09-09.
 */
export default {
  name: 'FirmDepreciationRates',

  props: {
    /** The caller's bearer token; the backend re-checks authorisation on every call. */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: true,
      saving: false,
      error: '',
      showHistory: false,
      history: [],
      /** Two-letter code in the box, before it is asked for. */
      countryInput: '',
      /** The country actually being shown, once the backend has answered for it. */
      country: '',
      /** Countries this level has approved something for. */
      countries: [],
      /** True when the table on screen is this level's own rather than inherited. */
      hasOwn: false,
      /** This level's OWN stored table for the country, or null. */
      own: null,
      /** The resolved answer: six categories, each with its origin, and the rule. */
      resolved: { categories: {}, firstYearRule: null, isDefault: true }
    }
  },

  computed: {
    canShow () {
      return /^[A-Za-z]{2}$/.test(String(this.countryInput || '').trim())
    },

    /** The six rows, in the order the forecast holds its categories. */
    rows () {
      const labels = {
        vehicles: 'Vehicles',
        leaseholdImprovements: 'Leasehold improvements',
        plantEquipment: 'Plant and equipment',
        officeEquipment: 'Office equipment',
        computerHardware: 'Computer hardware',
        other: 'Other'
      }
      const cats = this.resolved.categories || {}
      return Object.keys(labels).filter(k => cats[k]).map((key) => {
        const c = cats[key]
        const operative = c.method === 'sl' ? c.slRate : c.dvRate
        return {
          key,
          label: labels[key],
          // The tax authority's own wording for the class this rate was taken from. Absent
          // on an app default, because an app default came from no published class at all.
          className: c.label || '',
          rate: operative === null || operative === undefined ? '—' : `${Math.round(operative * 1000) / 10}%`,
          method: c.method === 'sl' ? 'straight line' : 'diminishing value',
          origin: this.originLabel(c),
          badgeType: c.originTier ? 'is-info is-light' : 'is-light',
          source: c.source ? `${c.source.document}${c.source.page ? ', p.' + c.source.page : ''} · ${c.source.published}` : ''
        }
      })
    },

    /** The resolved first-year rule, or null when no level has adopted one. */
    rule () {
      return this.resolved.firstYearRule || null
    },

    /** Was the rule adopted at THIS level? Only then can it be withdrawn here. */
    ownRule () {
      return Boolean(this.own && this.own.firstYearRule)
    },

    rulePercent () {
      return this.rule ? `${Math.round(this.rule.rate * 1000) / 10}%` : ''
    },

    ruleRemainder () {
      return this.rule ? `${Math.round((1 - this.rule.rate) * 1000) / 10}%` : ''
    },

    ruleSource () {
      const s = this.rule && this.rule.source
      return s ? `${s.document} · ${s.published}` : ''
    }
  },

  mounted () {
    this.load('')
  },

  methods: {
    /**
     * Which tier supplied a rate, in the words a manager reads on the forecast itself.
     * @param {object} c - a resolved category
     * @returns {string}
     */
    originLabel (c) {
      const names = {
        mentor: 'Advisor-e',
        global_group_manager: 'your global group',
        group_manager: 'your group',
        firm_manager: 'your firm'
      }
      if (!c.originTier) { return 'app default' }
      return names[c.originTier] || c.originTier
    },

    /** Ask for a country by name from the box or a quick-link. */
    show (code) {
      const c = String(code || '').trim().toUpperCase()
      if (!/^[A-Z]{2}$/.test(c)) { return }
      this.countryInput = c
      this.load(c)
    },

    /**
     * Read what this level inherits, what it has approved, and the resolved result.
     * @param {string} country - two-letter code, or '' for the country-less first load
     */
    async load (country) {
      this.loading = true
      this.error = ''
      try {
        const q = country ? `?country=${encodeURIComponent(country)}` : ''
        const data = await this.api('GET', `/api/firm-manager/depreciation-rates${q}`)
        this.country = data.country || ''
        this.countries = data.countries || []
        this.hasOwn = Boolean(data.hasOwn)
        this.own = data.own || null
        this.resolved = data.resolved || { categories: {}, firstYearRule: null, isDefault: true }
        // With nothing asked for and exactly one country held, showing it beats making a
        // manager retype what they already have.
        if (!country && this.countries.length === 1) {
          await this.load(this.countries[0])
          return
        }
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Withdrawing a rule stops every future forecast claiming it, so it asks first — and
     * says what it does NOT do, because the rates are a separate decision.
     */
    confirmWithdraw () {
      this.$buefy.dialog.confirm({
        title: 'Withdraw this first-year rule',
        message: 'Forecasts for ' + this.country + ' clients will stop offering it. The depreciation rates are not affected.',
        confirmText: 'Withdraw it',
        type: 'is-warning',
        onConfirm: () => this.withdraw()
      })
    },

    async withdraw () {
      this.saving = true
      this.error = ''
      try {
        await this.api('POST', '/api/firm-manager/depreciation-rates/first-year-rule', {
          country: this.country,
          rule: null
        })
        await this.load(this.country)
        this.$buefy.toast.open({ message: 'The rule has been withdrawn', type: 'is-success' })
      } catch (err) {
        this.error = err.message
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
        const data = await this.api('GET', '/api/firm-manager/depreciation-rates/history')
        this.history = data.history || []
      } catch (err) {
        this.error = err.message
      }
    },

    async restore (versionId) {
      try {
        await this.api('POST', '/api/firm-manager/depreciation-rates/restore', {
          versionId,
          country: this.country
        })
        await this.load(this.country)
        this.$buefy.toast.open({ message: 'That version is back in force', type: 'is-success' })
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
.fdr-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 90px 150px 240px;
  gap: 0.75rem;
  align-items: start;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f3f7;
}
.fdr-row:last-child { border-bottom: 0; }
/* The header row is labels, not controls — quieter, and no rule of its own so it reads as
   the top of the table rather than a row in it. Same treatment as the sibling tabs. */
.fdr-head {
  border-bottom: 1px solid #dfe6ee;
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #7a8ba0;
  font-weight: 600;
}
.fdr-label .label { margin-bottom: 0.1rem; }
.fdr-num {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
</style>
