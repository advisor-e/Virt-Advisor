<template lang="pug">
.firm-template-contents
  .ftc-head
    p.ftc-band-title {{ $t('firmTemplateLibrary.contentsHeading') }}
    b-input.ftc-search(
      v-model="search"
      :placeholder="$t('firmTemplateLibrary.searchPlaceholder')"
      icon="magnify"
      size="is-small"
    )
    span.is-size-7.has-text-grey {{ countLine }}

  .ftc-readonly-note {{ $t('firmTemplateLibrary.readOnlyNote') }}

  p.is-size-7.has-text-grey(v-if="filtered.length === 0") {{ $t('firmTemplateLibrary.noMatches') }}
  b-table(
    v-else
    :data="filtered"
    :hoverable="true"
    :narrowed="true"
    :paginated="filtered.length > perPage"
    :per-page="perPage"
    :detailed="true"
    detail-key="page"
  )
    b-table-column(v-slot="{ row }" field="position" :label="$t('firmTemplateLibrary.colPos')" width="50")
      | {{ row.position }}
    b-table-column(v-slot="{ row }" field="section" :label="$t('firmTemplateLibrary.colSection')")
      | {{ row.section }}
    b-table-column(v-slot="{ row }" field="subSection" :label="$t('firmTemplateLibrary.colSubSection')")
      | {{ row.subSection }}
    b-table-column(v-slot="{ row }" field="topic" :label="$t('firmTemplateLibrary.colTopic')")
      | {{ row.topic }}
    b-table-column(v-slot="{ row }" field="title" :label="$t('firmTemplateLibrary.colTitle')")
      strong {{ row.title }}
    b-table-column(v-slot="{ row }" field="cpd" :label="$t('firmTemplateLibrary.colCpd')" width="60")
      | {{ hasCpd(row) ? $t('firmTemplateLibrary.yes') : '—' }}

    template(#detail="{ row }")
      .ftc-detail-grid
        .ftc-f.ftc-wide(v-if="row.purpose")
          .ftc-k {{ $t('firmTemplateLibrary.fPurpose') }}
          .ftc-v {{ row.purpose }}
        .ftc-f.ftc-wide(v-if="row.cpd && row.cpd.objective")
          .ftc-k {{ $t('firmTemplateLibrary.fObjective') }}
          .ftc-v {{ row.cpd.objective }}
        .ftc-f.ftc-wide(v-if="row.tags && row.tags.length")
          .ftc-k {{ $t('firmTemplateLibrary.fTags') }}
          .ftc-v
            span.tag.is-light.mr-1.mb-1(v-for="tag in row.tags" :key="tag") {{ tag }}
        .ftc-f
          .ftc-k {{ $t('firmTemplateLibrary.fLinkId') }}
          .ftc-v {{ row.page }}
        .ftc-f(v-if="hasCpd(row)")
          .ftc-k {{ $t('firmTemplateLibrary.fWatched') }}
          .ftc-v {{ $t('firmTemplateLibrary.mins', { n: row.cpd.watchedVideo || 0 }) }}
        .ftc-f(v-if="hasCpd(row)")
          .ftc-k {{ $t('firmTemplateLibrary.fReview') }}
          .ftc-v {{ $t('firmTemplateLibrary.mins', { n: row.cpd.reviewTemplate || 0 }) }}
        .ftc-f(v-if="hasCpd(row)")
          .ftc-k {{ $t('firmTemplateLibrary.fRehearsed') }}
          //- 'reheasedTemplate' is the field's REAL name in the master export —
          //- a misspelling upstream owns, never corrected here (Advisor-e's IDs
          //- and fields are theirs alone).
          .ftc-v {{ $t('firmTemplateLibrary.mins', { n: row.cpd.reheasedTemplate || 0 }) }}
        .ftc-f(v-if="row.growth && !row.growth.isHidden && row.growth.stage")
          .ftc-k {{ $t('firmTemplateLibrary.fGrowthStage') }}
          .ftc-v {{ row.growth.stage }}
        .ftc-f
          .ftc-k {{ $t('firmTemplateLibrary.fIncluded') }}
          .ftc-v {{ row.includedInClient ? $t('firmTemplateLibrary.yes') : $t('firmTemplateLibrary.no') }}
        .ftc-f.ftc-wide(v-if="row.growth && !row.growth.isHidden && row.growth.fundamental")
          .ftc-k {{ $t('firmTemplateLibrary.fFundamental') }}
          .ftc-v {{ row.growth.fundamental }}
</template>

<script>
/**
 * FirmTemplateContents — the read-only "What's in this library" table on the
 * firm's Template Library tab (approved mockup
 * design/mockups/firm-template-library.html, Mike 2026-09-01).
 *
 * VIEW-ONLY BY RULING (Mike, 2026-09-01): no Edit/Remove per row — template
 * content and IDs are edited only in Advisor-e and re-uploaded (CLAUDE.md).
 * "Potential to become the master doc source in future, depending on feedback
 * from the master coding team" — recorded in the cascade plan, not built.
 */
export default {
  name: 'FirmTemplateContents',

  props: {
    /** The library in force, as GET /api/firm-manager/templates/library returns it. */
    templates: { type: Array, required: true },
    /** 'firm' when the firm's own upload is in force, else 'platform'. */
    source: {
      type: String,
      required: true,
      validator: v => ['firm', 'platform'].includes(v)
    }
  },

  data () {
    return {
      search: '',
      perPage: 15
    }
  },

  computed: {
    /** @returns {object[]} rows matching the search, over the fields a manager hunts by. */
    filtered () {
      const q = this.search.trim().toLowerCase()
      if (!q) { return this.templates }
      return this.templates.filter((t) => {
        const hay = [t.title, t.topic, t.section, t.subSection, t.purpose,
          ...(Array.isArray(t.tags) ? t.tags : [])]
        return hay.some(v => typeof v === 'string' && v.toLowerCase().includes(q))
      })
    },

    /** @returns {string} the count + whose-library line beside the search box. */
    countLine () {
      const key = this.source === 'firm' ? 'countFirm' : 'countPlatform'
      return this.$t(`firmTemplateLibrary.${key}`, { n: this.filtered.length })
    }
  },

  methods: {
    /** @param {object} row @returns {boolean} whether the row carries visible CPD. */
    hasCpd (row) {
      return !!(row.cpd && !row.cpd.isHidden)
    }
  }
}
</script>

<style scoped>
.ftc-head {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin: 1.6rem 0 0.6rem;
}
.ftc-band-title {
  font-weight: 700;
  color: #002b64;
  font-size: 1.05rem;
  margin: 0;
}
.ftc-search {
  flex: 1 1 220px;
  max-width: 320px;
}
.ftc-readonly-note {
  font-size: 0.8rem;
  color: #7a7a7a;
  background: #f0f4fa;
  border: 1px solid #dce6f5;
  border-radius: 4px;
  padding: 0.4rem 0.7rem;
  margin-bottom: 0.8rem;
}
.ftc-detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 0.6rem 1.4rem;
}
.ftc-wide {
  grid-column: 1 / -1;
}
.ftc-k {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #9a9a9a;
}
.ftc-v {
  font-size: 0.84rem;
}
</style>
