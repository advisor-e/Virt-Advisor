<template lang="pug">
.sp
  header.sp-top
    .sp-top-text
      p.sp-eyebrow {{ $t('strategyPlanner.navTitle') }}
      h1.sp-title {{ $t('strategyPlanner.title') }}
      p.sp-sub {{ $t('strategyPlanner.subtitle') }}
    .sp-top-actions
      b-select(
        v-if="step === 'scope'"
        v-model="clientId"
        :placeholder="$t('strategyPlanner.chooseClient')"
      )
        option(v-for="c in clients" :key="c.id" :value="c.id") {{ c.name }}
      b-button(v-if="step === 'scope'" type="is-primary" :disabled="!canStart" @click="startSession") {{ $t('strategyPlanner.startSession') }}
      b-button(v-if="step === 'run'" outlined type="is-primary" @click="step = 'scope'") {{ $t('strategyPlanner.back') }}
      b-button(v-if="step === 'run'" type="is-primary" @click="step = 'objectives'") {{ $t('strategyPlanner.toObjectives') }}
      b-button(v-if="step === 'objectives'" outlined type="is-primary" @click="step = 'run'") {{ $t('strategyPlanner.back') }}
      b-button(v-if="step === 'objectives'" type="is-primary" @click="step = 'plan'") {{ $t('strategyPlanner.producePlan') }}
      b-button(v-if="step === 'plan'" outlined type="is-primary" @click="step = 'objectives'") {{ $t('strategyPlanner.back') }}

  nav.sp-rail(aria-label="Session progress")
    div(:class="railClass('scope')") {{ $t('strategyPlanner.rail.scope') }}
    div(:class="railClass('run')") {{ $t('strategyPlanner.rail.run') }}
    div(:class="railClass('objectives')") {{ $t('strategyPlanner.rail.objectives') }}
    div(:class="railClass('plan')") {{ $t('strategyPlanner.rail.plan') }}

  b-notification(v-if="error" type="is-danger" :closable="true" @close="error = ''") {{ error }}

  b-loading(:is-full-page="false" :active="loading")

  template(v-if="!loading && step === 'scope'")
    strategy-scope-menu(
      :decks="decks"
      :chosen="chosen"
      :session-label="sessionLabel"
      @scope-changed="onScopeChanged"
    )

  template(v-if="!loading && step === 'run'")
    //- 🔴 SAYS WHAT IT CANNOT RUN. The advisor scoped concepts that have no capture card
    //- built yet, and a step that silently showed only two of eleven would read as a bug
    //- in the room. Stage 1 of item 15.1 — the cards are stages 4 and 5.
    b-notification(v-if="conceptsWithoutACard > 0" type="is-warning" :closable="false")
      | {{ $tc('strategyPlanner.menu.notRunnable', conceptsWithoutACard, { count: conceptsWithoutACard }) }}

    //- 🔴 A CONCEPT WITH AN APPROVED CARD USES IT. Porter's was designed on
    //- 2026-09-16 (strategy-planner.html screen 2c) as five force boxes, each
    //- carrying the deck's own question, with Existing Rivalry as the centre — and
    //- it was built. Replacing it with a grid derived from the Word template lost
    //- all five prompts and the fifth force. Mike, 2026-09-17: "i saw much better
    //- graphics in a design 6 or 8 sessions ago - what happened??"
    strategy-capture-card(
      v-for="(framework, index) in chosenFrameworks"
      :key="'fw-' + framework.id"
      :framework="framework"
      :entries="entriesFor(framework.conceptId || framework.id)"
      :eyebrow="cardEyebrow(index)"
      :teachable="isTeachable(framework)"
      class="sp-card"
      @field-opened="onFrameworkFieldOpened(framework, $event)"
      @field-changed="onFrameworkFieldChanged(framework, $event)"
    )

    //- Everything else: the concept's own fill-in table, read from Mike's
    //- workbooks. 47 of the 52 have no approved card of their own.
    strategy-concept-capture(
      v-for="(visit, index) in conceptVisits"
      :key="visit.key"
      :name="visit.name"
      :capture="visit.capture"
      :part="visit.part"
      :concept-summary="visit.conceptSummary"
      :helps-client-to="visit.helpsClientTo"
      :teaching-form="visit.teachingForm"
      :instruction="visitInstruction(visit)"
      :entries="entriesFor(visit.conceptId)"
      :eyebrow="visitEyebrow(index)"
      @field-opened="onVisitFieldOpened(visit, $event)"
      @field-changed="onVisitFieldChanged(visit, $event)"
    )

  template(v-if="!loading && step === 'objectives'")
    strategy-capture-card(
      v-for="framework in closingFrameworks"
      :key="framework.id"
      :framework="framework"
      :entries="entriesFor(framework.id)"
      :eyebrow="$t('strategyPlanner.rail.objectives')"
      class="sp-card"
      @field-opened="onFieldOpened"
      @field-changed="onFieldChanged"
    )
    section.sp-section
      h4.sp-h {{ $t('strategyPlanner.wheel.heading') }}
      p.sp-cap {{ $t('strategyPlanner.wheel.caption') }}
      strategy-growth-wheel(:aspects="growthAspects" :counts="aspectCounts")

  //- Screen 4 — the plan. READ ONLY, and assembled from what was captured; it holds no
  //- state of its own, so it can never disagree with the session behind it.
  template(v-if="!loading && step === 'plan'")
    article.sp-plan
      h2.sp-plan-title {{ clientName }}
      p.sp-plan-sub {{ $t('strategyPlanner.plan.subtitle') }}

      section.sp-plan-sec(v-for="block in planBlocks" :key="block.id")
        h3.sp-plan-h {{ block.name }}
        p.sp-plan-empty(v-if="!block.lines.length") {{ $t('strategyPlanner.plan.nothingCaptured') }}
        dl.sp-plan-dl(v-else)
          template(v-for="line in block.lines")
            dt(:key="line.key + '-t'") {{ line.label }}
            dd(:key="line.key + '-d'") {{ line.value }}

      section.sp-plan-sec
        h3.sp-plan-h {{ $t('strategyPlanner.wheel.heading') }}
        strategy-growth-wheel(:aspects="growthAspects" :counts="aspectCounts")
