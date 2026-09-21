<template lang="pug">
sales-team
</template>

<script>
/**
 * /sales-team — the firm-wide roll-up of every advisor's pipeline (item 17 stage 4).
 *
 * 🔴 A MANAGER'S SCREEN, and the only Sales Tracker screen that is. The other
 * three (`/sales-pipeline`, `/sales-coi`, `/sales-tracker-dashboard`) are the
 * advisor's own tool per Mike's ruling of 2026-09-21; this one shows every deal
 * in the firm including private ones, per his ruling of 2026-09-22.
 *
 * The gate is the BACKEND's — `/api/sales/team` sits behind `requireManagerRole`,
 * so an advisor who reaches this address is told plainly rather than shown an
 * empty table. The source app did the reverse: it hid the page with a client-side
 * redirect and left its endpoint open to anyone signed in.
 *
 * The page holds no logic, matching every other page here.
 */
import SalesTeam from '~/components/sales/SalesTeam.vue'

export default {
  name: 'SalesTeamPage',
  components: { SalesTeam },
  head () {
    return { title: this.$t('salesTeam.title') }
  }
}
</script>
