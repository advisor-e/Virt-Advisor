<template lang="pug">
.mlb-root
  .mlb-wrap
    .mlb-eyebrow {{ $t('modelLibrary.eyebrow') }}
    h1.mlb-h1 {{ $t('modelLibrary.title') }}
    p.mlb-lede {{ $t('modelLibrary.lede') }}

    .mlb-controls
      .mlb-search
        b-input(
          v-model="query"
          type="search"
          :placeholder="$t('modelLibrary.searchPlaceholder')"
          :aria-label="$t('modelLibrary.searchLabel')"
        )
      .mlb-count(aria-live="polite") {{ countLabel }}

      //- Preferred currency: managers pick it, everyone else sees it read-only.
      //- Client-only (currencyReady) so the role-dependent markup never mismatches SSR.
      .mlb-currency(v-if="currencyReady")
        template(v-if="canEditCurrency")
          span.mlb-cur-label {{ $t('modelLibrary.currency.label') }}
          b-select(
            :value="firmCurrency"
            :loading="savingCurrency"
            size="is-small"
            :aria-label="$t('modelLibrary.currency.label')"
            @input="changeCurrency"
          )
            option(v-for="c in currencies" :key="c.code" :value="c.code") {{ c.symbol }} {{ c.label }} ({{ c.code }})
        template(v-else)
          span.mlb-cur-label {{ $t('modelLibrary.currency.label') }}:
          span.mlb-cur-value {{ currentCurrencyLabel }}
          span.mlb-cur-note {{ $t('modelLibrary.currency.managedNote') }}

    .mlb-chips.mlb-chips-class(role="group" :aria-label="$t('modelLibrary.classFilterLabel')")
      button.mlb-chip(
        v-for="chip in classChips"
        :key="`class-${chip}`"
        type="button"
        :class="{ 'is-on': chip === classFilter }"
        :aria-pressed="String(chip === classFilter)"
        @click="classFilter = chip"
      ) {{ chip === allClass ? $t('modelLibrary.classAll') : $t(`modelLibrary.shelf.${chip}.title`) }}

    //- The topic row is a drill-down: it only appears once a type is chosen
    //- (owner ruling 2026-07-15), so the first page stays a single, simple choice.
    .mlb-chips(v-if="classFilter !== allClass" role="group" :aria-label="$t('modelLibrary.filterLabel')")
      button.mlb-chip(
        v-for="chip in chips"
        :key="chip"
        type="button"
        :class="{ 'is-on': chip === category }"
        :aria-pressed="String(chip === category)"
        @click="category = chip"
      ) {{ chip === allChip ? $t('modelLibrary.categoryAll') : chip }}

    template(v-if="visibleModels.length")
      section.mlb-shelf(v-for="shelf in shelves" :key="shelf.classKey")
        .mlb-shelf-head
          h2.mlb-shelf-title {{ shelfTitle(shelf) }}
          span.mlb-shelf-count {{ $tc('modelLibrary.shelfCount', shelf.models.length) }}
        p.mlb-shelf-sub(v-if="shelfSub(shelf)") {{ shelfSub(shelf) }}
        .mlb-grid
          component.mlb-card(
            v-for="model in shelf.models"
            :key="model.name"
            :is="openable(model) ? 'nuxt-link' : 'div'"
            v-bind="openable(model) ? { to: model.route } : {}"
            :class="{ 'is-soon': !openable(model) }"
          )
            .mlb-chead
              .mlb-ico(:style="{ background: iconBackground(model.category) }")
                svg(viewBox="0 0 24 24" aria-hidden="true")
                  template(v-if="model.category === 'Cash Flow'")
                    path(d="M5 8a7 7 0 0 1 12-2")
                    path(d="M19 6v4h-4")
                    path(d="M19 16a7 7 0 0 1-12 2")
                    path(d="M5 18v-4h4")
                  template(v-else-if="model.category === 'Profitability'")
                    line(x1="6" y1="20" x2="6" y2="13")
                    line(x1="12" y1="20" x2="12" y2="9")
                    line(x1="18" y1="20" x2="18" y2="5")
                  template(v-else-if="model.category === 'Growth'")
                    polyline(points="4,16 10,11 14,14 20,7")
                    polyline(points="15,7 20,7 20,12")
                  template(v-else-if="model.category === 'Valuation'")
                    ellipse(cx="12" cy="7" rx="7" ry="3")
                    path(d="M5 7v6c0 1.7 3.1 3 7 3s7-1.3 7-3V7")
                  template(v-else-if="model.category === 'Budgeting'")
                    line(x1="7" y1="8" x2="17" y2="8")
                    line(x1="7" y1="12" x2="17" y2="12")
                    line(x1="7" y1="16" x2="13" y2="16")
                  template(v-else-if="model.category === 'Risk'")
                    polyline(points="3,14 8,8 12,13 16,6 21,12")
              .mlb-ctag {{ model.category }}
              span.mlb-class(:class="`is-${model.modelClass}`") {{ classLabel(model) }}

            .mlb-cbody
              h3.mlb-cname {{ model.name }}
              p.mlb-csum {{ model.summary }}
              //- Only a model shipping in phases carries this: how much of it is built.
              //- Ruled by Mike 2026-08-17 — the card is what an advisor sees first, so a
              //- name promising more than the screen delivers must say so here too.
              p.mlb-cscope(v-if="model.scope") {{ model.scope }}
              span.mlb-status(:class="openable(model) ? 'is-ready' : 'is-soon'")
                span.mlb-dot
                | {{ openable(model) ? $t('modelLibrary.openReport') : $t('modelLibrary.comingSoon') }}

    .mlb-empty(v-else) {{ $t('modelLibrary.noMatches', { query: query }) }}
