<template lang="pug">
.mg-root
  .mg-wrap
    nuxt-link.mg-backlink(to="/model-library") {{ $t('modelGuide.backToLibrary') }}

    .mg-eyebrow {{ $t('modelGuide.eyebrow') }}
    h1.mg-h1 {{ $t('modelGuide.title') }}
    p.mg-lede {{ $t('modelGuide.lede') }}

    //- Loading and error are both rendered. A failed call must never leave a
    //- silently empty page (Engineering Standards, SSR & data).
    .mg-state(v-if="loading") {{ $t('modelGuide.loading') }}

    .mg-state.is-error(v-else-if="error")
      p.mg-state-msg {{ $t('modelGuide.error') }}
      b-button(size="is-small" @click="load") {{ $t('modelGuide.retry') }}

    template(v-else)
      .mg-controls
        .mg-search
          b-input(
            v-model="query"
            type="search"
            :placeholder="$t('modelGuide.searchPlaceholder')"
            :aria-label="$t('modelGuide.searchLabel')"
          )
        .mg-count(aria-live="polite") {{ countLabel }}

      p.mg-empty(v-if="!visibleModels.length")
        | {{ $t('modelGuide.noMatches', { query: query }) }}
        br
        b-button.mg-clear(size="is-small" @click="query = ''") {{ $t('modelGuide.clearSearch') }}

      //- Grouped by category, in catalogue order, so the page reads the same way
      //- the Model Library's shelves do.
      section.mg-shelf(v-for="shelf in shelves" :key="shelf.category")
        .mg-shelf-head
          h2.mg-shelf-title {{ shelf.category }}
          span.mg-shelf-count {{ $tc('modelGuide.shelfCount', shelf.models.length) }}
        .mg-shelf-rule(:style="{ background: categoryColour(shelf.category) }")

        article.mg-card(v-for="model in shelf.models" :key="model.route")
          .mg-chead
            span.mg-ctag {{ model.category }}
            span.mg-cls(:class="`is-${model.modelClass}`") {{ classLabel(model) }}
          h3.mg-cname {{ model.name }}
          p.mg-answers {{ model.answers }}

          .mg-grid
            .mg-block
              p.mg-label {{ $t('modelGuide.label.keyCalcs') }}
              .mg-calcs
                dl
                  template(v-for="fig in heroFigures(model)")
                    dt(:key="`${fig.label}-t`") {{ fig.label }}
                    dd(:key="`${fig.label}-d`" v-if="fig.sub") {{ fig.sub }}

              template(v-if="model.alsoOnScreen")
                p.mg-label {{ $t('modelGuide.label.alsoOnScreen') }}
                p.mg-prose {{ model.alsoOnScreen }}

            .mg-block
              template(v-if="(model.coach || []).length")
                p.mg-label {{ coachLabel(model) }}
                .mg-coach
                  p(v-for="(line, i) in coachLines(model)" :key="i") {{ line }}

              p.mg-label {{ $t('modelGuide.label.useWhen') }}
              p.mg-prose {{ model.useWhen }}

              p.mg-label {{ $t('modelGuide.label.inputs') }}
              p.mg-prose {{ model.inputsNeeded }}

              p.mg-label {{ $t('modelGuide.label.limits') }}
              p.mg-limits {{ model.limits }}

          nuxt-link.mg-open(:to="model.route")
            | {{ $t('modelGuide.open') }}
            span.mg-route  {{ model.route }}
</template>

<script>
/**
 * ModelGuide — what each report model is for, what it calculates, and the reading
 * its Coach panel gives.
 *
 * 🔴 THE SAME RECORDS THE AI IS GIVEN — same file, served by `GET /api/report/model-guide`.
 * Two readers, one source: a firm manager choosing a model and the AI guiding an advisor
 * cannot be told different things about the same screen.
 *
 * 🔴 IT UPDATES ITSELF WHEN A MODEL IS ADDED. Nothing here names a model. The list is
 * whatever the backend returns, and `tests/unit/reportModelSummaries.test.js` ties that
 * file to `utils/reportModelCatalogue.js` in both directions — so a new model going live
 * FAILS THE BUILD until it has an entry, and the moment it has one it appears here with no
 * change to this component.
 *
 * 🔴 THE COACH READING CARRIES REAL FIGURES, and they are not computed here. The records
 * arrive with `coachFigures` — raw values from the same model function the screen's own
 * route calls — and this component only writes them out, in the firm's currency, into the
 * `{gaps}` the sentence leaves. Until 2026-08-22 the sentence was printed with its numbers
 * still missing ("takes [n] days"), which is to-do item 4.34.
 *
 * Presentation only. No business logic: the records arrive whole from the backend.
 */
