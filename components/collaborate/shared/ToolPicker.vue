<template lang="pug">
  b-autocomplete(
    v-model="query"
    :data="filteredTools"
    field="title"
    :placeholder="$t('market.toolPlaceholder')"
    :loading="loading"
    open-on-focus
    clearable
    @select="onSelect"
  )
    template(slot-scope="props")
      .is-flex.is-justify-content-space-between.is-align-items-center
        span
          | {{ props.option.title }}
          span.tag.is-warning.is-light.ml-2(v-if="props.option.locked") 🔒 {{ $t('market.locked') }}
        small.has-text-grey.ml-2 {{ props.option.subSection }}
    template(slot="empty") {{ $t('market.noTool') }}
</template>

<script>
/**
 * ToolPicker — the shared Advisor-e tool-catalogue picker (FEAT-TOOLPICKER-EXTRACT).
 * A type-to-search autocomplete over the master catalogue (`GET /api/templates`),
 * used in three places: the marketplace "List a tool" form, a group's Shared
 * workspace, and the 1:1 conversation pane. The catalogue is read-only master data
 * (never edited here); filtering is client-side and capped for a snappy dropdown.
 *
 * Props:
 *   blockLocked — when true, a locked / non-derivable framework (Tier 2, plan §6)
 *                 cannot be chosen (the marketplace can't list one); the component
 *                 refuses it and emits `locked` so the parent can explain why.
 *
 * Events:
 *   select (tool)  — a tool was chosen (the full catalogue row: pageId/title/purpose/tags).
 *   locked         — a locked tool was chosen while blockLocked is on (nothing selected).
 *   clear          — the selection was cleared (re-searching or the field emptied).
 *
 * Reset via the exposed `reset()` method (call when re-opening the picker).
 */
export default {
  name: 'ToolPicker',
  props: {
    blockLocked: { type: Boolean, default: false }
  },
  data () {
    return { tools: [], loading: false, query: '', selected: null }
  },
  computed: {
    // Client-side filter over the loaded catalogue; capped so the dropdown stays
    // snappy with 200+ tools. Matches title, sub-section and tags.
    filteredTools () {
      const q = (this.query || '').trim().toLowerCase()
      const base = q
        ? this.tools.filter((t) => {
          const hay = (t.title + ' ' + (t.subSection || '') + ' ' + (t.tags || []).join(' ')).toLowerCase()
          return hay.includes(q)
        })
        : this.tools
      return base.slice(0, 40)
    }
  },
  watch: {
    // If the text no longer matches the confirmed selection, the user is
    // re-searching — drop the selection until they pick again.
    query (val) {
      if (this.selected && val !== this.selected.title) {
        this.selected = null
        this.$emit('clear')
      }
    }
  },
  async mounted () {
    await this.loadTools()
  },
  methods: {
    // Load the Advisor-e tool catalogue once.
    async loadTools () {
      if (this.tools.length) { return }
      this.loading = true
      try {
        const res = await fetch('/api/templates')
        if (res.ok) { this.tools = await res.json() }
      } catch (e) {
        // leave empty; the picker just shows no options
      } finally {
        this.loading = false
      }
    },
    onSelect (option) {
      if (!option) { this.selected = null; this.$emit('clear'); return }
      // A locked framework can't be listed for sale (plan §6) — refuse at the picker.
      if (option.locked && this.blockLocked) {
        this.query = ''
        this.selected = null
        this.$emit('locked')
        return
      }
      this.selected = option
      this.query = option.title
      // Emits the full catalogue row — the parent reads pageId/title/purpose/tags.
      this.$emit('select', option)
    },
    // Clear the picker to a blank slate (call when re-opening).
    reset () {
      this.query = ''
      this.selected = null
    }
  }
}
</script>
