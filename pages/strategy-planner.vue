<template lang="pug">
.sp(:style="firmStyle")
  header.sp-top
    //- 🔴 THE QUESTION BELONGS TO SCOPE SESSION AND IS SHOWN THERE ALONE. Mike's ruling,
    //- 2026-09-21. It used to head all five stages, so an advisor was asked "What do you
    //- want from your session?" while building the steps, running the meeting, writing the
    //- objectives and producing the plan — four screens where it is the wrong question.
    //- ⚠ THE OTHER FOUR ARE NOT LEFT WITHOUT A HEADING. Hiding it outright would leave
    //- those pages with no h1 at all, which is a worse fault wearing a tidier hat. They
    //- take the page's own name instead, which is already-approved wording — no new words
    //- were invented — and the numbered rail beneath names the stage.
    //- ⚠ Found by opening the screen on 2026-09-21, not by a test, and deliberately not
    //- guarded by one: a heading on the wrong screen is what a person in UAT sees in five
    //- seconds (Mike's testing ruling, 2026-08-24).
    .sp-top-text(v-if="step === 'scope'")
      p.sp-eyebrow {{ $t('strategyPlanner.navTitle') }}
      h1.sp-title {{ $t('strategyPlanner.title') }}
      p.sp-sub {{ $t('strategyPlanner.subtitle') }}
    .sp-top-text(v-else)
      h1.sp-title {{ $t('strategyPlanner.navTitle') }}
    .sp-top-actions
      b-select(
        v-if="step === 'scope'"
        v-model="clientId"
        :placeholder="$t('strategyPlanner.chooseClient')"
      )
        option(v-for="c in clients" :key="c.id" :value="c.id") {{ c.name }}
      b-button(v-if="step === 'scope'" type="is-primary" :disabled="!canStart" @click="startSession") {{ $t('strategyPlanner.startSession') }}
      b-button(v-if="step === 'steps'" outlined type="is-primary" @click="step = 'scope'") {{ $t('strategyPlanner.back') }}
      //- 🔴 NEVER DISABLED. Decision 3: an advisor may run a session with cards left
      //- unplaced — they simply are not in it, and stay recorded in the scope. The
      //- count is the guard, because a locked button strands him mid-meeting over a
      //- concept he has decided against.
      b-button(v-if="step === 'steps'" type="is-primary" @click="step = 'run'") {{ $t('strategyPlanner.steps.toRun', { placed: placedCardCount, total: placeableCards.length }) }}
      b-button(v-if="step === 'run'" outlined type="is-primary" @click="step = 'steps'") {{ $t('strategyPlanner.back') }}
      b-button(v-if="step === 'run'" type="is-primary" @click="step = 'objectives'") {{ $t('strategyPlanner.toObjectives') }}
      b-button(v-if="step === 'objectives'" outlined type="is-primary" @click="step = 'run'") {{ $t('strategyPlanner.back') }}
      b-button(v-if="step === 'objectives'" type="is-primary" @click="step = 'plan'") {{ $t('strategyPlanner.producePlan') }}
      b-button(v-if="step === 'plan'" outlined type="is-primary" @click="step = 'objectives'") {{ $t('strategyPlanner.back') }}
      //- 🔴 THE CLIENT'S DOCUMENT LEAVES THE APP HERE, AND ONLY HERE. Mike's request,
      //- 2026-09-21. The browser writes the PDF — Business Performance Report P7: no PDF
      //- library runs on the locked Node 14.15, and the browser's own dialog means a
      //- client's session never leaves the machine to be rendered. It is also the only
      //- method his own ruling of 2026-09-17 allows: "there is ONE artefact, never two
      //- formats", so this prints the document already on screen rather than generating
      //- a second one that could disagree with it.
      b-button(v-if="step === 'plan'" type="is-primary" @click="printPlan") {{ $t('strategyPlanner.printPlan') }}

  //- 🔴 THE RAIL IS THE WAY THROUGH THE SESSION, NOT A PROGRESS PICTURE. Mike's request,
  //- 2026-09-21: *"enable me to be able to click on the step banner (scope, build etc) in any
  //- order i want to make it easier if i forget something"*. An advisor who realises
  //- mid-meeting that a concept was never scoped had to walk back one Back button at a time,
  //- then forward again through every screen.
  //- ⚠ REAL BUTTONS, NOT CLICKABLE DIVS. These are the only way to reach four of the five
  //- screens now, so a keyboard or a screen reader has to be able to use them.
  nav.sp-rail(aria-label="Session progress")
    button.sp-rail-step(
      v-for="stage in railStages"
      :key="stage.key"
      type="button"
      :class="railClass(stage.key)"
      :disabled="!canOpenStage(stage.key)"
      :aria-current="step === stage.key ? 'step' : null"
      @click="goToStage(stage.key)"
    ) {{ $t(stage.label) }}

  b-notification(v-if="error" type="is-danger" :closable="true" @close="error = ''") {{ error }}

  b-loading(:is-full-page="false" :active="loading")

  //- 🔴 THE DOOR — stage 7, Decision A, from design/mockups/strategy-session-resume.html.
  //- An advisor who left this screen for ANY reason used to come back to a blank one with
  //- no way into the session they had been running, and a second `Build the session` opened
  //- an empty duplicate for the same client. Our pages carry no navigation of their own, so
  //- leaving is never a door we built — they vanish. This is on the ARRIVAL screen because
  //- that is where they always land.
  //- ⚠ IT OFFERS. IT NEVER RESUMES BY ITSELF. A new meeting with the same client is an
  //- ordinary thing to want, and guessing wrong in front of a client cannot be undone in
  //- the room. Not a modal either: an advisor who wants a fresh session ignores this.
  //- ⚠ IT SAYS WHOSE THE SESSION IS. The route is scoped to the FIRM, not to one advisor,
  //- so a colleague's session for this client appears here — useful, never silent.
  .sp-resume(v-if="!loading && step === 'scope' && mostRecentSession")
    .sp-resume-main
      p.sp-resume-t {{ $t('strategyPlanner.resume.heading', { client: clientName, when: sessionWhen(mostRecentSession) }) }}
      p.sp-resume-facts {{ sessionFacts(mostRecentSession) }}
    .sp-resume-acts
      b-button(type="is-primary" @click="reopenSession(mostRecentSession.id)") {{ $t('strategyPlanner.resume.reopen') }}
      b-button(outlined @click="dismissResume") {{ $t('strategyPlanner.resume.startNew') }}
      a.sp-resume-more(
        v-if="earlierSessions.length"
        href="#"
        @click.prevent="showEarlier = !showEarlier"
      ) {{ $tc('strategyPlanner.resume.earlier', earlierSessions.length, { count: earlierSessions.length }) }}

  //- Behind the bar's own link, because a regular client accumulates sessions and the bar
  //- must stay one line. Nothing here is closed or archived — see Decision C, dropped.
  .sp-slist(v-if="!loading && step === 'scope' && showEarlier && earlierSessions.length")
    .sp-srow(v-for="s in earlierSessions" :key="s.id")
      span.sp-swhen {{ sessionWhen(s) }}
      span.sp-swhat {{ sessionFacts(s) }}
      b-button(size="is-small" outlined @click="reopenSession(s.id)") {{ $t('strategyPlanner.resume.reopenShort') }}

  //- 🔴 THE SESSION'S OWN CONTROLS — Mike's two requests of 2026-09-22, and the stamp that
  //- Decisions D and E put beside them. Shown once a session exists and never on Scope
  //- before one does, because there is nothing yet to save or to leave.
  //- ⚠ `Leave session` IS DRAWN AND NOT BUILT — it has no destination, and it is NOT
  //- Advisor-e's to give (Mike, 2026-09-22). A button that looks live and goes nowhere
  //- cannot be told apart from a broken app — the rule that fixed `Suggest for this client`.
  //- The full note is on the drawing: design/mockups/strategy-session-resume.html.
  .sp-sessbar(v-if="!loading && sessionId && step !== 'scope'")
    span.sp-saved(v-if="saveStampKey" :class="'is-' + saveState")
      | {{ $t(saveStampKey) }}{{ saveStampTime ? ' ' + saveStampTime : '' }}
    span.sp-sessbar-spacer
    b-button(size="is-small" outlined @click="saveSessionNow") {{ $t('strategyPlanner.save.button') }}

  //- 🔴 REOPENED, AND IT SAYS WHERE — Decision B. Landing deep in a session is quick, and
  //- disorienting without this: it names the concept and offers one click back to the start.
  .sp-reopened(v-if="!loading && reopenedAt && step === 'run'")
    p
      | {{ $t('strategyPlanner.resume.landed', { concept: reopenedAt.name }) }}
      a.sp-resume-more(href="#" @click.prevent="goToStage('scope')") {{ $t('strategyPlanner.resume.backToScope') }}

  //- 🔴 EVERY SCREEN WEARS THE AGREED FRAME — Mike, 2026-09-22: "i dont care about the
  //- page size until it comes to printing. so long as the border is same distance from
  //- outer edge, has the logo in bottom left as agreed."
  //-
  //- 🔴 AND THE FRAME IS NOT THE WHOLE BRAND. EVERY COMPONENT THAT RENDERS ONE OF THE 33
  //- DRAWINGS TAKES `firm-name`, `firm-colour` AND `firm-logo`, AND ALL FOUR CALL SITES
  //- BELOW PASS THEM. Omit them and the prop defaults to '' and the drawing prints the
  //- literal words "Firm logo" against a disc with no initial in it — on the page an
  //- advisor is showing a client. Item 16; Mike's rule of 2026-09-18 is that in client
  //- dealings the brand is ALWAYS the advisor's firm, never Advisor-e.
  //- ⚠ Found 2026-09-23 by reading the code on Mike's instruction: the plan document was
  //- wired on 2026-09-22 and the three SESSION screens were not, so a client met the
  //- placeholder in the meeting and the real brand only on the document afterwards.
  .sp-sheet
    strategy-plan-frame(split screen)
    strategy-plan-mark.sp-sheet-mark(
      :name="firmBrand.name || ''"
      :logo="firmBrand.logo || ''"
      :colour="firmBrand.colour || '#0070c0'"
    )
    template(v-if="!loading && step === 'scope'")
      strategy-scope-menu(
        :decks="decks"
        :chosen="chosen"
        :session-label="sessionLabel"
        :suggested="suggested"
        :suggesting="suggesting"
        :suggest-state="suggestState"
        :client-chosen="Boolean(clientId)"
        @scope-changed="onScopeChanged"
        @suggest-requested="requestSuggestion"
      )

    template(v-if="!loading && step === 'steps'")
      //- 🔴 SAYS WHY THE LIST IS SHORTER THAN WHAT HE TICKED, AND IT BELONGS HERE NOW.
      //- Tick all 52 and this screen offers 40 cards — 2 approved framework cards and 38
      //- concepts — because 12 of the 52 have neither a fill-in table nor a drawing and are
      //- not offered at all. The notice used to sit on the next screen, which was the first
      //- place the shortfall showed — since 2026-09-20 this screen is, so an unexplained gap
      //- would be the first thing he meets. Found by opening the screen, not by a test.
      //- ⚠ COUNTED OFF THE RUNNING SCREEN ON 2026-09-21 — 2 + 38 + 12 = 52 — AFTER A DERIVED
      //- COUNT GOT IT WRONG. A script that scanned the drawings registry read 39 and 13,
      //- because one of the 33 entries (`pricing`) is an unquoted key and the pattern wanted
      //- quotes. The app said 40 and the script said 39; the app was right. Re-count by
      //- opening the screen, never by scanning that file.
      //- ⚠ 16 — the count of concepts with a SUPPLIED fill-in table — is unchanged and is
      //- not what this screen offers. `data/strategy-capture-tables.json` `templateCount`
      //- is 20 and counts TEMPLATES, several of which serve more than one concept while
      //- four concepts name a template that does not exist. Do not read one for the other.
      b-notification(v-if="conceptsWithoutACard > 0" type="is-warning" :closable="false")
        | {{ $tc('strategyPlanner.menu.notRunnable', conceptsWithoutACard, { count: conceptsWithoutACard }) }}

      //- 🔴 THE PROCESS BANNER — Decision A and Decision C on one line, where the approved
      //- drawing puts them. It says the session arrived rather than being invented, and it
      //- says WHOSE it is, so an inherited process is never mistaken for the firm's own.
      //- `Start from blank instead` is one click away on purpose: a standard session is a
      //- starting point and never a cage.
      .sp-proc(v-if="processSource && !startedFromBlank")
        .sp-proc-main
          b.sp-proc-t {{ $t('strategyPlanner.process.handedDown', { count: sessionProcess ? sessionProcess.steps.length : 0 }) }}
          span.sp-proc-s {{ $t('strategyPlanner.process.editable') }}
        span.sp-proc-who {{ processOwnerLabel }}
        b-button(size="is-small" outlined type="is-primary" @click="startFromBlank") {{ $t('strategyPlanner.process.startBlank') }}

      strategy-step-builder(
        :cards="placeableCards"
        :steps="planStepDefs"
        :session-label="sessionLabel"
        @steps-changed="onStepsChanged"
      )

    template(v-if="!loading && step === 'run'")
      //- 🔴 SAYS WHAT IT CANNOT RUN. The advisor scoped concepts that have no capture card
      //- built yet, and a step that silently showed only two of eleven would read as a bug
      //- in the room. Stage 1 of item 15.1 — the cards are stages 4 and 5.
      b-notification(v-if="conceptsWithoutACard > 0" type="is-warning" :closable="false")
        | {{ $tc('strategyPlanner.menu.notRunnable', conceptsWithoutACard, { count: conceptsWithoutACard }) }}

      //- 🔴 THE MEETING RUNS IN THE ADVISOR'S OWN ORDER, UNDER HIS OWN HEADINGS. Before
      //- stage 2 existed this was a flat list in whatever order the data produced, with no
      //- headings a client would recognise from the agenda they were handed.
      p.sp-cap(v-if="!runSteps.length") {{ $t('strategyPlanner.steps.nothingToRun') }}

      section.sp-runstep(v-for="(runStep, i) in runSteps" :key="'rs' + i")
        h4.sp-h {{ runStep.name }}

        template(v-for="card in runStep.cards")
          //- 🔴 A CONCEPT WITH AN APPROVED CARD USES IT. Porter's was designed on
          //- 2026-09-16 (strategy-planner.html screen 2c) as five force boxes, each
          //- carrying the deck's own question, with Existing Rivalry as the centre — and
          //- it was built. Replacing it with a grid derived from the Word template lost
          //- all five prompts and the fifth force. Mike, 2026-09-17: "i saw much better
          //- graphics in a design 6 or 8 sessions ago - what happened??"
          strategy-capture-card(
            v-if="card.kind === 'framework'"
            :key="card.key"
            :framework="card.framework"
            :entries="entriesFor(card.framework.conceptId || card.framework.id)"
            :eyebrow="card.eyebrow"
            :teachable="isTeachable(card.framework)"
            :firm-name="firmBrand.name || ''"
            :firm-colour="firmBrand.colour || undefined"
            :firm-logo="firmBrand.logo || ''"
            :text-edits="textEdits"
            editable
            class="sp-card"
            @text-edited="onTextEdited"
            @field-opened="onFrameworkFieldOpened(card.framework, $event)"
            @field-changed="onFrameworkFieldChanged(card.framework, $event)"
            @field-typing="onFrameworkFieldTyping(card.framework, $event)"
          )

          //- Everything else: the concept's own fill-in table, read from Mike's
          //- workbooks. Only 2 of the 52 have an approved framework card of their own
          //- (Porter's 5 Forces and the 8 Profit Levers) — counted 2026-09-21.
          strategy-concept-capture(
            v-else
            :key="card.key"
            :name="card.visit.name"
            :capture="card.visit.capture"
            :concept-summary="card.visit.conceptSummary"
            :helps-client-to="card.visit.helpsClientTo"
            :teaching-form="card.visit.teachingForm"
            :page-words="card.visit.pageWords"
            :concept-id="card.visit.conceptId"
            :entries="entriesFor(card.visit.conceptId)"
            :client-id="clientId || ''"
            :client-name="clientName"
            :token="apiToken"
            :eyebrow="card.eyebrow"
            :firm-name="firmBrand.name || ''"
            :firm-colour="firmBrand.colour || undefined"
            :firm-logo="firmBrand.logo || ''"
            :text-edits="textEdits"
            editable
            @text-edited="onTextEdited"
            @field-opened="onVisitFieldOpened(card.visit, $event)"
            @field-changed="onVisitFieldChanged(card.visit, $event)"
            @fields-changed="onVisitFieldsChanged(card.visit, $event)"
            @field-typing="onVisitFieldTyping(card.visit, $event)"
          )

    template(v-if="!loading && step === 'objectives'")
      strategy-capture-card(
        v-for="framework in closingFrameworks"
        :key="framework.id"
        :framework="framework"
        :entries="entriesFor(framework.id)"
        :eyebrow="$t('strategyPlanner.rail.objectives')"
        :firm-name="firmBrand.name || ''"
        :firm-colour="firmBrand.colour || undefined"
        :firm-logo="firmBrand.logo || ''"
        class="sp-card"
        @field-opened="onFieldOpened"
        @field-changed="onFieldChanged"
        @field-typing="onFieldTyping($event)"
      )
      section.sp-section
        h4.sp-h {{ $t('strategyPlanner.wheel.heading') }}
        p.sp-cap {{ $t('strategyPlanner.wheel.caption') }}
        strategy-growth-wheel(:aspects="growthAspects" :counts="aspectCounts")

    //- Screen 4 — the plan. READ ONLY, and assembled from what was captured; it holds no
    //- state of its own, so it can never disagree with the session behind it.
    template(v-if="!loading && step === 'plan'")
      //- The three firm props, as on every other call site — the rule is stated once at
      //- `.sp-sheet` above. Here they reach every teaching page of the document the
      //- client keeps; they were missing until 2026-09-22 (item 16.2).
      strategy-plan-document(
        :client-name="clientName"
        :client-id="clientId || ''"
        :decks="planDecks"
        :steps="planSteps"
        :closing="closingCards"
        :firm-name="firmBrand.name || ''"
        :firm-colour="firmBrand.colour || undefined"
        :firm-logo="firmBrand.logo || ''"
        :text-edits="textEdits"
      )
      section.sp-section
        h4.sp-h {{ $t('strategyPlanner.wheel.heading') }}
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
import StrategyPlanDocument from '~/components/strategy/StrategyPlanDocument.vue'
import StrategyPlanMark from '~/components/strategy/StrategyPlanMark.vue'
import StrategyStepBuilder from '~/components/strategy/StrategyStepBuilder.vue'
import { isPlaceableConcept } from '~/utils/strategyCards'
import { isDevHost } from '~/utils/devHost'
import { rolesFrom, namedRoles } from '~/utils/orgChart'
import { getSavedReport } from '~/utils/clientReports'
import { requestFromSaved, contrastFrom } from '~/utils/ownerExpectationsPrint'