</template>

<script>
/**
 * ModelLibrary — the Business Performance Report's model picker.
 *
 * Renders the catalogue (`utils/reportModelCatalogue.js`) as a searchable,
 * category-filtered grid. Models that are built link to their live report route;
 * catalogued-but-unbuilt models render as inert cards so nobody clicks into a
 * dead page.
 *
 * Presentation only — the selection logic lives in the catalogue module, which is
 * where it is unit-tested. The conversational "client situation" coach shown in the
 * mockup is deliberately NOT here: it is separate design work (T22 / T23) and its
 * matching logic belongs on the Restify backend, not in a Nuxt component.
 */
import {
  MODELS,
  CATEGORIES,
  CATEGORY_ALL,
  CLASS_ALL,
  CLASS_ORDER,
  filterModels,
  groupByClass,
  readyCount,
  colourFor,
  isOpenable
} from '~/utils/reportModelCatalogue'
import currencyMixin from '~/mixins/currencyMixin'
import currenciesData from '~/data/currencies.json'

// Mirrors pages/firm-manager.vue — the write route is manager-gated on the backend;
// this only decides whether the landing page shows an editable picker or read-only text.
const MANAGER_ROLES = ['firm_manager', 'platform_admin']
const TOKEN_KEY = 'advisor_e_token'
const ROLE_KEY = 'advisor_e_role'
const CURRENCY_CACHE_KEY = 'advisor_e_currency'

