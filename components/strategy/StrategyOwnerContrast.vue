<template lang="pug">
.soc
  p.soc-sub {{ $t('report.ownerExpectations.contrast.subtitle') }}
  table.soc-table
    thead
      tr
        th
        th.soc-own(v-for="(o, i) in contrast.owners" :key="'o' + i" colspan="2") {{ o.name }}
    tbody
      tr.soc-band
        td(:colspan="1 + contrast.owners.length * 2") {{ $t('report.ownerExpectations.contrast.income') }}
      tr(v-for="(label, s) in stageLabels" :key="'inc' + s")
        td {{ label }}
        td.soc-mid(v-for="(o, i) in contrast.owners" :key="'iv' + i" colspan="2") {{ money(o.incomes[s]) }}

      tr.soc-band
        td(:colspan="1 + contrast.owners.length * 2") {{ $t('report.ownerExpectations.contrast.time') }}
      tr(v-for="s in 3" :key="'t' + s")
        td {{ stageNames[s] }}
        td.soc-mid(v-for="(o, i) in contrast.owners" :key="'tv' + i" colspan="2") {{ hoursLeave(o.stages[s - 1]) }}

      tr.soc-band
        td {{ $t('report.ownerExpectations.contrast.tasks') }}
        template(v-for="(o, i) in contrast.owners")
          td.soc-n(:key="'hn' + i") {{ $t('report.ownerExpectations.contrast.now') }}
          td.soc-n(:key="'hf' + i") {{ $t('report.ownerExpectations.contrast.focus') }}
      tr(v-for="task in contrast.tasks" :key="task.name")
        td {{ task.name }}
        template(v-for="(cell, i) in task.cells")
          td.soc-n(:key="'n' + i") {{ cell ? pct(cell.now) : '' }}
          //- Green where the owner's focus is more than their now, red where it is less —
          //- one of the two touches Mike approved on the drawing, 2026-09-25.
          td.soc-n(:key="'f' + i" :class="shift(cell)") {{ cell ? pct(cell.focus) : '' }}

  p.soc-strip
    b {{ $t('report.ownerExpectations.contrast.mustReach') }}
    span(v-for="(label, s) in stageLabels" :key="'rv' + s")  · {{ label }} {{ money(contrast.revenue[s]) }}
</template>

<script>
import currencyMixin from '~/mixins/currencyMixin'

/**
 * StrategyOwnerContrast — the Business Owner Expectations page of a client's strategy plan
 * (item 15.23), drawn from `design/mockups/strategy-concept-owner-expectations.html`,
 * approved by Mike 2026-09-25.
 *
 * Owners across, and down the side what each wants to earn, the hours and leave they want,
 * and how their week splits across tasks now and at focus — his *"who does what in return
 * for what"*. Presentational: every figure arrives in `contrast`, built by
 * `utils/ownerExpectationsPrint.js` from the model's own backend answer.
 */
export default {
  name: 'StrategyOwnerContrast',

  mixins: [currencyMixin],

  props: {
    /** The table, from `contrastFrom()`: `{ years, owners, tasks, revenue }`. */
    contrast: {
      type: Object,
      required: true,
      validator: c => !!c && Array.isArray(c.owners) && Array.isArray(c.tasks)
    },

    /** The session's client, so money prints in that client's currency as on the model's page. */
    clientId: {
      type: String,
      default: ''
    }
  },

  computed: {
    /** "Current", "Stage 1", "Stage 2", "Stage 3" — the model's own words. */
    stageNames () {
      return ['current', 'stage1', 'stage2', 'stage3']
        .map(k => this.$t('report.ownerExpectations.stageShort.' + k))
    },

    /** Each stage with its year, as the model's own screen heads its columns. */
    stageLabels () {
      return this.stageNames.map((name, i) => {
        const year = this.contrast.years[i]
        return year ? this.$t('report.ownerExpectations.stageWithYear', { stage: name, year }) : name
      })
    }
  },

  mounted () {
    if (this.clientId) { this.loadClientCurrency(this.clientId) }
  },

  methods: {
    /** "45 hrs · 6 wks" for one owner at one stage. */
    hoursLeave (stage) {
      const s = stage || {}
      return this.$t('report.ownerExpectations.contrast.hoursLeave', {
        hours: this.num(Number(s.weeklyHours) || 0, 0),
        weeks: this.num(Number(s.leaveWeeks) || 0, 0)
      })
    },

    /** A decimal share as a whole percentage. */
    pct (v) {
      return Math.round((Number(v) || 0) * 100) + '%'
    },

    /** Up, down or level against the owner's own "now". */
    shift (cell) {
      if (!cell || cell.focus === cell.now) { return '' }
      return cell.focus > cell.now ? 'is-up' : 'is-down'
    }
  }
}
</script>

<style scoped>
/* 🔴 SIZED TO CLEAR THE FOOT OF ONE A4 SHEET — measured 2026-09-25 on the workbook's own
   sample: at 3px row padding the table ran 45px past the page's running foot. */
.soc-sub { color: #6b7f99; margin: 0 0 6px; font-size: 12px; }
.soc-table { width: 100%; border-collapse: collapse; font-size: 11px; line-height: 1.3; }
.soc-table th, .soc-table td { padding: 1px 8px; border-bottom: 1px solid #d5e1ee; text-align: left; font-variant-numeric: tabular-nums; }
.soc-own { text-align: center !important; color: #002b64; font-size: 12px; border-bottom: 2px solid #0070c0 !important; }
.soc-band td { background: #f1f6fb; color: #002b64; font-weight: 700; font-size: 10.5px; letter-spacing: 0.05em; text-transform: uppercase; }
.soc-mid { text-align: center !important; }
.soc-n { text-align: right !important; }
.is-up { color: #1d6b2b; font-weight: 700; }
.is-down { color: #c0392b; }
.soc-strip { margin: 10px 0 0; font-size: 12px; color: #002b64; }
</style>
