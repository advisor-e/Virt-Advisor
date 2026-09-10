<template lang="pug">
.ddr
  .notification.is-info.is-light.py-3.mb-4
    p.is-size-7
      | #[b Nothing on this page is read by anything until you approve it.] Until then a
      |  {{ document.country }} client's forecast keeps the figures it uses today. The wording
      |  beside each rate is the document's own, not ours.

  //- 1 · Six decisions, not one hundred and fifty-six.
  .box
    .level.is-mobile.mb-2
      .level-left
        p.has-text-weight-semibold Which published class is each category?
      .level-right
        b-button(
          size="is-small"
          type="is-light"
          :disabled="!unconfirmedCount"
          @click="confirmAllMatched"
        ) Confirm all matched

    p.is-size-7.has-text-grey.mb-3
      | {{ document.documentName }} read — #[b {{ matchedCount }} of {{ totalCount }} categories matched]{{ unconfirmedCount ? `, ${unconfirmedCount} still need you` : '' }}.
      | #[b Check each match before you approve the rates] — a category matched to the wrong
      |  class produces a wrong rate carrying a real page number.

    .ddr-row.ddr-head
      span Your category
      span Matched to
      span Rate
      span State

    template(v-for="row in rows")
      .ddr-row(:key="row.key")
        .ddr-cell
          label.label.is-small.mb-0 {{ row.label }}
        .ddr-cell
          template(v-if="row.matched")
            p.is-size-7 {{ row.className }}
            p.is-size-7.has-text-grey {{ row.sourceLine }}
          p.is-size-7.has-text-grey(v-else)
            | No class in this document is a clear match. This category keeps the figure it uses
            |  today and is listed under the gaps below.
        span.ddr-num {{ row.rateText }}
        .ddr-state
          b-tag(v-if="!row.matched" type="is-danger is-light" size="is-small") No match
          b-tag(v-else-if="row.confirmed" type="is-success is-light" size="is-small") Confirmed
          b-button(
            v-else
            size="is-small"
            type="is-light"
            @click="confirmMatch(row.key)"
          ) Confirm
          b-button(
            size="is-small"
            type="is-text"
            :disabled="!classes.length"
            @click="openPicker(row.key)"
          ) {{ row.matched ? 'Change' : 'Choose a class' }}

      //- 2 · Changing a match. Opened from the row it belongs to, so the category being
      //-     re-matched is never in doubt.
      .ddr-picker(v-if="picking === row.key" :key="row.key + '-picker'")
        p.has-text-weight-semibold.is-size-7.mb-1 {{ row.label }} — choose the published class
        p.is-size-7.has-text-grey.mb-2
          | {{ classes.length }} classes in {{ document.documentName }} · type to narrow.
          | #[b This is what the document itself publishes] — whatever you choose brings its
          |  own page and date.
        b-input(
          v-model="search"
          size="is-small"
          placeholder="Search the document's classes"
          icon="magnify"
        )
        p.is-size-7.has-text-grey.mt-2(v-if="!filteredClasses.length") Nothing in this document matches that.
        .ddr-options(v-else)
          .ddr-option(
            v-for="(cls, i) in filteredClasses"
            :key="i"
            :class="{ 'is-chosen': chosenLabel === cls.label }"
            @click="chosenLabel = cls.label"
          )
            span.is-size-7 {{ cls.label }}
            span.ddr-num.is-size-7 {{ percentText(operativeOf(cls)) }} · {{ cls.source && cls.source.page ? 'p.' + cls.source.page : 'no page' }}
        .buttons.mt-3
          b-button(
            type="is-primary"
            size="is-small"
            :disabled="!chosenLabel"
            @click="useChosenClass(row.key)"
          ) Use this class
          b-button(size="is-small" type="is-light" @click="closePicker") Cancel

  //- 3 · The rates themselves, which the manager may correct before approving.
  .box
    p.has-text-weight-semibold.mb-1 The rates you are approving
    p.is-size-7.has-text-grey.mb-3
      | #[b What you approve is what the app uses, not what the AI said.] The rate the forecast
      |  charges is the one for this document's method — change it here and your figure is the
      |  one stored, still showing the document it came from.

    p.is-size-7.has-text-grey(v-if="!matchedCount") This document proposed no rates at all. There is nothing here to approve.

    table.table.is-fullwidth.is-narrow(v-else)
      thead
        tr
          th Asset class
          th Life
          th Basis
          th Rate the forecast would use
          th Used today
      tbody
        tr(v-for="row in matchedRows" :key="row.key")
          td
            b.is-size-7 {{ row.label }}
            p.is-size-7.has-text-grey {{ row.className }}
            p.is-size-7.has-text-grey {{ row.sourceLine }}
          td.is-size-7 {{ row.lifeText }}
          td.is-size-7 {{ row.methodText }}
          td
            b-field(:type="row.error ? 'is-danger' : ''" :message="row.error")
              b-input(
                :value="row.percentValue"
                type="number"
                step="0.1"
                min="0"
                max="100"
                size="is-small"
                style="width: 7rem"
                @input="setPercent(row.key, $event)"
              )
          td
            span.ddr-num.is-size-7 {{ row.currentText }}
            br
            b-tag(:type="row.currentIsDefault ? 'is-light' : 'is-info is-light'" size="is-small") {{ row.currentOrigin }}

  //- 4 · What the AI could NOT find. Named, because an absence looks identical to a negative.
  .box
    p.has-text-weight-semibold.mb-2 Gaps in what was loaded
    ul.ddr-gaps
      li(v-if="!document.firstYearRuleFound")
        | #[b No first-year or accelerated-deduction rule was found in this document.] The newest
        |  document held for {{ document.country }} is dated {{ newestPublished || 'unknown' }}. If a scheme
        |  was introduced after that date, nothing loaded here would mention it.
      li(v-if="unmatchedLabels.length")
        | #[b {{ unmatchedLabels.length }} of the six asset categories matched no class] in this document —
        | {{ unmatchedLabels.join(', ') }}. They keep the figures they use today, marked as app defaults
        |  on every forecast.
      li(v-if="document.refusedRows")
        | #[b {{ document.refusedRows }} proposed {{ document.refusedRows === 1 ? 'row was' : 'rows were' }} refused] for
        |  carrying a rate, a class or a page we could not use. Nothing was taken from
        | {{ document.refusedRows === 1 ? 'it' : 'them' }}.
      //- The entries the document itself could not settle. Named with their pages so a
        manager can look, rather than dropped where nobody would know they existed.
      li(v-if="unresolved.length")
        | #[b {{ unresolved.length }} {{ unresolved.length === 1 ? 'entry' : 'entries' }} could not be settled]
        |  from this document and {{ unresolved.length === 1 ? 'was' : 'were' }} left out. Check
        | {{ unresolved.length === 1 ? 'it' : 'them' }} against the pages named:
        ul.ddr-unresolved
          li(v-for="(u, i) in unresolved" :key="i")
            | {{ u.label }}
            template(v-if="u.pages") &nbsp;— page {{ u.pages }}
            template(v-if="u.differs") &nbsp;— {{ u.differs }}
      li(v-if="!gapCount") #[b Nothing was missing.] All six categories matched a published class, and a first-year rule was found.

  b-message(v-if="error" type="is-danger" size="is-small") {{ error }}

  .buttons
    b-button(
      type="is-primary"
      :loading="saving"
      :disabled="!canApprove"
      @click="confirmApprove"
    ) Approve {{ matchedCount }} {{ matchedCount === 1 ? 'rate' : 'rates' }}
    b-button(type="is-light" :loading="saving" @click="confirmReject") Reject
  p.is-size-7.has-text-grey(v-if="!canApprove && matchedCount")
    | Confirm every matched class first — that is the check this step exists for.
