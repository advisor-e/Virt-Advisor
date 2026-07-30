<template lang="pug">
  section.section
    .container
      .section-banner.section-banner--market
        span.ico 🛒
        h1 {{ $t('market.title') }}
        page-help(help-key="marketplace")
      .level.is-mobile.mb-3
        .level-left
          p.has-text-grey {{ $t('market.intro') }}
        .level-right
          b-button(type="is-warning" @click="openCreate") ＋ {{ $t('market.list') }}

      .tabs.is-toggle.is-small.mb-4
        ul
          li(:class="{ 'is-active': filter === 'all' }")
            a(@click="filter = 'all'") {{ $t('market.allTools') }}
          li(:class="{ 'is-active': filter === 'mine' }")
            a(@click="filter = 'mine'") {{ $t('market.myTools') }} ({{ ownedCount }})

      b-message(v-if="loading" type="is-info") Loading…
      p.has-text-grey(v-else-if="filter === 'mine' && !visibleListings.length") {{ $t('market.noPurchases') }}
      .columns.is-multiline(v-else)
        .column.is-half(v-for="l in visibleListings" :key="l.id")
          .box.listing
            .is-flex.is-justify-content-space-between.is-align-items-flex-start
              p.is-size-5.has-text-weight-semibold {{ l.title }}
              span.tag.price {{ l.price }}
            p.mt-2 {{ l.summary }}
            .tags.mt-2
              span.tag(v-for="t in (l.tags || [])" :key="t") {{ t }}
            p.mt-2(v-if="l.ipTier === 4")
              span.tag.is-link.is-light 🏷️ {{ $t('market.groupOwned') }}
            p.has-text-grey.is-size-7.mt-2 {{ $t('market.by') }} {{ l.createdBy }} · {{ l.groupName }}
            p.has-text-grey.is-size-7 ⓘ {{ $t('market.licence') }}
            .mt-3.buttons
              b-button(v-if="!l.owned" type="is-success" size="is-small" @click="buy(l)") {{ $t('market.get') }}
              template(v-else)
                span.tag.is-success.is-light ✓ {{ $t('market.owned') }}
                a.button.is-link.is-small.is-light(v-if="l.openUrl" :href="l.openUrl" target="_blank" rel="noopener") ↗ {{ $t('market.openTool') }}

      b-modal(v-model="createOpen" has-modal-card)
        .modal-card
          header.modal-card-head
            p.modal-card-title {{ $t('market.list') }}
          section.modal-card-body
            b-field(:label="$t('market.fTool')" :message="$t('market.toolHint')")
              tool-picker(ref="toolPicker" :block-locked="true" @select="onToolSelect" @locked="onToolLocked" @clear="onToolClear")
            b-field(v-if="form.pageId" :label="$t('market.fToolId')")
              .tags.has-addons.mb-0
                span.tag.is-dark {{ form.pageId }}
                span.tag.is-info.is-light 🔒 {{ $t('market.readOnly') }}
            b-field(:label="$t('market.fTitle')")
              b-input(v-model="form.title")
            button.button.is-light.is-small.mb-4(
              v-if="speechSupported"
              @click="toggleVoiceInput('form.title')"
              :class="{ 'is-danger': voiceField === 'form.title' }"
              title="Voice input"
            ) 🎤
            b-field(:label="$t('market.fSummary')")
              b-input(type="textarea" v-model="form.summary")
            button.button.is-light.is-small.mb-4(
              v-if="speechSupported"
              @click="toggleVoiceInput('form.summary')"
              :class="{ 'is-danger': voiceField === 'form.summary' }"
              title="Voice input"
            ) 🎤
            b-field(:label="$t('market.fTags')")
              b-taginput(v-model="form.tags" ellipsis)
            b-field(:label="$t('market.fPrice')" :message="$t('market.priceHint')")
              b-input(v-model="form.price" placeholder="Free")
          footer.modal-card-foot
            b-button(type="is-warning" @click="create") {{ $t('market.list') }}
            b-button(@click="createOpen = false") {{ $t('common.cancel') }}
