<template lang="pug">
section.firm-adviser-network
  //- Intro, in the same shape as the Hub's other tabs.
  p.subtitle.is-6.has-text-grey.mb-4 {{ $t('firmAdviserNetwork.lede') }}

  manager-console(embedded)
</template>

<script>
/**
 * FirmAdviserNetwork — the Firm Manager Hub's "Adviser Network" tab.
 *
 * A thin frame, on purpose. The screen itself is Collaborate's ManagerConsole,
 * which is ONE component serving every manager tier (firm → group → global →
 * mentor), each re-scoped by the backend from the verified token. Cloning it into
 * a firm-only version would have forked that, and the tiers above the firm are
 * exactly what this repo has been told to make room for rather than design out
 * (COLLABORATE-MERGE-PLAN.md §4.4). So the Hub supplies the tab chrome and the
 * console is rendered inside it unchanged.
 *
 * What a manager does here: see every adviser in scope with their availability
 * and group count, approve or decline requests to join specialty groups, invite
 * several advisers into a group at once, set whether their advisers may work with
 * advisers outside the firm, and read the activity feed for their scope.
 *
 * The View-as control is deliberately absent in this tab — see ManagerConsole's
 * own header for why, and for what has to land before it comes back.
 */
import ManagerConsole from '~/components/collaborate/shared/ManagerConsole.vue'

export default {
  name: 'FirmAdviserNetwork',

  components: { ManagerConsole }
}
</script>

<style scoped>
/* The console brings its own layout; this tab only removes the top margin the
   Hub's other tabs do not have, so it lines up with its siblings. */
.firm-adviser-network >>> .mc-embedded {
  padding: 0;
}
</style>