</template>

<script>
/**
 * DepreciationDocumentReview — one loaded tax-authority document, from what the model read
 * out of it to the manager's decision on it. Item 4.78, slice 3b.
 *
 * Built from two approved drawings, and both are the record rather than this comment:
 * `design/mockups/depreciation-rates-upload.html` (approved 2026-09-08) §3 and §4, and its
 * addendum `design/mockups/depreciation-rates-class-match.html` (2026-09-09) for the match
 * step. Differences between the two drawings and this build are named in
 * `design/features/depreciation-rates-history.md`.
 *
 * 🔴 THE MANAGER CONFIRMS EVERY MATCH BEFORE ANYTHING CAN BE APPROVED — Mike's ruling of
 * 2026-09-09 (P10). A tax authority publishes around 156 classes and the forecast has six
 * categories; a category matched to the wrong class yields a wrong rate carrying a real
 * document, a real page and a real date, which is the most convincing kind of wrong. The
 * Approve button is disabled until each proposed row has been confirmed.
 *
 * 🔴 A RATE IS TYPED AS A PERCENTAGE AND STORED AS A DECIMAL, and the conversion happens
 * here, once. The store's convention is decimal (50% is 0.5) because the forecast engine
 * multiplies book value by the number directly, and a 50 reaching it would depreciate an
 * asset by 5000% a year. The screen speaks percentages because every rate a manager has ever
 * read is a percentage. Neither side bends: `setPercent` is the single seam.
 *
 * ⚠ IT DECIDES NOTHING ITSELF. Approving and rejecting are emitted to the tab, which holds
 * the token and calls the routes; the backend re-checks the manager's authorisation and
 * re-validates every figure regardless of what this screen sends.
 *
 * ⚠ STRINGS ARE HARDCODED ENGLISH, matching `FirmDepreciationRates.vue` and four of its five
 * sibling tabs, against the i18n standard in `CLAUDE.md`. The deviation is recorded there and
 * converting all five is one job rather than six.
 */
