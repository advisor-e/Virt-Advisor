<template lang="pug">
.les-root
  sample-notice(v-if="showSample" :text="$t('report.sampleFigures')")

  .les-card(v-for="grp in groups" :key="grp.key")
    h3.les-title {{ $t('report.loanEstimator.security.' + grp.key + 'Title') }}
    .les-grid
      .les-row.les-head
        span.les-label
        span {{ $t('report.loanEstimator.security.col.value') }}
        span {{ $t('report.loanEstimator.security.col.adjustment') }}
        span {{ $t('report.loanEstimator.security.col.prospects') }}
        span {{ $t('report.loanEstimator.security.col.debt') }}
        span {{ $t('report.loanEstimator.security.col.payments') }}
      .les-row(v-for="cls in grp.classes" :key="cls.key")
        span.les-label {{ cls.label }}
        span.les-derived(
          v-if="derivedKeys.indexOf(cls.key) !== -1"
          :title="$t('report.loanEstimator.security.computedFromSide')"
        ) {{ money(derivedValue(cls.key)) }}
        b-input(v-else v-model.number="rows[cls.key].value" type="number" step="any" size="is-small")
        b-input(v-model.number="rows[cls.key].adjPct" type="number" step="any" size="is-small")
        b-select(v-model="rows[cls.key].prospects" size="is-small")
          option(value="Static") {{ $t('report.loanEstimator.security.prospects.static') }}
          option(value="Growth") {{ $t('report.loanEstimator.security.prospects.growth') }}
          option(value="Decline") {{ $t('report.loanEstimator.security.prospects.decline') }}
        b-input(v-model.number="rows[cls.key].debt" type="number" step="any" size="is-small")
        b-input(v-model.number="rows[cls.key].payments" type="number" step="any" size="is-small")

  .les-side
    .les-card
      h3.les-title {{ $t('report.loanEstimator.security.subTitle') }}
      .les-field
        label {{ $t('report.loanEstimator.security.rentalIncome') }}
        b-input(v-model.number="sub.rentalIncome" type="number" step="any" size="is-small")
      .les-field
        label {{ $t('report.loanEstimator.security.capRate') }}
        b-input(v-model.number="sub.capRatePct" type="number" step="any" size="is-small")
      .les-field
        label {{ $t('report.loanEstimator.security.fonterraShares') }}
        b-input(v-model.number="sub.fonterraShares" type="number" step="any" size="is-small")
      .les-field
        label {{ $t('report.loanEstimator.security.fonterraTradingValue') }}
        b-input(v-model.number="sub.fonterraTradingValue" type="number" step="any" size="is-small")
    .les-card
      h3.les-title {{ $t('report.loanEstimator.security.overdraftTitle') }}
      .les-field
        label {{ $t('report.loanEstimator.security.fundsDrawn') }}
        b-input(v-model.number="overdraft.fundsDrawn" type="number" step="any" size="is-small")
      .les-field
        label {{ $t('report.loanEstimator.security.securedLabel') }}
        b-select(v-model="overdraft.secured" size="is-small")
          option(value="Secured") {{ $t('report.loanEstimator.security.secured') }}
          option(value="Unsecured") {{ $t('report.loanEstimator.security.unsecured') }}

  .les-actions
    b-button(type="is-primary" @click="confirm") {{ $t('report.loanEstimator.security.continue') }}
</template>

<script>
/**
 * LoanEstimatorSecurity — step 1 of the Loan Estimator: the `Capital Input` grid
 * (workbook rows 6–39) where the advisor enters what the client owns and owes,
 * per security class.
 *
 * Row identity (key, label, personal/commercial group) comes single-source from
 * `data/loan-criteria.json` — the same file the backend model reads — so a class
 * renamed in the workbook config renames here with no second copy to drift.
 *
 * Two rows mirror the sheet's own wiring and are therefore DERIVED, not typed:
 * Commercial Property (G21 = D26, net rental income ÷ cap rate) and Fonterra
 * Shares (G39 = D31, shares × trading value). Their inputs live in the side
 * calculations card; the grid shows the computed value read-only.
 *
 * Figures are seeded with the workbook's sample scenario (the same
 * DEFAULT_INPUTS the backend falls back to), flagged by SampleNotice until the
 * advisor returns to this step with confirmed figures of their own.
 *
 * Percent fields are held as display percentages (7, not 0.07) and converted to
 * decimals in the payload — the shape `computeLoanEstimator` expects.
 */