export default {
  name: 'ModelLibrary',

  mixins: [currencyMixin],

  data () {
    return {
      /** Free-text search, matched against name, summary and category. */
      query: '',
      /** Active class filter (T26); `CLASS_ALL` means no class filter. */
      classFilter: CLASS_ALL,
      /** Active category filter; `CATEGORY_ALL` means no category filter. */
      category: CATEGORY_ALL,
      models: MODELS,
      allChip: CATEGORY_ALL,
      allClass: CLASS_ALL,
      /** Supported currencies for the picker (single source, shared with the backend). */
      currencies: currenciesData.currencies,
      /** True once mounted() has read the role — gates the client-only currency control. */
      currencyReady: false,
      /** Manager/admin may change the account currency; others see it read-only. */
      canEditCurrency: false,
      /** Guards against overlapping saves / a double toast. */
      savingCurrency: false
    }
  },

  computed: {
    /** `All` first, then the three classes in shelf order (T26). */
    classChips () {
      return [CLASS_ALL].concat(CLASS_ORDER)
    },

    /** `All` first, then the categories in their catalogue display order. */
    chips () {
      return [CATEGORY_ALL].concat(CATEGORIES.map(c => c.name))
    },

    /** The catalogue narrowed by the current search box, class chip and category chip. */
    visibleModels () {
      return filterModels(this.models, {
        query: this.query,
        category: this.category,
        modelClass: this.classFilter
      })
    },

    /**
     * The filtered models split into the three class shelves (T26) — Teaching tools,
     * Decision tools, Client reports — in `CLASS_ORDER`. Empty shelves are omitted,
     * so a narrow filter collapses to the shelves that still have cards.
     */
    shelves () {
      return groupByClass(this.visibleModels)
    },

    /** e.g. "5 of 19 models · 3 ready" */
    countLabel () {
      return this.$t('modelLibrary.count', {
        shown: this.visibleModels.length,
        total: this.models.length,
        ready: readyCount(this.models)
      })
    },

    /** The current currency as "£ British Pound", for the read-only display. */
    currentCurrencyLabel () {
      const c = this.currencies.find(x => x.code === this.firmCurrency)
      return c ? `${c.symbol} ${c.label}` : this.firmCurrency
    }
  },

  watch: {
    /**
     * The topic row is hidden until a type is chosen, so a topic picked earlier
     * must never keep filtering invisibly — changing type resets topic to All.
     */
    classFilter () {
      this.category = CATEGORY_ALL
    }
  },

  mounted () {
    // Client-only role read (localStorage is unavailable during SSR). Localhost dev
    // runs as platform_admin so the picker stays testable — mirrors firm-manager.vue.
    if (!process.client) { return }
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      this.canEditCurrency = true
    } else {
      this.canEditCurrency = MANAGER_ROLES.includes(window.localStorage.getItem(ROLE_KEY))
    }
    this.currencyReady = true
  },

  methods: {
    /** A model is a link only if it is ready AND has a route. */
    openable (model) {
      return isOpenable(model)
    },

    /**
     * The model's class, shown on the card so the advisor knows what they are opening
     * BEFORE they open it — a teaching aid with illustrative numbers is a very different
     * thing to put in front of a client than a report on their real accounts.
     * See `design/MODEL-CLASSIFICATION.md`.
     */
    classLabel (model) {
      return this.$t(`modelLibrary.class.${model.modelClass}`)
    },

    /**
     * The shelf heading. Falls back to the raw class key for an unknown class —
     * fail loudly and visibly rather than dropping the shelf (see `groupByClass`).
     */
    shelfTitle (shelf) {
      const key = `modelLibrary.shelf.${shelf.classKey}.title`
      return this.$te(key) ? this.$t(key) : shelf.classKey
    },

    /** The shelf's one-line description; blank (and not rendered) if none exists. */
    shelfSub (shelf) {
      const key = `modelLibrary.shelf.${shelf.classKey}.sub`
      return this.$te(key) ? this.$t(key) : ''
    },

    /** The category's brand colour, as the card icon's gradient tile. */
    iconBackground (category) {
      const colour = colourFor(category)
      return `linear-gradient(135deg, ${colour}, ${colour}cc)`
    },

    /**
     * Save the account's preferred currency (managers only — the route is
     * manager-gated). Optimistically applies it, reverts + warns on failure, and
     * caches it so every report picks it up on open. @param {string} code
     */
    async changeCurrency (code) {
      if (this.savingCurrency || code === this.firmCurrency) { return }
      this.savingCurrency = true
      const previous = this.firmCurrency
      try {
        const token = window.localStorage.getItem(TOKEN_KEY) || 'dev-local-bypass'
        const res = await fetch('/api/report/currency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ currency: code })
        })
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        this.firmCurrency = code
        window.localStorage.setItem(CURRENCY_CACHE_KEY, code)
        const c = this.currencies.find(x => x.code === code)
        this.$buefy.toast.open({
          message: this.$t('modelLibrary.currency.saved', { name: c ? c.label : code, symbol: c ? c.symbol : '' }),
          type: 'is-success'
        })
      } catch (e) {
        this.firmCurrency = previous
        this.$buefy.toast.open({ message: this.$t('modelLibrary.currency.saveError'), type: 'is-danger' })
      } finally {
        this.savingCurrency = false
      }
    }
  }
}
</script>