import currencyMixin from '~/mixins/currencyMixin'

export default {
  name: 'ModelGuide',

  mixins: [currencyMixin],

  data () {
    return {
      /** @type {object[]} the live models, as served by the backend */
      models: [],
      /** @type {string} the firm manager's search text */
      query: '',
      loading: true,
      /** @type {string|null} set when the load fails, so the page says so */
      error: null
    }
  },

  computed: {
    /**
     * The models matching the search, or all of them when it is empty.
     *
     * 🔴 THE SEARCH READS EVERY FIELD, not just the name. Mike's instruction: a firm
     * manager uses this page "to find the most appropriate model", so a search for
     * "overdraft" must reach Debtor Drag through its Coach text, and "what's it worth"
     * must reach EBITDA through the situation it is built for — neither word appears in
     * either model's name.
     *
     * @returns {object[]}
     */
    visibleModels () {
      const q = this.query.trim().toLowerCase()
      if (!q) { return this.models }
      return this.models.filter(m => this.haystack(m).includes(q))
    },

    /**
     * The matching models grouped by category, each group in the order the backend
     * sent them — which is catalogue order.
     * @returns {Array<{category: string, models: object[]}>}
     */
    shelves () {
      const out = []
      this.visibleModels.forEach((m) => {
        let shelf = out.find(s => s.category === m.category)
        if (!shelf) { shelf = { category: m.category, models: [] }; out.push(shelf) }
        shelf.models.push(m)
      })
      return out
    },

    /** "10 models" when idle, "3 models match" while searching. @returns {string} */
    countLabel () {
      return this.query.trim()
        ? this.$tc('modelGuide.matchCount', this.visibleModels.length)
        : this.$tc('modelGuide.modelCount', this.models.length)
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /**
     * Fetch the models from the Restify backend via the Nuxt proxy.
     * Sets `error` rather than throwing — the template renders the failure.
     * @returns {Promise<void>}
     */
    async load () {
      this.loading = true
      this.error = null
      try {
        const res = await fetch('/api/report/model-guide')
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        const body = await res.json()
        if (!body || !body.success || !body.data || !Array.isArray(body.data.models)) {
          throw new Error('Unexpected response shape')
        }
        this.models = body.data.models
      } catch (e) {
        this.error = String(e.message || e)
        this.models = []
      } finally {
        this.loading = false
      }
    },

    /**
     * Everything about a model that the search should reach, lower-cased.
     * @param {object} m
     * @returns {string}
     */
    haystack (m) {
      return [
        m.name,
        m.category,
        m.modelClass,
        m.answers,
        m.alsoOnScreen,
        m.inputsNeeded,
        m.useWhen,
        m.limits,
        m.route,
        (m.keyOutputs || []).join(' '),
        (m.heroFigures || []).map(f => `${f.label} ${f.sub || ''}`).join(' '),
        // The RESOLVED lines, so the search reads what the manager reads.
        this.coachLines(m).join(' ')
      ].filter(Boolean).join(' ').toLowerCase()
    },

    /**
     * A model's Coach reading with its figures written in.
     *
     * The sentence and the figures both come from the backend — see the file note. A gap
     * with no figure becomes "—", the reports' own no-figure convention, so a brace can
     * never reach the screen even if a model fails to compute.
     *
     * @param {object} m
     * @returns {string[]}
     */
    coachLines (m) {
      const figures = m.coachFigures || {}
      return (m.coach || []).map((line) => {
        return String(line).replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (whole, token) => {
          return this.renderFigure(figures[token])
        })
      })
    },

    /**
     * One figure as text, in the firm's currency and the reader's language.
     *
     * The `format` tag is set by `server/utils/reportModelFigures.js`, which documents what
     * each kind means. `plain` is printed unformatted on purpose — grouping would render
     * the year 2024 as "2,024".
     *
     * @param {{value: *, format: string}} [figure]
     * @returns {string}
     */
    renderFigure (figure) {
      if (!figure) { return '—' }
      const v = figure.value
      if (v === null || v === undefined || v === '') { return '—' }
      if (figure.format === 'text' || figure.format === 'plain') { return String(v) }
      if (typeof v !== 'number' || !isFinite(v)) { return '—' }

      switch (figure.format) {
        case 'money': return this.money(v)
        case 'number1': return this.num(v, 1)
        case 'percent1': return (Math.round(v * 1000) / 10).toFixed(1) + '%'
        case 'percentInt': return Math.round(v * 100) + '%'
        default: return this.num(v, 0)
      }
    },

    /**
     * The headline figures. Falls back to the plain `keyOutputs` strings for a model
     * whose entry predates the labelled form, so a partial entry still renders.
     * @param {object} m
     * @returns {Array<{label: string, sub: string}>}
     */
    heroFigures (m) {
      if ((m.heroFigures || []).length) { return m.heroFigures }
      return (m.keyOutputs || []).map(label => ({ label, sub: '' }))
    },

    /**
     * Two models — 8 Levers and Cost of Capital — have no Coach panel; their entries
     * carry explanatory notes and verdict rules instead. Saying "Coach" over those
     * would describe a panel that is not on the screen.
     * @param {object} m
     * @returns {string}
     */
    coachLabel (m) {
      return m.coachIsNotAPanel
        ? this.$t('modelGuide.label.screenSays')
        : this.$t('modelGuide.label.coach')
    },

    /** @param {object} m @returns {string} */
    classLabel (m) {
      return this.$t(`modelGuide.class.${m.modelClass}`)
    },

    /**
     * The shelf rule colour, matching the Model Library's category colours so the two
     * pages read as one section.
     * @param {string} category
     * @returns {string}
     */
    categoryColour (category) {
      const map = {
        'Cash Flow': '#0070c0',
        Profitability: '#4ca52d',
        Growth: '#00b1e0',
        Valuation: '#002b64',
        Budgeting: '#ff9900',
        Risk: '#ff0000'
      }
      return map[category] || '#0070c0'
    }
  }
}
</script>

