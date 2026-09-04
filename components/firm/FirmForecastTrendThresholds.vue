<template lang="pug">
.ftt
  .notification.is-info.is-light.mb-4
    p.is-size-7
      | These decide when the #[b Three-Way Forecast]’s two-year comparison marks a measure amber or red. Every number here is yours.
      |  #[b A measure you leave blank is still shown in full, with both years and the movement — it is simply never banded.]
      |  That is the right setting for anything you would rather report than judge.

  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  template(v-else)
    .mb-4
      b-tag(v-if="hasOwn" type="is-info is-light" size="is-medium") Some thresholds are set here
      b-tag(v-else type="is-light" size="is-medium") Everything is inherited

    .box
      p.has-text-weight-semibold.mb-1 Where the figure stands
      p.is-size-7.has-text-grey.mb-3
        | These three are judged on this year’s level. Each has its own numbers, because
        |  46 days means a quite different thing about a customer, a supplier and a shelf.

      .ftt-row.ftt-head
        span Measure
        span.has-text-right Green up to
        span.has-text-right Amber up to
        span Red
        span

      .ftt-row(v-for="m in levelFields" :key="m.key")
        .ftt-label
          label.label.is-small {{ m.label }}
          p.is-size-7.has-text-grey {{ m.help }}
        b-input(v-model="form.levels[m.key].green" type="number" step="any" size="is-small")
        b-input(v-model="form.levels[m.key].amber" type="number" step="any" size="is-small")
        span.is-size-7.has-text-grey {{ redAbove(m.key) }}
        .ftt-source
          b-tag(v-if="isOwn('levels', m.key)" type="is-info is-light" size="is-small") set here
          b-tag(v-else type="is-light" size="is-small") inherited

    .box
      p.has-text-weight-semibold.mb-1 How far it moved
      p.is-size-7.has-text-grey.mb-3
        | These three are judged on the movement between the two years. A level would not
        |  travel: a gross margin that is alarming for a retailer is routine for a builder,
        |  whereas a margin that fell three points is worth a look in any trade.

      .ftt-row.ftt-head
        span Measure
        span.has-text-right Worth a look
        span.has-text-right Needs an explanation
        span Unit
        span

      .ftt-row(v-for="m in movementFields" :key="m.key")
        .ftt-label
          label.label.is-small {{ m.label }}
          p.is-size-7.has-text-grey {{ m.help }}
        b-input(v-model="form.movements[m.key].warn" type="number" step="any" size="is-small")
        b-input(v-model="form.movements[m.key].crit" type="number" step="any" size="is-small")
        span.is-size-7.has-text-grey {{ m.unit }}
        .ftt-source
          b-tag(v-if="isOwn('movements', m.key)" type="is-info is-light" size="is-small") set here
          b-tag(v-else type="is-light" size="is-small") inherited

    b-message(v-if="saveError" type="is-danger" size="is-small") {{ saveError }}

    .buttons
      b-button(type="is-primary" :loading="saving" @click="save") Save these thresholds
      b-button(type="is-light" :disabled="!hasOwn || saving" @click="confirmReset") Go back to inherited
      b-button(type="is-text" @click="toggleHistory") {{ showHistory ? 'Hide change history' : 'Change history' }}

    .box(v-if="showHistory")
      p.has-text-weight-semibold.mb-2 Change history
      p.is-size-7.has-text-grey(v-if="!history.length") Nothing has been saved at this level yet.
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
 * FirmForecastTrendThresholds — the tab the bands on the Three-Way Forecast's two-year
 * trend read are set on. Item 4.61 phase (b).
 *
 * RULED BY MIKE, 2026-09-03, AGAINST THE RECOMMENDATION. He was offered a plain read —
 * direction and size, no judgement — and chose warning bands on thresholds HE sets. The
 * recommendation's objection was that any threshold a developer picked would be invented
 * advisory content inside a document a lender reads; his ruling removes that objection
 * rather than overriding it, because the numbers are his. THIS SCREEN IS WHAT THAT RULING
 * COSTS, and it is also what makes it safe: the numbers are visible and changeable rather
 * than buried in a prompt builder or a constant.
 *
 * 🔴 IT SHOWS WHERE EVERY VALUE CAME FROM, not just what it is — the same two badges as
 * `FirmPropertyTaxRules`, for the same reason. A level holds only its changes
 * (`tier-cascade.md` P3), so a threshold reading "inherited" keeps receiving the level
 * above's corrections and one reading "set here" is protected from them, and a manager
 * cannot otherwise tell a decision they made from a value that happens to agree.
 *
 * MENTOR TIER ALONE today (`TAB_TIERS`), per the default-is-mentor-alone ruling of
 * 2026-08-24: these are platform advisory thresholds and no firm has yet had a real reason
 * to hold different ones. Nothing here is mentor-specific — the routes and the resolver
 * carry every tier already — so switching a lower tier on is a line in that matrix.
 *
 * ⚠ A BLANK BOX IS A SETTING, NOT AN OMISSION. It clears the threshold, and the measure is
 * then reported in full and banded never. Five of the six ship blank, because Mike has so
 * far given only the debtor-day numbers; the screen must never make that look broken.
 *
 * ⚠ THE LABELS ON THIS TAB ARE OURS, NOT MIKE'S, AND THIS NOTE IS THE RECORD. The approved
 * drawing (`design/mockups/three-way-forecast-trend.html`) settles the block on step 3 and
 * the shape of this screen; the exact column headings and help sentences here were written
 * to build it and have not been put to him. They are one edit each.
 */
