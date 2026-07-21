<template lang="pug">
header.rs-top
  .rs-brand
    nuxt-link.rs-backlink(:to="backTo") {{ backLabel }}
    .rs-eyebrow(v-if="eyebrow") {{ eyebrow }}
    h1.rs-h1 {{ title }}
    .rs-client(v-if="client") {{ client }}
  .rs-badge(v-if="badge") {{ badge }}
</template>

<script>
/**
 * ReportHeader — the banner every report in this section wears: back to the library,
 * which class of report this is, its title, who it is for, and (where it applies) the
 * "Illustrative" marker.
 *
 * **Owner ruling, 2026-07-22: one header for every model in this section — a SOLID
 * `#002b64` banner, no gradient.** Before this, three designs were in circulation: Eight
 * Levers had a dark gradient banner, three screens had a plain header with an amber
 * badge, and the two client-data reports had a plain header defined in their *page*.
 *
 * **The badge is optional, deliberately.** "Illustrative" means *these figures are not
 * your client's*. Quick Position and EBITDA/DCF are built from the client's own Xero
 * exports, so stamping it on them would tell an advisor — in front of their client —
 * that real accounts are dummy data. Omit `badge` and it is not rendered.
 *
 * Named ReportHeader rather than the plan's "ReportShell" because it owns the header
 * band only; page layout and print framing stayed with each screen, which is a smaller
 * and safer change to six live reports. See design/REPORT-SCAFFOLDING-PLAN.md.
 *
 * Extracted 2026-07-22 (report-scaffolding Phase 3).
 *
 * @example
 *   report-header(
 *     :back-label="$t('modelLibrary.backToLibrary')"
 *     :eyebrow="$t('report.eyebrow')"
 *     :title="$t('report.eightLevers.title')"
 *     :client="$t('report.preparedFor')"
 *     :badge="$t('report.illustrative')")
 */
export default {
  name: 'ReportHeader',

  props: {
    /** The report's name — the only part every screen must supply. */
    title: { type: String, required: true },
    /** Text of the back link (an i18n string the caller resolves). */
    backLabel: { type: String, required: true },
    /** Where the back link goes. Every report currently returns to the library. */
    backTo: { type: String, default: '/model-library' },
    /** Small uppercase line above the title — the report's class. Omit to hide. */
    eyebrow: { type: String, default: '' },
    /** Who the report is for: a real company name, or the placeholder. Omit to hide. */
    client: { type: String, default: '' },
    /**
     * The "Illustrative" marker. Omit on any report built from a client's real
     * figures — see the note above; this is a correctness matter, not a style one.
     */
    badge: { type: String, default: '' }
  }
}
</script>

<style scoped>
.rs-top {
  display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
  max-width: 1180px; margin: 0 auto 22px; padding: 22px 24px;
  /* Solid, not a gradient — owner ruling 2026-07-22. */
  background: #002b64;
  border-radius: var(--rs-radius, 14px);
  color: #fff;
  box-shadow: var(--rs-shadow, 0 1px 2px #002b6412, 0 8px 24px -12px #002b6426);
}
.rs-backlink {
  display: inline-block; margin-bottom: 10px;
  font-size: 12px; font-weight: 600; letter-spacing: .04em;
  color: #7fd3f1; text-decoration: none; opacity: .9;
}
.rs-backlink:hover { opacity: 1; text-decoration: underline; }
.rs-eyebrow { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #00b1e0; font-weight: 600; }
.rs-h1 { margin: 4px 0 3px; font-size: 27px; font-weight: 300; letter-spacing: -.01em; }
.rs-client { font-size: 12.5px; opacity: .85; }
.rs-badge {
  flex: none; font-size: 10.5px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase;
  padding: 5px 10px; border-radius: 999px;
  background: #ffffff22; border: 1px solid #ffffff44;
}

@media print {
  /* The back link is a dead control on paper, and the badge was already hidden in
     print by three of the four screens carrying one — kept as they had it. */
  .rs-backlink, .rs-badge { display: none !important; }
  .rs-top { max-width: none; box-shadow: none; }
}
</style>
