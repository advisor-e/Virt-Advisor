<template lang="pug">
//- The drawing's logo box (design/mockups/business-performance-report.html, `.logo` and
//- `.logo.big`), now holding the advisor firm's mark instead of the words "Firm logo".
span.drm(:class="{ 'is-big': big, 'has-firm': hasFirm, 'has-logo': !!logo }")
  img.drm-img(v-if="logo" :src="logo" :alt="name")
  template(v-else-if="name")
    i.drm-disc(:style="{ background: colour }") {{ initial }}
    span.drm-name {{ name }}
  template(v-else) {{ $t('report.dashboardReports.doc.firmLogo') }}
</template>

<script>
/**
 * DashboardReportMark — the advisor firm's mark on the Business Performance Report: the
 * big box on the cover and the small one in every page's footer (item 16).
 *
 * Mike's rulings: in client dealings the brand is ALWAYS the advisor's firm, never
 * Advisor-e (2026-09-18); the firm's real logo fills a fixed-height box, and the initials
 * disc is the fallback, never the design (2026-09-22). design/features/white-label.md §3.
 *
 * Three states, in this order:
 * 1. a logo — the firm's own image, contained in the box;
 * 2. a name and no logo — the disc in the firm's colour, with the name beside it;
 * 3. nothing known — the drawing's placeholder, "Firm logo". A made-up initial would be
 *    a made-up firm (the rule `StrategyPlanMark` already applies).
 *
 * Not `StrategyPlanMark`: that one is positioned to the Strategy Planner sheet's geometry,
 * copied from a different approved drawing.
 */
export default {
  name: 'DashboardReportMark',

  props: {
    /** The advisor firm's name. Empty, with no logo, prints the placeholder. */
    name: { type: String, default: '' },
    /** The firm's real logo as an absolute http(s) URL. Empty means use the disc. */
    logo: { type: String, default: '' },
    /** The firm's colour, as a CSS colour — the disc's fill. */
    colour: { type: String, default: '#0070c0' },
    /** The cover's large box. */
    big: { type: Boolean, default: false }
  },

  computed: {
    hasFirm () { return Boolean(this.logo || this.name) },
    /** @returns {string} one letter for the disc */
    initial () { return this.name.trim().charAt(0).toUpperCase() }
  }
}
</script>

<style scoped>
/* The placeholder box — the drawing's `.logo` / `.logo.big`, as the report already drew it. */
.drm {
  display: inline-grid; place-items: center; width: 88px; height: 24px; overflow: hidden;
  border: 1px dashed var(--drd-sky); border-radius: 4px; background: var(--drd-tint-sky);
  color: var(--drd-blue); font-size: 9px; letter-spacing: .06em; text-transform: uppercase;
}
.drm.is-big { width: 170px; height: 52px; font-size: 11px; border-color: #00b1e0; background: rgba(255, 255, 255, .08); color: #7fd3f1; }

/* A known firm: the same fixed height, no dashed placeholder around it. */
.drm.has-firm {
  display: inline-flex; align-items: center; gap: 6px; width: auto; max-width: 220px;
  border: 0; background: none; letter-spacing: 0; text-transform: none; color: inherit;
}
.drm.is-big.has-firm { gap: 10px; max-width: 320px; color: #fff; }
/* A logo on the navy cover sits on a white plate: most logos are drawn for white paper. */
.drm.is-big.has-logo { width: 170px; background: #fff; border-radius: 4px; padding: 6px 10px; }
.drm-img { display: block; max-width: 100%; max-height: 100%; object-fit: contain; }
.drm-disc {
  flex: none; height: 100%; aspect-ratio: 1; border-radius: 50%; display: grid; place-items: center;
  color: #fff; font-style: normal; font-weight: 700; font-size: 11px;
}
.drm.is-big .drm-disc { font-size: 22px; }
.drm-name { font-size: 11.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.drm.is-big .drm-name { font-size: 18px; }
</style>