/** Where the master app leaves the advisor's token before our pages load. */
const TOKEN_KEY = 'advisor_e_token'

/** The one capture form that captures a structure rather than words. */
const ORG_CHART_FORM = 'parent-child-list'

/** A concept whose capture is a Report Model run inside the card (item 15.23). */
const MODEL_FORM = 'report-model'

/**
 * How each hosted model reaches the client's plan: the backend route that computes it, the
 * request built from the client's saved record, and the table printed from the answer.
 */
const MODEL_PRINTS = {
  '/owner-expectations': {
    url: '/api/report/owner-expectations',
    request: requestFromSaved,
    table: contrastFrom
  }
}

/**
 * How long the advisor stops typing before the open box is written out — Decision D,
 * "yes - auto save" (Mike, 2026-09-22).
 *
 * 🔴 IT IS A PAUSE AND NOT A KEYSTROKE, and the difference is the whole of that day's
 * defect: until it was fixed, every character typed was its own `PUT /entries` and its
 * own database write — 62 for a 62-character sentence. This writes once, after the
 * advisor stops. 1.2 seconds is long enough that ordinary typing never trips it and
 * short enough that "Unsaved changes" is gone before anyone reads it.
 *
 * ⚠ Leaving the box saves too, through Buefy's `lazy` — this closes the OTHER hole, an
 * advisor who types an answer and then walks away without clicking anything at all.
 */
const AUTOSAVE_PAUSE_MS = 1200

