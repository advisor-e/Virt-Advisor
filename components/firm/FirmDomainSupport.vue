<template lang="pug">
section.firm-domain-support
  p.subtitle.is-6.has-text-grey.mb-4 {{ $t('firmDomainSupport.lede') }}

  b-message(v-if="error" type="is-danger" has-icon :closable="false") {{ error }}

  //- Toolbar — search
  .level.mb-4
    .level-left
      b-field.mb-0
        b-input(
          v-model="query"
          type="search"
          icon="magnify"
          :placeholder="$t('firmDomainSupport.searchPlaceholder')"
          :aria-label="$t('firmDomainSupport.searchPlaceholder')"
        )

  b-loading(:is-full-page="false" :active="loading")

  .columns(v-if="!loading")
    //- Rail: advisory domains + GET files
    .column.is-4
      firm-rail(
        :sections="tree"
        :query="query.trim()"
        :aria-label="$t('firmDomainSupport.railLabel')"
        :empty-text="query ? $t('firmDomainSupport.noMatch') : $t('firmDomainSupport.emptyLibrary')"
      )
        template(v-slot:sub-badge="{ sub }")
          b-tag(:type="sub.hasOverride ? 'is-warning is-light' : 'is-light'" size="is-small")
            | {{ sub.hasOverride ? $t('firmDomainSupport.overrideTag') : $t('firmDomainSupport.platformTag') }}

        template(v-slot:default="{ sub }")
          button.rail-page(
            v-for="item in sub.items"
            :key="item.id"
            type="button"
            :class="{ 'is-current': current && current.id === item.id }"
            @click="select(item)"
          )
            span.rail-pagename {{ item.label }}
            b-tag(size="is-small" rounded) {{ item.supportTools }}

          .rail-empty(v-if="!sub.items.length")
            span.has-text-grey.is-size-7
              | {{ query ? $t('firmDomainSupport.noMatch') : $t('firmDomainSupport.noItems') }}

    //- Panel: the selected domain's editable content
    .column.is-8
      .box.panel-empty(v-if="!current")
        p.has-text-weight-semibold {{ $t('firmDomainSupport.pickADomain') }}
        p.has-text-grey.is-size-7 {{ $t('firmDomainSupport.pickADomainHint') }}

      div(v-else)
        .box
          .level.mb-3
            .level-left
              div
                p.title.is-5.mb-2 {{ current.label }}
                .tags.mb-0
                  b-tag(:type="current.origin === 'firm' ? 'is-warning is-light' : 'is-light'")
                    | {{ current.origin === 'firm' ? $t('firmDomainSupport.originFirm') : $t('firmDomainSupport.originPlatform') }}
                  b-tag(type="is-light") {{ current.supportTools }} {{ $t('firmDomainSupport.supportTools') }}

          //- Quick edit form (simplified for now)
          div(v-if="currentData")
            .field
              label.label {{ $t('firmDomainSupport.triggerKeywords') }}
              b-field
                b-input(
                  v-model="editForm.trigger_keywords"
                  type="textarea"
                  :placeholder="$t('firmDomainSupport.triggerKeywordsPlaceholder')"
                  rows="3"
                )

            .field
              label.label {{ $t('firmDomainSupport.overview') }}
              b-field
                b-input(
                  v-model="editForm.overview"
                  type="textarea"
                  :placeholder="$t('firmDomainSupport.overviewPlaceholder')"
                  rows="4"
                )

            .level.mt-4
              .level-left
                button.button.is-primary(@click="saveDomainSupport" :loading="saving")
                  span {{ $t('firmDomainSupport.save') }}
              .level-right
                button.button.is-text(v-if="current.origin === 'firm'" @click="resetDomainSupport")
                  span {{ $t('firmDomainSupport.reset') }}

        //- Version history
        .box
          p.title.is-6 {{ $t('firmDomainSupport.historyHeading') }}
          b-table(v-if="history.length" :data="history" :mobile-cards="false")
            b-table-column(v-slot="{ row }" field="version" :label="$t('firmDomainSupport.historyVersion')" width="80")
              | v{{ row.version }}
            b-table-column(v-slot="{ row }" field="saved_by" :label="$t('firmDomainSupport.historySavedBy')")
              | {{ row.saved_by }}
            b-table-column(v-slot="{ row }" field="created_at" :label="$t('firmDomainSupport.historyDate')")
              | {{ row.created_at }}
</template>

<script>
const FirmRail = require('./FirmRail.vue')

