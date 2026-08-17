<template lang="pug">
report-shell
  multiple-property-assessment
</template>

<script>
/**
 * /multiple-property page — the Multiple Property Assessment, Phase 1
 * (Valuation · Decision class).
 *
 * Thin: wraps the screen in the shared ReportShell (which owns the page frame —
 * canvas, centred 1120px column, padding — and the visual-standard tokens) and
 * renders the screen component. The calc runs backend-only.
 */
import ReportShell from '~/components/base/ReportShell.vue'
import MultiplePropertyAssessment from '~/components/MultiplePropertyAssessment.vue'

export default {
  name: 'MultiplePropertyPage',
  components: { ReportShell, MultiplePropertyAssessment }
}
</script>
