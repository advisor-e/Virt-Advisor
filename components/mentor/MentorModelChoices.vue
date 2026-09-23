<template lang="pug">
section.mentor-model-choices
  //- Design: design/mockups/model-choices.html, drawn 2026-09-16, all three
  //- decisions ruled by Mike the same day. Item 7.5.
  //- The four bands below are the drawing's own, in its order.
  p.subtitle.is-6.has-text-grey.mb-4 {{ $t('modelChoices.lede') }}

  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")
    p.has-text-grey.is-size-7 {{ $t('modelChoices.loading') }}

  //- The record could not be READ. Said out loud rather than drawn as a period in
  //- which the AI named nothing — an unreachable record and a quiet month must
  //- never render the same screen.
  b-message(v-else-if="error" type="is-danger" has-icon :closable="false")
    p.mb-3 {{ $t('modelChoices.loadFailed') }}
    b-button(type="is-danger" size="is-small" outlined @click="load")
      | {{ $t('modelChoices.retry') }}

  //- A middle tier with no firms mapped beneath it yet. Replaces the whole page for
  //- the same reason Adoption does: bands of zero are themselves a claim, and here
  //- the claim would be "the AI never names a model", which is false.
  tier-not-connected(v-else-if="awaitingFirms")

  template(v-else)
    //- ── Band 1: the period at a glance ──────────────────────────────────────
    .sec.mb-5
      h4.title.is-6.mb-1 {{ $t('modelChoices.band1Heading') }}
      p.has-text-grey.is-size-7.mb-3 {{ $t('modelChoices.band1Caption') }}
      .columns.is-multiline.mb-2
        .column.is-4(v-for="tile in tiles" :key="tile.key")
          .box.tile-box(:class="'tile-' + tile.key")
            .tile-num {{ tile.value }}
            .tile-label.has-text-grey.is-size-7 {{ $t(tile.labelKey) }}
      p.has-text-grey.is-size-7 {{ $t('modelChoices.band1Note') }}

    //- ── Band 2: which model, for which kind of problem ──────────────────────
    .sec.mb-5
      h4.title.is-6.mb-1 {{ $t('modelChoices.band2Heading') }}
      p.has-text-grey.is-size-7.mb-3 {{ $t('modelChoices.band2Caption') }}

      p.has-text-grey.has-text-centered.py-5(v-if="!pairings.length")
        | {{ $t('modelChoices.band2Empty') }}

      b-table(v-else :data="pairings" :hoverable="true")
        b-table-column(
          v-slot="{ row }"
          field="domain"
          :label="$t('modelChoices.colDomain')"
          sortable
        )
          span.dom {{ row.domain || $t('modelChoices.domainUnknown') }}

        b-table-column(
          v-slot="{ row }"
          field="model"
          :label="$t('modelChoices.colModel')"
          sortable
        )
          span.has-text-weight-semibold {{ row.model }}

        b-table-column(
          v-slot="{ row }"
          field="route"
          :label="$t('modelChoices.colPage')"
        )
          code {{ row.route }}

        b-table-column(
          v-slot="{ row }"
          field="count"
          :label="$t('modelChoices.colTimes')"
          width="90"
          numeric
          sortable
        )
          | {{ row.count }}

      //- 🔴 THE DRAWING'S OWN WORDS, AND THEY ARE THE POINT OF THE BAND: nothing
      //- here is judged. A pairing that happened once is not a fault.
      p.has-text-grey.is-size-7.mt-3(v-if="pairings.length") {{ $t('modelChoices.band2Note') }}

    //- ── Band 3: when it said no model fits ──────────────────────────────────
    .sec.mb-5
      h4.title.is-6.mb-1 {{ $t('modelChoices.band3Heading') }}
      p.has-text-grey.is-size-7.mb-3 {{ $t('modelChoices.band3Caption') }}
      //- 🔴 A GAP MAP, NOT A FAULT LIST — Mike, 2026-09-16. Nineteen models against
      //- twenty-two domains, so a domain listed here has no calculator at all and
      //- the AI is answering correctly every time.
      b-message.is-size-7(type="is-info" has-icon :closable="false")
        | {{ $t('modelChoices.band3Gap') }}

      p.has-text-grey.has-text-centered.py-5(v-if="!declines.length")
        | {{ $t('modelChoices.band3Empty') }}

      b-table(v-else :data="declines" :hoverable="true")
        b-table-column(
          v-slot="{ row }"
          field="domain"
          :label="$t('modelChoices.colDomain')"
          sortable
        )
          span.dom {{ row.domain || $t('modelChoices.domainUnknown') }}

        b-table-column(
          v-slot="{ row }"
          field="count"
          :label="$t('modelChoices.colTimes')"
          width="90"
          numeric
          sortable
        )
          | {{ row.count }}

    //- ── Band 4: every choice, most recent first ─────────────────────────────
    .sec
      h4.title.is-6.mb-1 {{ $t('modelChoices.band4Heading') }}
      p.has-text-grey.is-size-7.mb-3 {{ $t('modelChoices.band4Caption') }}

      p.has-text-grey.has-text-centered.py-5(v-if="!rows.length")
        | {{ $t('modelChoices.band4Empty') }}

      b-table(
        v-else
        :data="rows"
        :hoverable="true"
        :paginated="rows.length > 25"
        :per-page="25"
      )
        b-table-column(
          v-slot="{ row }"
          field="at"
          :label="$t('modelChoices.colWhen')"
          sortable
        )
          | {{ formatWhen(row.at) }}

        //- The firm column is the same at every tier; what changes is how many
        //- firms the rows come from. A firm manager reads one value here.
        b-table-column(
          v-slot="{ row }"
          field="firmId"
          :label="$t('modelChoices.colFirm')"
          sortable
        )
          | {{ row.firmId }}

        b-table-column(
          v-slot="{ row }"
          field="advisorName"
          :label="$t('modelChoices.colAdvisor')"
          sortable
        )
          | {{ row.advisorName || row.advisorId }}

        b-table-column(
          v-slot="{ row }"
          field="domain"
          :label="$t('modelChoices.colDomain')"
          sortable
        )
          span.dom {{ row.domain || $t('modelChoices.domainUnknown') }}

        b-table-column(
          v-slot="{ row }"
          field="model"
          :label="$t('modelChoices.colDid')"
          sortable
        )
          span.has-text-weight-semibold(v-if="!row.declined") {{ row.model }}
          span.has-text-weight-semibold(v-else) {{ $t('modelChoices.saidNoModel') }}

        b-table-column(
          v-slot="{ row }"
          field="source"
          :label="$t('modelChoices.colHow')"
        )
          b-tag(:type="howType(row)") {{ howLabel(row) }}

      //- 🔴 THE FIRM AND THE ADVISOR ARE ON THE ROW. NOT ONE WORD THE ADVISOR TYPED
      //- IS. Decision 2 as Mike ruled it — the advisor's own description of their
      //- client stays inside their firm, on their own saved case.
      p.has-text-grey.is-size-7.mt-3(v-if="rows.length") {{ $t('modelChoices.band4Note') }}
