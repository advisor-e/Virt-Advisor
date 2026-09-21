<template lang="pug">
.sl
  header.sl-head
    .sl-eyebrow {{ $t('salesLists.eyebrow') }}
    h1.sl-title {{ $t('salesLists.title') }}
    p.sl-lede {{ $t('salesLists.lede') }}

  b-notification.sl-note(
    v-if="errorText"
    type="is-danger is-light"
    :closable="true"
    @close="errorText = ''"
  ) {{ errorText }}

  b-notification.sl-note(
    v-if="savedKey"
    type="is-success is-light"
    :closable="true"
    @close="savedKey = ''"
  ) {{ $t('salesLists.saved', { list: savedKey }) }}

  loading-spinner(v-if="loading && !listKeys.length" :message="$t('salesLists.loading')")

  .sl-cards(v-else)
    //- One card per list. Collapsed to its name and count until opened, because
    //- ten open editors at once is a wall rather than a screen.
    .sl-card(v-for="key in listKeys" :key="key" :class="{ 'is-open': expanded === key }")
      button.sl-cardhead(
        type="button"
        :aria-expanded="expanded === key ? 'true' : 'false'"
        @click="toggle(key)"
      )
        .sl-cardname
          span.sl-cardtitle {{ lists[key].name }}
          span.sl-carddesc {{ lists[key].description }}
        .sl-cardmeta
          span.sl-count {{ $tc('salesLists.itemCount', lists[key].items.length, { count: lists[key].items.length }) }}
          span.sl-chev {{ expanded === key ? '−' : '+' }}

      .sl-cardbody(v-if="expanded === key")
        p.sl-empty(v-if="!lists[key].items.length") {{ $t('salesLists.emptyList') }}

        ul.sl-items
          li.sl-item(v-for="(item, idx) in lists[key].items" :key="item")
            span.sl-swatch(
              v-if="lists[key].colors && lists[key].colors[item]"
              :style="{ backgroundColor: lists[key].colors[item] }"
              aria-hidden="true"
            )
            span.sl-itemtext {{ item }}
            .sl-itembtns
              b-button(
                size="is-small"
                :disabled="idx === 0"
                :aria-label="$t('salesLists.moveUp')"
                @click="move(key, idx, -1)"
              ) ↑
              b-button(
                size="is-small"
                :disabled="idx === lists[key].items.length - 1"
                :aria-label="$t('salesLists.moveDown')"
                @click="move(key, idx, 1)"
              ) ↓
              b-button(
                size="is-small"
                type="is-danger is-light"
                :aria-label="$t('salesLists.remove')"
                @click="remove(key, idx)"
              ) ×

        .sl-add
          b-input.sl-addinput(
            v-model="draft"
            size="is-small"
            :placeholder="$t('salesLists.addPlaceholder')"
            :aria-label="$t('salesLists.addPlaceholder')"
            @keyup.native.enter="add(key)"
          )
          b-button(
            type="is-link"
            size="is-small"
            :disabled="!draft.trim()"
            @click="add(key)"
          ) {{ $t('salesLists.add') }}

        .sl-actions
          b-button(
            type="is-primary"
            size="is-small"
            :loading="savingKey === key"
            :disabled="!isDirty(key)"
            @click="save(key)"
          ) {{ $t('salesLists.save') }}
          b-button(
            size="is-small"
            :disabled="!isDirty(key) || savingKey === key"
            @click="revert(key)"
          ) {{ $t('salesLists.revert') }}
          span.sl-dirty(v-if="isDirty(key)") {{ $t('salesLists.unsaved') }}

  p.sl-foot {{ $t('salesLists.footnote') }}
</template>

<script>
import LoadingSpinner from '~/components/sales/LoadingSpinner.vue'

/** The same key the other Sales Tracker screens read their token from. */
const TOKEN_KEY = 'advisor_e_token'