<style scoped>
/* Palette, face, radius and column width are the Model Library's own, so the two
   pages read as one section rather than two designs. */
.mg-root {
  --mg-bg:#eef3f8; --mg-panel:#ffffff; --mg-ink:#002b64; --mg-muted:#5b6f8a; --mg-line:#d5e1ee;
  --mg-accent:#0070c0; --mg-accent-bright:#00b1e0; --mg-warn:#ff9900;
  --mg-shadow:0 1px 2px #002b6410, 0 8px 22px -14px #002b6433; --mg-r:14px;
  background:var(--mg-bg); color:var(--mg-ink);
  font-family:'Open Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-weight:300; -webkit-font-smoothing:antialiased; min-height:100vh;
}

.mg-wrap { max-width:1080px; margin:0 auto; padding:34px 22px 64px; }

.mg-backlink { display:inline-block; margin:0 0 14px; font-size:12.5px; color:var(--mg-muted); text-decoration:none; }
.mg-backlink:hover, .mg-backlink:focus { color:var(--mg-accent-bright); }

.mg-eyebrow { font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:var(--mg-accent-bright); font-weight:600; }
.mg-h1 { margin:4px 0 3px; font-size:29px; font-weight:300; letter-spacing:-.01em; }
.mg-lede { font-size:13.5px; color:var(--mg-muted); margin:0 0 24px; max-width:72ch; }