export default {
  name: 'DepreciationDocumentReview',

  props: {
    /** The pending document record, as `server/utils/depreciationProposals.js` stores it. */
    document: { type: Object, required: true },
    /** What this level resolves to today, so each row can show the figure it would replace. */
    resolved: { type: Object, default: () => ({ categories: {} }) },
    /** The publication date of the newest document held for this country, for the gaps panel. */
    newestPublished: { type: String, default: '' },
    /** True while the tab is calling the backend. */
    saving: { type: Boolean, default: false },
    /** A message from the last failed call, shown above the buttons. */
    error: { type: String, default: '' }
  },

  data () {
    return {
      /** The manager's working copy of the six entries, keyed by category. */
      edits: {},
      /** Which categories the manager has confirmed the match of. */
      confirmed: {},
      /** The category whose picker is open, or '' for none. */
      picking: '',
      /** The picker's filter text. */
      search: '',
      /** The label chosen in the open picker, before Use this class is pressed. */
      chosenLabel: '',
      /** Per-category message when a typed rate cannot be used. */
      errors: {}
    }
  },

  computed: {
    /** The six category labels, in the order the forecast holds them. */
    categoryLabels () {
      return {
        vehicles: 'Vehicles',
        leaseholdImprovements: 'Leasehold improvements',
        plantEquipment: 'Plant and equipment',
        officeEquipment: 'Office equipment',
        computerHardware: 'Computer hardware',
        other: 'Other'
      }
    },

    /** The document's published classes, which the picker offers. */
    classes () {
      return Array.isArray(this.document.classes) ? this.document.classes : []
    },

    /** Those classes narrowed by the picker's search box. */
    filteredClasses () {
      const term = String(this.search || '').trim().toLowerCase()
      if (!term) { return this.classes }
      return this.classes.filter(c => String(c.label || '').toLowerCase().includes(term))
    },

    /** All six rows, matched or not, in the forecast's own order. */
    rows () {
      return Object.keys(this.categoryLabels).map((key) => {
        const entry = this.edits[key] || null
        const current = (this.resolved.categories || {})[key] || null
        const percent = entry === null ? null : this.operativeOf(entry)
        return {
          key,
          label: this.categoryLabels[key],
          matched: entry !== null,
          confirmed: this.confirmed[key] === true,
          className: entry ? entry.label : '',
          sourceLine: entry ? this.sourceLine(entry) : '',
          rateText: this.percentText(percent),
          percentValue: percent === null ? '' : String(Math.round(percent * 1000) / 10),
          lifeText: entry && entry.lifeYears ? entry.lifeYears + ' yrs' : '—',
          methodText: entry && entry.method === 'sl' ? 'straight line' : 'diminishing value',
          currentText: this.percentText(current ? this.operativeOf(current) : null),
          currentOrigin: current && current.originTier ? this.originLabel(current.originTier) : 'app default',
          currentIsDefault: !(current && current.originTier),
          error: this.errors[key] || ''
        }
      })
    },

    /** Only the rows the document actually proposed a class for. */
    matchedRows () {
      return this.rows.filter(r => r.matched)
    },

    totalCount () {
      return Object.keys(this.categoryLabels).length
    },

    matchedCount () {
      return this.matchedRows.length
    },

    /** Matched rows the manager has not yet confirmed. Approve waits on this reaching zero. */
    unconfirmedCount () {
      return this.matchedRows.filter(r => !r.confirmed).length
    },

    /** The categories with no proposed class, in the words the manager reads elsewhere. */
    unmatchedLabels () {
      return this.rows.filter(r => !r.matched).map(r => r.label)
    },

    /**
     * Entries the document could not settle — the same class printed twice with figures that
     * disagree, and the like. They carry no rate and nothing is ever taken from them; they are
     * here so a dropped entry is visible rather than silently absent.
     */
    unresolved () {
      return Array.isArray(this.document.unresolved) ? this.document.unresolved : []
    },

    /** How many things the gaps panel has to report. */
    gapCount () {
      return (this.document.firstYearRuleFound ? 0 : 1) +
        this.unmatchedLabels.length +
        (this.document.refusedRows ? 1 : 0) +
        (this.unresolved.length ? 1 : 0)
    },

    /**
     * Approve is open only when every matched class has been confirmed and every rate on
     * screen is usable. A document that proposed nothing cannot be approved at all — there
     * would be no figures to store.
     */
    canApprove () {
      if (!this.matchedCount) { return false }
      if (this.unconfirmedCount) { return false }
      return Object.keys(this.errors).filter(k => this.errors[k]).length === 0
    }
  },

  mounted () {
    this.reset()
  },

  methods: {
    /** Takes a fresh working copy of the document's proposal. */
    reset () {
      const proposed = this.document.categories || {}
      const edits = {}
      Object.keys(proposed).forEach((key) => {
        edits[key] = JSON.parse(JSON.stringify(proposed[key]))
      })
      this.edits = edits
      this.confirmed = {}
      this.errors = {}
      this.picking = ''
      this.search = ''
      this.chosenLabel = ''
    },

    /**
     * The rate the forecast would actually charge for an entry — the one its method names.
     * @param {object} entry - a store-shaped category or class entry
     * @returns {number|null}
     */
    operativeOf (entry) {
      if (!entry) { return null }
      const rate = entry.method === 'sl' ? entry.slRate : entry.dvRate
      return typeof rate === 'number' ? rate : null
    },

    /**
     * A decimal rate as the percentage a manager reads.
     * @param {number|null} rate
     * @returns {string}
     */
    percentText (rate) {
      if (rate === null || rate === undefined) { return '—' }
      return (Math.round(rate * 1000) / 10) + '%'
    },

    /**
     * Where a figure came from, as one line: the document, its page, its date.
     * @param {object} entry
     * @returns {string}
     */
    sourceLine (entry) {
      const s = entry && entry.source
      if (!s) { return '' }
      return s.document + (s.page ? ', p.' + s.page : '') + ' · ' + s.published
    },

    /**
     * Which tier a rate in force came from, in the words used on the forecast itself.
     * @param {string} tier
     * @returns {string}
     */
    originLabel (tier) {
      const names = {
        mentor: 'Advisor-e',
        global_group_manager: 'your global group',
        group_manager: 'your group',
        firm_manager: 'your firm'
      }
      return names[tier] || tier
    },

    /** @param {string} key - a category */
    confirmMatch (key) {
      this.$set(this.confirmed, key, true)
    },

    /** Confirms every matched row at once — the drawing's own control. */
    confirmAllMatched () {
      this.matchedRows.forEach((row) => { this.$set(this.confirmed, row.key, true) })
    },

    /** @param {string} key - the category being re-matched */
    openPicker (key) {
      this.picking = key
      this.search = ''
      this.chosenLabel = this.edits[key] ? this.edits[key].label : ''
    },

    closePicker () {
      this.picking = ''
      this.search = ''
      this.chosenLabel = ''
    },

    /**
     * Replaces a category's whole entry with the published class the manager chose, so the
     * rate, the wording, the page and the date all move together. Taking only the rate would
     * leave a figure sitting under another class's citation.
     *
     * ⚠ CHOOSING A CLASS ALSO CONFIRMS THE MATCH. The manager has just made it themselves,
     * and asking them to confirm their own choice is a click that means nothing.
     *
     * @param {string} key - the category
     */
    useChosenClass (key) {
      const chosen = this.classes.filter(c => c.label === this.chosenLabel)[0]
      if (!chosen) { return }
      this.$set(this.edits, key, JSON.parse(JSON.stringify(chosen)))
      this.$set(this.confirmed, key, true)
      this.$delete(this.errors, key)
      this.closePicker()
    },

    /**
     * Writes a typed percentage back to the working copy as the decimal the store holds.
     *
     * 🔴 REFUSED, NEVER RESCALED OR CLAMPED. A rate typed in the wrong unit is not a bad
     * rate, it is a different number: 50 read as 5000% would depreciate an asset to nothing
     * in a forecast that still balances. An unusable figure blocks Approve and says why.
     *
     * @param {string} key - the category
     * @param {string|number} value - what the manager typed, as a percentage
     */
    setPercent (key, value) {
      const entry = this.edits[key]
      if (!entry) { return }

      const typed = typeof value === 'number' ? value : parseFloat(String(value).trim())
      if (!Number.isFinite(typed) || typed <= 0 || typed > 100) {
        this.$set(this.errors, key, 'A rate is a percentage above 0 and no more than 100.')
        return
      }

      this.$delete(this.errors, key)
      const next = Object.assign({}, entry)
      // Only the rate the method names is written. The other one stays exactly as the
      // document published it, so the pair on screen never becomes half document, half typed.
      if (next.method === 'sl') { next.slRate = typed / 100 } else { next.dvRate = typed / 100 }
      this.$set(this.edits, key, next)
    },

    confirmApprove () {
      this.$buefy.dialog.confirm({
        title: 'Approve these rates',
        message: 'Every ' + this.document.country + ' client\'s forecast will depreciate assets at ' +
          'these rates from now on. Forecasts already open are not changed.',
        confirmText: 'Approve them',
        type: 'is-info',
        onConfirm: () => {
          // The manager's own figures for this document — corrections included, never the
          // model's untouched proposal. Payload: { documentId, categories }.
          this.$emit('approve', { documentId: this.document.id, categories: this.edits })
        }
      })
    },

    confirmReject () {
      this.$buefy.dialog.confirm({
        title: 'Reject this document',
        message: 'Nothing was using it, so the rates in force do not change. The document stays ' +
          'on the list, marked rejected.',
        confirmText: 'Reject it',
        type: 'is-warning',
        onConfirm: () => {
          // Payload: { documentId }.
          this.$emit('reject', { documentId: this.document.id })
        }
      })
    }
  }
}
</script>