export default {
  name: 'StrategyPlannerPage',

  components: { StrategyScopeMenu, StrategyStepBuilder, StrategyCaptureCard, StrategyConceptCapture, StrategyGrowthWheel, StrategyPlanDocument, StrategyPlanMark },

  data () {
    return {
      /**
       * Which SCREEN is showing: 'scope' | 'steps' | 'run' | 'objectives' | 'plan'.
       *
       * 🔴 THIS IS NOT THE SESSION'S STEPS AND THE TWO MUST NEVER BE CONFLATED. This is
       * the wizard's own position; the session's steps are `planStepDefs` below, named by
       * the advisor and printed on the client's agenda. The drawing says so in as many
       * words, because wiring one to the other is the obvious mistake to make here.
       */
      step: 'scope',
      loading: true,
      error: '',
      /**
       * The advisor firm's brand for the printed plan — item 16.2. Fetched once on
       * mount from `GET /api/report/firm/brand`. Nulls are the honest resting state:
       * `firmLogo` null means the firm holds no logo and the initials disc shows
       * (Mike's ruling, 2026-09-22), and `firmColour` null means the page border
       * falls back to the platform colour. The route answers 200 with nulls on any
       * failure, so a plan always prints.
       */
      firmBrand: { name: null, logo: null, colour: null },
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
       * What a hosted model prints on the client's plan, by concept id (item 15.23) —
       * `{ contrast }`, `{ contrast: null }` where the client has nothing saved, or
       * `{ failed: true }`. Read from the client's own record on Produce plan, never kept
       * in the session: Decision B of the approved drawing.
       */
      modelPrints: {},
      /**
       * CONCEPT ids ticked on the session scope menu — Mike's own 52, not framework ids.
       * Changed in Stage 1: the menu is now his Session Scope table (Decision A), and a
       * concept is the unit an advisor ticks.
       */
      chosen: [],
      /**
       * THE SESSION'S STEPS — what the advisor names on stage 2 and drags cards into.
       * `[{ key, name, items: [cardKey] }]`, in the order they will run.
       *
       * 🔴 A STEP HOLDING NOTHING IS A REAL STEP. Mike's ruling, 2026-09-20: he names
       * the steps, and one with nothing in it still prints on the agenda — Pivot's
       * step 5 "Do It & Review It" has no slides behind it at all. Nothing may prune
       * an empty entry from this list.
       *
       * `key` is a client-side handle so a name input keeps focus while it is typed;
       * only `name` and `items` are saved, with the scope.
       */
      planStepDefs: [],
      /** The open session's id, once one exists. */
      sessionId: null,
      /**
       * WHAT THE AI PROPOSED, AND ONLY THAT — `[{ id, reason }]`. Decision C, stage 6.
       *
       * 🔴 IT IS NEVER THE SCOPE. `chosen` above is the scope and is the only thing saved
       * as one. This list exists so the screen can show which rows were proposed, why, and
       * how many of them the advisor has since taken back off — the disagreement between
       * the two lists is the advisor's judgement and is the point of keeping both.
       */
      suggested: [],
      /** True while the suggestion is being fetched. */
      suggesting: false,
      /** '' | 'ok' | 'no-history' | 'nothing-matched' | 'failed' — what the bar says. */
      suggestState: '',
      /** Captured text, keyed `frameworkId::fieldKey`. */
      entries: {},
      /**
       * The advisor's own wording on this session's concept pages — item 15.25.
       * `{ '<conceptId>#<sheet>': { '<block>': 'words' } }`, as the session stores it.
       */
      textEdits: {},
      /**
       * Each ticked concept's real fill-in table, keyed by concept id, as
       * `GET /api/strategy/concepts/:id/capture` returns it. Loaded when the
       * advisor starts the session rather than at scope time — 52 requests to
       * render a menu would be 52 requests nobody reads.
       */
      captures: {},
      /**
       * THE STANDARD SESSION HANDED DOWN TO THIS FIRM — `{ name, steps }`, or null when
       * nothing above has written one and the fetch failed. Decision A, 2026-09-21: it is
       * what Build session opens on, rather than a blank step.
       *
       * ⚠ READ-ONLY HERE. The advisor edits `planStepDefs`, never this — his changes
       * belong to one session and never travel back up to the firm's standard (Decision C).
       */
      sessionProcess: null,
      /**
       * Whose the handed-down session is: `{ scopeId, tier, shipped }`. Decision C — a
       * tier that has written nothing shows what it inherits AND SAYS WHOSE IT IS, so an
       * inherited process is never mistaken for one the firm authored.
       */
      processSource: null,
      /** Set when the advisor presses "Start from blank instead", for this session only. */
      startedFromBlank: false,

      // ── THE DOOR — stage 7, from design/mockups/strategy-session-resume.html ──────
      //
      // 🔴 WHY ANY OF THIS EXISTS. Until 2026-09-22 an advisor who left this screen for
      // ANY reason — Advisor-e's menu, a phone call, a closed lid, a mis-clicked back
      // button — came back to a blank Scope screen with no way into the session they had
      // been running, and a second `Build the session` opened an empty duplicate for the
      // same client. Everything they had typed was stored and unreachable. Our pages carry
      // no navigation of their own, so leaving is never a door we built: they vanish. That
      // is why the way back is on the ARRIVAL screen, where they always land.

      /**
       * That client's sessions, newest first, from `GET /api/strategy/sessions?clientId=`.
       * Empty until a client is chosen. Decision A.
       */
      clientSessions: [],
      /** True while that list is being fetched, so the bar does not flash in and out. */
      loadingSessions: false,
      /** Decision A — the earlier-sessions list, behind the bar's own link. */
      showEarlier: false,
      /**
       * Set when a session was REOPENED rather than started: `{ conceptId, name }` or null.
       * Decision B — it is what the green banner names, so landing deep in a session is
       * never disorienting.
       */
      reopenedAt: null,

      // ── THE SAVED STAMP — Decisions D and E ──────────────────────────────────────
      //
      // 🔴 D IS "yes - auto save" (Mike, 2026-09-22) AND E IS WHAT KEEPS IT HONEST. A
      // stamp that only ever reads "Saved" lies at the one moment it matters — beside a
      // sentence the advisor has just typed and not yet left. So it has three states, and
      // the app writes the open box out after a PAUSE so "unsaved" lasts seconds.
      //
      // ⚠ A PAUSE, NEVER A KEYSTROKE. Saving per keystroke is the defect fixed the same
      // day (see `onFieldChanged`); this must never become that again.

      /** '' | 'unsaved' | 'saving' | 'saved' — what the stamp says. Decision E. */
      saveState: '',
      /** When the last successful save landed, for the stamp's time. */
      lastSavedAt: null,
      /** The open box's latest text, not yet written out: `{ frameworkId, fieldKey, value }`. */
      pendingEntry: null,
      /** The pause timer. Cleared on save, on leaving the box, and before unmount. */
      autoSaveTimer: null,

      /** Resolved in mounted — never at render time. */
      apiToken: ''
    }
  },

  computed: {
    /**
     * The firm's colour, as a custom property the whole planner reads — item 16.2.
     *
     * 🔴 THE BRANDING IS NOT THE PRINTED PLAN'S ALONE. Mike, 2026-09-22: *"i expect the
     * branding to be consistent throughout - not JUST the pdf printed version."* The
     * stage rail, the resume bar and the screen's own accents were hardcoded to
     * Advisor-e's `#0070c0`, so an advisor sat in front of a client on a screen wearing
     * the wrong firm's colour and then handed over a document wearing the right one.
     *
     * @returns {{'--sp-firm': string}} the firm's colour, or the platform blue where
     *   Advisor-e has not yet supplied one — the same fallback the document uses.
     */
    firmStyle () {
      return { '--sp-firm': this.firmBrand.colour || '#0070c0' }
    },

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
     * Every ticked concept, ONCE — the unit the session runs.
     *
     * 🔴 A CONCEPT APPEARS EXACTLY ONCE, EVERYWHERE. Mike's ruling, 2026-09-21: *"each
     * concept … are only listed once. they appear as an option and get selected in scope,
     * sorted into the correct order in build session — of course — appear ONCE in the run
     * session and ONCE in the produce plan."*
     *
     * This used to split a concept into one visit per PART of its capture table, so
     * Porter's could be worked twice — observations first, responses an hour later. That
     * is deleted, along with the split that produced it. The card key is the concept id
     * itself, with no visit number, because there is only ever one.
     *
     * @returns {Array<{key: string, conceptId: string, name: string, capture: object}>}
     */
    conceptVisits () {
      // A concept with an approved framework card is drawn by that card above, and must
      // not also appear here — that would be the same concept twice, which the ruling
      // above forbids outright.
      const hasApprovedCard = {}
      this.chosenFrameworks.forEach((f) => {
        if (f.conceptId) { hasApprovedCard[f.conceptId] = true }
      })

      const visits = []
      this.chosen.forEach((conceptId) => {
        if (hasApprovedCard[conceptId]) { return }
        const loaded = this.captures[conceptId]
        if (!loaded) { return }
        visits.push({
          key: conceptId,
          conceptId,
          name: loaded.name,
          conceptSummary: loaded.conceptSummary || '',
          helpsClientTo: loaded.helpsClientTo || '',
          teachingForm: loaded.teachingForm || '',
          pageWords: loaded.pageWords || [],
          capture: loaded.capture
        })
      })
      return visits
    },

    /**
     * Ticked concepts that genuinely cannot be run — no fill-in table AND no
     * approved drawing.
     *
     * ⚠ THE NOTICE THIS FEEDS SAYS "not shown below", SO IT MUST NOT COUNT A
     * CONCEPT THAT IS SHOWN. A concept admitted on its drawing alone (item 15.7)
     * appears in the session, so counting it here would tell an advisor their
     * concept had been dropped while it sat on the screen in front of them.
     *
     * @returns {number}
     */
    conceptsWithoutACard () {
      return this.chosen.filter((id) => {
        const loaded = this.captures[id]
        const hasTable = Boolean(loaded && loaded.capture && loaded.capture.supplied)
        return !isPlaceableConcept(hasTable, id)
      }).length
    },

    /**
     * The five stages, in order, and the one place that order is written down.
     *
     * 🔴 IT IS BOTH THE RAIL AND THE PROGRESS RULE. `railClass` reads this rather than
     * keeping a second list — the second list is exactly what went wrong before, when
     * `steps` was in the rail and missing from the order, so the rail marked Build session
     * done before the advisor had been there.
     *
     * @returns {Array<{key: string, label: string}>}
     */
    railStages () {
      return [
        { key: 'scope', label: 'strategyPlanner.rail.scope' },
        { key: 'steps', label: 'strategyPlanner.rail.steps' },
        { key: 'run', label: 'strategyPlanner.rail.run' },
        { key: 'objectives', label: 'strategyPlanner.rail.objectives' },
        { key: 'plan', label: 'strategyPlanner.rail.plan' }
      ]
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
    /**
     * Which decks this session drew on, as one line for the title page.
     * @returns {string}
     */
    planDecks () {
      const names = {}
      this.decks.forEach((d) => {
        if (d.concepts && d.concepts.some(c => this.chosen.includes(c.id))) { names[d.name] = true }
      })
      return Object.keys(names).join(' · ')
    },

    /**
     * Concept id → the display name of the deck it came from.
     *
     * 🔴 THE STEP BUILDER'S LEFT COLUMN IS UNREADABLE WITHOUT THIS. The approved
     * drawing (`design/mockups/strategy-step-builder.html`) puts the deck under
     * every card, because that is the only thing distinguishing forty-odd chips
     * from each other. Both branches of `placeableCards` used to read a
     * `deckName` field that exists nowhere — not in `data/strategy-frameworks.json`,
     * not on a concept visit — so `card.deck` was always '' and the `v-if` that
     * guards the label never fired. The column rendered as identical white boxes
     * and still looked plausible, which is why no test caught it and Mike did.
     *
     * `this.decks` is the only place the two are joined, so the map is built from
     * it rather than a second field being added to the payload.
     *
     * @returns {Object<string, string>}
     */
    deckNameByConcept () {
      const byConcept = {}
      this.decks.forEach((d) => {
        (d.concepts || []).forEach((c) => { byConcept[c.id] = d.name })
      })
      return byConcept
    },

    /**
     * EVERY CARD THE ADVISOR CAN PLACE, in the order the session would otherwise run
     * them. This is the one list stage 2 offers and stage 3 and the document both read,
     * so a card cannot exist on one screen and not another.
     *
     * 🔴 ONE CONCEPT, ONE CARD. Mike's ruling, 2026-09-21: a concept is listed once,
     * chosen once, sorted once, and appears once in Run session and once in the plan. A
     * concept with an approved framework card is that card; every other scoped concept is
     * one concept card. Nothing here may ever emit two cards for one concept.
     *
     * @returns {Array<{key: string, conceptId: string, name: string, deck: string, tag: string, summary: string, instruction: string, prompts: object[], lines: object[]}>}
     */
    placeableCards () {
      const cards = []

      // The approved framework cards first, in their authored order.
      this.chosenFrameworks.forEach((f) => {
        const conceptId = f.conceptId || f.id
        cards.push({
          key: 'fw-' + f.id,
          conceptId,
          hasTable: true,
          name: f.name,
          deck: this.deckNameByConcept[conceptId] || '',
          tag: '',
          summary: f.conceptSummary || '',
          instruction: f.captureInstruction || '',
          prompts: f.fields
            .filter(x => x.prompt)
            .map(x => ({ key: x.key, label: x.label, prompt: x.prompt })),
          lines: f.fields.map(x => ({
            key: conceptId + '::' + x.key,
            label: x.label,
            value: (this.entries[conceptId + '::' + x.key] || '').trim()
          }))
        })
      })

      // Then every concept captured through its own fill-in table.
      //
      // 🔴 A CONCEPT NEEDS A TABLE **OR** A DRAWING — Mike's ruling, 2026-09-20.
      // This line used to demand a supplied workbook, which was right while there
      // were no pictures: a concept with neither printed a title, an instruction
      // and nothing else, a near-empty page in a document a client is handed. With
      // the drawing wired in (item 15.7) such a concept now prints Mike's own
      // teaching page, so excluding it loses real content instead of sparing the
      // client a blank. Measured when the ruling was made: only 16 of the 52
      // concepts have a workbook, so the old line capped the 33 approved drawings
      // at 16 no matter how many were wired.
      this.conceptVisits.forEach((visit) => {
        const capture = visit.capture || {}
        const hasTable = Boolean(capture.supplied)
        if (!isPlaceableConcept(hasTable, visit.conceptId)) { return }
        // 🔴 THE ORG CHART CARRIES A STRUCTURE, NOT A SET OF BOXES. Decision E, ruled by
        // Mike 2026-09-21: the client's plan carries the drawn chart with the list of roles
        // beneath it. Its capture has no `fields` by design, so its lines are built from the
        // roles the advisor entered instead — and the chart itself travels beside them, so
        // the document draws the same one the advisor watched build.
        const orgRoles = capture.form === ORG_CHART_FORM
          ? namedRoles(rolesFrom(this.entriesFor(visit.conceptId)))
          : null
        const model = capture.form === MODEL_FORM ? capture.model : ''
        cards.push({
          key: visit.key,
          conceptId: visit.conceptId,
          orgChart: orgRoles,
          // A hosted model prints its own page from the client's record (item 15.23).
          model,
          modelPrint: model ? (this.modelPrints[visit.conceptId] || null) : null,
          // His own column heading, read off the workbook, so the client's plan heads the
          // list with the same word the advisor typed under.
          orgChartHead: (capture.orgChart && capture.orgChart.headLabel) || '',
          // A concept admitted on its drawing alone has nothing to fill in, and the
          // client's document must not print a capture page saying it was "not
          // worked through" when there was never anything to work.
          hasTable,
          name: visit.name,
          deck: this.deckNameByConcept[visit.conceptId] || '',
          // ⚠ NO PART TAG. A concept appears once (Mike, 2026-09-21), so there is never a
          // second chip of the same table to tell apart from the first.
          tag: '',
          summary: visit.conceptSummary || '',
          // ⚠ NO INSTRUCTION ON A CONCEPT CARD, and that is the true state rather than an
          // omission: no concept in data/strategy-frameworks.json carries one. The only
          // instruction that ever appeared here was the second visit's column heading,
          // and there is no second visit.
          instruction: '',
          prompts: [],
          // The WHOLE table. It used to be filtered to one part's field keys, which is
          // what made a second visit show different boxes from the first.
          lines: orgRoles
            ? orgRoles.map(r => ({
              key: visit.conceptId + '::orgrole-' + r.id,
              // The role and the person in it are one line of the list; who they report to
              // is its value. The document draws its own three-column table from `orgChart`
              // above — these lines are what everything else downstream reads.
              label: r.person ? r.name + ' · ' + r.person : r.name,
              value: r.reportsTo
            }))
            : (capture.fields || [])
              .map(f => ({
                key: visit.conceptId + '::' + f.key,
                // `columnHead` names the side where one heading spans two columns.
                label: [f.columnHead, f.columnLabel, f.rowLabel].filter(Boolean).join(' · ') || f.key,
                value: (this.entries[visit.conceptId + '::' + f.key] || '').trim()
              }))
        })
      })

      // 🔴 THE TWO CLOSING BLOCKS ARE NOT HERE, AND THAT IS DECISION D (Mike, 2026-09-21).
      // Strategic Statements and the Action Plan leave Build session entirely and appear
      // only on Objectives & actions, where they are already captured. They are the app's
      // own closing blocks rather than concepts off any of Mike's decks — which is why
      // they were the only two cards in the tray with no deck beneath them, and why the
      // tray read as arbitrary with them in it.
      //
      // ⚠ THIS REVERSES PART OF DECISION 4 OF 2026-09-20, which made them ordinary cards
      // on an ordinary step so their names would stop reaching the client's agenda. That
      // reason stands and is served better this way: out of the step builder, they name
      // nothing on the agenda at all.
      //
      // ⚠ THEY ARE STILL IN THE CLIENT'S PLAN. `closingCards` below builds them for the
      // assembled document, which prints them as its own closing block. Removing them
      // from this list must never remove them from the plan.
      return cards
    },

    /**
     * The two closing blocks as the assembled document prints them — outside the advisor's
     * steps, because Decision D took them off the screen where steps are built.
     *
     * 🔴 THIS IS WHAT STOPS DECISION D LOSING CONTENT. Before it, these two rode into the
     * document inside whichever step the advisor filed them under. With them gone from
     * `placeableCards` they would reach no step and vanish from the client's plan — the
     * Strategic Objective and the Action Plan, which are the two things the session exists
     * to produce.
     *
     * @returns {Array<object>} the same card shape the document's step items use
     */
    closingCards () {
      return this.closingFrameworks.map(f => ({
        key: 'close-' + f.id,
        // Ours, not a deck concept, so there is no drawing and never will be — the
        // graphic resolves to nothing and the page prints without one.
        conceptId: '',
        hasTable: true,
        name: f.name,
        deck: '',
        tag: '',
        summary: '',
        instruction: f.captureInstruction || '',
        prompts: [],
        lines: f.fields.map(x => ({
          key: f.id + '::' + x.key,
          label: x.label,
          value: (this.entries[f.id + '::' + x.key] || '').trim()
        }))
      }))
    },

    /**
     * The meeting itself, grouped under the advisor's own step names and run in his
     * order.
     *
     * ⚠ AN EMPTY STEP IS DROPPED HERE AND KEPT IN `planSteps`, AND THAT IS NOT A
     * CONTRADICTION. There is nothing to work in the room for a step holding nothing —
     * but it still belongs on the agenda the client reads, which is the document's job.
     * Pivot's step 5 is exactly that case.
     *
     * ⚠ THE CLOSING CARDS ARE NOT RUN HERE. The Strategic Objective and Action Plan are
     * captured on stage 4, as they always were; placing them on a step decides where
     * they PRINT, not where they are filled in.
     *
     * @returns {Array<{name: string, cards: object[]}>}
     */
    runSteps () {
      const frameworksByKey = {}
      this.chosenFrameworks.forEach((f) => { frameworksByKey['fw-' + f.id] = f })
      const visitsByKey = {}
      this.conceptVisits.forEach((v) => { visitsByKey[v.key] = v })

      return this.planStepDefs.map((def, i) => {
        const cards = []
        def.items.forEach((key) => {
          if (frameworksByKey[key]) {
            cards.push({ key, kind: 'framework', framework: frameworksByKey[key] })
          } else if (visitsByKey[key]) {
            cards.push({ key, kind: 'visit', visit: visitsByKey[key] })
          }
        })
        return {
          name: def.name || this.$t('strategyPlanner.steps.namePlaceholder', { n: i + 1 }),
          // The position an advisor reads mid-meeting is his position WITHIN THIS STEP —
          // "3 / 5" of the step he is working, not of the whole session.
          cards: cards.map((c, j) => Object.assign({}, c, { eyebrow: (j + 1) + ' / ' + cards.length }))
        }
      }).filter(s => s.cards.length)
    },

    /**
     * Whose standard session this advisor received — the badge on the process banner.
     *
     * 🔴 DECISION C SAYS IT MUST SAY WHOSE IT IS, so there is no neutral fallback here
     * that reads as "somebody set this". A tier we cannot name answers with the shipped
     * platform wording, which is the truthful one: nobody in this firm's chain authored it.
     *
     * ⚠ THE FOUR TIER NAMES ARE THE SETTLED ONES and are never abbreviated or reinvented
     * — mentor, global group manager, group manager, firm manager.
     *
     * @returns {string}
     */
    processOwnerLabel () {
      const src = this.processSource
      if (!src) { return '' }
      // 🔴 `shipped` IS NOT A SEPARATE CASE HERE, AND TREATING IT AS ONE PUT THE WORDS
      // "THE STANDARD SESSION" ON THE BADGE where the approved drawing says "set by the
      // mentor". The shipped default IS the mentor's — `source.tier` already says so — so
      // the badge names a tier whatever the advisor is looking at. Found by opening the
      // screen on 2026-09-21; the suite was green.
      const byTier = {
        mentor: 'strategyPlanner.process.byMentor',
        global_group_manager: 'strategyPlanner.process.byGlobalGroupManager',
        group_manager: 'strategyPlanner.process.byGroupManager',
        firm_manager: 'strategyPlanner.process.byFirmManager'
      }
      return byTier[src.tier] ? this.$t(byTier[src.tier]) : ''
    },

    /** @returns {number} how many placeable cards the advisor has put into a step */
    placedCardCount () {
      const placed = {}
      this.planStepDefs.forEach((s) => { s.items.forEach((k) => { placed[k] = true }) })
      return this.placeableCards.filter(c => placed[c.key]).length
    },

    /**
     * The session as the steps the assembled document prints — the advisor's own steps,
     * in his order, each holding the cards he put in it.
     *
     * 🔴 A STEP HOLDING NOTHING IS KEPT. Mike's ruling, 2026-09-20. Pivot's step 5
     * "Do It & Review It" has no slides behind it and still appears on the agenda a
     * client reads; the document already prints that as "on the agenda only". Filtering
     * empty steps out here would quietly delete the page this feature exists for.
     *
     * ⚠ A CARD LEFT UNPLACED IS NOT IN THE DOCUMENT. Decision 3: unplaced cards stay
     * recorded in the session's scope and simply do not run, which is why the button on
     * to stage 3 says "Run 11 of 14" rather than being greyed out.
     *
     * @returns {Array<{name: string, items: object[], teaches: boolean}>}
     */
    planSteps () {
      const byKey = {}
      this.placeableCards.forEach((c) => { byKey[c.key] = c })

      return this.planStepDefs.map((def, i) => {
        const items = def.items.map(k => byKey[k]).filter(Boolean)
        return {
          name: def.name || this.$t('strategyPlanner.steps.namePlaceholder', { n: i + 1 }),
          items,
          // `teaches` says whether the step has anything to present before it is
          // worked. Without it a step of pure tables printed a Discussion divider and
          // then went straight to the tables, which reads as a missing page.
          teaches: items.some(x => x.summary || x.prompts.length),
          // And the mirror of it: a step made only of concepts admitted on their
          // drawing has nothing to work, so the Action divider would announce pages
          // that never come. Mike's ruling of 2026-09-20 made that state possible.
          works: items.some(x => x.hasTable !== false)
        }
      })
    },

    // ── THE DOOR — stage 7 ───────────────────────────────────────────────────────

    /**
     * The session the bar offers — this client's newest, or null.
     *
     * 🔴 RECENCY IS THE WHOLE RULE, AND THAT IS DELIBERATE. Decision C — a "finished"
     * flag — was DROPPED by Mike on 2026-09-22: the bar only appears once a client is
     * chosen, so it is never choosing between people, and it names the session's date so
     * the advisor can see for themselves whether it is this week's work or last quarter's.
     * The route returns them newest first.
     *
     * @returns {object|null}
     */
    mostRecentSession () {
      if (this.sessionId || !this.clientSessions.length) { return null }
      return this.clientSessions[0]
    },

    /** @returns {Array<object>} everything but the one the bar offers. */
    earlierSessions () {
      return this.clientSessions.slice(1)
    },

    /**
     * What the Saved stamp says — Decision E, ruled by Mike 2026-09-22.
     *
     * 🔴 IT IS ALLOWED TO SAY SOMETHING OTHER THAN "Saved", WHICH IS THE POINT. A stamp
     * that only ever showed a green tick would be lying beside a sentence the advisor has
     * just typed and not yet left, which is the one moment it matters.
     *
     * @returns {string} '' when there is no session to stamp
     */
    saveStampKey () {
      if (!this.sessionId || !this.saveState) { return '' }
      return 'strategyPlanner.save.' + this.saveState
    },

    /** @returns {string} the time on the stamp, or '' when it has nothing to show. */
    saveStampTime () {
      if (this.saveState !== 'saved' || !this.lastSavedAt) { return '' }
      return this.lastSavedAt.toLocaleTimeString(this.$i18n.locale, {
        hour: 'numeric',
        minute: '2-digit'
      })
    }
  },

  watch: {
    /**
     * A client was chosen — look for the sessions they already have. Decision A.
     *
     * ⚠ The bar is the ONLY thing that changes. Nothing is reopened, nothing is started,
     * and what the advisor has already ticked is untouched: a silent resume is exactly
     * what the ruling refused, because guessing wrong in front of a client cannot be
     * undone in the room.
     */
    clientId () {
      this.modelPrints = {}
      this.loadClientSessions()
    },

    /** Produce plan reads each hosted model's figures fresh from the client's record. */
    step (now) {
      if (now === 'plan') { this.loadModelPrints() }
    }
  },

  /**
   * ⚠ THE PAUSE TIMER MUST NOT OUTLIVE THE PAGE. A pending auto-save firing after the
   * advisor has navigated away would write into a component that no longer exists, and
   * on a slow line that is precisely when it would happen.
   */
  beforeDestroy () {
    if (this.autoSaveTimer) { clearTimeout(this.autoSaveTimer); this.autoSaveTimer = null }
  },

  /**
   * ⚠ LOADED IN `mounted`, NOT IN `fetch()` OR `asyncData()`, AND NOT BY PREFERENCE.
   * Both of those also run on the SERVER during SSR, where the browser's `fetch` does not
   * exist on Node 14 — the page would throw before it rendered. The token has the same
   * constraint: it comes from `window.localStorage`, which only exists in the browser.
   */
  async mounted () {
    this.apiToken = this.resolveApiToken()
    await Promise.all([
      this.loadFrameworks(), this.loadClients(), this.loadSessionProcess(), this.loadFirmBrand()
    ])

    // 🔴 A REFRESH COMES BACK TO THE SESSION — stage 7. `loadClients` has already set
    // `clientId` from the address if one is there, and the watcher has fetched that
    // client's sessions. An id in the address is the advisor's own last state, put there
    // by `rememberSessionInUrl`, so it is reopened rather than merely offered: they did
    // not choose to leave, the browser did.
    const fromUrl = this.$route.query.sessionId
    if (fromUrl) { await this.reopenSession(fromUrl) }
  },

  methods: {
    /**
     * The advisor firm's brand for the printed plan — item 16.2.
     *
     * ⚠ IT NEVER BLOCKS THE PAGE. A brand is decoration on a screen whose figures
     * matter, so a failure leaves the nulls in place and the plan prints with the
     * initials disc and the platform border colour. There is no error message and no
     * retry: a logo that did not load is not something an advisor can act on.
     *
     * @returns {Promise<void>} resolves once `firmBrand` holds whatever could be read.
     */
    async loadFirmBrand () {
      try {
        const res = await fetch('/api/report/firm/brand', {
          credentials: 'same-origin', headers: this.headers()
        })
        if (!res.ok) { return }
        const body = await res.json()
        this.firmBrand = {
          name: typeof body.name === 'string' ? body.name : null,
          logo: typeof body.logo === 'string' ? body.logo : null,
          colour: typeof body.colour === 'string' ? body.colour : null
        }
      } catch (e) {
        // Deliberately silent — see the note above.
      }
    },

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
     *
     * 🔴 `steps` WAS MISSING FROM THIS ORDER AND THE RAIL HAD BEEN LYING SINCE BUILD SESSION
     * WAS ADDED. `indexOf` returned -1 for it, so on Scope — the very first screen — segment
     * 2 rendered as DONE because `-1 < 0`, and on Build session segment 1 rendered as
     * untouched because nothing was less than -1. Measured on screen 2026-09-21 while making
     * the rail clickable; no test could see it and it is the kind of thing a person reads
     * past, because a green segment looks like progress rather than a mistake.
     */
    railClass (step) {
      const order = this.railStages.map(s => s.key)
      const here = order.indexOf(this.step)
      const mine = order.indexOf(step)
      return { 'is-on': mine === here, 'is-done': mine >= 0 && here >= 0 && mine < here }
    },

    /**
     * May this stage be opened from where the advisor is now?
     *
     * 🔴 A STATED JUDGEMENT, NOT A HIDDEN RULE. Any stage may be opened in any order — that
     * is the whole request — but the last four have nothing to show until a session exists:
     * they read `sessionId` to save what is typed, and opening Run session before one is
     * open would draw an empty meeting and quietly discard anything typed into it.
     *
     * @param {string} stage
     * @returns {boolean}
     */
    canOpenStage (stage) {
      return stage === 'scope' || Boolean(this.sessionId)
    },

    /**
     * Move to a stage, in whatever order the advisor asks for it.
     *
     * 🔴 LEAVING SCOPE IS NOT JUST A SCREEN CHANGE, AND THIS IS THE WHOLE POINT OF THE
     * REQUEST. Mike asked for this so he could go back when he had *"forgot something"* —
     * which means ticking another concept. Two things have to happen before anything
     * downstream reads that tick, and neither used to happen outside `startSession`:
     *
     *   1. **Its capture table has to be fetched.** `conceptVisits` skips a concept with
     *      nothing in `captures`, so a newly ticked one would be SILENTLY ABSENT from Build
     *      session, the meeting and the client's plan — the advisor ticks it, sees it
     *      confirmed on the menu, and it never appears again.
     *   2. **The scope has to be saved.** It reaches the backend with the steps, so
     *      re-scoping and then not touching the steps would leave the session's stored scope
     *      behind what is on screen.
     *
     * ⚠ THE STEPS ARE NOT RE-SEEDED. `seedSteps` only ever fills an empty list, so a return
     * visit to Scope never discards the arrangement the advisor has already built; the new
     * concept simply arrives in the tray as unplaced.
     *
     * @param {string} stage
     * @returns {Promise<void>}
     */
    async goToStage (stage) {
      if (stage === this.step || !this.canOpenStage(stage)) { return }
      if (this.step === 'scope') {
        await this.loadCaptures()
        this.seedSteps()
        await this.saveScope()
      }
      this.step = stage
    },

    /**
     * Record what is ticked, without touching the advisor's steps.
     *
     * ⚠ A FAILED SAVE DOES NOT ROLL THE SCREEN BACK, the same rule the capture boxes and the
     * step builder follow: the advisor keeps what they chose and is told it did not save.
     *
     * @returns {Promise<void>}
     */
    async saveScope () {
      if (!this.sessionId) { return }
      try {
        const res = await fetch('/api/strategy/sessions/' + this.sessionId + '/scope', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: this.headers(true),
          body: JSON.stringify({
            domains: [],
            frameworks: this.chosen,
            steps: this.planStepDefs.map(s => ({ name: s.name, items: s.items }))
          })
        })
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
      } catch (e) {
        this.error = this.$t('strategyPlanner.errors.stepsSaveFailed')
      }
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
    /**
     * Read each placed model's figures for the client's plan (item 15.23).
     *
     * From the client's ONE saved record — the same one the model's own page opens, Decision
     * B — and computed on the model's own backend route, so the plan prints exactly what the
     * advisor saw. A failed read says so on the page rather than printing an empty table.
     *
     * @returns {Promise<void>}
     */
    async loadModelPrints () {
      if (!this.clientId) { return }
      const wanted = this.placeableCards.filter(c => c.model && MODEL_PRINTS[c.model])
      await Promise.all(wanted.map(async (card) => {
        const print = MODEL_PRINTS[card.model]
        try {
          const saved = await getSavedReport(this.clientId, card.model, this.apiToken)
          if (!saved || !saved.report) {
            this.$set(this.modelPrints, card.conceptId, { contrast: null })
            return
          }
          const res = await fetch(print.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(print.request(saved.report.inputs))
          })
          const body = await res.json()
          if (!res.ok || !body || !body.success) { throw new Error('model refused') }
          this.$set(this.modelPrints, card.conceptId, { contrast: print.table(body.data) })
        } catch (e) {
          this.$set(this.modelPrints, card.conceptId, { failed: true })
        }
      }))
    },

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
          // ⚠ THIS OBJECT IS A HAND-COPIED SUBSET, so a field added to the route
          // reaches the screen only if it is named here too. The deck-image fields
          // were served, proxied and ignored for exactly that reason before anyone
          // noticed. Anything new the route serves must be named here as well.
          pageWords: Array.isArray(b.pageWords) ? b.pageWords : [],
          capture: b.capture
        })
      })
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
     * Typing on a framework card — the Saved stamp's signal, never a write.
     *
     * ⚠ It resolves the SAME id as the save above. A typing signal keyed differently from
     * the save it precedes would leave the box permanently "unsaved" on screen after it
     * had in fact saved, because the two would never cancel each other out.
     *
     * @param {{id: string, conceptId?: string}} framework
     * @param {{fieldKey: string, value: string}} payload
     */
    onFrameworkFieldTyping (framework, payload) {
      this.onFieldTyping({
        frameworkId: framework.conceptId || framework.id,
        fieldKey: payload.fieldKey,
        value: payload.value
      })
    },

    /**
     * Typing on a concept's own fill-in table — the Saved stamp's signal, never a write.
     * @param {{conceptId: string}} visit
     * @param {{fieldKey: string, value: string}} payload
     */
    onVisitFieldTyping (visit, payload) {
      this.onFieldTyping({
        frameworkId: visit.conceptId,
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
     * Several boxes on a visit, saved together.
     *
     * 🔴 THE ORG CHART BUILDER NEEDS THIS AND NOTHING ELSE DOES. Adding a role writes the
     * roster and the box it makes real, and those two have to land in the same request or a
     * reload shows a name with no row to put it on; loading Mike's 24-role example is 49
     * writes, which is inside the route's ceiling of 60 for one save.
     *
     * @param {{conceptId: string}} visit
     * @param {{entries: Array<{fieldKey: string, value: string}>}} payload
     */
    onVisitFieldsChanged (visit, payload) {
      this.onFieldsChanged((payload.entries || []).map(e => ({
        frameworkId: visit.conceptId,
        fieldKey: e.fieldKey,
        value: e.value
      })))
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

    /**
     * Build session opens on the standard process handed down to this firm, each step
     * already holding its concepts.
     *
     * 🔴 DECISION A, RULED BY MIKE 2026-09-21, AND IT REPLACES DECISION 2 OF 2026-09-20.
     * That earlier ruling opened the screen with everything unplaced and one empty step to
     * rename, so the advisor would not simply press past it. Measured afterwards, that
     * cost 5 of 5 step names typed and 42 of 42 cards placed by hand from a cold start —
     * and he rejected the screen it produced. A handed-down step now arrives WITH ITS
     * CONCEPTS ALREADY PLACED; he drags out whatever does not suit this client.
     *
     * 🔴 THE SCOPE HE TICKED IS NEVER CHANGED BY WHAT ARRIVES. Same ruling. A standard
     * step naming a concept this session did not scope contributes NOTHING — the key is
     * dropped here rather than added to `chosen`, so the handed-down process can widen a
     * session only if the advisor widens it himself on Scope session.
     *
     * ⚠ AN EMPTY STEP SURVIVES THE FILTER. Pivot's steps 4 and 5 carry no concepts at all
     * and still print on the client's agenda (Mike, 2026-09-20). Dropping a step because
     * nothing in it was scoped would delete the page this feature exists for.
     *
     * Only ever seeds an empty list, so returning to stage 2 never discards work.
     * @returns {void}
     */
    seedSteps () {
      if (this.planStepDefs.length) { return }

      const handedDown = this.sessionProcess
      if (!handedDown || !Array.isArray(handedDown.steps) || !handedDown.steps.length) {
        // Nothing to hand down — a tier may legitimately have written none, and the
        // honest fallback is the blank step the advisor names himself.
        this.planStepDefs = [{ key: 's1', name: '', items: [] }]
        return
      }

      const inScope = {}
      this.placeableCards.forEach((c) => { inScope[c.key] = true })

      this.planStepDefs = handedDown.steps.map((s, i) => ({
        key: 's' + (i + 1),
        name: s.name || '',
        items: (s.items || []).filter(k => inScope[k])
      }))
    },

    /**
     * Throw the handed-down process away for this session and start from one empty step.
     *
     * The drawing puts this one click from the process banner, and the reason is on it:
     * a standard session is a starting point and never a cage. It touches only this
     * session — the firm's own standard is untouched, which is why nothing is saved
     * anywhere but the session's own scope.
     *
     * @returns {void}
     */
    startFromBlank () {
      this.startedFromBlank = true
      this.onStepsChanged([{ key: 's1', name: '', items: [] }])
    },

    /**
     * The standard planning session this firm works to, and whose it is.
     *
     * ⚠ FAILURE IS NOT AN ERROR BANNER. A session can be run without a handed-down
     * process — that is exactly today's behaviour — so a fetch that fails leaves
     * `sessionProcess` null and `seedSteps` falls back to the blank step. Stopping the
     * advisor from opening a session because a convenience did not load would be worse
     * than the convenience being absent.
     *
     * @returns {Promise<void>}
     */
    async loadSessionProcess () {
      try {
        const res = await fetch('/api/strategy/session-process', {
          credentials: 'same-origin',
          headers: this.headers()
        })
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        const body = await res.json()
        this.sessionProcess = body.process || null
        this.processSource = body.source || null
      } catch (e) {
        this.sessionProcess = null
        this.processSource = null
      }
    },

    /**
     * The step builder emits the whole list; the page owns it and saves it with the
     * scope, so what is on screen and what is stored cannot drift apart.
     *
     * ⚠ A FAILED SAVE DOES NOT ROLL THE SCREEN BACK. The advisor keeps what he arranged
     * and is told it did not save — the same rule the capture boxes follow, and for the
     * same reason: silently undoing his work is worse than an error he can act on.
     *
     * @param {Array<{key: string, name: string, items: string[]}>} next
     * @returns {Promise<void>}
     */
    async onStepsChanged (next) {
      this.planStepDefs = next
      if (!this.sessionId) { return }
      try {
        const res = await fetch('/api/strategy/sessions/' + this.sessionId + '/scope', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: this.headers(true),
          body: JSON.stringify({
            domains: [],
            frameworks: this.chosen,
            steps: next.map(s => ({ name: s.name, items: s.items }))
          })
        })
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        this.error = ''
      } catch (e) {
        this.error = this.$t('strategyPlanner.errors.stepsSaveFailed')
      }
    },

    /**
     * Ask the AI which concepts suit this client — Decision C, stage 6.
     *
     * 🔴 IT TICKS NOTHING BY ITSELF, AND THAT IS THE RULING NOT A PRECAUTION. What comes
     * back is added to `chosen` as pre-ticks the advisor can take straight back off, and
     * `suggested` keeps the original list so the screen can show what was proposed and how
     * much of it survived. A build that assigned the reply to `chosen` and kept no record
     * would have broken Decision C(a) and C(b) at once.
     *
     * ⚠ IT NEVER UNTICKS. Concepts already chosen stay chosen even if the AI did not
     * propose them — the union, never the reply.
     *
     * @returns {Promise<void>}
     */
    async requestSuggestion () {
      if (this.suggesting || !this.clientId) { return }
      this.suggesting = true
      this.suggestState = ''
      try {
        const res = await fetch('/api/strategy/suggest', {
          method: 'POST',
          credentials: 'same-origin',
          headers: this.headers(true),
          body: JSON.stringify({
            clientId: this.clientId,
            sessionId: this.sessionId || undefined
          })
        })
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        const body = await res.json()
        const concepts = (body.suggestion && body.suggestion.concepts) || []

        this.suggested = concepts
        this.suggestState = body.reason === 'ok' ? 'ok' : body.reason

        if (concepts.length) {
          const add = concepts.map(c => c.id).filter(id => !this.chosen.includes(id))
          if (add.length) { await this.onScopeChanged(this.chosen.concat(add)) }
        }
        this.error = ''
      } catch (e) {
        this.suggestState = 'failed'
      } finally {
        this.suggesting = false
      }
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
            // A suggestion made before the session existed is written with the first
            // ticks, so Decision C(b)'s trail survives the moment the session is opened.
            scope: {
              domains: [],
              frameworks: this.chosen,
              suggestion: this.suggested.length
                ? { at: new Date().toISOString(), concepts: this.suggested }
                : undefined
            }
          })
        })
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        const body = await res.json()
        this.sessionId = body.sessionId
        // A new session starts with every page exactly as drawn.
        this.textEdits = {}
        // Stage 7: this is a new session, not a reopened one, so no banner — and the bar
        // goes now that `mostRecentSession` sees a session id.
        this.reopenedAt = null
        this.markSaved()
        this.rememberSessionInUrl()
        await this.loadCaptures()
        // 🔴 THE CAPTURES MUST BE LOADED FIRST. `placeableCards` reads them to know which
        // concepts have a fill-in table at all, and `seedSteps` filters the handed-down
        // process against that list — opened before they arrive, every step would come in
        // empty and the advisor would be handed a blank session.
        this.seedSteps()

        // 🔴 THE SEEDED STEPS ARE SAVED AT ONCE, AND WERE NOT UNTIL 2026-09-22. Only
        // `onStepsChanged` wrote them, so an advisor who accepted the handed-down session
        // unchanged had an arrangement that existed on screen and NOWHERE ELSE. Two things
        // went wrong with that, and both were found by opening the app rather than by any
        // test: the reopen bar read "0 steps named" beside a session visibly holding five,
        // which is the line an advisor judges a session by; and reopening rebuilt the steps
        // from the firm's CURRENT standard instead of restoring the ones actually run, so a
        // standard edited in between would hand back a different session without saying so.
        await this.saveScope()
        this.step = 'steps'
      } catch (e) {
        // ⚠ ITS OWN MESSAGE. The first build reused the capture-box message here, so a
        // failure to OPEN a session told the advisor a box had not saved — found by
        // pressing the button rather than by any test.
        this.error = this.$t('strategyPlanner.errors.startFailed')
      }
    },

    // ── THE DOOR — stage 7 ───────────────────────────────────────────────────────

    /**
     * That client's own sessions, newest first — Decision A.
     *
     * 🔴 THE BAR ONLY EVER APPEARS ONCE A CLIENT IS CHOSEN, WHICH IS WHY THERE IS NO
     * "finished" FLAG ANYWHERE IN THIS FILE. Mike dropped Decision C on exactly that
     * ground: the app is never choosing between people, only between one client's
     * sessions in date order, and the bar names the date. A flag somebody had to SET as a
     * meeting broke up would be forgotten, and a record confidently wrong about what is
     * finished is worse than no record at all.
     *
     * ⚠ THE ROUTE IS SCOPED TO THE FIRM, NOT THE ADVISOR. A colleague's session for the
     * same client appears here — covering for someone away is real — so the bar says
     * WHOSE it is and never pretends it is yours.
     *
     * Failure is silent by design: no bar rather than an error banner on a screen the
     * advisor has only just opened. They can still start a session, which is the state
     * the app was in before any of this existed.
     *
     * @returns {Promise<void>}
     */
    async loadClientSessions () {
      this.clientSessions = []
      this.showEarlier = false
      if (!this.clientId) { return }

      this.loadingSessions = true
      try {
        const res = await fetch(
          '/api/strategy/sessions?clientId=' + encodeURIComponent(this.clientId),
          { credentials: 'same-origin', headers: this.headers() }
        )
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        const body = await res.json()
        this.clientSessions = Array.isArray(body.sessions) ? body.sessions : []
      } catch (e) {
        this.clientSessions = []
      } finally {
        this.loadingSessions = false
      }
    },

    /**
     * "Start a new session" on the bar — Decision A's other half.
     *
     * It does NOT open a session. It puts the bar away so the advisor can get on with
     * scoping, and `Build the session` opens one exactly as it always has. Opening one
     * here would strand them: a session exists, nothing is ticked, and the screen would
     * have skipped the only stage where ticking happens.
     *
     * @returns {void}
     */
    dismissResume () {
      this.clientSessions = []
      this.showEarlier = false
    },

    /**
     * When a session was, for the bar and the earlier-sessions list.
     * @param {{startedAt: string}} session
     * @returns {string}
     */
    sessionWhen (session) {
      const when = this.storeTime(session && session.startedAt)
      if (!when) { return this.$t('strategyPlanner.resume.whenUnknown') }
      return this.$d(when, 'long')
    },

    /**
     * Read a time out of the session store — and it is NOT a plain `new Date()`.
     *
     * 🔴 THE STORE STRIPS THE `Z`, DELIBERATELY, AND THE BROWSER THEN READS UTC AS LOCAL.
     * `now()` in `server/utils/strategySessionStore.js` writes
     * `new Date().toISOString().replace('T', ' ').replace('Z', '')` so the value matches
     * MySQL's `DATETIME` column. The instant is UTC; nothing in the string says so. Passed
     * to `new Date()` in a browser it is taken as local time, and in New Zealand that is
     * **twelve hours out** — the stamp read "Saved 4:10 AM" beside a save made at 4:10 PM,
     * and a session started late in the evening would show the wrong DAY on the bar.
     *
     * Found 2026-09-22 by opening the screen. No test saw it and none could have without
     * being told what the right answer was, which is why the fix lives here, once, rather
     * than at each call site.
     *
     * ⚠ IT MUST ALSO ACCEPT A PROPER ISO STRING. With a real MySQL behind it the same
     * field can arrive already carrying its `Z`, and adding a second one would push the
     * time out again in the other direction.
     *
     * @param {string|Date} value
     * @returns {Date|null} null when there is nothing usable to show
     */
    storeTime (value) {
      if (!value) { return null }
      if (value instanceof Date) { return isNaN(value.getTime()) ? null : value }
      const text = String(value).trim()
      // Already carries a zone (trailing Z, or +hh:mm / -hh:mm) — parse it as it stands.
      const zoned = /(?:Z|[+-]\d{2}:?\d{2})$/.test(text)
      const iso = zoned ? text : text.replace(' ', 'T') + 'Z'
      const when = new Date(iso)
      return isNaN(when.getTime()) ? null : when
    },

    /**
     * What is in a session, in one line — the whole basis on which an advisor decides
     * whether this is the meeting they are continuing.
     *
     * 🔴 THIS LINE IS WHY THERE IS NO "finished" FLAG. Mike dropped Decision C because the
     * date and these counts already tell an advisor what they need. Do not reduce it.
     *
     * @param {object} session
     * @returns {string}
     */
    sessionFacts (session) {
      const scope = (session && session.scope) || {}
      const name = session && session.advisorName
      const concepts = (scope.frameworks || []).length
      const steps = (scope.steps || []).length
      // ⚠ EACH COUNT IS PLURALISED ON ITS OWN. The first build read "1 concepts scoped",
      // because the whole line was one `$t` with the numbers dropped into it — found by
      // opening the screen on 2026-09-22, which is where a wrong word is always found.
      return this.$t('strategyPlanner.resume.facts', {
        concepts: this.$tc('strategyPlanner.resume.conceptsScoped', concepts, { count: concepts }),
        steps: this.$tc('strategyPlanner.resume.stepsNamed', steps, { count: steps }),
        who: name
          ? this.$t('strategyPlanner.resume.startedBy', { name })
          : this.$t('strategyPlanner.resume.startedByUnknown')
      })
    },

    /**
     * Reopen one of this client's sessions — the whole point of stage 7.
     *
     * 🔴 NOTHING HERE IS NEW MACHINERY. `GET /sessions/:id` has returned the session, its
     * entries and its timeline since the store was written, and no screen had ever called
     * it. The session already holds the ticks, the advisor's own named steps and which
     * concepts sit in each, the AI's suggestion, every typed box and the field-level
     * timeline. This puts them back on the screen.
     *
     * ⚠ THE CAPTURES MUST BE LOADED BEFORE THE STEPS ARE RESTORED, for the same reason
     * `startSession` loads them first: `placeableCards` reads them to know which concepts
     * have a fill-in table at all, and a step restored before they arrive would come back
     * empty — the advisor's own arrangement, silently thrown away.
     *
     * @param {number|string} id the session to reopen
     * @returns {Promise<void>}
     */
    async reopenSession (id) {
      this.error = ''
      this.loading = true
      try {
        const res = await fetch('/api/strategy/sessions/' + encodeURIComponent(id), {
          credentials: 'same-origin',
          headers: this.headers()
        })
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        const body = await res.json()
        const session = body.session || {}
        const scope = session.scope || {}

        this.sessionId = session.id
        this.chosen = Array.isArray(scope.frameworks) ? scope.frameworks.slice() : []
        this.suggested = (scope.suggestion && Array.isArray(scope.suggestion.concepts))
          ? scope.suggestion.concepts.slice()
          : []
        this.textEdits = (scope.edits && typeof scope.edits === 'object') ? scope.edits : {}

        // Every typed box, keyed exactly as the screen keys them.
        const entries = {}
        ;(body.entries || []).forEach((e) => {
          entries[e.frameworkId + '::' + e.fieldKey] = e.value
        })
        this.entries = entries

        await this.loadCaptures()

        // The advisor's own steps, restored as saved. `seedSteps` is NOT called: it fills
        // an empty list from the firm's standard, which would overwrite the arrangement
        // this session already holds. A session saved before the step builder existed has
        // no steps at all, and only then does the standard seed it.
        const savedSteps = Array.isArray(scope.steps) ? scope.steps : []
        this.planStepDefs = savedSteps.length
          ? savedSteps.map((s, i) => ({ key: 's' + (i + 1), name: s.name || '', items: (s.items || []).slice() }))
          : []
        if (!this.planStepDefs.length) { this.seedSteps() }

        this.reopenedAt = this.landingConcept(body.timeline)
        this.step = this.reopenedAt ? 'run' : 'scope'
        this.markSaved(session.lastOpenedAt)
        this.rememberSessionInUrl()
      } catch (e) {
        this.error = this.$t('strategyPlanner.errors.reopenFailed')
      } finally {
        this.loading = false
      }
    },

    /**
     * Where a reopened session lands — Decision B, ruled by Mike 2026-09-22: straight back
     * to the concept the advisor was working on, not to the beginning.
     *
     * 🔴 THE STAGE ITSELF IS NOT STORED ANYWHERE, AND DOES NOT NEED TO BE. The timeline
     * records the FIELD and CONCEPT last open — `frameworkId`, `fieldKey`, `openedAt` —
     * and a concept with an open field can only ever have been open on Run session. A
     * claim that the timeline "records where they were" was corrected before this was
     * drawn; do not go looking for a stage column.
     *
     * A session that was scoped and never run has no timeline, and then the honest
     * landing is Scope — which is where its advisor actually stopped.
     *
     * @param {Array<{frameworkId: string, openedAt: string}>} timeline newest last
     * @returns {{conceptId: string, name: string}|null}
     */
    landingConcept (timeline) {
      const rows = Array.isArray(timeline) ? timeline : []
      for (let i = rows.length - 1; i >= 0; i--) {
        const id = rows[i] && rows[i].frameworkId
        if (!id) { continue }
        // Only a concept still in scope can be landed on. One unticked since has no card
        // to open, and landing on nothing is worse than landing at the beginning.
        if (!this.chosen.includes(id)) { continue }
        // ⚠ MATCH ON `conceptId` AND READ `name`. The first build matched `key` — which
        // for an approved framework card is `fw-<id>`, never the concept id the timeline
        // records — and read `label`, which no card has. Both failed silently to the id,
        // so the banner read "Reopened where you left off — porters-5-forces". Found by
        // opening the screen; nothing in 13,000 assertions was looking at that word.
        const card = this.placeableCards.find(c => c.conceptId === id)
        return { conceptId: id, name: (card && card.name) || id }
      }
      return null
    },

    /**
     * Put the session in the address bar, so a refresh comes back to it.
     *
     * Invisible plumbing, and the drawing says so: it decides nothing, it simply means the
     * one thing an advisor does by reflex — reload the page — stops costing them the
     * session. `replace` rather than `push`, so the back button still leaves the app
     * rather than walking backwards through session ids.
     *
     * @returns {void}
     */
    rememberSessionInUrl () {
      if (!process.client || !this.sessionId) { return }
      const q = Object.assign({}, this.$route.query, {
        sessionId: String(this.sessionId),
        clientId: this.clientId || undefined
      })
      this.$router.replace({ query: q }).catch(() => { /* same route, nothing to do */ })
    },

    /**
     * The advisor is typing — Decisions D and E. NOTHING IS SENT HERE.
     *
     * 🔴 THIS IS THE HALF THAT MUST NEVER BECOME A SAVE. It runs on every keystroke, and
     * its only jobs are to say "unsaved" honestly and to start the pause timer. The
     * network call happens once, in `flushPending`, after the advisor stops.
     *
     * @param {{frameworkId: string, fieldKey: string, value: string}} payload
     * @returns {void}
     */
    onFieldTyping (payload) {
      if (!this.sessionId) { return }
      this.pendingEntry = payload
      this.saveState = 'unsaved'
      if (this.autoSaveTimer) { clearTimeout(this.autoSaveTimer) }
      this.autoSaveTimer = setTimeout(() => { this.flushPending() }, AUTOSAVE_PAUSE_MS)
    },

    /**
     * Write out the open box, if it holds anything not yet saved.
     *
     * Called by the pause timer, by `Save session`, and before leaving the session — the
     * three moments at which an unsaved box would otherwise be at risk.
     *
     * @returns {Promise<void>}
     */
    async flushPending () {
      if (this.autoSaveTimer) { clearTimeout(this.autoSaveTimer); this.autoSaveTimer = null }
      const pending = this.pendingEntry
      if (!pending) { return }
      this.pendingEntry = null
      await this.onFieldsChanged([pending])
    },

    /**
     * `Save session` — Mike's request, 2026-09-22: "i should also be able to 'save
     * session' at any time and return to continue."
     *
     * ⚠ IT IS NOT THEATRE, AND IT WOULD HAVE BEEN BEFORE THAT DAY'S FIX. Answers now save
     * when the advisor leaves a box or pauses, so the box they are TYPING IN genuinely is
     * not written out yet — this commits it, and the scope with it, and stamps the time.
     *
     * @returns {Promise<void>}
     */
    async saveSessionNow () {
      if (!this.sessionId) { return }
      this.saveState = 'saving'
      await this.flushPending()
      await this.saveScope()
      if (!this.error) { this.markSaved() }
    },

    /**
     * Record a successful save for the stamp.
     * @param {string} [at] an ISO time to use instead of now (a reopened session's own)
     * @returns {void}
     */
    markSaved (at) {
      // ⚠ `storeTime`, never `new Date()` — the store's own format has no timezone on it.
      // See the note there; this read "Saved 4:10 AM" for a 4:10 PM save until 2026-09-22.
      this.lastSavedAt = (at ? this.storeTime(at) : null) || new Date()
      this.saveState = 'saved'
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
     *
     * 🔴 WHAT MAKES THAT TRUE IS THE `lazy` PROP ON THE TWO CAPTURE INPUTS, AND FROM THE
     * DAY THIS COMMENT WAS WRITTEN UNTIL 2026-09-22 IT WAS NOT THERE. Buefy's Input emits
     * `input` from the NATIVE input event unless `lazy` is set, so every character typed
     * into a box arrived here as its own save: one `PUT /entries` and one database write
     * each, roughly 200 for a 200-character answer. They are also fired without awaiting
     * one another, so on a slow line an early short value can land after a later one and
     * store a half-typed sentence. Remove `lazy` from StrategyConceptCapture.vue or
     * StrategyCaptureBox.vue and all of that comes back, silently and invisibly on screen.
     * tests/unit/strategyCaptureSaveRate.test.js exists to stop that.
     *
     * @param {{frameworkId: string, fieldKey: string, value: string}} payload
     */
    async onFieldChanged (payload) {
      await this.onFieldsChanged([payload])
    },

    /**
     * One or more boxes, saved in a single request.
     *
     * ⚠ A FAILED SAVE DOES NOT ROLL THE SCREEN BACK — the same rule the step builder
     * follows, and for the same reason: the advisor keeps what they typed and is told it did
     * not save, because silently undoing their work mid-session is worse than an error they
     * can act on.
     *
     * @param {Array<{frameworkId: string, fieldKey: string, value: string}>} payload
     */
    async onFieldsChanged (payload) {
      const entries = Array.isArray(payload) ? payload : []
      if (!this.sessionId || !entries.length) { return }
      this.error = ''
      // Optimistic: the advisor sees their own words stay put while the save runs.
      entries.forEach((e) => {
        this.$set(this.entries, e.frameworkId + '::' + e.fieldKey, e.value)
      })

      // 🔴 THE BOX IS NO LONGER PENDING ONCE IT IS ON ITS WAY. Without this, leaving a box
      // saves it and the pause timer then saves the identical value a second later — two
      // writes for one answer, which is a smaller version of the defect this replaced.
      if (this.pendingEntry && entries.some(e =>
        e.frameworkId === this.pendingEntry.frameworkId && e.fieldKey === this.pendingEntry.fieldKey)) {
        this.pendingEntry = null
        if (this.autoSaveTimer) { clearTimeout(this.autoSaveTimer); this.autoSaveTimer = null }
      }
      this.saveState = 'saving'

      try {
        const res = await fetch('/api/strategy/sessions/' + this.sessionId + '/entries', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: this.headers(true),
          body: JSON.stringify({ entries })
        })
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        this.markSaved()
      } catch (e) {
        this.error = this.$t('strategyPlanner.errors.saveFailed')
        // ⚠ THE STAMP MUST NOT SAY "Saved" AFTER A FAILURE. Decision E is about the stamp
        // telling the truth; a green tick over a save that did not happen is the exact lie
        // it exists to prevent. The words are still on screen — a failed save never rolls
        // the advisor back — so "unsaved" is the accurate word for them.
        this.saveState = 'unsaved'
      }
    },

    /**
     * Save the advisor's wording for one block of a concept page — item 15.25, approved to
     * build by Mike 2026-09-25. The drawing has already measured that the words fit; an
     * edit that does not fit never reaches here (his ruling the same day).
     *
     * 🔴 THE EDIT BOX STAYS OPEN UNTIL THIS SAYS IT SAVED. `done(false)` leaves the advisor's
     * words in the box with the page's save-failed message above, so a failure can never
     * look like a finished edit.
     *
     * @route PUT /api/strategy/sessions/:id/edits
     * @param {{conceptId: string, sheet: number, block: string, text: (string|null)}} edit
     *   text null puts back the original
     * @param {function(boolean): void} done
     */
    async onTextEdited (edit, done) {
      const finish = typeof done === 'function' ? done : () => {}
      if (!this.sessionId || !edit) { finish(false); return }
      this.error = ''
      this.saveState = 'saving'
      try {
        const res = await fetch('/api/strategy/sessions/' + this.sessionId + '/edits', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: this.headers(true),
          body: JSON.stringify(edit)
        })
        if (!res.ok) { throw new Error('HTTP ' + res.status) }
        const sheetKey = edit.conceptId + '#' + edit.sheet
        const sheet = Object.assign({}, this.textEdits[sheetKey] || {})
        if (edit.text) { sheet[edit.block] = edit.text } else { delete sheet[edit.block] }
        const next = Object.assign({}, this.textEdits)
        if (Object.keys(sheet).length) { next[sheetKey] = sheet } else { delete next[sheetKey] }
        this.textEdits = next
        this.markSaved()
        finish(true)
      } catch (e) {
        this.error = this.$t('strategyPlanner.errors.saveFailed')
        this.saveState = 'unsaved'
        finish(false)
      }
    },

    /**
     * Hand the client their plan — the assembled document, and nothing else.
     *
     * The browser writes the PDF. That is not a shortcut: no PDF library runs on the
     * locked Node 14.15 (Business Performance Report P7, ruled 2026-09-06), and using
     * the browser's own dialog means a client's session is never sent anywhere to be
     * rendered. It is also what Mike's ruling of 2026-09-17 requires — "there is ONE
     * artefact, never two formats" — so what prints is the document already on screen.
     *
     * The body class is what separates the document from the screen around it: the
     * heading, the five-stage rail and the coverage wheel are the advisor's, not the
     * client's. See the UNSCOPED print block at the foot of this file for why it cannot
     * be a scoped rule. It is added for the duration of this press alone, so an ordinary
     * Ctrl+P anywhere in the app behaves exactly as it did before.
     *
     * HONEST LIMIT: the advisor saves the file themselves, so nothing here holds a copy
     * of what was actually given to the client, and the margins depend on their own
     * browser's print settings.
     *
     * @returns {void}
     */
    printPlan () {
      if (!process.client || typeof window === 'undefined' || !window.print) { return }
      document.body.classList.add('sp-printing')
      try {
        window.print()
      } finally {
        // Always removed, including if print() throws: a page left in printing mode
        // renders blank to the advisor still sitting in front of it.
        document.body.classList.remove('sp-printing')
      }
    }
  }
}
</script>