export default {
  name: 'FirmDomainSupport',

  components: { FirmRail },

  props: {
    apiToken: {
      type: String,
      default: ''
    }
  },

  data () {
    return {
      query: '',
      loading: true,
      error: null,
      saving: false,
      tree: [],
      current: null,
      currentData: null,
      history: [],
      editForm: {
        trigger_keywords: '',
        overview: ''
      },
      allData: {
        advisoryDomains: [],
        getSellers: []
      }
    }
  },

  mounted () {
    if (process.client) {
      this.loadDomainSupport()
    }
  },

  methods: {
    async loadDomainSupport () {
      this.loading = true
      this.error = null
      try {
        const res = await this.api('/api/firm-manager/domain-support')
        this.allData = res
        this.buildTree()
      } catch (err) {
        this.error = err.message || 'Failed to load domain support'
      } finally {
        this.loading = false
      }
    },

    buildTree () {
      this.tree = [
        {
          name: this.$t('firmDomainSupport.advisoryDomains'),
          tone: 0,
          subs: [
            {
              key: 'advisory',
              name: this.$t('firmDomainSupport.advisoryLabel'),
              items: this.filterByQuery(this.allData.advisoryDomains)
            }
          ]
        },
        {
          name: this.$t('firmDomainSupport.sellerContent'),
          tone: 1,
          subs: [
            {
              key: 'sellers',
              name: this.$t('firmDomainSupport.sellerLabel'),
              items: this.filterByQuery(this.allData.getSellers)
            }
          ]
        }
      ]
    },

    filterByQuery (items) {
      if (!this.query) { return items }
      const q = this.query.toLowerCase()
      return items.filter(item => item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q))
    },

    select (item) {
      this.current = item
      this.editForm = {
        trigger_keywords: '',
        overview: ''
      }
      this.history = []
      this.loadDomainDetail()
    },

    async loadDomainDetail () {
      try {
        const res = await this.api(`/api/firm-manager/domain-support/${this.current.id}`)
        this.currentData = res
        // Populate edit form with current data
        if (this.currentData) {
          this.editForm.trigger_keywords = (this.currentData.trigger_keywords || []).join(', ')
          this.editForm.overview = this.currentData.overview || ''
        }
        await this.loadHistory()
      } catch (err) {
        this.error = err.message || 'Failed to load domain detail'
      }
    },

    async loadHistory () {
      try {
        const res = await this.api(`/api/firm-manager/domain-support/${this.current.id}/history`)
        this.history = res.history || []
      } catch (err) {
        // Silent fail for history
      }
    },

    async saveDomainSupport () {
      this.saving = true
      try {
        const override = {
          trigger_keywords: this.editForm.trigger_keywords
            .split(',')
            .map(s => s.trim())
            .filter(s => s),
          overview: this.editForm.overview
        }
        await this.api(`/api/firm-manager/domain-support/${this.current.id}`, {
          method: 'POST',
          body: override
        })
        this.$buefy.toast.open({ message: this.$t('firmDomainSupport.saved'), type: 'is-success' })
        await this.loadDomainSupport()
        if (this.current) { this.select(this.current) }
      } catch (err) {
        this.error = err.message || 'Failed to save'
      } finally {
        this.saving = false
      }
    },

    async resetDomainSupport () {
      this.$buefy.dialog.confirm({
        title: this.$t('firmDomainSupport.confirmResetTitle'),
        message: this.$t('firmDomainSupport.confirmResetMessage'),
        onConfirm: async () => {
          try {
            await this.api(`/api/firm-manager/domain-support/${this.current.id}`, {
              method: 'DELETE'
            })
            this.$buefy.toast.open({ message: this.$t('firmDomainSupport.resetDone'), type: 'is-success' })
            await this.loadDomainSupport()
          } catch (err) {
            this.error = err.message || 'Failed to reset'
          }
        }
      })
    },

    api (url, opts = {}) {
      const token = this.apiToken || (this.$auth && this.$auth.access_token) || ''
      const options = {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        ...opts
      }
      if (opts.body) {
        options.body = JSON.stringify(opts.body)
      }
      return fetch(url, options).then(r => {
        if (!r.ok) { throw new Error(`HTTP ${r.status}`) }
        return r.json()
      })
    }
  },

  watch: {
    query () {
      this.buildTree()
    }
  }
}
</script>

<style scoped>
.rail-page {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
}

.rail-page:hover {
  background-color: #f5f5f5;
}

.rail-page.is-current {
  background-color: #e8f4f8;
  font-weight: 600;
}

.rail-pagename {
  display: block;
  margin-bottom: 0.25rem;
}

.rail-empty {
  padding: 1rem;
  text-align: center;
}

.panel-empty {
  text-align: center;
  background-color: #fafafa;
}
</style>