</template>

<script>
/**
 * /strategy-planner — the session an advisor runs with a client.
 *
 * To-do item 15.1. Design: `design/mockups/strategy-planner.html`, eleven decisions ruled
 * by Mike 2026-09-16 and registered in `design/ARTEFACTS.md`.
 *
 * ALL FOUR STEPS ARE HERE: scope the session, run the chosen frameworks, close it with the
 * Strategic Objective, the Action Plan and the nine Growth Aspects coverage check, then the
 * plan itself. Built at this breadth first, on Mike's instruction of 2026-09-16 — *"lets
 * build it a global level and drop to detail after we see it in full context"* — so the
 * whole journey can be judged before any part of it is refined.
 *
 * 🔴 THE COVERAGE CHECK COUNTS WHAT THE ADVISOR CHOSE. Each Action Plan row carries a
 * Growth Aspect the advisor picks from a list; the wheel counts those. No model reads an
 * objective and guesses which aspect it belongs to — that would be LLM output trusted as
 * structured data, and it would be invisible when wrong.
 *
 * ⚠ THE PLAN IS DERIVED, NEVER STORED. Screen 4 assembles what was captured and holds no
 * state of its own, so it cannot drift from the session behind it.
 *
 * 🔴 `field-opened` IS NOT ANALYTICS. Decision 11: the box open when words are spoken
 * claims them, so every focus is posted to the session's navigation timeline. That is what
 * lets a recording be apportioned without a model deciding where anything belongs. A
 * refactor that drops it has left AI judgement as the only route, which that ruling forbids.
 *
 * 🔴 A FAILED SAVE SAYS SO AND KEEPS THE TEXT. An advisor is mid-meeting with a client in
 * front of them; silently losing a box is worse than an error they can act on, so the
 * message says the words are still on screen.
 *
 * ⚠ SSR: EVERYTHING LOADS IN `mounted`, NOT IN `fetch()` OR `asyncData()`. Both of those
 * also run on the server, where the browser's `fetch` does not exist on Node 14 and
 * `window.localStorage` — where the advisor's token lives — does not either. The page
 * would throw before rendering. See the note on `mounted` below.
 */
