<template lang="pug">
.sth
  .sth-wrap
    .sth-eyebrow {{ $t('salesTrackerHome.eyebrow') }}
    h1.sth-h1 {{ $t('salesTrackerHome.title') }}
    p.sth-lede {{ $t('salesTrackerHome.lede') }}

    //- The advisor's three screens. Every card is a nuxt-link, so middle-click and
    //- open-in-new-tab keep working — the same choice the Model Library made.
    .sth-grid
      nuxt-link.sth-card(v-for="card in cards" :key="card.route" :to="card.route")
        .sth-chead
          .sth-ico(:style="{ background: card.tint }")
            svg(viewBox="0 0 24 24" aria-hidden="true")
              template(v-if="card.icon === 'pipeline'")
                path(d="M3 5h18")
                path(d="M6 12h12")
                path(d="M10 19h4")
              template(v-else-if="card.icon === 'partners'")
                circle(cx="9" cy="8" r="3")
                path(d="M3 20a6 6 0 0 1 12 0")
                path(d="M16 7a3 3 0 0 1 0 6")
                path(d="M18.5 20a5 5 0 0 0-2.5-4")
              template(v-else)
                path(d="M4 19V9")
                path(d="M10 19V5")
                path(d="M16 19v-7")
                path(d="M3 21h18")
          .sth-cname {{ card.title }}
        p.sth-cdesc {{ card.description }}
        .sth-cgo
          span {{ $t('salesTrackerHome.open') }}
          span.sth-arrow(aria-hidden="true") →

    //- The manager's two screens are NOT cards here. They live in the Firm Manager
    //- Hub, which sits behind requireManagerRole — putting them on an advisor's
    //- landing page would offer every advisor a door that answers 403.
    p.sth-foot {{ $t('salesTrackerHome.managerNote') }}
</template>

<script>
/**
 * The Sales Tracker's landing page — the advisor's doorway (item 17 stage 4).
 *
 * 🔴 IT EXISTS BECAUSE THIS APP HAS NO NAVIGATION OF ITS OWN. `layouts/default.vue`
 * is `div > nuxt` and nothing more: every screen here is reached by Advisor-e
 * deep-linking into it. So the advisor's three Sales Tracker screens had no way of
 * being found at all — an advisor would have had to know and type the address.
 *
 * 🔴 THIS PAGE IS THE STUB FOR THE MASTER TEAM — Mike, 2026-09-22: "when this gets
 * introduced to the master app we need a 'stub' the master coding team can place the
 * landing page/doorway into a page within the main advisor-e app". They place ONE
 * link, to `/sales-tracker`, and every screen below it is reachable. Adding a fourth
 * advisor screen later changes this page, never their link.
 * See design/features/sales-tracker.md §13.
 *
 * ⚠ THE MANAGER'S TWO SCREENS ARE DELIBERATELY ABSENT. The Team roll-up and the
 * Lists are Firm Manager Hub tabs behind `requireManagerRole`; offering them here
 * would give every advisor a door that answers 403.
 */
export default {
  name: 'SalesTrackerHome',

  computed: {
    /**
     * The three advisor screens, in the order an advisor uses them: record the
     * deal, record who sent it, then read what it all adds up to.
     * @returns {{route: string, title: string, description: string, icon: string, tint: string}[]}
     */
    cards () {
      return [
        {
          route: '/sales-pipeline',
          title: this.$t('salesTrackerHome.cards.pipeline.title'),
          description: this.$t('salesTrackerHome.cards.pipeline.description'),
          icon: 'pipeline',
          tint: 'linear-gradient(135deg,#0070c0,#00b1e0)'
        },
        {
          route: '/sales-coi',
          title: this.$t('salesTrackerHome.cards.coi.title'),
          description: this.$t('salesTrackerHome.cards.coi.description'),
          icon: 'partners',
          tint: 'linear-gradient(135deg,#2f7d32,#6fc44e)'
        },
        {
          route: '/sales-tracker-dashboard',
          title: this.$t('salesTrackerHome.cards.dashboard.title'),
          description: this.$t('salesTrackerHome.cards.dashboard.description'),
          icon: 'dashboard',
          tint: 'linear-gradient(135deg,#b56200,#ff9900)'
        }
      ]
    }
  }
}
</script>

<style scoped>
.sth {
  min-height: 100vh;
  background: #eef3f8;
  padding: 2rem 1.25rem 4rem;
}

.sth-wrap { max-width: 980px; margin: 0 auto; }

.sth-eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #0070c0;
}

.sth-h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #002b64;
  margin: 0.3rem 0 0.4rem;
  line-height: 1.12;
}

.sth-lede {
  color: #5b6f8a;
  max-width: 70ch;
  margin: 0 0 1.75rem;
}

.sth-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.sth-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #d5e1ee;
  border-radius: 14px;
  box-shadow: 0 1px 2px #002b640f;
  text-decoration: none;
  color: inherit;
  padding: 15px;
  transition: transform .15s, box-shadow .15s, border-color .15s;
}

a.sth-card:hover {
  transform: translateY(-2px);
  border-color: #0070c0;
  box-shadow: 0 2px 4px #002b6414, 0 14px 28px -16px #002b6440;
}

a.sth-card:focus-visible { outline: 2px solid #00b1e0; outline-offset: 2px; }

.sth-chead { display: flex; align-items: center; gap: 11px; }

.sth-ico {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sth-ico svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: #fff;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sth-cname { font-weight: 700; color: #002b64; font-size: 1.02rem; }

.sth-cdesc {
  color: #5b6f8a;
  font-size: 0.87rem;
  line-height: 1.5;
  margin: 0.7rem 0 0;
  flex: 1;
}

.sth-cgo {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 0.9rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #0070c0;
}

.sth-foot {
  margin-top: 1.5rem;
  font-size: 0.8rem;
  color: #5b6f8a;
}

@media (max-width: 720px) {
  .sth { padding: 1.5rem 0.9rem 3rem; }
  .sth-h1 { font-size: 1.6rem; }
}
</style>
