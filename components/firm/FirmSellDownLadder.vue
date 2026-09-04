<template lang="pug">
.fsd
  .notification.is-info.is-light.mb-4
    p.is-size-7
      | These are the prices imported stock sells down at as it ages, on the #[b Three-Way Forecast]’s
      |  overseas section. Every figure here is yours, out of your Import &amp; Retail workbook.
      |  #[b They set what a new forecast opens on — an advisor can still change them for one client.]

  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  template(v-else)
    .mb-4
      b-tag(v-if="hasOwn" type="is-info is-light" size="is-medium") Some of this is set here
      b-tag(v-else type="is-light" size="is-medium") Everything is inherited

    .box
      p.has-text-weight-semibold.mb-1 The price ladder
      p.is-size-7.has-text-grey.mb-3
        | A mark-up is on #[b cost], so 185% means stock that cost 100 to land sells at 285.
        |  The days say how long each price lasts before the next one takes over.

      .fsd-row.fsd-head
        span Rung
        span.has-text-right Mark-up on cost (%)
        span.has-text-right Sells at, per 100 of cost
        span Applies to stock up to
        span

      .fsd-row(v-for="r in rungs" :key="r.key")
        .fsd-label
          label.label.is-small {{ r.label }}
          p.is-size-7.has-text-grey {{ r.help }}
        b-input(v-model="form.ladder[r.markupKey]" type="number" step="any" size="is-small")
        span.is-size-7.has-text-grey.has-text-right {{ pricePer100(r.markupKey) }}
        b-input(
          v-if="r.dayKey"
          v-model="form.ladder[r.dayKey]"
          type="number" step="1" size="is-small")
        span.is-size-7.has-text-grey(v-else) {{ runoutSentence }}
        .fsd-source
          b-tag(v-if="isOwn(r.markupKey)" type="is-info is-light" size="is-small") set here
          b-tag(v-else type="is-light" size="is-small") inherited

      b-message.mt-3(v-if="ladderRises" type="is-warning" size="is-small")
        | Your runout mark-up is above your new-stock one, so stock would get
        |  #[b dearer] as it ages. That is allowed — but it is usually a typo.

    .box
      p.has-text-weight-semibold.mb-1 What that does to a container
      p.is-size-7.has-text-grey.mb-3
        | Stock sells down over four 30-day bands. This is which price each band gets,
        |  worked out from the days above — change a boundary and this changes with it.
      .fsd-bands
        .fsd-band(v-for="b in bands" :key="b.days" :class="'is-' + b.rung")
          .fsd-band-days {{ b.range }}
          .fsd-band-rung {{ b.label }}
          .fsd-band-mark {{ b.markup }}%
      p.is-size-7.has-text-danger.mt-2(v-if="deadRung")
        | Nothing is priced at the #[b {{ deadRung }}] rung. Every band falls either side of it.

    .box
      p.has-text-weight-semibold.mb-1 How fast it sells
      p.is-size-7.has-text-grey.mb-3
        | The demand shape a new forecast opens on. An advisor can pick a different one for
        |  a client; this is only the starting point.
      .fsd-pattern
        b-select(v-model="form.defaultPattern" size="is-small")
          option(v-for="p in patterns" :key="p.name" :value="p.name") {{ p.name }}
        span.is-size-7.has-text-grey {{ patternSentence }}
        .fsd-source
          b-tag(v-if="isOwnPattern" type="is-info is-light" size="is-small") set here
          b-tag(v-else type="is-light" size="is-small") inherited
      p.is-size-7.has-text-grey.mt-2
        | The shapes themselves are not edited here — each one’s four bands have to total
        |  100%, and they belong to the shipment calculator rather than to this screen.

    b-message(v-if="saveError" type="is-danger" size="is-small") {{ saveError }}

    .buttons
      b-button(type="is-primary" :loading="saving" @click="save") Save this ladder
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
 * FirmSellDownLadder — the tab the price ladder for imported stock is set on. Item 4.64.
 *
 * Mike's figures, out of `design/report-source-models/Import & Retail.xlsx`. They decide
 * what a client's imported stock is priced at as it ages, so they move revenue, GST and tax
 * together on a document a lender reads. That is why this is a screen: the hub-page rule
 * says content that shapes what a client is shown must be visible and changeable rather
 * than buried in a data file nobody can open.
 *
 * 🔴 IT SHOWS WHERE EVERY VALUE CAME FROM, not just what it is — the same two badges as
 * `FirmForecastTrendThresholds` and `FirmPropertyTaxRules`, for the same reason. A level
 * holds only its changes (`tier-cascade.md` P3), so a figure reading "inherited" keeps
 * receiving the level above's corrections and one reading "set here" is protected from
 * them, and a manager cannot otherwise tell a decision they made from a value that happens
 * to agree.
 *
 * MENTOR TIER ALONE today (`TAB_TIERS`), per the default-is-mentor-alone ruling of
 * 2026-08-24: this is platform advisory content and no firm has yet had a real reason to
 * price differently. Nothing here is mentor-specific — the routes and the resolver carry
 * every tier already — so switching a lower tier on is a line in that matrix.
 *
 * 🔴 THE "WHAT THAT DOES TO A CONTAINER" BLOCK IS THE POINT OF THE SCREEN, not decoration.
 * Stock sells down over four fixed 30-day bands, so the two day boundaries decide which of
 * the three prices each band actually gets — and a boundary past 120 days, or two
 * boundaries inside the same band, leaves a rung of the ladder priced at nothing. The
 * backend refuses an INVERTED pair outright; this block is what shows a manager the effect
 * of a pair that is merely unhelpful, which no validator can judge for them.
 *
 * ⚠ THERE IS NO RUNOUT DAY BOX BECAUSE THE ENGINE HAS NO RUNOUT BOUNDARY. In
 * `threeWayForecastModel.js` the runout markup is the ELSE branch: everything past the
 * standard boundary is runout, whatever `runoutUpToDays` in the data file says. Showing an
 * editable box there would be a control that silently does nothing.
 *
 * ⚠ UNITS. The backend stores a markup as a DECIMAL (1.85), because the engine prices at
 * cost x (1 + markup). This screen works in PERCENTAGES, as the advisor's own step-3
 * boxes do, and converts on both edges — `toPct` on the way in, `/100` on the way out.
 *
 * ⚠ THE LABELS ON THIS TAB ARE OURS, NOT MIKE'S, AND THIS NOTE IS THE RECORD — the same
 * position as the trend-thresholds tab beside it. The tab's own name ("Imported Stock
 * Prices") he approved on 2026-09-04; the column headings, rung names and help sentences
 * here were written to build it and have not been put to him. They are one edit each.
 */
