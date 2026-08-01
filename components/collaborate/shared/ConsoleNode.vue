<template lang="pug">
  .cnode(:class="'cnode--d' + depth")
    .cnode-row(:class="{ 'is-expandable': expandable, 'is-open': open }" @click="toggle")
      span.cnode-caret(v-if="expandable") {{ open ? '▾' : '▸' }}
      span.cnode-caret.is-leaf(v-else) •
      span.cnode-label {{ displayLabel }}
      span.cnode-counts {{ countsText }}
    .cnode-kids(v-if="open")
      //- Either more grouping levels (recurse) …
      template(v-if="node.children")
        console-node(v-for="c in node.children" :key="c.level + ':' + c.value" :node="c" :preview="preview" :preview-tier="previewTier" :depth="depth + 1")
      //- … or a branch's advisers, LOADED ON DEMAND (PERF-CONSOLE-TREE) so the tree
      //- payload never scales with the subtree size.
      template(v-else-if="node.childLevel === 'advisor'")
        p.cnode-note(v-if="loadingPeople") {{ $t('console.loadingAdvisers') }}
        p.cnode-note(v-else-if="loadError") {{ $t('console.loadFailed') }}
        template(v-else)
          .cnode-person(v-for="p in people" :key="p.id")
            span.cnode-pname
              | {{ p.name }}
              span.tag.is-light.ml-2(v-if="p.isMe") {{ $t('firm.you') }}
              span.tag.is-warning.is-light.ml-2(v-if="p.blocked") 🔒
            span.cnode-ptitle {{ p.title }}
            span.tag.ml-2(:class="p.available ? 'is-success is-light' : 'is-light'") {{ p.available ? $t('common.available') : $t('console.unavailable') }}
          p.cnode-note(v-if="loaded && !people.length") {{ $t('console.noAdvisers') }}
</template>

<script>
/**
 * ConsoleNode — one row of the manager-console roll-up (Q-ROLES). Recursive: a node
 * is a grouping level (global group / country / firm) that expands to its children,
 * and the firm level expands to its advisers. Purely presentational; the payload
 * (with per-node counts) comes from the backend `tree`.
 */
const COUNTRY_NAMES = { DE: 'Germany', IE: 'Ireland', CH: 'Switzerland', IT: 'Italy', GB: 'United Kingdom', US: 'United States', FR: 'France', ES: 'Spain' }

export default {
  name: 'ConsoleNode',
  props: {
    node: { type: Object, required: true },
    preview: { type: Boolean, default: false },
    // The preview tier ('group'/'global'/'mentor') when in show-home mode, so the
    // lazy adviser loader hits the dev-gated preview endpoint. Empty = real endpoint.
    previewTier: { type: String, default: '' },
    depth: { type: Number, default: 0 }
  },
  data () {
    return { open: false, people: [], loaded: false, loadingPeople: false, loadError: false }
  },
  computed: {
    expandable () {
      return !!(this.node.children && this.node.children.length) ||
        (this.node.childLevel === 'advisor' && this.node.advisers > 0)
    },
    // Where to fetch this branch's advisers (real vs dev preview endpoint).
    advisersUrl () {
      const base = this.previewTier
        ? '/api/people/console/preview/' + this.previewTier + '/advisers'
        : '/api/people/console/advisers'
      return base + '?firm=' + encodeURIComponent(this.node.value)
    },
    // Country codes render as names; brands/branches show as-is.
    displayLabel () {
      if (this.node.level === 'country') { return COUNTRY_NAMES[this.node.value] || this.node.value }
      return this.node.label
    },
    // e.g. "3 firms · 5 advisers", or "1 group · 1 adviser" (singular/plural aware).
    countsText () {
      const advisers = this.countLabel(this.node.advisers, 'advisor')
      if (this.node.childLevel === 'advisor') { return advisers }
      return this.countLabel(this.node.childCount, this.node.childLevel) + ' · ' + advisers
    }
  },
  methods: {
    // "{n} {singular|plural}" — picks the form by count.
    countLabel (n, level) {
      const key = (n === 1 ? 'console.levelSingular.' : 'console.levelPlural.') + level
      return n + ' ' + this.$t(key)
    },
    toggle () {
      if (!this.expandable) { return }
      this.open = !this.open
      // Lazy-load a branch's advisers the first time it is opened (PERF-CONSOLE-TREE).
      if (this.open && this.node.childLevel === 'advisor' && !this.loaded && !this.loadingPeople) {
        this.loadPeople()
      }
    },
    async loadPeople () {
      this.loadingPeople = true
      this.loadError = false
      try {
        const res = await fetch(this.advisersUrl)
        if (res.ok) {
          const data = await res.json()
          this.people = data.advisers || []
          this.loaded = true
        } else {
          this.loadError = true
        }
      } catch (e) {
        this.loadError = true
      } finally {
        this.loadingPeople = false
      }
    }
  }
}
</script>

<style scoped>
.cnode-row { display: flex; align-items: center; gap: .5rem; padding: .5rem .25rem; border-bottom: 1px solid #eee; }
.cnode-row.is-expandable { cursor: pointer; }
.cnode-row.is-expandable:hover { background: #f7f8fc; }
.cnode-caret { width: 1rem; text-align: center; color: var(--muted); font-size: .8rem; flex: none; }
.cnode-caret.is-leaf { color: #cfd3e0; }
.cnode-label { font-weight: 400; }
.cnode-counts { margin-left: auto; color: var(--muted); font-size: .82rem; white-space: nowrap; }
/* Indent each level so the hierarchy reads at a glance. */
.cnode-kids { margin-left: 1rem; border-left: 2px solid #eef0f6; padding-left: .5rem; }
.cnode-person { display: flex; align-items: baseline; gap: .5rem; padding: .35rem .25rem; border-bottom: 1px dashed #eee; }
.cnode-person:last-child { border-bottom: 0; }
.cnode-pname { font-size: .9rem; }
.cnode-ptitle { color: var(--muted); font-size: .78rem; }
.cnode-note { color: var(--muted); font-size: .82rem; padding: .35rem .25rem; }
</style>
