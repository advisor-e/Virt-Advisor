<template lang="pug">
header.rs-top
  .rs-brand
    nuxt-link.rs-backlink(:to="backTo") {{ backLabel }}
    .rs-eyebrow(v-if="eyebrow") {{ eyebrow }}
    h1.rs-h1 {{ title }}
    .rs-client(v-if="client") {{ client }}
    .rs-saved(v-if="savedLine") {{ savedLine }}
  .rs-right
    .rs-badge(v-if="badge") {{ badge }}
    //- The advisor's per-client "Client access" switch (business-entity-reports, D3).
    //- Client-only, and it renders nothing unless an advisor is signed in and this route
    //- is a catalogue model — so every report gains it without its page changing.
    client-access-switch(v-if="routePath" :model-route="routePath" @client-change="$emit('client-change', $event)")
    //- Saving the figures per client (§5, item 4.62). Shown only when the screen adopted
    //- the savedReport mixin and there is someone to save as.
    .rs-save(v-if="canSave")
      button.rs-savebtn(type="button" :disabled="saved.busy" @click="$emit('save')") {{ saveLabel }}
      span.rs-save-note(v-if="saved.error" role="alert") {{ saved.error }}
      span.rs-save-note.is-ok(v-else-if="saved.notice") {{ saved.notice }}
  //- The client edited this report since the advisor's version (D4): who, when, how many
  //- figures — and Restore. Full width, under the band.
  .rs-edited(v-if="clientEdited" role="status")
    span
      b {{ $t('clientReports.saved.editedBy', { name: saved.report.savedBy.name, date: day(saved.report.savedAt) }) }}
      |  {{ changedLine }}
    button.rs-restore(v-if="saved.report.advisorVersion" type="button" :disabled="saved.busy" @click="$emit('restore')") {{ $t('clientReports.saved.restore') }}
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
import ClientAccessSwitch from '~/components/base/ClientAccessSwitch.vue'

export default {
  name: 'ReportHeader',

  components: { ClientAccessSwitch },

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
    badge: { type: String, default: '' },
    /**
     * The savedReport mixin's state (mixins/savedReport.js), from a screen that saves its
     * figures per client. Omit and nothing of it renders. Shape: { mode, clientId,
     * clientName, report, clientChanges, busy, error, notice }.
     */
    saved: { type: Object, default: null }
  },

  computed: {
    /** This report's route, for the switch to match against the catalogue. Empty outside a router. */
    routePath () {
      return this.$route && typeof this.$route.path === 'string' ? this.$route.path : ''
    },
    /** A Save control needs a sign-in to save as, and in advisor mode a chosen client. */
    canSave () {
      const s = this.saved
      return !!(s && (s.mode === 'client' || (s.mode === 'advisor' && s.clientId)))
    },
    saveLabel () {
      return this.$t(this.saved.mode === 'client' ? 'clientReports.saved.saveClient' : 'clientReports.saved.saveAdvisor')
    },
    /** The line under the client's name: who last saved this, or that nobody has. */
    savedLine () {
      const s = this.saved
      if (!this.canSave) { return '' }
      const r = s.report
      if (!r) { return this.$t(s.mode === 'client' ? 'clientReports.saved.noneForYou' : 'clientReports.saved.notSaved') }
      const date = this.day(r.savedAt)
      const byClient = r.savedBy && r.savedBy.tier === 'business_entity'
      if (s.mode === 'client') {
        return this.$t(byClient ? 'clientReports.saved.yourChanges' : 'clientReports.saved.advisorFigures', { date })
      }
      return byClient
        ? this.$t('clientReports.saved.lastSavedByClient', { date })
        : this.$t('clientReports.saved.savedBy', { name: r.savedBy ? r.savedBy.name : '', date })
    },
    /** The advisor is looking at figures the client changed. */
    clientEdited () {
      const s = this.saved
      return !!(s && s.mode === 'advisor' && s.report && s.report.savedBy && s.report.savedBy.tier === 'business_entity')
    },
    changedLine () {
      const s = this.saved
      const n = s.clientChanges.length
      const av = s.report.advisorVersion
      if (!av) { return this.$tc('clientReports.saved.changedNoVersion', n, { n }) }
      return this.$tc('clientReports.saved.changedCount', n, { n, date: this.day(av.savedAt) })
    }
  },

  methods: {
    /** The date part of an ISO stamp, as the drawing shows it (2026-09-05). */
    day (iso) {
      return typeof iso === 'string' ? iso.slice(0, 10) : ''
    }
  }
}
</script>

<style scoped>
.rs-top {
  display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 16px;
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
.rs-saved { margin-top: 4px; font-size: 12px; color: #9dc2e8; }
.rs-brand { flex: 1 1 320px; }
.rs-save { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.rs-savebtn {
  padding: 6px 14px; border-radius: 8px; border: 1px solid #00b1e0; cursor: pointer;
  background: #00b1e0; color: #002b64; font: inherit; font-size: 12.5px; font-weight: 700;
}
.rs-savebtn:disabled { cursor: default; opacity: .6; }
.rs-save-note { font-size: 11.5px; color: #ffb3b3; }
.rs-save-note.is-ok { color: #9be7a3; }
/* The client-edited banner: amber on the navy band, spanning the full width (D4). */
.rs-edited {
  flex-basis: 100%; display: flex; justify-content: space-between; align-items: center; gap: 12px;
  padding: 10px 14px; border-radius: 10px; font-size: 13px;
  background: #ff99001f; border: 1px solid #ff9900; color: #fff;
}
.rs-restore {
  flex: none; padding: 5px 12px; border-radius: 8px; cursor: pointer;
  background: #fff; border: 1px solid #ff9900; color: #002b64; font: inherit; font-size: 12.5px; font-weight: 600;
}
.rs-restore:disabled { cursor: default; opacity: .6; }
.rs-right { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.rs-badge {
  flex: none; font-size: 10.5px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase;
  padding: 5px 10px; border-radius: 999px;
  background: #ffffff22; border: 1px solid #ffffff44;
}

@media print {
  /* The back link is a dead control on paper, and the badge was already hidden in
     print by three of the four screens carrying one — kept as they had it. */
  .rs-backlink, .rs-badge, .rs-save, .rs-restore { display: none !important; }
  .rs-top { max-width: none; box-shadow: none; }
}
</style>