import loanCriteria from '~/data/loan-criteria.json'
import SampleNotice from '~/components/base/SampleNotice.vue'
import currencyMixin from '~/mixins/currencyMixin'

/** The two grid rows whose value is computed from the side calculations. */
const DERIVED_KEYS = ['commercialProperty', 'fonterraShares']

/**
 * The workbook's sample scenario (`Capital Input`), cell-for-cell the backend's
 * DEFAULT_INPUTS with percents in display form. Source cells noted per row.
 */
function sampleRows () {
  return {
    residentialHome: { value: 1350000, adjPct: 2, prospects: 'Static', debt: 1080000, payments: 6632 }, //          r6
    rentalProperty: { value: 865000, adjPct: 7, prospects: 'Decline', debt: 350000, payments: 2321.16 }, //         r8
    boat: { value: 1350000, adjPct: 2, prospects: 'Static', debt: 1080000, payments: 6632 }, //                     r10
    classicCars: { value: 450000, adjPct: 7, prospects: 'Static', debt: 350000, payments: 2321.16 }, //             r12
    artworks: { value: 375000, adjPct: 7, prospects: 'Decline', debt: 350000, payments: 2321.16 }, //               r14
    commercialProperty: { value: null, adjPct: 7, prospects: 'Static', debt: 440000, payments: 0 }, //              r21 (G21=D26)
    plantEquipment: { value: 48000, adjPct: 7, prospects: 'Decline', debt: 12000, payments: 0 }, //                 r23
    vehicles: { value: 65000, adjPct: 7, prospects: 'Static', debt: 18000, payments: 0 }, //                        r25
    inventoryStock: { value: 122000, adjPct: 7, prospects: 'Static', debt: 32000, payments: 5574 }, //              r27
    debtors90: { value: 89000, adjPct: 7, prospects: 'Static', debt: 0, payments: 0 }, //                           r29
    farmDairy: { value: 3750000, adjPct: 7, prospects: 'Decline', debt: 1500000, payments: 13356.95 }, //           r31
    farmSheepBeef: { value: 2569800, adjPct: 7, prospects: 'Static', debt: 120000, payments: 0 }, //                r33
    horticulture: { value: 3500000, adjPct: 7, prospects: 'Static', debt: 2365478, payments: 0 }, //                r35
    glasshouseHorticulture: { value: 1500000, adjPct: 7, prospects: 'Static', debt: 350000, payments: 0 }, //       r37
    fonterraShares: { value: null, adjPct: 7, prospects: 'Static', debt: 12000, payments: 0 } //                    r39 (G39=D31)
  }
}