import StrategyScopeMenu from '~/components/strategy/StrategyScopeMenu.vue'
import StrategyCaptureCard from '~/components/strategy/StrategyCaptureCard.vue'
import StrategyConceptCapture from '~/components/strategy/StrategyConceptCapture.vue'
import StrategyGrowthWheel from '~/components/strategy/StrategyGrowthWheel.vue'
import { isDevHost } from '~/utils/devHost'

/** Where the master app leaves the advisor's token before our pages load. */
const TOKEN_KEY = 'advisor_e_token'

export default {
  name: 'StrategyPlannerPage',

  components: { StrategyScopeMenu, StrategyCaptureCard, StrategyConceptCapture, StrategyGrowthWheel },

  data () {
    return {
      /** 'scope' | 'run' | 'objectives' | 'plan'. */
      step: 'scope',
      loading: true,
      error: '',
      planningDomains: [],
      /** The five panels of the session scope menu, in Mike's order. */
      decks: [],
      frameworks: [],
      /** The two that close every session — never ticked, always present. */
      closingFrameworks: [],
      /** The nine, from data/growth-fundamentals.json via the backend. */
      growthAspects: [],
      clients: [],
      /**
       * 🔴 null, NOT ''. Buefy draws the "Choose a client…" placeholder option only
       * while the bound value is null; an empty string is a value, so the option is
       * skipped and the picker renders BLANK with no prompt in it. The advisor then
       * ticks concepts, finds Start the session greyed out, and nothing on screen
       * says a client is what is missing. Found by Mike on 2026-09-17, on the first
       * click — every test was green, because a test reads `canStart` rather than
       * looking at the box.
       */
      clientId: null,
      /**
       * CONCEPT ids ticked on the session scope menu — Mike's own 52, not framework ids.
       * Changed in Stage 1: the menu is now his Session Scope table (Decision A), and a
       * concept is the unit an advisor ticks.
       */
      chosen: [],
      /** The open session's id, once one exists. */
      sessionId: null,
      /** Captured text, keyed `frameworkId::fieldKey`. */
      entries: {},
      /**
       * Each ticked concept's real fill-in table, keyed by concept id, as
       * `GET /api/strategy/concepts/:id/capture` returns it. Loaded when the
       * advisor starts the session rather than at scope time — 52 requests to
       * render a menu would be 52 requests nobody reads.
       */
      captures: {},
      /** Resolved in mounted — never at render time. */
      apiToken: ''
    }
  },

  computed: {
    /**
     * The ticked concepts that have a built capture card, in authored order.
     *
     * ⚠ FAR FEWER THAN THE ADVISOR TICKED, AND THAT IS THE TRUE STATE. The menu offers all
     * 52 of Mike's concepts; two of them — Porter's 5 Forces and the 8 Profit Levers — have
     * a framework behind them today. The rest are scoped and wait on the later stages of
     * item 15.1. `conceptsWithoutACard` counts them so the screen can say so rather than
     * quietly drop them.
     *
     * @returns {object[]}
     */
    chosenFrameworks () {
      return this.frameworks.filter(f => f.conceptId && this.chosen.includes(f.conceptId))
    },

    /**
     * Every ticked concept as a VISIT — the unit the session actually runs.
     *
     * 🔴 A CONCEPT CAN APPEAR MORE THAN ONCE, AND THAT IS MIKE'S OWN DECK. Pivot puts
     * Porter's on page 11 for *"record your observations ONLY. (For Now)"* and again on
     * page 21 for the responses. Its table carries both — the observation columns and
     * the response columns — so the two visits write to different boxes and the second
     * never overwrites the first.
     *
     * Each visit opens one part. Mike's reason, 2026-09-17: you teach the concept, let
     * it land, then ask how it applies — showing the response columns at visit one is
     * asking somebody to answer before they understand the question.
     *
     * @returns {Array<{key: string, conceptId: string, name: string, part: number, capture: object}>}
     */
    conceptVisits () {
      // A concept with an approved framework card is drawn by that card above,
      // not twice.
      const hasApprovedCard = {}
      this.chosenFrameworks.forEach((f) => {
        if (f.conceptId) { hasApprovedCard[f.conceptId] = true }
      })

      const visits = []
      this.chosen.forEach((conceptId) => {
        if (hasApprovedCard[conceptId]) { return }
        const loaded = this.captures[conceptId]
        if (!loaded) { return }
        const parts = (loaded.capture && loaded.capture.parts) || []
        const count = parts.length > 1 ? parts.length : 1
        for (let part = 1; part <= count; part++) {
          visits.push({
            key: conceptId + '#' + part,
            conceptId,
            name: loaded.name,
            conceptSummary: loaded.conceptSummary || '',
            helpsClientTo: loaded.helpsClientTo || '',
            teachingForm: loaded.teachingForm || '',
            part,
            capture: loaded.capture
          })
        }
      })
      return visits
    },

    /** @returns {number} ticked concepts whose fill-in table Mike has not supplied */
    conceptsWithoutACard () {
      return this.chosen.filter((id) => {
        const loaded = this.captures[id]
        return !loaded || !loaded.capture || !loaded.capture.supplied
      }).length
    },

    /** @returns {string} the chrome line: which client, and when */
    sessionLabel () {
      return this.clientId ? this.clientName : ''
    },

    /**
     * A session needs a client AND something to run. Without a client the backend refuses
     * the save — correctly, because a plan belongs to somebody.
     * @returns {boolean}
     */
    canStart () {
      return !!this.clientId && this.chosen.length > 0
    },

    /** @returns {string} */
    clientName () {
      const found = this.clients.find(c => c.id === this.clientId)
      return found ? found.name : this.$t('strategyPlanner.plan.untitled')
    },

    /**
     * How many operational objectives name each Growth Aspect. This is the coverage check
     * Orientation 1 asks for, and it is COUNTED FROM WHAT THE ADVISOR CHOSE — no model
     * reads an objective and guesses which aspect it belongs to.
     * @returns {Object.<string,number>}
     */
    aspectCounts () {
      const counts = {}
      Object.keys(this.entries).forEach((k) => {
        if (k.indexOf('action-plan::') !== 0 || !k.includes('-aspect')) { return }
        const name = String(this.entries[k] || '').trim()
        if (!name) { return }
        // Only counts where the row actually has an objective — an aspect chosen beside
        // an empty row would colour the wheel for a plan that says nothing.
        const objectiveKey = k.replace('-aspect', '-objective')
        if (!String(this.entries[objectiveKey] || '').trim()) { return }
        counts[name] = (counts[name] || 0) + 1
      })
      return counts
    },

    /**
     * The plan, assembled from what was captured. Read-only and derived, so it can never
     * disagree with the session behind it.
     * @returns {Array<{id: string, name: string, lines: object[]}>}
     */
    planBlocks () {
      return this.chosenFrameworks.concat(this.closingFrameworks).map(f => ({
        id: f.id,
        name: f.name,
        lines: f.fields
          .map(field => ({
            key: f.id + '::' + field.key,
            label: field.label,
            value: String(this.entries[f.id + '::' + field.key] || '').trim()
          }))
          .filter(line => line.value)
      }))
    }
  },

  /**
   * ⚠ LOADED IN `mounted`, NOT IN `fetch()` OR `asyncData()`, AND NOT BY PREFERENCE.
   * Both of those also run on the SERVER during SSR, where the browser's `fetch` does not
   * exist on Node 14 — the page would throw before it rendered. The token has the same
   * constraint: it comes from `window.localStorage`, which only exists in the browser.
   */
  async mounted () {
    this.apiToken = this.resolveApiToken()
    await Promise.all([this.loadFrameworks(), this.loadClients()])
  },

  methods: {
    /**
     * Same resolution as pages/dashboard-reports.vue: a loopback host always uses the dev
     * bypass; otherwise the token the master app stored. With no token the backend
     * returns 401, which is the safe direction to fail.
     * @returns {string}
     */
    resolveApiToken () {
      if (isDevHost()) { return 'dev-local-bypass' }
      try {
        return window.localStorage.getItem(TOKEN_KEY) || ''
      } catch (e) {
        return ''
      }
    },

    /**
     * Headers for every call. The token is what firmAuth reads the firm and the advisor
     * from — nothing in a body or a query string decides either.
     * @param {boolean} [withBody]
     * @returns {object}
     */
    headers (withBody) {
      const h = { Authorization: 'Bearer ' + this.apiToken }
      if (withBody) { h['Content-Type'] = 'application/json' }
      return h
    },

    /**
     * @param {string} step
     * @returns {object} class bindings for one rail segment
     */
    railClass (step) {
      const order = ['scope', 'run', 'objectives', 'plan']
      const here = order.indexOf(this.step)
      const mine = order.indexOf(step)
      return { 'sp-rail-step': true, 'is-on': mine === here, 'is-done': mine < here }
    },

    /**
     * "Strategic Orientation · framework 2 of 4" — where the advisor is in the session.
     * @param {number} index
     * @returns {string}
     */
    cardEyebrow (index) {
      return (index + 1) + ' / ' + this.chosenFrameworks.length
    },

    /**
     * Load each ticked concept's fill-in table.
     *
     * `Promise.allSettled` rather than `all` on purpose: one concept whose table
     * fails to load must not take the other ten down with it. A concept that does
     * not load simply has no card, which the count on screen already reports.
     *
     * @returns {Promise<void>}
     */
    async loadCaptures () {
      const wanted = this.chosen.filter(id => !this.captures[id])
      if (!wanted.length) { return }

      const results = await Promise.allSettled(wanted.map(async (id) => {
        const res = await fetch(
          '/api/strategy/concepts/' + encodeURIComponent(id) + '/capture',
          { credentials: 'same-origin', headers: this.headers() }
        )
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        return { id, body: await res.json() }
      }))

      results.forEach((r) => {
        if (r.status !== 'fulfilled') { return }
        const b = r.value.body
        this.$set(this.captures, r.value.id, {
          name: b.name,
          conceptSummary: b.conceptSummary,
          helpsClientTo: b.helpsClientTo,
          teachingForm: b.teachingForm,
          capture: b.capture
        })
      })
    },

    /**
     * Position in the session, so an advisor knows where they are with a client
     * watching.
     * @param {number} index
     * @returns {string}
     */
    visitEyebrow (index) {
      return (index + 1) + ' / ' + this.conceptVisits.length
    },

    /**
     * The instruction for this visit.
     *
     * A concept visited once carries none. A second visit carries the heading of
     * the columns it opens — Mike's own "How We Plan To Respond" — which is what
     * tells an advisor why they are back at the same table.
     *
     * @param {{part: number, capture: object}} visit
     * @returns {string}
     */
    visitInstruction (visit) {
      const parts = (visit.capture && visit.capture.parts) || []
      if (parts.length < 2) { return '' }
      const chosen = parts[visit.part - 1]
      return (chosen && chosen.label) || ''
    },

    /**
     * Whether this framework is taught before it is captured.
     *
     * A concept card is; a closing table like the Action Plan is filled in, not
     * taught. The judgement is the shape's, and the shape is Mike's approved data.
     *
     * @param {{shape: string}} framework
     * @returns {boolean}
     */
    isTeachable (framework) {
      return framework.shape !== 'actions'
    },

    /**
     * A box opened on an approved framework card.
     *
     * Keyed on the CONCEPT, not the framework, so a concept captured through its
     * approved card and one captured through its own table land in the same place.
     *
     * @param {{id: string, conceptId: string}} framework
     * @param {{frameworkId: string, fieldKey: string}} payload
     */
    onFrameworkFieldOpened (framework, payload) {
      this.onFieldOpened({
        frameworkId: framework.conceptId || framework.id,
        fieldKey: payload.fieldKey
      })
    },

    /**
     * A box typed into on an approved framework card.
     * @param {{id: string, conceptId: string}} framework
     * @param {{frameworkId: string, fieldKey: string, value: string}} payload
     */
    onFrameworkFieldChanged (framework, payload) {
      this.onFieldChanged({
        frameworkId: framework.conceptId || framework.id,
        fieldKey: payload.fieldKey,
        value: payload.value
      })
    },

    /**
     * The advisor moved into a box on a visit.
     * @param {{conceptId: string}} visit
     * @param {{fieldKey: string}} payload
     */
    onVisitFieldOpened (visit, payload) {
      this.onFieldOpened({ frameworkId: visit.conceptId, fieldKey: payload.fieldKey })
    },

    /**
     * The advisor typed into a box on a visit.
     * @param {{conceptId: string}} visit
     * @param {{fieldKey: string, value: string}} payload
     */
    onVisitFieldChanged (visit, payload) {
      this.onFieldChanged({ frameworkId: visit.conceptId, fieldKey: payload.fieldKey, value: payload.value })
    },

    /**
     * Everything captured for one framework, keyed by field.
     * @param {string} frameworkId
     * @returns {Object.<string,string>}
     */
    entriesFor (frameworkId) {
      const out = {}
      const prefix = frameworkId + '::'
      Object.keys(this.entries).forEach((k) => {
        if (k.indexOf(prefix) === 0) { out[k.slice(prefix.length)] = this.entries[k] }
      })
      return out
    },

    /**
     * Loads the frameworks, the Planning Domains, and the session scope menu itself.
     *
     * Two calls rather than one: the menu is Mike's 52 concepts grouped by deck, and the
     * frameworks are the handful of built capture cards. They are different sets with
     * different lifetimes, and folding them into one response would hide that.
     */
    async loadFrameworks () {
      this.loading = true
      try {
        const [frameworkRes, conceptRes] = await Promise.all([
          fetch('/api/strategy/frameworks', { credentials: 'same-origin', headers: this.headers() }),
          fetch('/api/strategy/concepts', { credentials: 'same-origin', headers: this.headers() })
        ])
        if (!frameworkRes.ok) { throw new Error('HTTP ' + frameworkRes.status) }
        if (!conceptRes.ok) { throw new Error('HTTP ' + conceptRes.status) }
        const body = await frameworkRes.json()
        const conceptBody = await conceptRes.json()
        this.planningDomains = body.planningDomains || []
        this.frameworks = body.frameworks || []
        this.closingFrameworks = body.closingFrameworks || []
        this.growthAspects = body.growthAspects || []
        this.decks = conceptBody.decks || []
      } catch (e) {
        this.error = this.$t('strategyPlanner.errors.loadFailed')
      } finally {
        this.loading = false
      }
    },

    /**
     * The advisor's own clients. A planning session belongs to one of them, and the
     * backend refuses a session without one — so this is not a convenience.
     */
    async loadClients () {
      try {
        const res = await fetch('/api/clients', {
          credentials: 'same-origin',
          headers: this.headers()
        })
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        const body = await res.json()
        this.clients = body.clients || []
        // An id in the address wins, so a link from a client's record still works.
        const fromUrl = this.$route.query.clientId
        if (fromUrl && this.clients.some(c => c.id === fromUrl)) { this.clientId = fromUrl }
      } catch (e) {
        this.error = this.$t('strategyPlanner.errors.clientsFailed')
      }
    },

    /** @param {string[]} next the full list of ticked framework ids */
    onScopeChanged (next) {
      this.chosen = next
    },

    /** Opens the session and moves to the frameworks. */
    async startSession () {
      this.error = ''
      try {
        const res = await fetch('/api/strategy/sessions', {
          method: 'POST',
          credentials: 'same-origin',
          headers: this.headers(true),
          body: JSON.stringify({
            clientId: this.clientId,
            scope: { domains: [], frameworks: this.chosen }
          })
        })
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        const body = await res.json()
        this.sessionId = body.sessionId
        await this.loadCaptures()
        this.step = 'run'
      } catch (e) {
        // ⚠ ITS OWN MESSAGE. The first build reused the capture-box message here, so a
        // failure to OPEN a session told the advisor a box had not saved — found by
        // pressing the button rather than by any test.
        this.error = this.$t('strategyPlanner.errors.startFailed')
      }
    },

    /**
     * The advisor moved into a box — Decision 11's timeline.
     * Failure here is deliberately silent: it degrades the apportioning of a future
     * recording, and an error banner mid-sentence would cost the advisor more than the
     * timeline gap does. The gap itself is visible on the session's timeline afterwards.
     * @param {{frameworkId: string, fieldKey: string}} payload
     */
    async onFieldOpened (payload) {
      if (!this.sessionId) { return }
      try {
        await fetch('/api/strategy/sessions/' + this.sessionId + '/timeline', {
          method: 'POST',
          credentials: 'same-origin',
          headers: this.headers(true),
          body: JSON.stringify(payload)
        })
      } catch (e) { /* see the note above */ }
    },

    /**
     * A box changed. Saved on blur, never per keystroke.
     * @param {{frameworkId: string, fieldKey: string, value: string}} payload
     */
    async onFieldChanged (payload) {
      if (!this.sessionId) { return }
      this.error = ''
      const key = payload.frameworkId + '::' + payload.fieldKey
      // Optimistic: the advisor sees their own words stay put while the save runs.
      this.$set(this.entries, key, payload.value)

      try {
        const res = await fetch('/api/strategy/sessions/' + this.sessionId + '/entries', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: this.headers(true),
          body: JSON.stringify({ entries: [payload] })
        })
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
      } catch (e) {
        this.error = this.$t('strategyPlanner.errors.saveFailed')
      }
    }
  }
}
</script>

