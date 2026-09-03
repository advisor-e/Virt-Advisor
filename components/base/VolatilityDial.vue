<template lang="pug">
.vd-gauge
  svg(
    viewBox="0 0 220 210"
    width="220"
    height="210"
    role="img"
    :aria-label="$t('report.volatility.dial.alt', { score: num(score, 2) })")
    path(d="M 59.09 160.91 A 72 72 0 0 1 110 38" fill="none" stroke="#4ca52d" stroke-width="18")
    path(d="M 110 38 A 72 72 0 0 1 176.52 82.45" fill="none" stroke="#ff9900" stroke-width="18")
    path(d="M 176.52 82.45 A 72 72 0 0 1 160.91 160.91" fill="none" stroke="#ff0000" stroke-width="18")
    line(x1="110" y1="29" x2="110" y2="47" stroke="#002b64" stroke-width="2")
    line(x1="184.8" y1="78.1" x2="168.3" y2="86.8" stroke="#002b64" stroke-width="2")
    line(x1="52.7" y1="167.3" x2="65.5" y2="154.5" stroke="#002b64" stroke-width="2")
    line(x1="167.3" y1="167.3" x2="154.5" y2="154.5" stroke="#002b64" stroke-width="2")
    text(x="47" y="181" font-size="10" fill="#5b6f8a" text-anchor="middle") 0
    text(x="110" y="24" font-size="10" fill="#5b6f8a" text-anchor="middle") 50
    text(x="196" y="74" font-size="10" fill="#5b6f8a" text-anchor="middle") 75
    text(x="173" y="181" font-size="10" fill="#5b6f8a" text-anchor="middle") 100
    line(
      :x1="needle.tailX"
      :y1="needle.tailY"
      :x2="needle.tipX"
      :y2="needle.tipY"
      stroke="#002b64"
      stroke-width="3.5"
      stroke-linecap="round")
    circle(cx="110" cy="110" r="8" fill="#002b64")
    circle(cx="110" cy="110" r="3.5" fill="#ffffff")
    text.vd-gauge-v(x="110" y="200" text-anchor="middle") {{ num(score, 2) }}
  .vd-gaugekey
    p.vd-explain {{ $t('report.volatility.dial.explain') }}
    .vd-keyrow
      span.vd-sw(style="background:#4ca52d")
      | {{ $t('report.volatility.dial.keyGood') }}
    .vd-keyrow
      span.vd-sw(style="background:#ff9900")
      | {{ $t('report.volatility.dial.keyWarn') }}
    .vd-keyrow
      span.vd-sw(style="background:#ff0000")
      | {{ $t('report.volatility.dial.keyCrit') }}
    slot
</template>

<script>
/**
 * VolatilityDial — the rev counter from the Volatility Report workbook, and the score
 * beneath it.
 *
 * WHY IT IS A SHARED COMPONENT. It was drawn once and now appears twice: on the Volatility
 * Report itself, and — Mike's ruling of 2026-09-03, against the recommendation — inside the
 * Three-Way Forecast's step 3. The geometry is not decoration: 0 sits at 225° and 100 at
 * −45°, sweeping 270° clockwise, and the green/amber/red boundaries at 50 and 75 were
 * MEASURED from the workbook's own gauge images rather than chosen. Two copies of that
 * would drift, and a needle pointing to a slightly different place on two screens showing
 * the same client is exactly the sort of thing nobody reports.
 *
 * It renders a score and nothing else — no arithmetic. The score comes from
 * `server/report/volatilityModel.js`.
 */
import currencyMixin from '~/mixins/currencyMixin'

export default {
  name: 'VolatilityDial',

  mixins: [currencyMixin],

  props: {
    /** The dial score — `(2 × deviation) ÷ average × 100`, from the model. */
    score: { type: Number, required: true }
  },

  computed: {
    /**
     * The needle, as two points. Scores above 100 peg at the end stop rather than swinging
     * back round, which would read as a low score.
     */
    needle () {
      const score = Math.max(0, Math.min(100, Number(this.score) || 0))
      const rad = (225 - (score / 100) * 270) * Math.PI / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)
      return {
        tipX: 110 + 64 * cos,
        tipY: 110 - 64 * sin,
        tailX: 110 - 14 * cos,
        tailY: 110 + 14 * sin
      }
    }
  }
}
</script>

<style scoped>
.vd-gauge { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
.vd-gauge svg { flex: none; }
.vd-gauge-v {
  font-size: 26px; font-weight: 600; fill: var(--rs-ink);
  font-variant-numeric: tabular-nums;
}
.vd-gaugekey { flex: 1; min-width: 240px; }
.vd-explain { margin: 0 0 8px; font-size: 14px; line-height: 1.6; }
.vd-keyrow { display: flex; align-items: center; gap: 9px; font-size: 12.5px; margin-top: 6px; }
.vd-sw { width: 14px; height: 8px; border-radius: 3px; flex: none; }
</style>