<style scoped>
.mlb-root {
  --mlb-bg:#eef3f8; --mlb-panel:#ffffff; --mlb-ink:#002b64; --mlb-muted:#5b6f8a; --mlb-line:#d5e1ee;
  --mlb-accent:#0070c0; --mlb-accent-bright:#00b1e0; --mlb-good:#4ca52d;
  --mlb-shadow:0 1px 2px #002b6410, 0 8px 22px -14px #002b6433; --mlb-r:14px;
  background:var(--mlb-bg); color:var(--mlb-ink);
  font-family:'Open Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-weight:300; -webkit-font-smoothing:antialiased; min-height:100vh;
}

.mlb-wrap { max-width:1080px; margin:0 auto; padding:40px 22px 64px; }

.mlb-eyebrow {
  font-size:11px; letter-spacing:.16em; text-transform:uppercase;
  color:var(--mlb-accent-bright); font-weight:600;
}
.mlb-h1 { margin:4px 0 3px; font-size:29px; font-weight:300; letter-spacing:-.01em; }
.mlb-lede { font-size:13.5px; color:var(--mlb-muted); margin:0 0 24px; }

.mlb-controls { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:16px; }
.mlb-search { flex:1; min-width:220px; }
.mlb-search >>> input {
  width:100%; font:inherit; font-size:14px; color:var(--mlb-ink);
  background:var(--mlb-panel); border:1px solid var(--mlb-line);
  border-radius:10px; padding:11px 14px; box-shadow:none; height:auto;
}
.mlb-search >>> input:focus {
  border-color:var(--mlb-accent); box-shadow:0 0 0 3px #0070c018;
}
.mlb-search >>> input::placeholder { color:var(--mlb-muted); }
.mlb-count { font-size:12.5px; color:var(--mlb-muted); white-space:nowrap; }

/* Preferred-currency control — pushed to the right of the controls row. */
.mlb-currency { margin-left:auto; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.mlb-cur-label { font-size:12.5px; font-weight:600; color:var(--mlb-muted); white-space:nowrap; }
.mlb-cur-value { font-size:12.5px; font-weight:600; color:var(--mlb-ink); white-space:nowrap; }
.mlb-cur-note { font-size:11px; font-style:italic; color:var(--mlb-muted); white-space:nowrap; }

.mlb-chips { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:22px; }
/* The class row sits directly above the category row — one filter block, two levels. */
.mlb-chips-class { margin-bottom:10px; }
.mlb-chip {
  font:inherit; font-size:12.5px; font-weight:600; color:var(--mlb-muted);
  background:var(--mlb-panel); border:1px solid var(--mlb-line);
  border-radius:999px; padding:6px 13px; cursor:pointer;
  transition:border-color .15s, background .15s, color .15s;
}
.mlb-chip:hover { border-color:var(--mlb-accent); }
.mlb-chip.is-on { color:#fff; background:var(--mlb-accent); border-color:var(--mlb-accent); }

.mlb-shelf { margin-bottom:34px; }
.mlb-shelf:last-of-type { margin-bottom:0; }
.mlb-shelf-head { display:flex; align-items:baseline; gap:10px; }
.mlb-shelf-title { margin:0; font-size:19px; font-weight:600; letter-spacing:-.01em; }
.mlb-shelf-count { font-size:12px; font-weight:600; color:var(--mlb-muted); white-space:nowrap; }
.mlb-shelf-sub { margin:2px 0 0; font-size:12.5px; font-style:italic; color:var(--mlb-muted); }
.mlb-shelf .mlb-grid { margin-top:12px; }

.mlb-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); gap:16px; }
.mlb-card {
  display:flex; flex-direction:column; background:var(--mlb-panel);
  border:1px solid var(--mlb-line); border-radius:var(--mlb-r);
  box-shadow:var(--mlb-shadow); text-decoration:none; color:inherit;
  transition:transform .15s, box-shadow .15s, border-color .15s;
}
a.mlb-card:hover {
  transform:translateY(-2px); border-color:var(--mlb-accent);
  box-shadow:0 2px 4px #002b6414, 0 14px 28px -16px #002b6440;
}
.mlb-card.is-soon { opacity:.62; }

