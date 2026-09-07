<template lang="pug">
.mpat(v-if="visible")
  .box.mb-4
    .is-flex.is-justify-content-space-between.is-align-items-baseline.mb-1
      h4.title.is-6.mb-0 Are the observation points landing?
      span.is-size-7.has-text-grey(v-if="!loading && !loadError") {{ chrome }}

    p.is-size-7.has-text-grey.mb-4
      | Counts across the firm. No advisor is named, and no figure can be traced back to a
      |  person.

    .has-text-centered.py-5(v-if="loading")
      b-loading(:is-full-page="false" :active="true")

    b-message(v-else-if="loadError" type="is-danger" size="is-small") {{ loadError }}

    //- The empty state is the screen most firms will actually meet, which is why the drawing
    //- gives it a panel of its own (C4). It has to say WHY it is empty, or the first manager
    //- to open it reports a bug — when the honest answer is that the software is protecting
    //- their people.
    b-message(v-else-if="!enough" type="is-info" size="is-small")
      p.mb-2
        b Not enough meetings yet to show patterns safely.
      p
        | Figures appear once at least #[b {{ minAdvisors }} advisors] and
        |  #[b {{ minMeetings }} meetings] have contributed. Below that, a count can be worked
        |  backwards to an individual — and no manager sees an individual's notes unless that
        |  advisor sends them.

    //- Above the threshold and still nothing to show: every point fell under the per-point
    //- floor. Saying "no points" here would read as "you have no observation points", which
    //- is a different and untrue statement.
    p.is-size-7.has-text-grey.py-4(v-else-if="!points.length")
      | Enough meetings this month, but no single observation point has been checked in
      |  {{ minMeetings }} of them yet. A point counted over fewer meetings than that can be
      |  worked backwards to a person, so it is left out rather than shown.

    template(v-else)
      .mpat-row(v-for="p in points" :key="p.pointId")
        .mpat-text {{ p.text || p.pointId }}
        .mpat-count {{ p.met }} / {{ p.of }}
        b-progress.mpat-bar(
          :value="percent(p)"
          :type="p.met / p.of < lowMark ? 'is-warning' : 'is-success'"
          size="is-small"
          :max="100"
          show-value=false)
</template>

<script>
/**
 * Meeting Review — the manager's aggregate.
 *
 * Are the observation points landing across this firm, this month? Counts only, never a name.
 *
 * Asked for by Mike 2026-09-01 as the manager's half of Meeting Review. Design
 * `design/features/meeting-review.md` P3 and §5 trap 2; artefact
 * `design/mockups/meeting-review.html` screens **C3 and C4, approved by Mike 2026-09-01**, and
 * every string on this screen is that drawing's own wording.
 *
 * 🔴 FIRM TIER ALONE, AND THAT IS A RULING RATHER THAN AN OMISSION. Brief **P13**: nothing
 * derived from a recorded meeting travels beyond the firm, because the consent line promises a
 * named client exactly that. So this does NOT cascade to group, global group or mentor — the
 * opposite direction from every other block in this hub. The component renders nothing at all at
 * those tiers, and the backend answers them 403 rather than with zeroes.
 *
 * 🔴 THE THRESHOLD IS NOT A TUNING CONSTANT. 5 advisors and 20 meetings, Mike's ruling of
 * 2026-09-01, and it arrives from the backend so that this screen cannot hold a second copy of
 * it that drifts. Lowering it to populate a screen would undo the promise quietly, and no test
 * on this component would catch it — which is why the numbers are pinned where they are computed.
 *
 * ⚠ TWO NAMED DIFFERENCES FROM THE APPROVED DRAWING, both deliberate:
 *
 * 1. **The drawing's "Edit the firm's observation points" button is absent.** It navigated to
 *    the points editor, which on the built screen is directly below this panel on the same tab.
 *    A button that scrolls the page a few inches is worse than no button.
 * 2. **The bar turns amber below 70%.** The drawing shows one row styled "low" at 61% and three
 *    plain ones at 75, 86 and 93, so a mark somewhere between 61 and 75 is implied but never
 *    stated. 70 is OURS, not a ruling, and it changes only a colour — never a figure.
 */
