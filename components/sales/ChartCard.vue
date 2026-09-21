<template lang="pug">
.box.chart-card(:class="{ wide }")
  p.title.is-6.mb-1 {{ title }}
  p.is-size-7.has-text-grey-light.mb-3(v-if="subtitle") {{ subtitle }}
  .chart-container(:class="chartType || 'default'")
    slot
</template>

<script>
/**
 * ChartCard — the titled white panel each Sales Dashboard chart sits in.
 *
 * A faithful copy of Mike's own `components/dashboard/ChartCard.vue` from
 * advisor-e/sales-tracker-nuxt: same markup, same classes, same heights. Only
 * the prop declarations gained their types, which this repo's standards require
 * and which changes nothing on screen.
 */
export default {
  name: 'ChartCard',

  props: {
    /** The panel's heading. */
    title: { type: String, default: '' },
    /** The quiet line beneath it. */
    subtitle: { type: String, default: '' },
    /** Which fixed height the chart well takes. */
    chartType: {
      type: String,
      default: '',
      validator: v => ['', 'pie', 'doughnut', 'line', 'bar-h', 'bar-v', 'default'].includes(v)
    },
    /** Lets a caller mark the panel as the wide one in a row. */
    wide: { type: Boolean, default: false }
  }
}
</script>

<style scoped>
/* Mike's CSS, copied unchanged. */
.chart-card {
  overflow: hidden;
  min-width: 0;
}

.chart-container {
  position: relative;
  width: 100%;
  max-width: 100%;
}

.chart-container.pie,
.chart-container.doughnut {
  height: 280px;
}

.chart-container.line {
  height: 220px;
}

.chart-container.bar-h {
  height: 200px;
}

.chart-container.bar-v {
  height: 240px;
}

.chart-container.default {
  height: 220px;
}
</style>
