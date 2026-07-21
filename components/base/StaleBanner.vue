<template lang="pug">
.stale
  .stalehead {{ title }}
  p.stalebody {{ message }}
  b-button(type="is-danger" size="is-small" @click="$emit('retry')") {{ retryLabel }}
</template>

<script>
/**
 * StaleBanner — the warning shown when a recompute has FAILED but earlier figures are
 * still on screen. Those figures now describe the previous inputs while looking live,
 * and stale figures presented as live are worse than no figures at all (R9).
 *
 * The parent keeps the `v-if` — it owns the decision to show this — and passes its own
 * wording in, so no screen's text changes as a side effect of the extraction.
 *
 * **Why this component exists at all.** On 2026-07-22 the Eight Levers copy of this
 * banner was found rendering the literal word "true" at the advisor: the Phase 1b mixin
 * conversion replaced that screen's error *string* with a boolean flag and its
 * `{{ error }}` binding was never updated, while the other two copies were fine. Three
 * hand-maintained copies is precisely how that happens. One component makes it
 * impossible.
 *
 * Colours and radius come from CSS custom properties with the Quick Position / EBITDA
 * values as fallbacks, so Eight Levers keeps its own palette *and* its dark-mode
 * overrides by mapping them once on its root — the pattern SliderField already uses.
 *
 * Extracted 2026-07-22 (report-scaffolding Phase 3).
 *
 * @example
 *   stale-banner(
 *     v-if="error"
 *     :title="$t('report.staleTitle')"
 *     :message="$t('report.calcUnreachable')"
 *     :retry-label="$t('report.retry')"
 *     @retry="recompute")
 */
export default {
  name: 'StaleBanner',

  props: {
    /** Heading — e.g. "These figures are out of date". */
    title: { type: String, required: true },
    /**
     * The explanation. A STRING the caller resolves — never the mixin's boolean `error`
     * flag, which is what produced the "true" defect this component exists to prevent.
     */
    message: { type: String, required: true },
    /** Text on the retry button. */
    retryLabel: { type: String, required: true }
  }

  // retry: emitted with no payload when the advisor clicks the retry button — the
  // parent decides what recomputing means for its own screen.
}
</script>

<style scoped>
.stale {
  background: #ff000010;
  border: 1px solid var(--sb-crit, #ff0000);
  border-radius: var(--sb-radius, 14px);
  padding: 12px 14px;
  margin-bottom: var(--sb-gap, 0);
}
.stalehead { font-size: 13px; font-weight: 600; color: var(--sb-crit, #ff0000); margin-bottom: 3px; }
.stalebody { font-size: 12.5px; color: var(--sb-muted, #5b6f8a); margin: 0 0 9px; line-height: 1.5; }
</style>