export default {
  name: 'FirmSellDownLadder',

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
      /** The demand shapes as shipped. Read-only here — see the block's own note. */
      patterns: [],
      /**
       * The resolved ladder the inputs edit. Held as STRINGS because that is what a number
       * input gives back, and because a half-typed "1" must not be read as a decision.
       * Percentages, not the decimals the backend stores.
       */
      form: {
        ladder: { newMarkup: '', standardMarkup: '', runoutMarkup: '', newUpToDays: '', standardUpToDays: '' },
        defaultPattern: ''
      }
    }
  },

  computed: {
    /** Has this level changed anything of its own? Drives the badge and the reset. */
    hasOwn () {
      return Object.keys(this.own).length > 0
    },

    /** Is the demand shape one THIS level chose? */
    isOwnPattern () {
      return Object.prototype.hasOwnProperty.call(this.own, 'defaultPattern')
    },

    /**
     * The three rungs, newest first. Only the first two carry a day boundary — the third is
     * everything left over, which is why it has no box. See the component note.
     */
    rungs () {
      return [
        { key: 'new', label: 'New stock', markupKey: 'newMarkup', dayKey: 'newUpToDays', help: 'The launch price, while the stock is still new.' },
        { key: 'standard', label: 'Standard retail', markupKey: 'standardMarkup', dayKey: 'standardUpToDays', help: 'The everyday price once the launch window has passed.' },
        { key: 'runout', label: 'Runout', markupKey: 'runoutMarkup', dayKey: null, help: 'What is left is cleared at this price. It has no boundary of its own.' }
      ]
    },

    /** The four 30-day bands stock sells over, each with the price the boundaries give it. */
    bands () {
      const out = []
      for (let b = 1; b <= 4; b++) {
        const days = b * 30
        const rung = days <= this.numOf('newUpToDays')
          ? 'new'
          : (days <= this.numOf('standardUpToDays') ? 'standard' : 'runout')
        const spec = this.rungs.filter(r => r.key === rung)[0]
        out.push({
          days,
          range: (days - 29) + '–' + days + ' days',
          rung,
          label: spec.label,
          markup: this.numOf(spec.markupKey)
        })
      }
      return out
    },

    /**
     * A rung no band reaches — the ladder has a dead rung and a third of it is unused. Not
     * refused by the backend, because "every band sells at the new price" is a legitimate
     * thing for a mentor to want; it is simply never what somebody means by accident.
     * @returns {string} the rung's label, or '' when all three are in use.
     */
    deadRung () {
      const used = this.bands.map(b => b.rung)
      const missing = this.rungs.filter(r => !used.includes(r.key))
      return missing.length === 1 ? missing[0].label : ''
    },

    /** Does the ladder go UP with age? Allowed, and almost always a typo. */
    ladderRises () {
      return this.numOf('runoutMarkup') > this.numOf('newMarkup')
    },

    /** The runout rung's "applies to" text — derived, because the engine has no boundary. */
    runoutSentence () {
      const std = this.numOf('standardUpToDays')
      return std ? 'anything older than ' + std + ' days' : 'everything left over'
    },

    /** The chosen shape's four bands, said in words rather than left as a name. */
    patternSentence () {
      const p = this.patterns.filter(x => x.name === this.form.defaultPattern)[0]
      if (!p) { return '' }
      return p.curve.map(v => Math.round(v * 100) + '%').join(' / ') + ' of the container, band by band'
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
        const data = await this.api('GET', '/api/firm-manager/sell-down')
        this.own = data.own || {}
        this.applyToForm(data.resolved || {})
      } catch (err) {
        this.saveError = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Put backend values into the form. Markups arrive as decimals and are shown as
     * percentages; the rounding is what stops 1.85 x 100 arriving in the box as
     * 185.00000000000003.
     * @param {object} sellDown - `{ladder, defaultPattern, patterns}`
     */
    applyToForm (sellDown) {
      const ladder = sellDown.ladder || {}
      this.patterns = sellDown.patterns || []
      const pct = v => (v === null || v === undefined ? '' : String(Math.round(v * 10000) / 100))
      const whole = v => (v === null || v === undefined ? '' : String(v))
      this.$set(this.form, 'ladder', {
        newMarkup: pct(ladder.newMarkup),
        standardMarkup: pct(ladder.standardMarkup),
        runoutMarkup: pct(ladder.runoutMarkup),
        newUpToDays: whole(ladder.newUpToDays),
        standardUpToDays: whole(ladder.standardUpToDays)
      })
      this.$set(this.form, 'defaultPattern', sellDown.defaultPattern || '')
    },

    /**
     * One form field as a number, for the derived blocks. A half-typed box reads as 0,
     * which puts every band on the runout rung until the manager finishes typing — visibly
     * wrong for a moment rather than quietly wrong afterwards.
     * @param {string} key @returns {number}
     */
    numOf (key) {
      const n = Number(this.form.ladder[key])
      return isFinite(n) ? n : 0
    },

    /**
     * What 100 of landed cost sells for at this rung — the markup said in the terms a
     * mentor recognises from their own workbook, rather than as an abstract percentage.
     * @param {string} key @returns {string}
     */
    pricePer100 (key) {
      const n = this.numOf(key)
      return String(Math.round((100 + n) * 100) / 100)
    },

    /**
     * Is this figure one THIS level changed, rather than one it inherits?
     * @param {string} key - a ladder key
     * @returns {boolean}
     */
    isOwn (key) {
      return Boolean(this.own.ladder && Object.prototype.hasOwnProperty.call(this.own.ladder, key))
    },

    /**
     * Everything on the form, as the backend wants it. The whole ladder is sent rather than
     * a diff: a manager who opened this tab and pressed Save has decided every figure on
     * it, including the ones that happened to match the level above. Markups go back as
     * decimals — the units the engine prices in.
     * @returns {object}
     */
    payload () {
      const num = (v) => {
        const n = Number(v)
        return isFinite(n) ? n : null
      }
      return {
        ladder: {
          newMarkup: num(this.form.ladder.newMarkup) / 100,
          standardMarkup: num(this.form.ladder.standardMarkup) / 100,
          runoutMarkup: num(this.form.ladder.runoutMarkup) / 100,
          newUpToDays: num(this.form.ladder.newUpToDays),
          standardUpToDays: num(this.form.ladder.standardUpToDays)
        },
        defaultPattern: this.form.defaultPattern
      }
    },

    async save () {
      this.saving = true
      this.saveError = ''
      try {
        const data = await this.api('POST', '/api/firm-manager/sell-down', { sellDown: this.payload() })
        this.own = data.own || {}
        this.applyToForm(data.resolved || {})
        this.$buefy.toast.open({ message: 'Ladder saved', type: 'is-success' })
        if (this.showHistory) { await this.loadHistory() }
      } catch (err) {
        this.saveError = err.message
      } finally {
        this.saving = false
      }
    },

    /**
     * Clearing this level's changes is not undoable from the screen and hands the whole
     * ladder back to the level above — so it asks first.
     */
    confirmReset () {
      this.$buefy.dialog.confirm({
        title: 'Go back to the inherited ladder',
        message: 'This level will stop holding its own prices and will take them from the level above again. New forecasts here will open on that level\'s ladder.',
        confirmText: 'Go back to inherited',
        type: 'is-warning',
        onConfirm: () => this.reset()
      })
    },

    async reset () {
      this.saving = true
      this.saveError = ''
      try {
        const data = await this.api('POST', '/api/firm-manager/sell-down', { sellDown: {} })
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
        const data = await this.api('GET', '/api/firm-manager/sell-down/history')
        this.history = data.history || []
      } catch (err) {
        this.saveError = err.message
      }
    },

    async restore (versionId) {
      try {
        await this.api('POST', '/api/firm-manager/sell-down/restore', { versionId })
        await this.load()
        this.$buefy.toast.open({ message: 'That version is back in force', type: 'is-success' })
      } catch (err) {
        this.saveError = err.message
      }
    },

    /**
     * Thin authenticated fetch — mirrors FirmForecastTrendThresholds's helper so this tab
     * can be mounted and tested on its own; the backend re-checks authorisation on every
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
.fsd-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 130px 150px 170px 110px;
  gap: 0.75rem;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f3f7;
}
.fsd-row:last-child { border-bottom: 0; }
/* The header row is labels, not controls — smaller, quieter, and no bottom rule of its
   own so it reads as the top of the table rather than a row in it. */
.fsd-head {
  border-bottom: 1px solid #dfe6ee;
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #7a8ba0;
  font-weight: 600;
}
.fsd-label .label { margin-bottom: 0.1rem; }
.fsd-source { text-align: right; }

/* The four 30-day bands. Colour carries the rung so the shape of the ladder is readable
   without comparing three numbers — it is never the only signal, since each band names
   its rung in words too. */
.fsd-bands { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.5rem; }
.fsd-band { border-radius: 4px; padding: 0.6rem 0.7rem; border: 1px solid #dfe6ee; }
.fsd-band-days { font-size: 0.7rem; letter-spacing: 0.04em; text-transform: uppercase; color: #7a8ba0; }
.fsd-band-rung { font-weight: 600; font-size: 0.85rem; }
.fsd-band-mark { font-size: 0.8rem; color: #4a5a6a; }
.fsd-band.is-new { background: #eef6ff; border-color: #cfe3f7; }
.fsd-band.is-standard { background: #f2f8f2; border-color: #d6e8d6; }
.fsd-band.is-runout { background: #fdf5ee; border-color: #f0dcc8; }

.fsd-pattern { display: grid; grid-template-columns: 200px minmax(0, 1fr) 110px; gap: 0.75rem; align-items: center; }

@media (max-width: 900px) {
  .fsd-row, .fsd-pattern { grid-template-columns: 1fr; }
  .fsd-head { display: none; }
  .fsd-source { text-align: left; }
  .fsd-bands { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