</template>

<script>
import speechMixin from '~/mixins/collaborate/speechMixin'
import ToolPicker from '~/components/collaborate/shared/ToolPicker.vue'

export default {
  name: 'MarketplacePage',
  components: { ToolPicker },
  mixins: [speechMixin],
  data () {
    return {
      listings: [],
      loading: true,
      filter: 'all', // 'all' | 'mine' (tools I've bought)
      createOpen: false,
      form: { title: '', summary: '', tags: [], price: 'Free', pageId: '' }
    }
  },
  computed: {
    ownedCount () { return this.listings.filter(l => l.owned).length },
    // "All tools" vs "My tools" (only the ones I've bought).
    visibleListings () {
      return this.filter === 'mine' ? this.listings.filter(l => l.owned) : this.listings
    }
  },
  async mounted () {
    await this.load()
  },
  methods: {
    async load () {
      this.loading = true
      try {
        const res = await fetch('/api/people/marketplace')
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        this.listings = await res.json()
      } catch (e) {
        // Keep listings as [] so the grid stays empty rather than crashing.
        this.$buefy.toast.open({ message: this.$t('toast.loadMarketplace'), type: 'is-danger' })
      } finally {
        this.loading = false
      }
    },
    async buy (l) {
      try {
        const res = await fetch('/api/people/marketplace/' + l.id + '/purchase', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
        })
        const data = await res.json()
        if (data.success) {
          l.owned = true
          this.$buefy.toast.open({ message: this.$t('market.gotIt'), type: 'is-success' })
        }
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('toast.failed'), type: 'is-danger' })
      }
    },
    // A tool was chosen in the shared ToolPicker: fill the form from it. The page ID
    // is the read-only link; title/summary/tags pre-fill from the master record and
    // stay editable. (The picker already refuses locked tools via block-locked.)
    onToolSelect (option) {
      this.form.pageId = option.pageId
      this.form.title = option.title
      this.form.summary = option.purpose || ''
      this.form.tags = (option.tags || []).slice()
    },
    // The picker refused a locked / non-derivable framework (Tier 2, plan §6).
    onToolLocked () {
      this.$buefy.toast.open({ message: this.$t('market.lockedTool'), type: 'is-warning' })
    },
    // The picker selection was cleared (re-searching) — drop the linked page ID so
    // create() blocks until a tool is chosen again.
    onToolClear () {
      this.form.pageId = ''
    },
    openCreate () {
      this.form = { title: '', summary: '', tags: [], price: 'Free', pageId: '' }
      this.createOpen = true
      if (this.$refs.toolPicker) { this.$refs.toolPicker.reset() }
    },
    async create () {
      // A listing must link to a real Advisor-e tool (page ID). The backend
      // re-checks this, but block early for a clear message.
      if (!this.form.pageId) {
        this.$buefy.toast.open({ message: this.$t('market.toolRequired'), type: 'is-warning' })
        return
      }
      if (!this.form.title.trim()) {
        this.$buefy.toast.open({ message: this.$t('market.fTitle') + '?', type: 'is-warning' })
        return
      }
      try {
        const res = await fetch('/api/people/marketplace', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.form)
        })
        const l = await res.json()
        if (l && l.id) {
          this.createOpen = false
          await this.load()
          this.$buefy.toast.open({ message: this.$t('market.listed'), type: 'is-success' })
        } else {
          // Surface a handled rejection (e.g. a locked framework) instead of failing silently.
          const msg = l && l.error && l.error.message ? l.error.message : 'Failed'
          this.$buefy.toast.open({ message: msg, type: 'is-warning' })
        }
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('toast.failed'), type: 'is-danger' })
      }
    }
  }
}
</script>

<style scoped>
.listing { height: 100%; }
.price { background: #fff0e8; color: #c0451f; font-weight: 300; }
</style>