</template>

<script>
import { fetchWithTimeout } from '~/utils/fetchWithTimeout'
import TierNotConnected from '~/components/base/TierNotConnected.vue'

/**
 * Buefy tag colour per "how we know". A lookup rather than a chain of v-ifs so a
 * third source added on the backend renders with no colour — visible — instead of
 * silently taking the last branch of an if.
 */
const HOW_TYPES = {
  declared: 'is-success is-light',
  prose: 'is-warning is-light'
}

export default {
  name: 'MentorModelChoices',

  components: { TierNotConnected },

  props: {
    /**
     * Bearer token for the hub API. The server re-derives the scope from this token
     * on every call and never reads one from the request, so this prop cannot widen
     * what the caller sees.
     */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: false,
      /** True when the record could not be READ — never merely "nothing recorded". */
      error: false,
      /** Domain × model with counts, commonest first, as the route returns them. */
      pairings: [],
      /** The gap map: domains where the AI said no model fits, grouped. */
      declines: [],
      /** One row per model named or declined, newest first. */
      rows: [],
      totals: {},
      /**
       * True when this tier has no firms mapped beneath it yet. Always false for
       * the mentor, whose scope matches every firm by design.
       */
      awaitingFirms: false
    }
  },

  computed: {
    /**
     * The headline tiles, in the drawing's order.
     *
     * 🔴 THREE, NOT THE DRAWING'S FOUR. The fourth — "conversations where a model
     * could have been named" — counts client conversations, which live in
     * `advisor_va_sessions`, a table this route does not read. The drawing names
     * that difference itself rather than leaving it to be found here.
     *
     * @returns {Array<{key: string, value: number, labelKey: string}>}
     */
    tiles () {
      const t = this.totals || {}
      return [
        { key: 'named', value: t.named || 0, labelKey: 'modelChoices.tileNamed' },
        { key: 'declined', value: t.declined || 0, labelKey: 'modelChoices.tileDeclined' },
        { key: 'prose', value: t.viaProse || 0, labelKey: 'modelChoices.tileProse' }
      ]
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /**
     * GET the model choices for the caller's own scope.
     *
     * Nothing about scope is sent from here — `req.firmId` is resolved by firmAuth
     * from the verified token, and a firmId in the query string would be an IDOR
     * into another firm's activity. Any failure sets `error` rather than leaving
     * empty bands: an unreachable record and a period with no choices must not
     * render the same screen.
     *
     * @returns {Promise<void>}
     */
    async load () {
      this.loading = true
      this.error = false
      try {
        const res = await fetchWithTimeout('/api/model-choices', {
          headers: { Authorization: `Bearer ${this.apiToken}` }
        })
        if (!res.ok) { throw new Error(res.statusText) }
        const data = await res.json()
        if (!data || !data.success) { throw new Error('UNSUCCESSFUL') }
        this.pairings = data.pairings || []
        this.declines = data.declines || []
        this.rows = data.rows || []
        this.totals = data.totals || {}
        this.awaitingFirms = data.awaitingFirms === true
      } catch (err) {
        this.error = true
      } finally {
        this.loading = false
      }
    },

    /**
     * Buefy tag type for how we know what the AI chose.
     *
     * @param {Object} row - one choice row.
     * @returns {string} a Buefy type, or '' for a source this screen does not know.
     */
    howType (row) {
      return HOW_TYPES[row.source] || ''
    },

    /**
     * The label for how we know. A decline has only one source — the AI declared it
     * — because there is no page path to find in prose when no model was named.
     *
     * @param {Object} row - one choice row.
     * @returns {string}
     */
    howLabel (row) {
      return row.source === 'prose'
        ? this.$t('modelChoices.howProse')
        : this.$t('modelChoices.howDeclared')
    },

    /**
     * Day-month, then time — the drawing's own "15 Sep 16:04". Deliberately not the
     * browser's short numeric default: 7/8 is a different day in two countries.
     *
     * @param {string|Date} dt - when the choice was made.
     * @returns {string} e.g. "15 Sep 16:04"
     */
    formatWhen (dt) {
      if (!dt) { return '' }
      const d = new Date(dt)
      const day = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
      const time = d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })
      return `${day} ${time}`
    }
  }
}
</script>

<style scoped>
.tile-box {
  height: 100%;
  padding: 1rem;
}

.tile-num {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.1;
}

/* The declines band is the one that was invisible before, and it is the AI doing
   its job rather than failing — so it reads as good news, per the drawing. */
.tile-declined .tile-num {
  color: #257953;
}

/* The AI half-obeying: a real model named, but the advisor left to find the page. */
.tile-prose .tile-num {
  color: #946c00;
}

.dom {
  color: #4a4a4a;
}
</style>