<style scoped>
.sp { max-width: 1120px; margin: 0 auto; padding: 1.4rem 1.1rem 4rem; position: relative; }
/* 🔴 THE PRIMARY BUTTON SITS IN THE SAME PLACE ON ALL FIVE SCREENS, and until 2026-09-21 it
   did not. Measured across the stages it wandered 166px sideways — 970, 1136, 1050, 1088 —
   and dropped 61px between Scope and everything after it, so the button an advisor was about
   to press was never twice in the same place. Mike found it by clicking through.

   Two causes, and both are fixed here. `.sp-top-actions` had NO rule at all, so its buttons
   sat wherever their own widths left them: "Build the session" ended 123px short of the page
   edge because the client picker shares that row, while the other three ended flush with it.
   And `align-items: flex-end` hung the row off the BOTTOM of a header that is three lines
   deep on Scope and one line everywhere else.

   ⚠ DO NOT RESTORE `flex-end` TO "line the button up with the title". That is what produced
   the 61px drop, and no test can see it — a button in the wrong place renders perfectly. */
/* -- THE AGREED FRAME AROUND EVERY SCREEN --
   Mike's ruling, 2026-09-22: "i dont care about the page size until it comes to printing.
   so long as the border is same distance from outer edge, has the logo in bottom left as
   agreed." `container-type` is what lets the frame take its inset and thickness from the
   width, so the border stays the same distance from the edge however tall a stage grows. */
