<template lang="pug">
.mentor-logic-lab-report
  .has-text-centered.py-6(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  b-notification(v-else-if="error" type="is-danger is-light" :closable="false")
    | {{ error }}

  //- A tier with no firms mapped beneath it yet. It replaces the whole report: the
  //- at-a-glance counts would all read zero, which states that no firm below has
  //- changed anything — a claim about firms that have not been connected.
  tier-not-connected(v-else-if="awaitingFirms")

  template(v-else)
    b-notification.mb-5(type="is-info is-light" :closable="false")
      | {{ $t('logicLabReport.privacy') }}

    p.title.is-5 {{ $t('logicLabReport.title') }}
    p.subtitle.is-6.has-text-grey.mb-5 {{ $t('logicLabReport.lede') }}

    //- ── 1 · What firms pushed ─────────────────────────────────────
    p.llr-band {{ $t('logicLabReport.pushed.heading') }}
    p.is-size-7.has-text-grey.mb-4
      | {{ $t('logicLabReport.pushed.sub', { edits: report.glance.pushedEdits, firms: report.glance.firmsWithPushes }) }}

    .box.has-text-centered.py-6(v-if="report.groups.length === 0")
      p.has-text-grey {{ $t('logicLabReport.pushed.empty') }}

    .box.mb-3(v-for="g in report.groups" :key="g.key")
      .columns
        .column.is-7
          span.tag.is-medium(:class="readingTone(g.reading)")
            | {{ $t('logicLabReport.groupCount', { firms: g.firmCount, edits: g.editCount }) }}
          p.llr-what.mt-2
            | {{ $t('logicLabReport.groupWhat', { domain: domainLabel(g.domain) }) }}
            |  #[b {{ g.template }}]
        .column.is-5
          p.is-size-7
            b {{ $t('logicLabReport.reading.' + g.reading + 'Head') }}
            |  {{ $t('logicLabReport.reading.' + g.reading + 'Body') }}
          b-button.mt-2(size="is-small" @click="toggle(g.key)")
            | {{ opened[g.key] ? $t('logicLabReport.hideEdits') : $t('logicLabReport.showEdits', { n: g.editCount }) }}

      .llr-drill.mt-3(v-if="opened[g.key]")
        .llr-idea(v-for="(e, i) in g.edits" :key="g.key + '-' + i")
          p.llr-firmline {{ e.firmName }} · {{ formatDate(e.at) }}
          dl
            dt {{ $t('logicLabReport.field.sentence') }}
            dd.llr-q {{ e.sentence }}
            dt {{ $t('logicLabReport.field.engine') }}
            dd {{ engineReading(e) }}
            dt {{ $t('logicLabReport.field.expected') }}
            dd {{ e.expectedTemplate }}
            dt {{ $t('logicLabReport.field.change') }}
            dd.llr-chg {{ changeMade(e) }}

    b-notification.mt-4(type="is-light" :closable="false")
      strong {{ $t('logicLabReport.whyFeed.heading') }}
      br
      | {{ $t('logicLabReport.whyFeed.body') }}

    //- ── 2 · The platform at a glance ──────────────────────────────
    p.llr-band.mt-6 {{ $t('logicLabReport.glance.heading') }}
    p.is-size-7.has-text-grey.mb-3 {{ $t('logicLabReport.glance.sub') }}
    .columns
      .column(v-for="t in glanceTiles" :key="t.k")
        .box.llr-tile(:class="{ 'llr-tile--accent': t.accent }")
          span.llr-num {{ t.n }}
          span.llr-lab {{ t.label }}
          p.is-size-7.has-text-grey.mt-2 {{ t.note }}

    //- ── 3 · What gets used ────────────────────────────────────────
    p.llr-band.mt-6 {{ $t('logicLabReport.usage.heading') }}
    p.is-size-7.has-text-grey.mb-3 {{ $t('logicLabReport.usage.sub') }}
    .columns
      .column.is-6
        .box
          p.llr-boxhead {{ $t('logicLabReport.usage.templatesHead') }}
          p.is-size-7.has-text-grey.mb-3 {{ $t('logicLabReport.usage.templatesSub') }}
          p.has-text-grey.is-size-7(v-if="report.usage.templates.length === 0")
            | {{ $t('logicLabReport.usage.noTemplates') }}
          table.llr-use(v-else)
            tr
              th {{ $t('logicLabReport.usage.colTemplate') }}
              th.llr-n {{ $t('logicLabReport.usage.colFirms') }}
            tr(v-for="t in report.usage.templates" :key="t.title")
              td
                | {{ t.title }}
                .llr-bar: i(:style="{ width: barWidth(t.firms, maxTemplateFirms) }")
              td.llr-n {{ t.firms }}
      .column.is-6
        .box
          p.llr-boxhead {{ $t('logicLabReport.usage.leversHead') }}
          p.is-size-7.has-text-grey.mb-3 {{ $t('logicLabReport.usage.leversSub') }}
          table.llr-use
            tr
              th {{ $t('logicLabReport.usage.colLever') }}
              th.llr-n {{ $t('logicLabReport.usage.colFirms') }}
            tr(v-for="l in report.usage.levers" :key="l.lever")
              td
                | {{ $t('logicLabReport.lever.' + l.lever) }}
                .llr-bar: i(:style="{ width: barWidth(l.firms, maxLeverFirms) }")
              td.llr-n {{ l.firms }}

    //- ── 4 · Firm by firm ──────────────────────────────────────────
    p.llr-band.mt-6 {{ $t('logicLabReport.firms.heading') }}
    p.is-size-7.has-text-grey.mb-3 {{ $t('logicLabReport.firms.sub') }}
    .box.has-text-centered.py-5(v-if="report.firms.length === 0")
      p.has-text-grey {{ $t('logicLabReport.firms.empty') }}
    b-table(v-else :data="report.firms")
      b-table-column(v-slot="{ row }" :label="$t('logicLabReport.firms.colFirm')")
        | {{ row.firmName }}
        b-tag.ml-2(v-if="row.defaultsOnly" type="is-light") {{ $t('logicLabReport.firms.defaultsOnly') }}
      b-table-column(v-slot="{ row }" :label="$t('logicLabReport.firms.colPushed')" numeric)
        | {{ row.pushedEdits }}
      b-table-column(v-slot="{ row }" :label="$t('logicLabReport.firms.colDistinctions')" numeric)
        | {{ row.distinctions }}
      b-table-column(v-slot="{ row }" :label="$t('logicLabReport.firms.colTableEdits')" numeric)
        | {{ row.tableEdits }}
      b-table-column(v-slot="{ row }" :label="$t('logicLabReport.firms.colLastActivity')")
        | {{ row.lastActivity ? formatDate(row.lastActivity) : $t('logicLabReport.firms.neverEdited') }}

    //- ── Honest limits ─────────────────────────────────────────────
    b-notification.mt-6(type="is-warning is-light" :closable="false")
      strong {{ $t('logicLabReport.limits.heading') }}
      br
      | {{ $t('logicLabReport.limits.body') }}
      br
      span.is-size-7.has-text-grey {{ $t('logicLabReport.limits.stamp', { firms: report.glance.firms, at: formatDate(report.rolledUpAt) }) }}
</template>

<script>
/**
 * Logic Lab Report — the Mentor Hub tab that reads across every firm.
 *
 * THE ARTEFACT is design/mockups/mentor-logic-lab-report-mockup.html, approved by
 * Mike 2026-08-04 ("i love it, it looks great"), with design/MENTOR-AI-HUB-STUB.md
 * stating its shape. The artefact declares its own wording to be PLACEHOLDER
 * awaiting Mike's ruling — so this build reproduces the structure and the reads
 * faithfully and puts every string in locales/en.json, where changing a word is a
 * one-line edit rather than a rebuild.
 *
 * The artefact's numbers are invented to show the shape. This screen shows only
 * what the platform actually holds, and says so plainly when that is nothing —
 * "silence here is absence of evidence, not approval of your defaults" is the
 * artefact's own third limit, and a screen that filled the gap with zeros dressed
 * as findings would break it.
 */

import { DISTINCTION_DOMAINS } from '~/components/FirmManagerHub.vue'
import TierNotConnected from '~/components/base/TierNotConnected.vue'

export default {
  name: 'MentorLogicLabReport',

  components: { TierNotConnected },

  props: {
    // The caller's JWT. Re-gated server-side by requireManagingTier on every call —
    // the mentor and the two middle tiers read this report, each seeing only the
    // firms beneath them.
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: true,
      error: '',
      report: { groups: [], glance: {}, usage: { templates: [], levers: [] }, firms: [] },
      /**
       * True when this tier has no firms mapped beneath it yet. From the response —
       * the backend is the only place that knows the mapping. Always false for the
       * mentor, whose empty report would genuinely mean no firm has changed anything.
       */
      awaitingFirms: false,
      opened: {}
    }
  },

  computed: {
    glanceTiles () {
      const g = this.report.glance || {}
      return [
        {
          k: 'pushed',
          accent: true,
          n: g.pushedEdits || 0,
          label: this.$t('logicLabReport.tile.pushed'),
          note: this.$t('logicLabReport.tile.pushedNote', {
            withPushes: g.firmsWithPushes || 0,
            firms: g.firms || 0,
            without: Math.max(0, (g.firms || 0) - (g.firmsWithPushes || 0))
          })
        },
        {
          k: 'firms',
          n: g.firms || 0,
          label: this.$t('logicLabReport.tile.firms'),
          note: this.$t('logicLabReport.tile.firmsNote', {
            edited: g.firmsThatEditedSomething || 0,
            defaults: Math.max(0, (g.firms || 0) - (g.firmsThatEditedSomething || 0))
          })
        },
        {
          k: 'distinctions',
          n: g.firmOwnDistinctions || 0,
          label: this.$t('logicLabReport.tile.distinctions'),
          note: this.$t('logicLabReport.tile.distinctionsNote')
        },
        {
          k: 'tables',
          n: g.logicTableEdits || 0,
          label: this.$t('logicLabReport.tile.tableEdits'),
          note: this.$t('logicLabReport.tile.tableEditsNote')
        }
      ]
    },

    maxTemplateFirms () {
      return Math.max(1, ...this.report.usage.templates.map(t => t.firms))
    },

    maxLeverFirms () {
      return Math.max(1, ...this.report.usage.levers.map(l => l.firms))
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    async load () {
      this.loading = true
      this.error = ''
      try {
        const res = await fetch('/api/mentor/logic-lab-report', {
          headers: { Authorization: `Bearer ${this.apiToken}` }
        })
        const body = await res.json()
        if (!res.ok || !body.success) { throw new Error('load failed') }
        this.report = body.report
        this.awaitingFirms = body.report.awaitingFirms === true
      } catch (e) {
        // A failed load must never render as an empty, reassuring page — the
        // difference between "no firm has pushed anything" and "we could not ask"
        // is the whole value of this screen.
        this.error = this.$t('logicLabReport.error.load')
      } finally {
        this.loading = false
      }
    },

    /** @param {string} key - the group key. */
    toggle (key) {
      this.$set(this.opened, key, !this.opened[key])
    },

    /** @param {string} reading @returns {string} Buefy tag type. */
    readingTone (reading) {
      return {
        'platform-gap': 'is-danger is-light',
        watch: 'is-warning is-light',
        preference: 'is-light'
      }[reading] || 'is-light'
    },

    /** @param {string} id @returns {string} the domain's display name. */
    domainLabel (id) {
      const d = DISTINCTION_DOMAINS.find(x => x.id === id)
      return d ? d.label : (id || this.$t('logicLabReport.noDomain'))
    },

    /**
     * What the engine did with the sentence, in one line — the artefact's second
     * field. Built from the log's own record of the run, because the run cannot
     * be repeated: the distinction classifier is a live AI call.
     *
     * @param {object} e - an accepted-idea entry.
     * @returns {string}
     */
    engineReading (e) {
      const parts = []
      if (e.domain) { parts.push(this.domainLabel(e.domain)) }
      if (Array.isArray(e.distinctionsMatched) && e.distinctionsMatched.length) {
        parts.push(this.$t('logicLabReport.engine.matched', { n: e.distinctionsMatched.length }))
      } else {
        parts.push(this.$t('logicLabReport.engine.noMatch'))
      }
      if (Array.isArray(e.templatesBefore) && e.templatesBefore.length) {
        parts.push(this.$t('logicLabReport.engine.topResult', { title: e.templatesBefore[0] }))
      }
      return parts.join(' · ')
    },

    /**
     * The change the firm actually accepted — the artefact's fourth field.
     *
     * @param {object} e - an accepted-idea entry.
     * @returns {string}
     */
    changeMade (e) {
      const added = (e.templatesAfter || []).filter(t => !(e.templatesBefore || []).includes(t))
      if (e.distinctionSource === 'new' || e.distinctionId === null) {
        return this.$t('logicLabReport.change.created', {
          template: e.expectedTemplate,
          description: e.distinctionDescription || ''
        })
      }
      return this.$t('logicLabReport.change.added', {
        template: added.join(', ') || e.expectedTemplate,
        description: e.distinctionDescription || ''
      })
    },

    /** @param {number} n @param {number} max @returns {string} */
    barWidth (n, max) {
      return `${Math.round((n / max) * 100)}%`
    },

    /** @param {string} iso @returns {string} */
    formatDate (iso) {
      if (!iso) { return '' }
      const d = new Date(iso)
      return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString()
    }
  }
}
</script>

<style scoped>
.llr-band {
  font-weight: 700;
  color: #002b64;
  font-size: 1.05rem;
}
.llr-what { font-size: 0.98rem; }
.llr-tile { height: 100%; border-top: 5px solid #d8dce3; }
.llr-tile--accent { border-top-color: #002b64; }
.llr-num {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: #002b64;
  line-height: 1.1;
}
.llr-lab { display: block; font-weight: 700; font-size: 0.92rem; color: #002b64; margin-top: 0.4rem; }
.llr-boxhead { font-weight: 700; color: #002b64; margin-bottom: 0.3rem; }
.llr-use { width: 100%; font-size: 0.85rem; }
.llr-use th {
  text-align: left;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #7a869a;
  padding-bottom: 0.4rem;
}
.llr-use td { padding: 0.4rem 0; vertical-align: top; }
.llr-n { text-align: right; font-variant-numeric: tabular-nums; }
.llr-bar { background: #eef1f5; border-radius: 3px; height: 6px; margin-top: 0.3rem; }
.llr-bar i { display: block; height: 6px; border-radius: 3px; background: #002b64; }
.llr-drill { border-left: 3px solid #e2e6ec; padding-left: 1rem; }
.llr-idea { padding: 0.75rem 0; border-bottom: 1px solid #eef1f5; }
.llr-idea:last-child { border-bottom: 0; }
.llr-firmline { font-weight: 600; color: #002b64; font-size: 0.85rem; margin-bottom: 0.35rem; }
.llr-idea dl { display: grid; grid-template-columns: 11rem 1fr; gap: 0.25rem 0.75rem; font-size: 0.83rem; }
.llr-idea dt { color: #7a869a; }
.llr-q { font-style: italic; }
.llr-chg { font-weight: 600; }
</style>