<style scoped>
.ddr-row {
  display: grid;
  grid-template-columns: minmax(0, 0.7fr) minmax(0, 1.6fr) 90px 200px;
  gap: 0.75rem;
  align-items: start;
  padding: 0.6rem 0;
  border-bottom: 1px solid #f0f3f7;
}
/* The header row is labels rather than controls — quieter, and matched to the sibling tabs. */
.ddr-head {
  border-bottom: 1px solid #dfe6ee;
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #7a8ba0;
  font-weight: 600;
}
.ddr-num {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.ddr-state {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  flex-wrap: wrap;
}
/* The picker opens under the row it belongs to, inset so the category being re-matched is
   never in doubt. */
.ddr-picker {
  background: #f1f6fb;
  border: 1px solid #d5e1ee;
  border-radius: 10px;
  padding: 0.75rem 0.9rem;
  margin: 0 0 0.6rem 0.5rem;
}
.ddr-options {
  max-height: 15rem;
  overflow-y: auto;
  margin-top: 0.5rem;
  background: #fff;
  border: 1px solid #d5e1ee;
  border-radius: 8px;
}
.ddr-option {
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid #f0f3f7;
  cursor: pointer;
}
.ddr-option:last-child { border-bottom: 0; }
.ddr-option:hover { background: #f1f6fb; }
.ddr-option.is-chosen {
  background: #e6f2fb;
  box-shadow: inset 3px 0 0 #0070c0;
}
.ddr-gaps {
  list-style: disc;
  padding-left: 1.2rem;
  font-size: 0.85rem;
}
.ddr-gaps li { margin: 0.35rem 0; }
.ddr-unresolved {
  list-style: circle;
  padding-left: 1.1rem;
  margin-top: 0.25rem;
  color: #4a4a4a;
}
</style>