<style scoped>
.sp { max-width: 1120px; margin: 0 auto; padding: 1.4rem 1.1rem 4rem; position: relative; }
.sp-top {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.sp-top-text { flex: 1 1 320px; min-width: 0; }
.sp-eyebrow {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #0070c0;
  margin: 0;
}
.sp-title { font-size: 1.6rem; font-weight: 700; margin: 0.1rem 0 0; color: #002b64; }
.sp-sub { font-size: 0.85rem; color: #5b6f8a; margin: 0.25rem 0 0; max-width: 70ch; }

.sp-rail {
  display: flex;
  border: 1px solid #d5e1ee;
  border-radius: 10px;
  overflow: hidden;
  background: #f1f6fb;
  margin-bottom: 1.2rem;
}
.sp-rail-step {
  flex: 1 1 0;
  padding: 0.55rem 0.7rem;
  font-size: 0.75rem;
  text-align: center;
  color: #5b6f8a;
  border-right: 1px solid #d5e1ee;
}
.sp-rail-step:last-child { border-right: 0; }
.sp-rail-step.is-on { background: #0070c0; color: #fff; font-weight: 600; }
.sp-rail-step.is-done { background: rgba(76, 165, 45, 0.1); color: #2f7d32; font-weight: 600; }

.sp-card { margin-bottom: 1.1rem; }
.sp-section { margin: 1.4rem 0; }
.sp-h { font-size: 0.85rem; font-weight: 700; margin: 0 0 0.2rem; color: #002b64; }
.sp-cap { font-size: 0.8rem; color: #5b6f8a; margin: 0 0 0.8rem; max-width: 80ch; }

.sp-plan {
  background: #fff;
  border: 1px solid #d5e1ee;
  border-radius: 14px;
  padding: 1.4rem 1.6rem 1.8rem;
}
.sp-plan-title { font-size: 1.4rem; font-weight: 700; color: #002b64; margin: 0; }
.sp-plan-sub { font-size: 0.82rem; color: #5b6f8a; margin: 0.2rem 0 1.2rem; }
.sp-plan-sec { border-top: 1px solid #d5e1ee; padding-top: 0.9rem; margin-top: 0.9rem; }
.sp-plan-h { font-size: 0.95rem; font-weight: 700; color: #002b64; margin: 0 0 0.5rem; }
.sp-plan-empty { font-size: 0.8rem; color: #5b6f8a; font-style: italic; margin: 0; }
.sp-plan-dl { margin: 0; }
.sp-plan-dl dt {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #0070c0;
  margin-top: 0.55rem;
}
.sp-plan-dl dd { margin: 0.1rem 0 0; font-size: 0.85rem; color: #002b64; }

@media (max-width: 860px) {
  .sp-rail { flex-wrap: wrap; }
  .sp-rail-step { flex: 1 1 45%; }
}
</style>