/**
 * The firm's Sales Tracker dropdown lists — item 17 stage 4.
 *
 * These ten lists fill the dropdowns on the pipeline and COI screens, so they
 * are firm-wide: one advisor must not retitle everyone's prospect stages. The
 * backend gates every WRITE on `requireManagerRole` while leaving the READ open,
 * because the screens that consume them belong to ordinary advisors.
 *
 * 🔴 EDITS ARE LOCAL UNTIL SAVED, ONE LIST AT A TIME. A card is dirty or it is
 * not, and the Save button says which. Auto-saving a dropdown that other people's
 * screens read is how a half-finished edit reaches a colleague mid-sentence.
 *
 * ⚠ THE LANGUAGES SECTION OF THE SOURCE SCREEN IS DELIBERATELY ABSENT. Its
 * `pages/lists.vue` carries an "add a language, AI translates the app" block —
 * that is stage 6, which the survey recommends dropping because Virt Advisor
 * already has its own language handling (design/features/sales-tracker.md §10).
 * It is not built here and its omission is a scope decision, not an oversight.
 */
export default {
  name: 'SalesLists',

  components: { LoadingSpinner },

  props: {
    /**
     * The hub passes its own token down; the standalone page at /sales-lists does
     * not, and the component falls back to the one the master app left in
     * localStorage. Optional so the SAME component serves both doorways.
     */
    apiToken: { type: String, default: '' }
  },

  data () {
    return {
      /** key → list, as the backend returns it (name, description, items, colors). */
      lists: {},
      /** The same lists as first loaded, to compare against for "unsaved". */
      original: {},
      expanded: '',
      draft: '',
      loading: false,
      savingKey: '',
      savedKey: '',
      errorText: ''
    }
  },

  computed: {
    /** The backend's order is the order these are shown in — never re-sorted here. */
    listKeys () {
      return Object.keys(this.lists)
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /**
     * Fetch every list for this firm.
     * @returns {Promise<void>}
     */
    authHeaders () {
      const token = this.apiToken ||
        (process.client && window.localStorage.getItem(TOKEN_KEY)) ||
        'dev-local-bypass'
      return { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
    },

    async load () {
      this.loading = true
      this.errorText = ''
      try {
        const res = await fetch('/api/sales/lists', { headers: this.authHeaders() })
        const body = await res.json().catch(() => null)
        if (!res.ok || !body || body.success !== true) {
          this.errorText = this.$t('salesLists.errors.load')
          return
        }
        this.lists = body.lists || {}
        this.original = JSON.parse(JSON.stringify(this.lists))
      } catch (e) {
        this.errorText = this.$t('salesLists.errors.load')
      } finally {
        this.loading = false
      }
    },

    /** Open one card and close any other; clears the half-typed value with it. */
    toggle (key) {
      this.expanded = this.expanded === key ? '' : key
      this.draft = ''
    },

    /**
     * Has this list changed since it was loaded or last saved?
     * @param {string} key
     * @returns {boolean}
     */
    isDirty (key) {
      const now = this.lists[key]
      const was = this.original[key]
      if (!now || !was) { return false }
      return JSON.stringify(now.items) !== JSON.stringify(was.items)
    },

    /**
     * Add the typed value to a list. A duplicate is refused on screen rather than
     * silently dropped by the backend, so the advisor sees why nothing happened.
     * @param {string} key
     */
    add (key) {
      const v = this.draft.trim()
      if (!v) { return }
      if (this.lists[key].items.includes(v)) {
        this.errorText = this.$t('salesLists.errors.duplicate', { value: v })
        return
      }
      this.lists[key].items.push(v)
      this.draft = ''
    },

    /**
     * Remove one value. Vue 2 needs splice on an array for reactivity.
     * @param {string} key
     * @param {number} idx
     */
    remove (key, idx) {
      this.lists[key].items.splice(idx, 1)
    },

    /**
     * Move a value up or down — the stored order is the order the dropdown shows.
     * @param {string} key
     * @param {number} idx
     * @param {number} delta - -1 up, 1 down
     */
    move (key, idx, delta) {
      const items = this.lists[key].items
      const to = idx + delta
      if (to < 0 || to >= items.length) { return }
      items.splice(to, 0, items.splice(idx, 1)[0])
    },

    /** Put one list back to how it was loaded, discarding local edits. */
    revert (key) {
      this.$set(this.lists, key, JSON.parse(JSON.stringify(this.original[key])))
    },

    /**
     * Save one list. The backend normalises and caps what it is given, so the
     * saved list it returns — not the local copy — becomes the new baseline.
     * @param {string} key
     * @returns {Promise<void>}
     */
    async save (key) {
      this.savingKey = key
      this.errorText = ''
      this.savedKey = ''
      try {
        const payload = { items: this.lists[key].items }
        if (this.lists[key].colors) { payload.colors = this.lists[key].colors }
        const res = await fetch(`/api/sales/lists/${key}`, {
          method: 'PUT',
          headers: this.authHeaders(),
          body: JSON.stringify(payload)
        })
        const body = await res.json().catch(() => null)
        if (!res.ok || !body || body.success !== true) {
          // 403 means an advisor is editing a manager's list — a different
          // sentence from a failure, because nothing is wrong with what they typed.
          this.errorText = res.status === 403
            ? this.$t('salesLists.errors.forbidden')
            : ((body && body.error && body.error.message) || this.$t('salesLists.errors.save'))
          return
        }
        // The backend normalises and caps what it is given, so the list IT
        // returns — not the local copy — becomes the new baseline.
        this.$set(this.lists, key, body.list)
        this.$set(this.original, key, JSON.parse(JSON.stringify(body.list)))
        this.savedKey = body.list.name
      } catch (e) {
        this.errorText = this.$t('salesLists.errors.save')
      } finally {
        this.savingKey = ''
      }
    }
  }
}
</script>

<style scoped>
.sl {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1.75rem 1.25rem 3rem;
}

.sl-head { margin-bottom: 1.25rem; }

.sl-eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #0070c0;
}

.sl-title {
  font-size: 1.85rem;
  font-weight: 700;
  color: #002b64;
  margin: 0.25rem 0 0.35rem;
  line-height: 1.15;
}

.sl-lede {
  color: #5b6f8a;
  max-width: 68ch;
  margin: 0;
}

.sl-note { margin-bottom: 1rem; }

.sl-cards { display: flex; flex-direction: column; gap: 0.6rem; }

.sl-card {
  background: #fff;
  border: 1px solid #d5e1ee;
  border-radius: 12px;
  overflow: hidden;
}

.sl-card.is-open { border-color: #0070c0; }

.sl-cardhead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  padding: 0.85rem 1rem;
  background: none;
  border: 0;
  cursor: pointer;
  text-align: left;
  font: inherit;
}

.sl-cardhead:hover { background: #f7fbff; }

.sl-cardname { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
.sl-cardtitle { font-weight: 700; color: #002b64; }
.sl-carddesc { font-size: 0.78rem; color: #5b6f8a; }

.sl-cardmeta { display: flex; align-items: center; gap: 0.75rem; flex: none; }

.sl-count {
  font-size: 0.72rem;
  color: #5b6f8a;
  background: #eef3f8;
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
  white-space: nowrap;
}

.sl-chev { font-size: 1.1rem; color: #5b6f8a; width: 1rem; text-align: center; }

.sl-cardbody { padding: 0 1rem 1rem; border-top: 1px solid #eef3f8; }

.sl-empty {
  color: #5b6f8a;
  font-style: italic;
  padding: 0.75rem 0;
  margin: 0;
}

.sl-items { list-style: none; margin: 0.75rem 0 0; padding: 0; }

.sl-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.35rem 0.5rem;
  border-radius: 7px;
  border: 1px solid #eef3f8;
  margin-bottom: 0.3rem;
}

.sl-swatch {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid #d5e1ee;
  flex: none;
}

.sl-itemtext { flex: 1; font-size: 0.88rem; color: #23405f; min-width: 0; }

.sl-itembtns { display: flex; gap: 0.25rem; flex: none; }

.sl-add { display: flex; gap: 0.5rem; margin-top: 0.85rem; align-items: center; }
.sl-addinput { flex: 1; }

.sl-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.85rem;
  padding-top: 0.75rem;
  border-top: 1px solid #eef3f8;
}

.sl-dirty { font-size: 0.75rem; color: #b56200; font-weight: 600; }

.sl-foot {
  margin-top: 1rem;
  font-size: 0.78rem;
  color: #5b6f8a;
}

@media (max-width: 720px) {
  .sl { padding: 1.25rem 0.85rem 2.5rem; }
  .sl-title { font-size: 1.5rem; }
  .sl-carddesc { display: none; }
}
</style>