.mg-state { font-size:13.5px; color:var(--mg-muted); padding:22px 0; }
.mg-state.is-error { color:#c0392b; }
.mg-state-msg { margin:0 0 10px; }

.mg-controls { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:20px; }
.mg-search { flex:1; min-width:240px; }
.mg-search >>> input {
  width:100%; font:inherit; font-size:14px; color:var(--mg-ink);
  background:var(--mg-panel); border:1px solid var(--mg-line);
  border-radius:10px; padding:11px 14px; box-shadow:none; height:auto;
}
.mg-search >>> input:focus { border-color:var(--mg-accent); box-shadow:0 0 0 3px #0070c018; }
.mg-count { font-size:12px; color:var(--mg-muted); }

.mg-empty { font-size:13.5px; color:var(--mg-muted); max-width:66ch; line-height:1.6; }
.mg-clear { margin-top:10px; }

.mg-shelf { margin:0 0 30px; }
.mg-shelf-head { display:flex; align-items:baseline; gap:10px; margin:0 0 10px; }
.mg-shelf-title { font-size:15px; font-weight:600; margin:0; letter-spacing:.01em; }
.mg-shelf-count { font-size:11.5px; color:var(--mg-muted); }
.mg-shelf-rule { height:2px; border-radius:2px; margin:0 0 14px; }

.mg-card {
  background:var(--mg-panel); border:1px solid var(--mg-line); border-radius:var(--mg-r);
  box-shadow:var(--mg-shadow); padding:20px 22px; margin:0 0 12px;
}

.mg-chead { display:flex; align-items:center; gap:9px; flex-wrap:wrap; margin:0 0 3px; }
.mg-ctag { font-size:10.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--mg-muted); font-weight:600; }
.mg-cls { font-size:10.5px; font-weight:600; border-radius:999px; padding:2px 9px; border:1px solid; }
.mg-cls.is-education { color:#0070c0; background:#0070c014; border-color:#0070c033; }
.mg-cls.is-decision  { color:#ff9900; background:#ff990014; border-color:#ff990033; }
.mg-cls.is-report    { color:#4ca52d; background:#4ca52d14; border-color:#4ca52d33; }

.mg-cname { font-size:19px; font-weight:400; margin:0 0 10px; letter-spacing:-.005em; }
.mg-answers { font-size:14px; line-height:1.6; margin:0 0 18px; max-width:72ch; }

.mg-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.1fr); gap:20px 28px; }
@media (max-width:820px) { .mg-grid { grid-template-columns:1fr; } }
.mg-block { min-width:0; }

.mg-label {
  font-size:10.5px; letter-spacing:.12em; text-transform:uppercase;
  color:var(--mg-muted); font-weight:600; margin:0 0 6px;
}
.mg-label + .mg-label,
.mg-prose + .mg-label,
.mg-limits + .mg-label,
.mg-calcs + .mg-label,
.mg-coach + .mg-label { margin-top:14px; }

/* The figures the screen shows — given the one tinted panel on the card, because
   they are what the page is for. */
.mg-calcs { background:#0070c00d; border:1px solid #0070c022; border-radius:10px; padding:12px 14px; }
.mg-calcs dl { margin:0; }
.mg-calcs dt { font-size:13.5px; font-weight:600; line-height:1.5; }
.mg-calcs dd { margin:0 0 9px; font-size:12px; line-height:1.5; color:var(--mg-muted); }
.mg-calcs dt:last-child, .mg-calcs dd:last-child { margin-bottom:0; }

/* The screen's own reading, in its own words. */
.mg-coach { background:#00b1e00f; border:1px solid #00b1e02b; border-radius:10px; padding:12px 14px; }
.mg-coach p { margin:0 0 8px; font-size:13px; line-height:1.62; }
.mg-coach p:last-child { margin-bottom:0; }

.mg-prose { font-size:13px; line-height:1.62; color:#2c4a70; margin:0; max-width:66ch; }

/* The sentences that stop a model being used for something it does not do. */
.mg-limits {
  border-left:3px solid var(--mg-warn); padding:2px 0 2px 12px; margin:0;
  font-size:13px; line-height:1.62; color:#2c4a70; max-width:66ch;
}

.mg-open { display:inline-block; margin:16px 0 0; font-size:12.5px; font-weight:600; color:var(--mg-accent); text-decoration:none; }
.mg-open:hover, .mg-open:focus { color:var(--mg-accent-bright); }
.mg-route { font-size:11.5px; color:var(--mg-muted); font-weight:300; }
</style>