export default {
  name: 'FirmMeetingPatterns',

  props: {
    /** The signed-in manager's token, passed down by the hub. */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: true,
      loadError: '',
      /** The caller's own tier, from the backend — never inferred from the token here. */
      tier: '',
      period: null,
      meetings: 0,
      advisors: 0,
      enough: false,
      minAdvisors: 5,
      minMeetings: 20,
      points: [],
      /** Below this share, the bar reads amber. Ours, not a ruling — see the component note. */
      lowMark: 0.7
    }
  },

  computed: {
    /**
     * P13 in one line: the firm tier alone, never a tier above it.
     * @returns {boolean}
     */
    visible () {
      return this.tier === 'firm_manager'
    },

    /**
     * The drawing's own chrome line — "Aug 2026 · 28 meetings · 9 advisors".
     * @returns {string}
     */
    chrome () {
      if (!this.period) { return '' }
      const m = this.meetings === 1 ? '1 meeting' : this.meetings + ' meetings'
      const a = this.advisors === 1 ? '1 advisor' : this.advisors + ' advisors'
      return this.period.label + ' · ' + m + ' · ' + a
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /**
     * Read this month's figures.
     *
     * A tier above the firm is answered 403 by design (P13), and that is not an error worth
     * showing anybody: the component simply stays hidden, because `tier` never becomes
     * `firm_manager`.
     *
     * @returns {Promise<void>}
     */
    async load () {
      this.loading = true
      this.loadError = ''
      try {
        const data = await this.api('GET', '/api/firm-manager/meeting-patterns')
        this.tier = data.tier || ''
        this.period = data.period || null
        this.meetings = data.meetings || 0
        this.advisors = data.advisors || 0
        this.enough = Boolean(data.enough)
        this.minAdvisors = data.minAdvisors || 5
        this.minMeetings = data.minMeetings || 20
        this.points = data.points || []
      } catch (e) {
        if (e.status !== 403) {
          this.loadError = 'The meeting figures could not be loaded: ' + e.message
        }
      }
      this.loading = false
    },

    /**
     * One row as a percentage, for the bar only. The figure a manager reads is "24 / 28".
     * @param {{met: number, of: number}} point
     * @returns {number}
     */
    percent (point) {
      if (!point || !point.of) { return 0 }
      return Math.round((point.met / point.of) * 100)
    },

    /**
     * One backend call. Both an HTTP error and a network failure arrive as an Error with a
     * message a manager can act on, per the house error rule; the status rides along so the
     * caller can tell a deliberate 403 from a real failure.
     *
     * @param {string} method
     * @param {string} path
     * @returns {Promise<object>}
     */
    async api (method, path) {
      let res
      try {
        res = await fetch(path, {
          method,
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        })
      } catch (e) {
        throw new Error('The server could not be reached. Check your connection and try again.')
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const err = new Error((data.error && data.error.message) || 'That could not be read.')
        err.status = res.status
        throw err
      }
      return data
    }
  }
}
</script>

<style scoped>
.mpat-row {
  display: grid;
  grid-template-columns: 1fr auto 140px;
  gap: 12px;
  align-items: center;
  padding: 8px 0;
  border-top: 1px solid #ededed;
}
.mpat-row:first-child {
  border-top: 0;
}
.mpat-text {
  font-size: 0.875rem;
}
.mpat-count {
  font-size: 0.875rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.mpat-bar {
  margin-bottom: 0;
}
@media screen and (max-width: 768px) {
  .mpat-row {
    grid-template-columns: 1fr auto;
  }
  .mpat-bar {
    grid-column: 1 / -1;
  }
}
</style>