.mlb-chead { display:flex; align-items:center; gap:11px; padding:14px 15px 0; }
.mlb-ico {
  width:40px; height:40px; border-radius:10px; flex:none;
  display:flex; align-items:center; justify-content:center;
}
.mlb-ico svg {
  width:22px; height:22px; fill:none; stroke:#fff; stroke-width:2.2;
  stroke-linecap:round; stroke-linejoin:round;
}
.mlb-ctag {
  font-size:9.5px; letter-spacing:.07em; text-transform:uppercase;
  font-weight:600; color:var(--mlb-muted);
}

/* The class badge — the advisor must be able to tell a teaching aid from a client
   report at a glance, so each class is visually distinct, not just differently worded. */
.mlb-class {
  display:inline-block; margin-top:3px; padding:2px 7px; border-radius:999px;
  font-size:9.5px; letter-spacing:.05em; text-transform:uppercase; font-weight:600;
  border:1px solid transparent; white-space:nowrap;
}
.mlb-class.is-education { color:#0070c0; background:#0070c014; border-color:#0070c033; }
.mlb-class.is-decision { color:#ff9900; background:#ff990014; border-color:#ff990033; }
.mlb-class.is-report { color:#4ca52d; background:#4ca52d14; border-color:#4ca52d33; }

.mlb-cbody { padding:9px 15px 15px; }
.mlb-cname { margin:0 0 4px; font-size:15.5px; font-weight:600; letter-spacing:-.01em; line-height:1.25; }
.mlb-csum { margin:0 0 12px; font-size:12.5px; color:var(--mlb-muted); line-height:1.5; }
/* The phase note — muted ink and the card's own border, no new colour. */
.mlb-cscope {
  margin:0 0 12px; font-size:11px; color:var(--mlb-muted); line-height:1.4;
  display:inline-block; border:1px solid var(--mlb-line); border-radius:999px; padding:2px 9px;
}

.mlb-status { display:inline-flex; align-items:center; gap:6px; font-size:11.5px; font-weight:600; }
.mlb-status.is-ready { color:var(--mlb-good); }
.mlb-status.is-soon { color:var(--mlb-muted); }
.mlb-dot { width:6px; height:6px; border-radius:50%; background:currentColor; }

.mlb-empty {
  text-align:center; color:var(--mlb-muted); font-size:14px; padding:40px;
}

/* There is deliberately NO dark-mode rule here — one light look on every screen,
   whatever the viewer's OS theme (owner ruling 2026-07-27, extended to this page
   2026-07-28). This grid is the way in to the report screens, which `ReportShell`
   already forces light; a dark catalogue handing over to a light report was the
   inconsistency. Re-adding a dark override here reopens it. */
</style>