.sp-sheet {
  position: relative;
  container-type: inline-size;
  background: #fff;
  /* clear of the bars - his inset 0.542% + his bar 0.986% - then his own text margin */
  padding: 5.5cqw 4.972% 8cqw;
}

/* The mark, in the gap his foot leaves. StrategyPlanMark places itself for a printed
   sheet at top: 90.025%, which on a stretching page is nowhere in particular, so here it
   is anchored to the foot instead - his own x, his own box, standing on the bar. */
.sp-sheet-mark.spm {
  top: auto;
  bottom: 0.2cqw;
  left: 6.875%;
  width: 9.639%;
  height: 5.236cqw;
  z-index: 1;
}
.sp-sheet >>> .sp-sheet-mark .spm-disc { height: 80%; font-size: 1.6cqw; }

/* 🔴 A VIOLET BUTTON BESIDE A FIRM-COLOURED RAIL IS THE INCONSISTENCY ITSELF. Buefy
   ships its own #7957D5 for `is-primary` and the planner loaded it unmodified, so the
   stage rail followed the firm while every button beside it did not. Within the planner
   they take the firm's colour, from the same custom property everything else reads.
   ⚠ Scoped to the planner deliberately — the same violet is on 84 files app-wide and
   correcting it everywhere is item 16.1, which is its own job. */
