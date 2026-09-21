<template lang="pug">
.stat-card
  .stat-card-top
    p.stat-card-label {{ label }}
    b-tag(v-if="badge" :type="tagType" size="is-small") {{ badge }}
  p.stat-card-value {{ value }}
  p.stat-card-footer(v-if="footer") {{ footer }}
  slot(name="footer")
</template>

<script>
/**
 * StatCard — one figure in the Sales Dashboard's stats strip.
 *
 * A faithful copy of Mike's own `components/dashboard/StatCard.vue` from
 * advisor-e/sales-tracker-nuxt: same markup, same classes, same CSS. Only the
 * prop declarations gained their types, which this repo's standards require and
 * which changes nothing on screen.
 */
export default {
  name: 'StatCard',

  props: {
    /** The small upper-case caption above the figure. */
    label: { type: String, default: '' },
    /** The figure itself, already formatted by the caller. */
    value: { type: [String, Number], default: '' },
    /** Optional pill to the right of the label. */
    badge: { type: String, default: '' },
    /** Which colour that pill takes. */
    badgeColor: {
      type: String,
      default: '',
      validator: v => ['', 'blue', 'green', 'cyan', 'teal', 'orange', 'pink'].includes(v)
    },
    /** Optional quiet line beneath the figure. */
    footer: { type: String, default: '' }
  },

  computed: {
    /** Mike's badge-colour → Buefy tag mapping, unchanged. */
    tagType () {
      const map = {
        blue: 'is-info is-light',
        green: 'is-success is-light',
        cyan: 'is-link is-light',
        teal: 'is-primary is-light',
        orange: 'is-warning is-light',
        pink: 'is-danger is-light'
      }
      return map[this.badgeColor] || 'is-light'
    }
  }
}
</script>

<style scoped>
/* Mike's CSS, copied unchanged. */
.stat-card {
  background: white;
  border-radius: 8px;
  padding: 0.75rem 0.85rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  transition: box-shadow 0.2s;
  min-width: 0;
}

.stat-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.stat-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem;
  margin-bottom: 0.4rem;
}

.stat-card-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-card-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.1;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-card-footer {
  font-size: 0.72rem;
  color: #94a3b8;
}
</style>