export default {
  name: 'LoanEstimatorSecurity',

  components: { SampleNotice },

  mixins: [currencyMixin],

  props: {
    /** A previously confirmed payload (stepping back from chip 2/3); null on first entry. */
    restore: { type: Object, default: null }
  },

  data () {
    return {
      rows: sampleRows(),
      // Side calculations (`Capital Input` D22–D31), percents in display form.
      sub: {
        rentalIncome: 67000, //         D22
        capRatePct: 5.05, //            D25
        fonterraShares: 45000, //       D29
        fonterraTradingValue: 3.85 //   D30
      },
      // Overdraft (`Capital Input` D35/C36) — the model reads 'Secured' as true.
      overdraft: { fundsDrawn: 25000, secured: 'Secured' },
      derivedKeys: DERIVED_KEYS,
      // Frozen at created(): whether this entry started from the sample scenario.
      showSample: true
    }
  },

  computed: {
    /** The grid's two group cards, rows in the workbook's own order. */
    groups () {
      const classes = loanCriteria.securityClasses
      return [
        { key: 'personal', classes: classes.filter(c => c.group === 'personal') },
        { key: 'commercial', classes: classes.filter(c => c.group === 'commercial') }
      ]
    }
  },

  created () {
    if (this.restore) {
      this.showSample = false
      this.applyRestore(this.restore)
    }
  },

  methods: {
    /**
     * The sheet's own sub-calculation wiring, shown in the grid read-only:
     * G21 = D26 (rental ÷ cap rate) · G39 = D31 (shares × trading value).
     * @param {string} key one of DERIVED_KEYS
     * @returns {number}
     */
    derivedValue (key) {
      if (key === 'commercialProperty') {
        const rate = Number(this.sub.capRatePct) / 100
        return rate > 0 ? Number(this.sub.rentalIncome) / rate : 0
      }
      return Number(this.sub.fonterraShares) * Number(this.sub.fonterraTradingValue)
    },

    /**
     * Rebuild every field from a confirmed payload, decimals back to display
     * percents (rounded to 2 dp so 0.07 restores as 7, not 7.000000000000001).
     * @param {Object} p a payload previously emitted by confirm()
     */
    applyRestore (p) {
      const rows = this.rows;
      (p.securities || []).forEach((s) => {
        const row = rows[s.key]
        if (!row) { return }
        row.value = DERIVED_KEYS.includes(s.key) ? null : s.value
        row.adjPct = Math.round(s.adjustmentPct * 10000) / 100
        row.prospects = s.prospects
        row.debt = s.currentDebt
        row.payments = s.currentMonthlyPayments
      })
      if (p.subCalculations) {
        this.sub.rentalIncome = p.subCalculations.commercialPropertyRentalIncome
        this.sub.capRatePct = Math.round(p.subCalculations.propertyCapRate * 10000) / 100
        this.sub.fonterraShares = p.subCalculations.fonterraShares
        this.sub.fonterraTradingValue = p.subCalculations.fonterraTradingValue
      }
      if (p.overdraft) {
        this.overdraft.fundsDrawn = p.overdraft.fundsDrawn
        this.overdraft.secured = p.overdraft.secured ? 'Secured' : 'Unsecured'
      }
    },

    /** @returns {Object} the model-shaped inputs block `computeLoanEstimator` expects. */
    payload () {
      const securities = loanCriteria.securityClasses.map((cls) => {
        const row = this.rows[cls.key]
        const value = DERIVED_KEYS.includes(cls.key)
          ? this.derivedValue(cls.key)
          : Number(row.value) || 0
        return {
          key: cls.key,
          value,
          adjustmentPct: (Number(row.adjPct) || 0) / 100,
          prospects: row.prospects,
          currentDebt: Number(row.debt) || 0,
          currentMonthlyPayments: Number(row.payments) || 0
        }
      })
      return {
        securities,
        subCalculations: {
          commercialPropertyRentalIncome: Number(this.sub.rentalIncome) || 0,
          propertyCapRate: (Number(this.sub.capRatePct) || 0) / 100,
          fonterraShares: Number(this.sub.fonterraShares) || 0,
          fonterraTradingValue: Number(this.sub.fonterraTradingValue) || 0
        },
        overdraft: {
          fundsDrawn: Number(this.overdraft.fundsDrawn) || 0,
          secured: this.overdraft.secured === 'Secured'
        }
      }
    },

    confirm () {
      // payload: model-shaped { securities[15], subCalculations, overdraft }, percents as decimals
      this.$emit('confirmed', this.payload())
    }
  }
}
</script>

<style scoped>
.les-card {
  background: #fff; border: 1px solid #d5e1ee; border-radius: 10px;
  padding: 16px 18px; margin-bottom: 14px;
}
.les-title {
  font-size: 13px; font-weight: 700; color: #002b64;
  text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 10px;
}
.les-grid { overflow-x: auto; }
.les-row {
  display: grid; grid-template-columns: 168px repeat(5, minmax(96px, 1fr));
  gap: 8px; align-items: center; padding: 3px 0; min-width: 720px;
}
.les-head span { font-size: 11px; font-weight: 600; color: #5b6f8a; }
.les-label { font-size: 12.5px; font-weight: 600; color: #223a57; }
.les-derived {
  font-size: 12.5px; color: #223a57; background: #eef3f8;
  border: 1px dashed #d5e1ee; border-radius: 6px; padding: 5px 8px;
}
.les-side { display: flex; gap: 14px; flex-wrap: wrap; }
.les-side .les-card { flex: 1 1 280px; }
.les-field { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 3px 0; }
.les-field label { font-size: 12.5px; font-weight: 600; color: #223a57; }
.les-field .control { width: 130px; }
.les-actions { margin-top: 6px; text-align: right; }
</style>