.sp >>> .button.is-primary {
  background-color: var(--sp-firm, #0070c0);
  border-color: var(--sp-firm, #0070c0);
  color: #fff;
}
.sp >>> .button.is-primary.is-outlined {
  background-color: transparent;
  color: var(--sp-firm, #0070c0);
}
.sp >>> .button.is-primary:hover:not([disabled]),
.sp >>> .button.is-primary:focus:not([disabled]) {
  background-color: var(--sp-firm, #0070c0);
  border-color: var(--sp-firm, #0070c0);
  filter: brightness(0.92);
}

.sp-top {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.sp-top-text { flex: 1 1 320px; min-width: 0; }
.sp-top-actions {
  margin-left: auto;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.sp-eyebrow {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--sp-firm, #0070c0);
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
/* Each segment is a real button now (Mike's request, 2026-09-21), so it resets the
   browser's own button chrome and then keeps exactly the look it had as a div. */
.sp-rail-step {
  flex: 1 1 0;
  padding: 0.55rem 0.7rem;
  font-size: 0.75rem;
  font-family: inherit;
  text-align: center;
  color: #5b6f8a;
  border: 0;
  border-right: 1px solid #d5e1ee;
  background: transparent;
  cursor: pointer;
}
.sp-rail-step:last-child { border-right: 0; }
.sp-rail-step.is-on { background: var(--sp-firm, #0070c0); color: #fff; font-weight: 600; }
.sp-rail-step.is-done { background: rgba(76, 165, 45, 0.1); color: #2f7d32; font-weight: 600; }
/* It has to LOOK clickable, or an advisor who was told they can jump about still will not. */
.sp-rail-step:hover:not(:disabled):not(.is-on) { background: #e3eefa; color: #002b64; }
.sp-rail-step:focus-visible { outline: 2px solid var(--sp-firm, #0070c0); outline-offset: -2px; }
/* Before a session is open there is nothing behind the last four to show. */
.sp-rail-step:disabled { cursor: default; opacity: 0.45; }

.sp-card { margin-bottom: 1.1rem; }
.sp-section { margin: 1.4rem 0; }
.sp-h { font-size: 0.85rem; font-weight: 700; margin: 0 0 0.2rem; color: #002b64; }
.sp-cap { font-size: 0.8rem; color: #5b6f8a; margin: 0 0 0.8rem; max-width: 80ch; }

/* The process banner, from the approved drawing: what arrived, whose it is, and the
   way out of it. It sits directly above the step builder and shares its top border. */
/* ── THE DOOR — stage 7, from design/mockups/strategy-session-resume.html ──────────
   The bar an advisor meets on arriving at a client they have worked with before, the
   list of that client's earlier sessions behind its link, the session's own Save
   control with the stamp that Decisions D and E put beside it, and the banner naming
   where a reopened session landed (Decision B). */
.sp-resume {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  padding: 0.8rem 1rem;
  margin-bottom: 1rem;
  border: 1px solid #9fd0f5;
  border-left: 4px solid var(--sp-firm, #0070c0);
  border-radius: 10px;
  background: linear-gradient(90deg, #eef7ff, #fbfdff);
}
.sp-resume-main { flex: 1 1 21rem; min-width: 0; }
.sp-resume-t { color: #002b64; font-weight: 700; font-size: 0.95rem; }
.sp-resume-facts { color: #5b6f8a; font-size: 0.8rem; margin-top: 0.15rem; }
.sp-resume-acts { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
.sp-resume-more { font-size: 0.8rem; color: var(--sp-firm, #0070c0); font-weight: 600; }

.sp-slist { border: 1px solid #d5e1ee; border-radius: 10px; margin-bottom: 1rem; overflow: hidden; }
.sp-srow {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
  padding: 0.6rem 0.9rem;
  border-bottom: 1px solid #d5e1ee;
}
.sp-srow:last-child { border-bottom: 0; }
.sp-swhen { flex: 0 0 11rem; color: #002b64; font-weight: 600; font-size: 0.85rem; }
.sp-swhat { flex: 1 1 15rem; color: #5b6f8a; font-size: 0.8rem; }

.sp-sessbar { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; margin-bottom: 0.9rem; }
.sp-sessbar-spacer { flex: 1 1 2rem; }

/* 🔴 THE STAMP IS ALLOWED TO SAY SOMETHING OTHER THAN "Saved" — Decision E. The dot is
   coloured by state for exactly that reason: a green tick beside a sentence the advisor
   has just typed and not yet left would be a lie at the one moment it matters. */
.sp-saved { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; font-weight: 600; white-space: nowrap; }
.sp-saved::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: currentColor; flex: none; }
.sp-saved.is-saved { color: #1d6b2b; }
.sp-saved.is-saving { color: #5b6f8a; }
.sp-saved.is-unsaved { color: #a76b00; }

.sp-reopened {
  padding: 0.6rem 0.9rem;
  margin-bottom: 0.9rem;
  border: 1px solid #a8dcb4;
  border-left: 4px solid #4ca52d;
  border-radius: 10px;
  background: #f3fbf5;
  color: #1d6b2b;
  font-size: 0.85rem;
}

.sp-proc {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  padding: 0.8rem 1rem;
  border: 1px solid #d5e1ee;
  border-bottom: 0;
  border-radius: 8px 8px 0 0;
  background: linear-gradient(90deg, #f3f9ff, #fff);
}
.sp-proc-main { flex: 1 1 20rem; min-width: 0; }
.sp-proc-t { display: block; color: #002b64; font-size: 0.95rem; }
.sp-proc-s { display: block; color: #5b6f8a; font-size: 0.8rem; }

/* The provenance badge. Decision C: an inherited process must never be mistaken for
   one this firm authored, so it is stated rather than implied by its absence. */
.sp-proc-who {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #1d6b2b;
  background: #f3fbf5;
  border: 1px solid #a8dcb4;
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
  white-space: nowrap;
}

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
  color: var(--sp-firm, #0070c0);
  margin-top: 0.55rem;
}
.sp-plan-dl dd { margin: 0.1rem 0 0; font-size: 0.85rem; color: #002b64; }

@media (max-width: 860px) {
  .sp-rail { flex-wrap: wrap; }
  .sp-rail-step { flex: 1 1 45%; }
}
</style>

<!--
  UNSCOPED, DELIBERATELY — the only rules on this page that are, and it is structural
  rather than a shortcut.

  Printing ONE section of a bigger screen means hiding everything around it, and
  everything around it belongs to other components. A scoped rule cannot reach them:
  Vue rewrites a scoped selector to match only this component's own elements, so a rule
  written against `body` compiles to `body[data-v-hash]` and matches nothing at all.
  That is not a theory — it shipped, in CourseBuilder's certificate, and
  `tests/unit/scopedStylesCannotReachOutside.test.js` now fails the build for it.

  `visibility`, not `display`, for the general sweep: display:none on an ancestor cannot
  be undone further down, so the document — nested inside Nuxt's own wrappers — could
  never be shown again. visibility can be turned back on, which is what makes this work.

  Everything is gated behind `body.sp-printing`, which exists only for the duration of
  the advisor's own press, so an ordinary Ctrl+P anywhere in the app is unaffected.
-->
<style>
/* 🔴 A4 LANDSCAPE, NAMED — Mike's ruling, 2026-09-21: "the majority of pages to be
   printed will be A4 size." Landscape because the document is a deck (his 2026-09-17
   ruling: "it is his deck page for page when printed"), and every one of the 33 concept
   drawings is a landscape 1500x844.

   ⚠ THIS DELIBERATELY DIFFERS FROM THE SIX REPORT SCREENS, and the difference is the
   point rather than drift. Business Performance Report P7 sets orientation and NEVER a
   paper size, so an advisor on US Letter is not overridden — right for a report, which
   reflows to whatever sheet it is given. This document cannot reflow: `.spd-page` is a
   fixed A4-landscape frame, so if the sheet is not A4 the page no longer matches it.
   The shape and the paper have to be named together or neither is worth naming.
   ⚠ HONEST LIMIT: an advisor who chooses Letter in their own print dialog gets the
   document scaled to fit. Nothing is lost or cropped; the margins simply grow.

   `@page` has no selector and cannot be gated behind the body class. It rides in this
   page's own stylesheet, so it reaches /strategy-planner and no other route. */
@page { size: A4 landscape; margin: 0; }

@media print {
  body.sp-printing * { visibility: hidden !important; }
  body.sp-printing .spd,
  body.sp-printing .spd * { visibility: visible !important; }

  /* A visibility:hidden element still occupies its space, so the heading, the stage
     rail and the coverage wheel would push blank sheets ahead of and behind the
     client's document. They are siblings, not ancestors, so collapsing them outright
     cannot take the document with them.
     🔴 THE COVERAGE WHEEL IS THE ADVISOR'S, NOT THE CLIENT'S. It appears nowhere in
     the approved drawing (design/mockups/strategy-plan-output.html §3), which is the
     whole of the reason it is not in the printed plan. */
  body.sp-printing .sp > *:not(.spd) { display: none !important; }

  /* The page's reading width and its gutters are for a screen. A printed sheet has
     @page margins of its own, and keeping both would inset every slide twice. */
  body.sp-printing .sp { max-width: none; margin: 0; padding: 0; }

  /* The 18px that separates the pages while scrolling would otherwise print as a band
     at the top of every sheet after the first. */
  body.sp-printing .spd { gap: 0; }

  /* 🔴 A RATIO IS THE WRONG TOOL ON PAPER, AND IT DOUBLED THE DOCUMENT. Measured
     2026-09-21: with the screen's `aspect-ratio: 297/210` left in force, each page
     computed to EXACTLY the height of the A4 sheet — and a box exactly as tall as its
     sheet rounds onto a second one. 25 document pages printed as 50 sheets, every other
     one blank. Nothing looked wrong on screen, and no test could see it.

     On paper the sheet is the authority, so the page gets a floor in millimetres and no
     ratio: 208mm inside a 210mm sheet. A page with little on it fills its sheet and
     stops; one with too much still grows and splits, which is visible and honest rather
     than silently cropped. `border-box` is stated rather than inherited, because the
     padding is what the 2mm of clearance would otherwise be spent on.

     GATED, like everything else here, so an ordinary Ctrl+P is left exactly as it was —
     these millimetres are only correct on the A4 sheet the `@page` above asks for. */
  body.sp-printing .spd-page {
    aspect-ratio: auto;
    box-sizing: border-box;
    min-height: 208mm;
  }

  /* 🔴 A TEACHING PAGE HAS TO FIT THE SHEET — Mike, 2026-09-22: "i also required the
     pdf to print in a4 as that is the most common format - stick to it and make it
     work".
     Measured at true A4 landscape (1123x794px = 297x210mm), NOT at a screen viewport,
     which inflates every millimetre and is how this was missed: the page came to
     259.2mm against a 210mm sheet — 4.2 for the kind, 14.8 the heading, 155 the
     concept drawing, 59.3 the prompts, 13.8 padding. It split across two sheets, so a
     client's 13-page plan printed as 14 with one concept's prompts orphaned.

     THE DRAWING GIVES WAY, NOT THE TEACHING CONTENT. The page becomes a flex column
     with a hard ceiling of one sheet, and the concept graphic is the only thing allowed
     to shrink. An SVG with a viewBox letterboxes inside whatever box it is given, so it
     scales and centres — it is never distorted and never cropped, which is the
     distinction `StrategyPlanDocument` deliberately draws about not clipping his
     content. A concept with fewer prompts leaves its drawing larger, because the space
     is shared rather than fixed. */
  body.sp-printing .spd-page.is-teach {
    max-height: 208mm;
    display: flex;
    flex-direction: column;
  }

  /* ⚠ THE WRAPPER SHRINKING IS NOT THE DRAWING SHRINKING. Giving the wrapper `flex`
     and the SVG `width:100%;height:100%` capped the PAGE and left the drawing at its
     natural size, so his diagram printed straight over the prompts beneath it. The
     drawing has to be driven from its HEIGHT — `height:100%` against a flex item whose
     height the ceiling above makes definite, with `width:auto` so its own viewBox
     ratio sets the width. It scales and centres; it is never squashed or cropped. */
  /* `height:100%` on the SVG did nothing, because a percentage cannot resolve against a
     flex item sized from its own content — the drawing stayed at 155mm and printed over
     the prompts. `flex-basis: 0` makes the wrapper's height come from the flex line
     rather than from its content, and an absolutely positioned SVG then has a definite
     box to fill. Its viewBox letterboxes it inside that box: scaled and centred, never
     squashed and never cropped. */
  body.sp-printing .spd-page.is-teach .scg {
    flex: 1 1 0%;
    min-height: 0;
    position: relative;
    overflow: hidden;
  }

  body.sp-printing .spd-page.is-teach .scg svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
}
</style>