export default {
  name: 'FirmForecastTrendThresholds',

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
      /** This level's OWN changes, as returned by the backend. */
      own: {},
      /**
       * The resolved thresholds the inputs edit. Held as STRINGS because that is what a
       * number input gives back, and because '' is the value that means "cleared" — a
       * distinction `Number('')` would destroy by turning it into 0, which is a real
       * threshold meaning something quite different.
       */
      form: {
        levels: { debtorDays: {}, creditorDays: {}, stockDays: {} },
        movements: { salesGrowth: {}, grossMargin: {}, overheadRatio: {} }
      }
    }
  },

  computed: {
    /** Has this level changed anything of its own? Drives the badge and the reset. */
    hasOwn () {
      return Object.keys(this.own).length > 0
    },

    /** The three measures judged on this year's level, in the order the block shows them. */
    levelFields () {
      return [
        { key: 'debtorDays', label: 'Debtor days', help: 'How long customers take to pay. Mike’s own figures: 35 and 45.' },
        { key: 'creditorDays', label: 'Creditor days', help: 'How long the business takes to pay suppliers. A high figure is the one that reads as stretching them.' },
        { key: 'stockDays', label: 'Stock days', help: 'How long stock sits before it sells. Varies more by trade than either of the other two.' }
      ]
    },

    /** The three measures judged on the movement between the two years. */
    movementFields () {
      return [
        { key: 'salesGrowth', label: 'Sales growth falls below', help: 'A percentage. Negative is allowed — “below −5%” is an ordinary red line.', unit: '% growth' },
        { key: 'grossMargin', label: 'Gross margin falls by more than', help: 'In percentage points, so a fall from 42% to 40% is 2.', unit: 'percentage points' },
        { key: 'overheadRatio', label: 'Overheads against sales rise by more than', help: 'In percentage points. Rising means running costs are taking more of every dollar sold.', unit: 'percentage points' }
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
        const data = await this.api('GET', '/api/firm-manager/trend-thresholds')
        this.own = data.own || {}
        this.applyToForm(data.resolved || {})
      } catch (err) {
        this.saveError = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Put backend values into the form. A null becomes '' rather than 0 — see `form`.
     * @param {object} thresholds - `{levels, movements}`
     */
    applyToForm (thresholds) {
      const text = v => (v === null || v === undefined ? '' : String(v))
      const groups = { levels: ['green', 'amber'], movements: ['warn', 'crit'] }
      Object.keys(groups).forEach((group) => {
        Object.keys(this.form[group]).forEach((key) => {
          const src = (thresholds[group] && thresholds[group][key]) || {}
          const pair = {}
          groups[group].forEach((b) => { pair[b] = text(src[b]) })
          this.$set(this.form[group], key, pair)
        })
      })
    },

    /**
     * The sentence in the "Red" column — red is everything above the amber boundary, so it
     * is derived rather than typed. Saying it rather than leaving the column blank is what
     * stops a manager looking for a third box that does not exist.
     * @param {string} key @returns {string}
     */
    redAbove (key) {
      const amber = this.form.levels[key] && this.form.levels[key].amber
      if (amber === '' || amber === null || amber === undefined) { return 'nothing is red until an amber figure is set' }
      return 'anything above ' + amber
    },

    /**
     * Is this threshold one THIS level changed, rather than one it inherits?
     * @param {string} group - 'levels' or 'movements'
     * @param {string} key - the measure
     * @returns {boolean}
     */
    isOwn (group, key) {
      return Boolean(this.own[group] && Object.prototype.hasOwnProperty.call(this.own[group], key))
    },

    /**
     * Everything on the form, as the backend wants it. The whole set is sent rather than a
     * diff: a manager who opened this tab and pressed Save has decided every value on it,
     * including the ones that happened to match the level above — and including the blanks,
     * which are sent as explicit nulls so that clearing a threshold is saved as a decision
     * rather than read as "no opinion, keep inheriting".
     * @returns {object}
     */
    payload () {
      const numOrNull = (v) => {
        if (v === '' || v === null || v === undefined) { return null }
        const n = Number(v)
        return isFinite(n) ? n : null
      }
      const out = { levels: {}, movements: {} }
      Object.keys(this.form.levels).forEach((key) => {
        out.levels[key] = {
          green: numOrNull(this.form.levels[key].green),
          amber: numOrNull(this.form.levels[key].amber)
        }
      })
      Object.keys(this.form.movements).forEach((key) => {
        out.movements[key] = {
          warn: numOrNull(this.form.movements[key].warn),
          crit: numOrNull(this.form.movements[key].crit)
        }
      })
      return out
    },

    async save () {
      this.saving = true
      this.saveError = ''
      try {
        const data = await this.api('POST', '/api/firm-manager/trend-thresholds', { thresholds: this.payload() })
        this.own = data.own || {}
        this.applyToForm(data.resolved || {})
        this.$buefy.toast.open({ message: 'Thresholds saved', type: 'is-success' })
        if (this.showHistory) { await this.loadHistory() }
      } catch (err) {
        this.saveError = err.message
      } finally {
        this.saving = false
      }
    },

    /**
     * Clearing this level's changes is not undoable from the screen and hands every
     * threshold back to the level above — so it asks first.
     */
    confirmReset () {
      this.$buefy.dialog.confirm({
        title: 'Go back to inherited thresholds',
        message: 'This level will stop holding its own thresholds and will take them from the level above again. Advisors here will see that level\'s bands.',
        confirmText: 'Go back to inherited',
        type: 'is-warning',
        onConfirm: () => this.reset()
      })
    },

    async reset () {
      this.saving = true
      this.saveError = ''
      try {
        const data = await this.api('POST', '/api/firm-manager/trend-thresholds', { thresholds: {} })
        this.own = {}
        this.applyToForm(data.resolved || {})
        this.$buefy.toast.open({ message: 'Now inheriting again', type: 'is-success' })
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
        const data = await this.api('GET', '/api/firm-manager/trend-thresholds/history')
        this.history = data.history || []
      } catch (err) {
        this.saveError = err.message
      }
    },

    async restore (versionId) {
      try {
        const data = await this.api('POST', '/api/firm-manager/trend-thresholds/restore', { versionId })
        this.applyToForm(data.resolved || {})
        await this.load()
        this.$buefy.toast.open({ message: 'That version is back in force', type: 'is-success' })
      } catch (err) {
        this.saveError = err.message
      }
    },

    /**
     * Thin authenticated fetch — mirrors FirmPropertyTaxRules's helper so this tab can be
     * mounted and tested on its own; the backend re-checks authorisation on every call
     * regardless of what the browser sends.
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
.ftt-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px 120px 200px 110px;
  gap: 0.75rem;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f3f7;
}
.ftt-row:last-child { border-bottom: 0; }
/* The header row is labels, not controls — smaller, quieter, and no bottom rule of its
   own so it reads as the top of the table rather than a row in it. */
.ftt-head {
  border-bottom: 1px solid #dfe6ee;
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #7a8ba0;
  font-weight: 600;
}
.ftt-label .label { margin-bottom: 0.1rem; }
.ftt-source { text-align: right; }
@media (max-width: 900px) {
  .ftt-row { grid-template-columns: 1fr; }
  .ftt-head { display: none; }
  .ftt-source { text-align: left; }
}
</style>
