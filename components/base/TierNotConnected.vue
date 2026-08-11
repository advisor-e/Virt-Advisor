<template lang="pug">
b-notification.tier-not-connected(type="is-info is-light" :closable="false")
  p {{ $t('tierNotConnected.firmsNotMapped') }}
</template>

<script>
/**
 * TierNotConnected — the panel a Global Group Manager Hub or a Group Manager Hub
 * shows in place of a report that has no firms mapped beneath it yet.
 *
 * 🔴 WHY A COMPONENT EXISTS FOR ONE SENTENCE. Five reports reach this state, and a
 * blank panel is what each of them would otherwise show. An empty report and an
 * unconnected one look identical on screen and mean opposite things — the first
 * says a customer's firms are not using the app, which would be a false and
 * discouraging statement to put in front of their own senior manager. The rule is
 * Mike's, recorded on 2026-08-10 as artefact §4.4 and standing since
 * COLLABORATE-MERGE-PLAN.md §4.3: "Where a stub is the honest answer, it says so on
 * screen rather than showing an empty roll-up that looks like real data with
 * nothing in it."
 *
 * ⚠ IT IS NOT AN ERROR AND MUST NOT LOOK LIKE ONE. Nothing has failed: the tier
 * works, and the firm-to-group mapping has not been supplied by the master team
 * yet. `is-info`, not `is-warning`.
 *
 * ⚠ THE SENTENCE IS THE APPROVED ONE, WORD FOR WORD, from the §4 wording table of
 * design/mockups/tier-hub-pages.html — the row "Firms not yet mapped". It is one
 * sentence there and it is one sentence here; a second explanatory line would be
 * new wording, and wording is Mike's to rule, not a build's to invent.
 *
 * ⚠ THE CALLER DECIDES WHEN TO SHOW IT, from the `awaitingFirms` flag its report
 * returns — never from the scope prop. The backend is the only place that knows
 * whether any firm is mapped beneath the caller, and a screen inferring it from its
 * own tier would be right today and wrong the moment the mapping lands.
 *
 * @example
 *   tier-not-connected(v-if="awaitingFirms")
 */
export default {
  name: 'TierNotConnected'
}
</script>

<style scoped>
.tier-not-connected {
  margin-bottom: 0;
}
</style>
