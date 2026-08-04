<template lang="pug">
section.firm-manager-hub.section
  .container.is-fluid
    //- Header
    .level.mb-5
      .level-left
        div
          p.title.is-4 Firm Manager Hub
          p.subtitle.is-6.has-text-grey {{ firmId }}
      .level-right(style="gap:12px;display:flex;align-items:center;")
        a.button.is-light.is-small(href="/advisor") ← Back to Advisor

    //- Main tabs
    b-tabs(ref="hubTabs" v-model="activeTab" type="is-boxed" animated)
      //- ── Tab: Domain Support (FIRM-EDITABLE-TABLES-PLAN.md Phase 2, §0.6) ──
      //- The four-column material tables the advisors' AI reads. The former PDF
      //- "Decision Frameworks" (Document Library) tab was removed 2026-07-27
      //- (owner decision); its FirmDocuments component + document/storage routes
      //- remain in the codebase but dormant (logged in ACTIONS for later deletion).
      b-tab-item(label="Domain Support")
        firm-domain-support(:api-token="apiToken")

      //- ── Tab: Logic Tables (FIRM-EDITABLE-TABLES-PLAN.md Phase 3, §0.6) ──
      //- The IF→THEN branch tables. Read-only preview (Slice A); Save + the
      //- prompt-fencing safeguard land in Slice B.
      b-tab-item(label="Logic Tables")
        firm-logic-tables(:api-token="apiToken")

      //- ── Logic-Lab — REMOVED FROM THE HUB 2026-08-02 (owner instruction) ──
      //- The phrase-testing screen (FirmLogicLab.vue) was tried here and rejected:
      //- its wording-change half compares against 470 branch conditions and lab
      //- cases, so it answered "nothing would change" to a real six-phrase edit —
      //- reassurance it had no basis for. Mike: "I want that logic lab page to be
      //- deleted. I don't wanna see it anymore."
      //-
      //- NOT DELETED FROM THE REPO, deliberately (no-silent-parking): the
      //- component, its 22 tests, both read-only routes and the approved green/red
      //- mockup are all still here and may be revived. See ACTIONS.md
      //- #logic-lab-phrase-testing-parked for what works, what does not, and what
      //- fixing it would take.
      //-
      //- The name "Logic-Lab" is now carried by the Decision Logic page below.

      //- ── Tab: Logic-Lab — the DECISION LOGIC page ───────────────────
      //- Built 2026-08-03 from design/mockups/decision-logic-map-mockup.html,
      //- the artefact Mike approved 2026-08-02. It is the read-only map he
      //- asked for: what decides a recommendation, which parts of it this firm
      //- can change, and which one to change for the outcome they want.
      //- Its one write path is the near-miss Move/Copy, which reuses the
      //- existing distinction endpoints and confirms first.
      b-tab-item(label="Logic-Lab" icon="map-search")
        //- `distinctions-changed`: the Logic-Lab page wrote to this firm's
        //- distinctions (the attach button, or a near-miss Move/Copy). No
        //- payload — re-read from the server, so this tab can never hold a
        //- version the store does not have.
        firm-decision-logic(
          :api-token="apiToken"
          @go-to="goToTab"
          @distinctions-changed="loadFirmDistinctions"
        )

      //- ── Tab: Advisory Staircase ────────────────────────────────────
      //- Body lives in its own component. It was the whole-config editor here
      //- until 2026-07-31; every step is now a decision (switch off / edit /
      //- reset / add your own) through the one firm-editable mechanism.
      b-tab-item(label="Advisory Staircase" icon="stairs")
        firm-staircase(:api-token="apiToken")

      //- ── Templates & Videos — HIDDEN 2026-07-27 (owner decision) ──────
      //- Not wired to anything usable in UAT (needs Firm-Manager MySQL); shown
      //- as a dead tab was misleading. Kept dormant (v-if="false") rather than
      //- deleted — it's a real feature the master team may still want. Logged in
      //- ACTIONS alongside the Decision Frameworks removal.
      b-tab-item(label="Templates & Videos" icon="play-box-multiple" v-if="false")
        .columns
          //- Template Library column
          .column
            p.has-text-weight-semibold.mb-3 Template library

            //- Current status
            .box.mb-4
              .has-text-centered.py-3(v-if="loadingTemplateImport")
                b-loading(:is-full-page="false" :active="true")
              template(v-else)
                .mb-3(v-if="templateImport.hasImport")
                  b-tag(type="is-success is-light" size="is-medium") {{ templateImport.templateCount }} templates loaded
                  p.is-size-7.has-text-grey.mt-1
                    | Version {{ templateImport.history[0] && templateImport.history[0].version }}
                    | &middot; saved {{ formatDate(templateImport.history[0] && templateImport.history[0].created_at) }}
                .mb-3(v-else)
                  b-tag(type="is-warning is-light" size="is-medium") Using platform default
                  p.is-size-7.has-text-grey.mt-1 No firm-specific template library imported yet

                //- Upload
                b-field(grouped)
                  b-field(expanded label="Import JSON from master app")
                    b-upload(v-model="templateImportFile" accept=".json" expanded)
                      a.button.is-light.is-fullwidth
                        b-icon(icon="upload")
                        span {{ templateImportFile ? templateImportFile.name : 'Choose JSON file…' }}
                  b-field(:label="'\u00a0'")
                    b-button(
                      type="is-primary"
                      :loading="importingTemplates"
                      :disabled="!templateImportFile"
                      @click="submitTemplateImport"
                    ) Import

                b-button(
                  v-if="templateImport.hasImport"
                  type="is-danger is-light"
                  size="is-small"
                  icon-left="restore"
                  @click="confirmResetTemplates"
                ) Reset to platform default

            //- Version history
            div(v-if="templateImport.history && templateImport.history.length > 1")
              p.has-text-weight-semibold.mb-2 Import history
              b-table(:data="templateImport.history" :hoverable="true" size="is-small")
                b-table-column(v-slot="{ row }" field="version" label="Version" width="80")
                  | v{{ row.version }}
                  b-tag(v-if="row.is_active" type="is-success is-light" size="is-small") current
                b-table-column(v-slot="{ row }" field="created_at" label="Imported") {{ formatDate(row.created_at) }}
                b-table-column(v-slot="{ row }" label="" width="80")
                  b-button(
                    v-if="!row.is_active"
                    size="is-small"
                    type="is-info is-light"
                    @click="restoreTemplateVersion(row)"
                  ) Restore

          //- Videos column
          .column
            p.has-text-weight-semibold.mb-3 Video links
            .box.mb-4
              b-field(label="Domain")
                b-select(v-model="newVideo.domain" placeholder="Select domain" expanded)
                  option(v-for="d in domains" :key="d" :value="d") {{ d }}
              b-field(label="Title")
                b-input(v-model="newVideo.title" placeholder="e.g. Cash Flow Masterclass")
              b-field(label="URL (HTTPS)")
                b-input(v-model="newVideo.url" type="url" placeholder="https://…")
              b-button(
                type="is-primary"
                :loading="addingVideo"
                :disabled="!newVideo.domain || !newVideo.title || !newVideo.url"
                @click="addVideo"
              ) Add video

            b-table(
              :data="videos"
              :hoverable="true"
              :loading="loadingVideos"
              empty-string="No videos added yet"
            )
              b-table-column(v-slot="{ row }" field="domain" label="Domain")
                b-tag {{ row.domain }}
              b-table-column(v-slot="{ row }" field="title" label="Title")
                a(:href="row.url" target="_blank" rel="noopener noreferrer") {{ row.title }}
              b-table-column(v-slot="{ row }" label="" width="80")
                b-button(
                  size="is-small"
                  type="is-danger is-light"
                  icon-left="delete"
                  @click="confirmDeleteVideo(row)"
                )

      //- ── Tab 5: Advisory Distinctions ───────────────────────────────
      b-tab-item(label="Advisory Distinctions" icon="brain")
        .columns
          //- Domain sidebar
          .column.is-3
            b-menu
              b-menu-list(label="Domain")
                //- The label goes through the slot rather than the `label` prop so the
                //- update count can sit beside it — Buefy renders one or the other,
                //- never both. The count is what makes a mentor update findable: the
                //- banner above the list says how many there are, and without this the
                //- only way to locate them is opening all fourteen domains in turn.
                b-menu-item(
                  v-for="d in distinctionDomains"
                  :key="d.id"
                  :active="selectedDistinctionDomain === d.id"
                  @click="selectedDistinctionDomain = d.id; closeDistinctionForm()"
                )
                  template(v-slot:label)
                    span.dist-domain
                      span.dist-domain-name {{ d.label }}
                      //- Spelled out, not left to the colour: the amber alone says
                      //- nothing to a reader who cannot see it.
                      b-tag(
                        v-if="distinctionUpdateCounts[d.id]"
                        type="is-warning"
                        size="is-small"
                      ) {{ distinctionUpdateCounts[d.id] }} {{ distinctionUpdateCounts[d.id] === 1 ? 'update' : 'updates' }}

          .column
            //- Help button — how distinction matching works (prominent, top-right)
            .has-text-right.mb-4
              b-button(
                type="is-info"
                size="is-medium"
                @click="showDistinctionHelpModal = true"
              ) How this works

            b-modal(v-model="showDistinctionHelpModal" has-modal-card trap-focus)
              .modal-card(style="max-width:600px")
                header.modal-card-head
                  p.modal-card-title How to write a distinction
                section.modal-card-body
                  p.mb-3 A distinction teaches the system to recommend the templates #[em you] trust when a certain kind of client situation comes up. The system reads what the advisor typed and understands the #[strong meaning] — so you just describe the situation in plain English, and it handles the rest. You don't need to guess every word an advisor might use.
                  p.mb-3 Here's what each box does:
                  .content
                    ul
                      li #[strong Domain] — The advisory area this applies to (Conflict, Staff, Strategy, and so on). Pick where this situation belongs.
                      li #[strong Description] — Describe the client situation in one plain sentence: what's #[em actually] going on. Aim at the #[strong cause], not just the surface symptom — "the owners aren't aligned on where the business is heading" works far better than "they're arguing." This is the sentence the system reads the advisor's words against, so write it the way you'd explain the situation to a colleague.
                      li #[strong Trigger phrases] — A few different ways an advisor might describe this in their own words. These are just examples to point the system in the right direction — #[strong not] exact phrases it has to find. Three to six varied examples is plenty; don't try to list every wording.
                      li #[strong Templates to boost] — The templates you want brought forward when this situation appears. Pick the ones you'd reach for yourself.
                      li #[strong Boost] — How hard to push those templates up the list when this situation is recognised. Leave it at the default for a gentle nudge; raise it when you want this situation to strongly steer the recommendation.
                footer.modal-card-foot
                  b-button(@click="showDistinctionHelpModal = false") Close

            //- Move-to-domain modal
            b-modal(v-model="showMoveModal" has-modal-card trap-focus)
              .modal-card(style="max-width:480px")
                header.modal-card-head
                  p.modal-card-title Move distinction to another domain
                section.modal-card-body
                  p.mb-3(v-if="moveRow") Move #[strong {{ moveRow.description }}] into:
                  b-field
                    b-select(v-model="moveTargetDomain" placeholder="Choose a domain…" expanded)
                      option(v-for="d in moveDomainOptions" :key="d.id" :value="d.id") {{ d.label }}
                  p.has-text-grey.is-size-7.mt-2(v-if="moveRow && moveRow.kind !== 'firm-own'")
                    | This creates your firm's copy in the new domain and switches the platform original off here.
                footer.modal-card-foot
                  b-button(
                    type="is-primary"
                    :disabled="!moveTargetDomain"
                    :loading="movingDistinction"
                    @click="confirmMoveDistinction"
                  ) Move
                  b-button(@click="closeMoveModal") Cancel

            //- Mentor-update review (Stage E): compare the mentor's current version with
            //- the firm's version, then Adopt the update or Keep the firm's version.
            b-modal(v-model="showMentorUpdateModal" has-modal-card trap-focus)
              .modal-card(style="max-width:720px" v-if="mentorUpdateRow")
                header.modal-card-head
                  p.modal-card-title The mentor updated this distinction
                section.modal-card-body
                  p.mb-4.has-text-grey
                    | You customised this distinction, so your version has been kept. The mentor has
                    | since changed their version. Compare them below, then choose.
                  .columns
                    .column
                      p.has-text-weight-semibold.mb-2 Mentor's current version
                      .box.is-shadowless(style="background:#fffbeb")
                        p.is-size-7.has-text-grey.mb-1 Description
                        p.mb-2 {{ mentorUpdateRow.mentorVersion.description }}
                        p.is-size-7.has-text-grey.mb-1 Trigger phrases
                        p.is-size-7.mb-2 {{ mentorUpdateRow.mentorVersion.triggers.join(', ') }}
                        p.is-size-7.has-text-grey.mb-1 Templates boosted
                        p.is-size-7.mb-2
                          b-tag.mr-1.mb-1(v-for="t in mentorUpdateRow.mentorVersion.templates" :key="'m-'+t" size="is-small") {{ t }}
                        p.is-size-7.has-text-grey.mb-1 Boost
                        p +{{ mentorUpdateRow.mentorVersion.boost }}
                    .column
                      p.has-text-weight-semibold.mb-2 Your version
                      .box.is-shadowless(style="background:#f0fff4")
                        p.is-size-7.has-text-grey.mb-1 Description
                        p.mb-2 {{ mentorUpdateRow.description }}
                        p.is-size-7.has-text-grey.mb-1 Trigger phrases
                        p.is-size-7.mb-2 {{ mentorUpdateRow.triggers.join(', ') }}
                        p.is-size-7.has-text-grey.mb-1 Templates boosted
                        p.is-size-7.mb-2
                          b-tag.mr-1.mb-1(v-for="t in mentorUpdateRow.templates" :key="'f-'+t" size="is-small" type="is-success is-light") {{ t }}
                        p.is-size-7.has-text-grey.mb-1 Boost
                        p +{{ mentorUpdateRow.boost }}
                footer.modal-card-foot
                  b-button(
                    type="is-primary"
                    :loading="resolvingMentorUpdate"
                    @click="adoptMentorUpdate(mentorUpdateRow.id)"
                  ) Adopt the mentor's version
                  b-button(
                    :loading="resolvingMentorUpdate"
                    @click="keepMineMentorUpdate(mentorUpdateRow.id)"
                  ) Keep mine
                  b-button(@click="closeMentorUpdateReview") Cancel

            //- Unified list — platform, customised, switched-off and firm-own rows together
            .level.mb-3
              .level-left
                p.has-text-weight-semibold Advisory Distinctions — {{ currentDistinctionDomainLabel }}
              .level-right
                //- Always offered. It used to hide whenever a form was open, which
                //- made a button vanishing at the top the only visible response to
                //- clicking Edit — and that read as a fault. Same fix as Quizzes.
                b-button(
                  type="is-primary"
                  size="is-small"
                  icon-left="plus"
                  @click="openDistinctionForm(null)"
                ) Add distinction
            b-notification.mb-3(type="is-info is-light" :closable="false" style="font-size:0.85rem")
              | Edit any distinction to make it your firm's own, or switch one off.
              | Platform rows are shared defaults; your changes apply to your firm only.

            //- "Since your last visit" — mentor updates the firm hasn't reviewed yet.
            //- Count spans all domains; switch domains to find the badged rows.
            b-notification.mb-3(
              v-if="distinctionNewUpdateCount > 0"
              type="is-warning is-light"
              :closable="false"
            )
              .level.is-mobile
                .level-left
                  span.has-text-weight-semibold
                    | {{ distinctionNewUpdateCount }} mentor {{ distinctionNewUpdateCount === 1 ? 'update' : 'updates' }} since your last visit
                .level-right
                  b-button(
                    type="is-warning"
                    size="is-small"
                    :loading="markingDistinctionsReviewed"
                    @click="markDistinctionsReviewed"
                  ) Mark all as reviewed

            //- One distinction per card, NOT a table (rebuilt 2026-08-01). The table
            //- could not open an edit form against the row it belonged to, and Mike
            //- ruled that every tab must behave the way Quizzes does — click Edit and
            //- the form opens in the thing you clicked. Cards make that structural
            //- rather than a Buefy detail-row trick, and the three tabs now read the
            //- same to a manager moving between them.
            template(v-if="!loadingFirmDistinctions && domainDistinctions.length > 0")
              article.distinction(
                v-for="row in domainDistinctions"
                :key="row.id"
                :class="[distinctionRowClass(row), { 'is-editing': isEditingDistinction(row) }]"
              )
                //- Editing happens HERE, in the card, not at the foot of the panel.
                template(v-if="isEditingDistinction(row)")
                  p.distinction-editing-label.mb-3 Edit distinction
                  firm-distinction-form(
                    v-model="distinctionForm"
                    :domains="distinctionDomains"
                    :domain-locked="editingPlatformRow"
                    :all-templates="allClientTemplates"
                    :sub-sections="templateSubSections"
                    :group-targets="templateGroupTargets"
                    :saving="savingDistinction"
                    submit-label="Save changes"
                    @save="saveDistinction"
                    @cancel="closeDistinctionForm"
                  )

                template(v-else)
                  .tags.mb-1
                    b-tag(:type="distinctionBadge(row.kind).type" size="is-small") {{ distinctionBadge(row.kind).label }}
                    b-tag(
                      v-if="row.mentorUpdated"
                      type="is-warning"
                      size="is-small"
                    ) Updated by mentor · {{ formatMentorDate(row.mentorUpdatedAt) }}
                    b-tag(
                      v-if="row.mentorDrift"
                      type="is-warning"
                      size="is-small"
                    ) Mentor updated this distinction
                  p.distinction-text {{ row.description }}
                  .distinction-field
                    p.distinction-label Trigger phrases
                    p.distinction-value.is-size-7.has-text-grey {{ row.triggers.join(', ') }}
                  .distinction-field
                    p.distinction-label Templates boosted
                    div
                      b-tag.mr-1.mb-1(
                        v-for="t in row.templates"
                        :key="t"
                        size="is-small"
                        :type="row.kind === 'firm-own' || row.kind === 'customised' ? 'is-success is-light' : ''"
                      ) {{ t }}
                  .distinction-field(v-if="row.kind !== 'declined'")
                    p.distinction-label Boost
                    p.distinction-value +{{ row.boost }}
                  .buttons.mt-2.mb-0
                    template(v-if="row.kind === 'platform'")
                      b-button(size="is-small" @click="openDistinctionForm(row)") Edit
                      b-button(size="is-small" @click="openMoveDistinction(row)") Move to…
                      b-button(size="is-small" @click="switchOffDistinction(row.id)") Switch off
                    template(v-else-if="row.kind === 'customised'")
                      b-button(
                        v-if="row.mentorDrift"
                        size="is-small"
                        type="is-warning"
                        icon-left="bell-ring"
                        @click="openMentorUpdateReview(row)"
                      ) Review update
                      b-button(size="is-small" @click="openDistinctionForm(row)") Edit
                      b-button(size="is-small" @click="openMoveDistinction(row)") Move to…
                      b-button(size="is-small" @click="confirmResetDistinction(row.id)") Reset to platform
                      b-button(size="is-small" @click="switchOffDistinction(row.id)") Switch off
                    template(v-else-if="row.kind === 'declined'")
                      b-button(size="is-small" type="is-primary is-light" @click="switchOnDistinction(row.id)") Switch on
                    template(v-else)
                      b-button(size="is-small" @click="openDistinctionForm(row)") Edit
                      b-button(size="is-small" @click="openMoveDistinction(row)") Move to…
                      b-button(size="is-small" type="is-danger is-light" @click="confirmDeleteDistinction(row.id)") Remove

            p.has-text-grey.is-size-7.mb-4(
              v-else-if="!loadingFirmDistinctions && domainDistinctions.length === 0 && !showDistinctionForm"
            ) No distinctions for this domain yet. Add one to boost specific templates when advisors use particular phrases.

            //- ── Add form ──────────────────────────────────────────────────
            //- Only for a NEW distinction, and at the end of the list on purpose:
            //- that is where it will appear. An EDIT never renders here — it happens
            //- in the card being edited, above.
            .box.distinction-form.mt-4(v-if="showDistinctionForm && !editingDistinctionId")
              p.has-text-weight-semibold.mb-4 New distinction
              firm-distinction-form(
                v-model="distinctionForm"
                :domains="distinctionDomains"
                :domain-locked="editingPlatformRow"
                :all-templates="allClientTemplates"
                :sub-sections="templateSubSections"
                :group-targets="templateGroupTargets"
                :saving="savingDistinction"
                submit-label="Add distinction"
                @save="saveDistinction"
                @cancel="closeDistinctionForm"
              )

      //- ── Tab: Quizzes (CB-31 Phase 3) ───────────────────────────────
      //- Body lives in its own component — the Hub is already over the
      //- decompose rule (CB-23), so a new tab adds a line here, not 200.
      b-tab-item(:label="$t('firmQuizzes.tab')" icon="help-circle-outline")
        firm-quizzes(:api-token="apiToken")

      //- ── Tab: Adviser Network (Collaborate's manager console) ───────
      //- Reads GET /api/people/*, which resolves the caller's TIER server-side
      //- from the verified token — a firm manager sees their firm, the levels
      //- above see a roll-up. Body is Collaborate's own component (CB-23), so
      //- the tiers above the firm keep working rather than being designed out.
      b-tab-item(:label="$t('firmAdviserNetwork.tab')" icon="account-network")
        firm-adviser-network

      //- ── Tab: Team Progress (advisor capability overview) ───────────
      //- Reads GET /api/activity/team, which already sits behind this Hub's own
      //- guard (firmAuth + requireManagerRole) — the firm comes from the verified
      //- token, never from the browser. Body lives in its own component (CB-23).
      b-tab-item(:label="$t('firmTeamProgress.tab')" icon="chart-line")
        firm-team-progress(:api-token="apiToken")

      //- ── Tab: Team Case Studies (manager review) ────────────────────
      b-tab-item(label="Team Case Studies" icon="account-group")
        .has-text-centered.py-5(v-if="loadingFirmCases")
          b-loading(:is-full-page="false" :active="true")
        template(v-else)
          b-notification.mb-4(type="is-info is-light" :closable="false")
            | Your advisors' shared case studies. Open one to see how the recommendation was reached, then review it. Private cases are never shown here.
          p.has-text-grey.has-text-centered.py-6(v-if="firmCases.length === 0")
            | No shared case studies yet. When an advisor shares a case, it appears here for review.
          div(v-else)
            .box.mb-3(v-for="c in firmCases" :key="c.id")
              .level.is-mobile.mb-0(style="cursor:pointer" @click="toggleReviewCase(c.id)")
                .level-left
                  div
                    p.has-text-weight-semibold {{ c.title }}
                    p.is-size-7.has-text-grey {{ caseAdvisorLabel(c) }} &middot; {{ c.domain || 'No area recorded' }} &middot; {{ formatDate(c.createdAt) }}
                .level-right(style="gap:8px")
                  b-tag(v-if="c.feedbackPending" type="is-warning is-light") Feedback welcome
                  b-icon(:icon="expandedReviewCaseId === c.id ? 'chevron-up' : 'chevron-down'")

              div(v-if="expandedReviewCaseId === c.id")
                hr.my-3
                //- Decision trace — how the recommendation was reached
                template(v-if="c.decisionTrace")
                  p.is-size-7
                    strong {{ $t('decisionTrace.caseAreaFocused') }}
                    | {{ traceDomainLabel(c.decisionTrace) }}
                  p.is-size-7
                    strong {{ $t('decisionTrace.caseWhatShaped') }}
                    | {{ lensSummary(c.decisionTrace) }}
                  .mt-3
                    p.is-size-7.has-text-weight-semibold {{ $t('decisionTrace.distinctions') }}
                    p.is-size-7.has-text-grey(v-if="traceNote(c.decisionTrace)") {{ traceNote(c.decisionTrace) }}
                    //- The SAVED copy of the same trace, and the reason this one
                    //- matters most: a case is a permanent record. Without this line
                    //- a session whose classifier never answered is filed for ever as
                    //- "no distinction applied" (S1, approved 2026-08-03 —
                    //- design/WORDING-DISTINCTION-AI-FAILURE.md).
                    p.is-size-7.trace-fault(v-if="traceAiFailed(c.decisionTrace)") {{ $t('decisionTrace.distAiFailed') }}
                    p.is-size-7(v-else-if="traceBoosts(c.decisionTrace).length")
                      span.has-text-success.has-text-weight-semibold(v-for="b in traceBoosts(c.decisionTrace)" :key="b.title") {{ b.title }} (+{{ b.boost }})&nbsp;&nbsp;
                    p.is-size-7.has-text-grey(v-else) {{ $t('decisionTrace.noDistinction') }}
                  .mt-3(v-if="traceNearMissAiFailed(c.decisionTrace)")
                    p.is-size-7.has-text-weight-semibold {{ $t('decisionTrace.filedElsewhere') }}
                    p.is-size-7.trace-fault {{ $t('decisionTrace.nearMissAiFailed') }}
                  .mt-3(v-else-if="caseNearMisses(c).length")
                    p.is-size-7.has-text-weight-semibold {{ $t('decisionTrace.filedElsewhere') }}
                    p.is-size-7.has-text-grey {{ $t('decisionTrace.caseNearMissIntro') }}
                    .nearmiss-row(v-for="nm in caseNearMisses(c)" :key="nm.id")
                      .level.is-mobile.mb-0
                        .level-left
                          p.is-size-7
                            span {{ nm.description }}
                            span.has-text-grey  {{ $t('decisionTrace.currentlyIn', { area: domainLabel(nm.domain) }) }}
                        .level-right
                          span.has-text-success.has-text-weight-semibold.is-size-7(v-if="isNearMissMoved(c, nm)") {{ $t('decisionTrace.caseMoved') }}
                          b-button(
                            v-else
                            size="is-small"
                            type="is-warning is-light"
                            :loading="movingNearMissKey === nearMissKey(c, nm)"
                            @click="moveNearMiss(c, nm)"
                          ) {{ $t('decisionTrace.caseMoveHere') }}
                  .mt-3(v-if="c.decisionTrace.templateScores && c.decisionTrace.templateScores.length")
                    p.is-size-7.has-text-weight-semibold {{ $t('decisionTrace.templatesScored') }}
                    table.table.is-narrow.is-fullwidth.is-size-7
                      thead
                        tr
                          th #
                          th {{ $t('decisionTrace.colTemplate') }}
                          th {{ $t('decisionTrace.colScore') }}
                          th {{ $t('decisionTrace.colWhy') }}
                      tbody
                        tr(v-for="t in c.decisionTrace.templateScores.slice(0, 6)" :key="t.rank")
                          td {{ t.rank }}
                          td {{ t.title }}
                          td {{ t.score }}
                          td.has-text-grey {{ humanizeReasons(t.matchReasons) }}
                template(v-else)
                  p.is-size-7.has-text-grey {{ $t('decisionTrace.caseNoTrace') }}

                //- Post-delivery review — the advisor's own reflection
                .mt-4(v-if="c.review")
                  p.is-size-7.has-text-weight-semibold Post-Delivery Review (by the advisor)
                  p.is-size-7(v-if="c.review.wentWell") ✓ What went well? — {{ c.review.wentWell }}
                  p.is-size-7(v-if="c.review.wentLess") ⚠ What went less well? — {{ c.review.wentLess }}
                  p.is-size-7(v-if="c.review.changesRecommended") What they'd do differently — {{ c.review.changesRecommended }}
                p.is-size-7.has-text-grey.mt-4(v-else) The advisor hasn't recorded a post-delivery review yet.

                //- Mentor review — share an anonymised copy with the mentor
                hr.my-3
                .level.is-mobile.mb-0
                  .level-left
                    div
                      p.is-size-7.has-text-weight-semibold Mentor review
                      p.is-size-7.has-text-grey(v-if="c.mentorShared") Shared with the mentor (anonymised){{ c.mentorSharedAt ? ' · ' + formatDate(c.mentorSharedAt) : '' }}
                      p.is-size-7.has-text-grey(v-else) Share an anonymised copy with the mentor to help improve the app. Client details are removed and you approve the copy first.
                  .level-right
                    b-button(
                      v-if="c.mentorShared"
                      size="is-small"
                      type="is-danger is-light"
                      :loading="mentorActionCaseId === c.id"
                      @click="withdrawFromMentor(c)"
                    ) Withdraw from mentor
                    b-button(
                      v-else
                      size="is-small"
                      type="is-primary is-light"
                      :loading="mentorActionCaseId === c.id"
                      @click="openMentorPreview(c)"
                    ) Share with mentor

          //- Mentor-share preview: the manager approves the anonymised copy before it reaches the mentor
          b-modal(v-model="showMentorPreview" has-modal-card trap-focus :can-cancel="['escape','outside']")
            .modal-card(style="max-width:680px")
              header.modal-card-head
                p.modal-card-title Share with mentor — review the anonymised copy
              section.modal-card-body
                b-notification.mb-3(type="is-info is-light" :closable="false" style="font-size:0.85rem")
                  | This is what the mentor will see. Client names, the business and identifying details have been removed; the wording and tone are kept. Approve only if you're happy it's anonymous.
                .has-text-centered.py-5(v-if="mentorPreviewLoading")
                  b-loading(:is-full-page="false" :active="true")
                  p.is-size-7.has-text-grey.mt-2 Preparing the anonymised copy…
                template(v-else-if="mentorPreview")
                  .mb-3(v-if="mentorPreview.summary")
                    p.is-size-7.has-text-weight-semibold Summary
                    p.is-size-7 {{ mentorPreview.summary }}
                  .mb-2(v-if="mentorPreview.transcript && mentorPreview.transcript.length")
                    p.is-size-7.has-text-weight-semibold Conversation
                    .mentor-anon-msg(v-for="(m, i) in mentorPreview.transcript" :key="i")
                      span.has-text-weight-semibold.is-size-7 {{ m.role === 'assistant' ? 'Adviser tool' : 'Adviser' }}:
                      span.is-size-7  {{ m.content }}
                  p.is-size-7.has-text-grey(v-if="!mentorPreview.summary && (!mentorPreview.transcript || !mentorPreview.transcript.length)") This case has no shareable content.
              footer.modal-card-foot
                b-button(
                  type="is-primary"
                  :disabled="mentorPreviewLoading || !mentorPreview"
                  :loading="mentorSharing"
                  @click="confirmShareWithMentor"
                ) Approve & share
                b-button(@click="closeMentorPreview") Cancel
</template>

<script>
import DOMPurify from 'isomorphic-dompurify'
import FirmQuizzes from '~/components/firm/FirmQuizzes.vue'
import FirmDomainSupport from '~/components/firm/FirmDomainSupport.vue'
import FirmLogicTables from '~/components/firm/FirmLogicTables.vue'
import FirmStaircase from '~/components/firm/FirmStaircase.vue'
import FirmTeamProgress from '~/components/firm/FirmTeamProgress.vue'
import FirmDistinctionForm from '~/components/firm/FirmDistinctionForm.vue'
import FirmAdviserNetwork from '~/components/firm/FirmAdviserNetwork.vue'
import FirmDecisionLogic from '~/components/firm/FirmDecisionLogic.vue'
import traceReasonMixin from '~/mixins/traceReasonMixin'

const { buildMoveRequest } = require('~/utils/distinctionMove')

// The distinctions picker offers the Do-the-Job templates a distinction can meaningfully
// boost. Do NOT filter on includedInClient (that field only governs client self-serve
// visibility, not advisor recommendability) — that wrongly hid ~150 templates. Derived
// straight from templates.json, so it reflects the JSON automatically.
//
// Two subSections are deliberately kept OUT of the per-template list:
//  - Revenue & Feasibility Models (87 industry/concept models) — represented instead by
//    the two group targets (@rf-industry / @rf-general), so the firm picks the group and
//    the engine auto-matches the specific model. Listing all 87 just floods the picker.
//  - Non-advisory plumbing/admin shelves (Help, Firm Manager/Risk Advisor Access, External
//    Advisors, and untitled section pages) — never a meaningful distinction target.
const PICKER_EXCLUDED_SUBSECTIONS = new Set([
  'Revenue & Feasibility Models',
  'Help', 'Firm Manager Access', 'Risk Advisor Access', 'External Advisors', ''
])
const ALL_CLIENT_TEMPLATES = require('~/data/templates.json')
  .filter(t => t.menuSection === 'do-the-job' && !PICKER_EXCLUDED_SUBSECTIONS.has(t.subSection || ''))
  // `index` rides along as the row's identity. Titles are NOT unique in the master
  // export — "Capacity, Capability, Opportunity" appears twice inside General Tools —
  // and a title-keyed picker list makes Vue reuse one row's node for the other, so a
  // tick can land on the row the manager did not click. See FirmDistinctionForm's
  // pickerKey(). What a tick STORES is still the title; only the render key changes.
  .map(t => ({ title: t.title, subSection: t.subSection, index: t.index }))
  .sort((a, b) => a.title.localeCompare(b.title))

const TEMPLATE_SUBSECTIONS = [...new Set(ALL_CLIENT_TEMPLATES.map(t => t.subSection))].sort()

const DISTINCTION_DOMAINS = [
  { id: 'conflict', label: 'Conflict & Dispute' },
  { id: 'profit', label: 'Profitability & Feasibility' },
  { id: 'staff', label: 'Staff & Team' },
  { id: 'data-systems', label: 'Data & Financial Systems' },
  { id: 'sales-marketing', label: 'Sales & Marketing' },
  { id: 'forecasting', label: 'Financial Management' },
  { id: 'governance', label: 'Governance & Leadership' },
  { id: 'strategy', label: 'Strategy & Planning' },
  { id: 'systems', label: 'Business Systems' },
  { id: 'valuation', label: 'Business Valuation' },
  { id: 'risk', label: 'Risk Management' },
  { id: 'succession', label: 'Succession & Exit Planning' },
  { id: 'eoy', label: 'End of Year' },
  { id: 'due-diligence', label: 'Due Diligence & Acquisitions' }
]

// Exported for the locking test (tests/unit/distinctionDomainsVisible.test.js),
// which holds this list against the `distinctions: true` flags in
// data/domains.json — the flag the Logic-Lab accept route files by. The
// 2026-08-03 org-board-pack write happened in the gap between the two lists;
// the test exists so that gap cannot silently reopen.
export { DISTINCTION_DOMAINS }

export default {
  name: 'FirmManagerHub',

  components: { FirmQuizzes, FirmDomainSupport, FirmLogicTables, FirmStaircase, FirmTeamProgress, FirmDistinctionForm, FirmAdviserNetwork, FirmDecisionLogic },

  mixins: [traceReasonMixin],

  props: {
    firmId: { type: String, required: true },
    userEmail: { type: String, default: '' },
    apiToken: { type: String, required: true },
    // The signed-in user's role (UI gating only — the server re-checks every
    // call). Gates the raw Decision Framework tab to platform admins (Mike's
    // ruling 2026-07-16: hide, admin-only); firm managers see only the
    // friendly no-code screens. Default '' = most restrictive.
    userRole: { type: String, default: '' }
  },

  data () {
    return {
      activeTab: 0,

      // Template import
      templateImport: { hasImport: false, templateCount: 0, history: [] },
      loadingTemplateImport: false,
      templateImportFile: null,
      importingTemplates: false,

      // Videos
      videos: [],
      loadingVideos: false,
      addingVideo: false,
      newVideo: { domain: '', title: '', url: '' },
      domains: [],

      // Team Case Studies (manager review)
      firmCases: [],
      loadingFirmCases: false,
      expandedReviewCaseId: null,
      // Mentor-share: preview-and-approve an anonymised copy before it reaches the mentor.
      showMentorPreview: false,
      mentorPreview: null, // { summary, transcript } from the anonymise-preview route
      mentorPreviewCaseId: null,
      mentorPreviewLoading: false,
      mentorSharing: false,
      mentorActionCaseId: null, // case whose share/withdraw button is mid-request
      // Near-misses moved this session, keyed `${caseId}::${nmId}` (the stored trace
      // still lists them, so this disables an already-moved row to stop a double-move).
      movedNearMisses: {},
      movingNearMissKey: null,

      // Advisory Distinctions
      distinctionDomains: DISTINCTION_DOMAINS,
      selectedDistinctionDomain: DISTINCTION_DOMAINS[0].id,
      // Full firm state from GET /distinctions/state: own rows + the cascade
      // (declined platform ids + platform overrides). The unified list is derived
      // from this plus the LIVE platform rows the backend returns (the mentor-authored
      // set — not the committed seed — so mentor edits show here).
      distinctionState: { ownRows: [], declinedIds: [], overrides: {} },
      // Live platform (mentor) rows from the backend, each flagged mentorUpdated /
      // mentorUpdatedAt when it changed since this firm last reviewed.
      livePlatformRows: [],
      // "Mentor updates since your last visit" — drives the banner + per-row badge
      // for rows the firm passively inherits (not overridden).
      distinctionNewUpdateCount: 0,
      distinctionLastReviewedAt: null,
      markingDistinctionsReviewed: false,
      // Stage E — platform ids the firm OVERRODE where the mentor has since changed the
      // underlying row (drift). These get the "mentor updated this" prompt + Adopt/Keep-mine.
      distinctionDriftIds: [],
      // Compare modal (mentor's current version vs the firm's version)
      showMentorUpdateModal: false,
      mentorUpdateRow: null,
      resolvingMentorUpdate: false,
      loadingFirmDistinctions: false,
      showDistinctionForm: false,
      showDistinctionHelpModal: false,
      editingDistinctionId: null,
      // Which kind of row the form is editing: 'platform' | 'customised' | 'firm-own' | null
      editingDistinctionKind: null,
      distinctionForm: { domain: '', description: '', triggers: [], templates: [], boost: 5 },
      savingDistinction: false,
      // Move-to-domain modal state
      showMoveModal: false,
      moveRow: null,
      moveTargetDomain: '',
      movingDistinction: false,
      deletingDistinctionId: null,
      confirmDeleteDistinctionId: null,
      // The picker's own search/area filters moved into FirmDistinctionForm — they are
      // about finding a template, not about what is saved, and a fresh child mounts with
      // fresh filters instead of the parent having to remember to reset them.
      // Revenue-model GROUP targets — let a distinction boost a whole group of revenue
      // models instead of one named model; the engine auto-matches the specific model to
      // the client's industry. Tokens are stored in distinctionForm.templates and read by
      // the resolver (templateResolver.js group-boost block). Revenue models only, by design.
      templateGroupTargets: [
        { token: '@rf-industry', label: 'Revenue & Feasibility Model — Industry (auto-matched)', hint: 'Engine picks the model matching the client\'s industry' },
        { token: '@rf-general', label: 'Revenue & Feasibility Model — General', hint: 'Generic feasibility/concept tools (Break-Even, EBITDA…)' }
      ],
      allClientTemplates: ALL_CLIENT_TEMPLATES,
      templateSubSections: TEMPLATE_SUBSECTIONS
    }
  },

  computed: {
    currentDistinctionDomainLabel () {
      const d = DISTINCTION_DOMAINS.find(d => d.id === this.selectedDistinctionDomain)
      return d ? d.label : ''
    },
    // The unified, badged list for the selected domain.
    domainDistinctions () {
      return this.distinctionRowsFor(this.selectedDistinctionDomain)
    },
    /**
     * Which domains hold a mentor update, so the sidebar can say where to look.
     *
     * WHY THIS EXISTS. The banner above the list says "N mentor updates since your last
     * visit" and its own comment admitted the rest: "switch domains to find the badged
     * rows". Fourteen domains, one on screen at a time — a manager was being told
     * something had changed and then left to hunt for it. Same gap the Quizzes rail
     * closed on 2026-08-01, and the same answer.
     *
     * Counted THROUGH distinctionRowsFor — the same rows the tab draws — so the sidebar
     * can never point at a domain where nothing turns out to be badged. A separate count
     * written here would be free to disagree, and a sidebar that disagrees with the
     * screen it points at is worse than no count at all.
     *
     * @returns {Object.<string, number>} domain id → badged rows in it
     */
    distinctionUpdateCounts () {
      const counts = {}
      for (const d of this.distinctionDomains) {
        counts[d.id] = this.distinctionRowsFor(d.id)
          .filter(r => r.mentorUpdated || r.mentorDrift).length
      }
      return counts
    },
    // True while the form is editing a platform-sourced row (its domain is fixed).
    editingPlatformRow () {
      return this.editingDistinctionKind === 'platform' || this.editingDistinctionKind === 'customised'
    },
    // Domains a distinction can be moved to — all except its current one.
    moveDomainOptions () {
      const current = this.moveRow ? this.moveRow.domain : null
      return this.distinctionDomains.filter(d => d.id !== current)
    }
  },

  mounted () {
    this.loadTemplateImport()
    this.loadVideos()
    this.loadDomains()
    this.loadFirmDistinctions()
    this.loadFirmCases()
  },

  methods: {
    // ── Shared fetch helper ─────────────────────────────────────────────────
    async api (method, path, body, isMultipart) {
      const opts = {
        method,
        headers: { Authorization: `Bearer ${this.apiToken}` }
      }
      if (body && !isMultipart) {
        opts.headers['Content-Type'] = 'application/json'
        opts.body = JSON.stringify(body)
      }
      if (body && isMultipart) {
        opts.body = body // FormData
      }
      const res = await fetch(`${path}`, opts)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }))
        throw new Error(err.message || res.statusText)
      }
      return res.json()
    },

    // ── Template Library Import ─────────────────────────────────────────────
    async loadTemplateImport () {
      this.loadingTemplateImport = true
      try {
        const data = await this.api('GET', '/api/firm-manager/templates')
        this.templateImport = data
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.loadingTemplateImport = false
      }
    },

    async submitTemplateImport () {
      if (!this.templateImportFile) { return }
      this.importingTemplates = true
      try {
        const form = new FormData()
        form.append('file', this.templateImportFile)
        const res = await this.api('POST', '/api/firm-manager/templates', form, true)
        this.$buefy.toast.open({
          message: res.version
            ? `${res.templateCount} templates imported (version ${res.version}).`
            : `${res.templateCount} templates imported.`,
          type: 'is-success'
        })
        this.templateImportFile = null
        this.loadTemplateImport()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.importingTemplates = false
      }
    },

    confirmResetTemplates () {
      this.$buefy.dialog.confirm({
        message: 'Remove your firm\'s template library import and revert to the platform default?',
        type: 'is-danger',
        confirmText: 'Reset to default',
        onConfirm: () => this.resetTemplateImport()
      })
    },

    async resetTemplateImport () {
      try {
        await this.api('DELETE', '/api/firm-manager/templates')
        this.$buefy.toast.open({ message: 'Template library reset to platform default.', type: 'is-success' })
        this.loadTemplateImport()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      }
    },

    async restoreTemplateVersion (row) {
      try {
        const res = await this.api('POST', '/api/firm-manager/framework/restore', {
          configKey: 'templates',
          versionId: row.id
        })
        this.$buefy.toast.open({ message: `Restored as version ${res.version}.`, type: 'is-success' })
        this.loadTemplateImport()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      }
    },

    // ── Videos ─────────────────────────────────────────────────────────────
    async loadVideos () {
      this.loadingVideos = true
      try {
        const data = await this.api('GET', '/api/firm-manager/videos')
        this.videos = data.videos || []
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.loadingVideos = false
      }
    },

    async addVideo () {
      this.addingVideo = true
      try {
        await this.api('POST', '/api/firm-manager/videos', this.newVideo)
        this.$buefy.toast.open({ message: 'Video added.', type: 'is-success' })
        this.newVideo = { domain: '', title: '', url: '' }
        this.loadVideos()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.addingVideo = false
      }
    },

    confirmDeleteVideo (row) {
      this.$buefy.dialog.confirm({
        message: DOMPurify.sanitize(`Remove <strong>${row.title}</strong>?`, { USE_PROFILES: { html: true } }),
        type: 'is-danger',
        confirmText: 'Remove',
        onConfirm: () => this.deleteVideo(row)
      })
    },

    async deleteVideo (row) {
      try {
        await this.api('DELETE', `/api/firm-manager/videos/${row.id}`)
        this.$buefy.toast.open({ message: 'Video removed.', type: 'is-success' })
        this.loadVideos()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      }
    },

    // ── Domains (for video tagging) ─────────────────────────────────────────
    async loadDomains () {
      try {
        const res = await fetch('/data/domains.json')
        const data = await res.json()
        this.domains = Array.isArray(data)
          ? data.map(d => d.name || d.key || d)
          : Object.keys(data)
      } catch {
        this.domains = ['Profitability', 'Cash Flow', 'Sales', 'Staff', 'Strategy',
          'Forecasting', 'Systems', 'Risk', 'Governance', 'Succession']
      }
    },

    // ── Advisory Distinctions (firm-level CRUD) ─────────────────────────────
    async loadFirmDistinctions () {
      this.loadingFirmDistinctions = true
      try {
        const data = await this.api('GET', '/api/firm-manager/distinctions/state')
        this.distinctionState = {
          ownRows: data.ownRows || [],
          declinedIds: data.declinedIds || [],
          overrides: data.overrides || {}
        }
        this.livePlatformRows = data.platform || []
        this.distinctionNewUpdateCount = data.newUpdateCount || 0
        this.distinctionLastReviewedAt = data.lastReviewedAt || null
        this.distinctionDriftIds = data.driftIds || []
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.loadingFirmDistinctions = false
      }
    },

    // Acknowledge the mentor updates — advances the firm's "last reviewed" marker on
    // the backend, then reloads so the banner + per-row badges clear. The marker only
    // ever moves on this explicit click, never on page load.
    async markDistinctionsReviewed () {
      this.markingDistinctionsReviewed = true
      try {
        await this.api('POST', '/api/firm-manager/distinctions/mark-reviewed')
        await this.loadFirmDistinctions()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.markingDistinctionsReviewed = false
      }
    },

    // "28 Jun" — short, locale-independent date for the "Updated by mentor" badge.
    formatMentorDate (iso) {
      if (!iso) { return '' }
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) { return '' }
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${d.getDate()} ${months[d.getMonth()]}`
    },

    // ── Stage E — review a mentor update to a distinction the firm customised ────
    // Opens the compare panel (mentor's current version vs the firm's version).
    openMentorUpdateReview (row) {
      this.mentorUpdateRow = row
      this.showMentorUpdateModal = true
    },
    closeMentorUpdateReview () {
      this.showMentorUpdateModal = false
      this.mentorUpdateRow = null
    },
    // Adopt — drop the firm's override and take the mentor's current version (reuses
    // the Reset-to-platform route, which also clears the drift baseline server-side).
    async adoptMentorUpdate (id) {
      this.resolvingMentorUpdate = true
      try {
        await this.api('DELETE', `/api/firm-manager/distinctions/platform/${id}`)
        this.closeMentorUpdateReview()
        await this.loadFirmDistinctions()
        this.$buefy.toast.open({ message: 'Adopted the mentor\'s version', type: 'is-success' })
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.resolvingMentorUpdate = false
      }
    },
    // Keep mine — keep the firm's version; re-stamp the baseline so the prompt clears
    // until the mentor's next edit.
    async keepMineMentorUpdate (id) {
      this.resolvingMentorUpdate = true
      try {
        await this.api('POST', `/api/firm-manager/distinctions/platform/${id}/keep-mine`)
        this.closeMentorUpdateReview()
        await this.loadFirmDistinctions()
        this.$buefy.toast.open({ message: 'Kept your version', type: 'is-success' })
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.resolvingMentorUpdate = false
      }
    },

    openDistinctionForm (row) {
      if (row) {
        this.editingDistinctionId = row.id
        // Platform/customised rows save via the override route; firm-own rows via
        // the firm-row route. A row with no kind (legacy call) is treated as firm-own.
        this.editingDistinctionKind = row.kind || 'firm-own'
        this.distinctionForm = {
          domain: row.domain,
          description: row.description,
          triggers: [...row.triggers],
          templates: [...row.templates],
          boost: row.boost
        }
      } else {
        this.editingDistinctionId = null
        this.editingDistinctionKind = null
        this.distinctionForm = {
          domain: this.selectedDistinctionDomain,
          description: '',
          triggers: [],
          templates: [],
          boost: 5
        }
      }
      this.showDistinctionForm = true
    },

    closeDistinctionForm () {
      this.showDistinctionForm = false
      this.editingDistinctionId = null
      this.editingDistinctionKind = null
      this.distinctionForm = { domain: '', description: '', triggers: [], templates: [], boost: 5 }
    },

    /**
     * True when this exact distinction is the one open for editing.
     *
     * Keyed on `id`, the row's stable identity — the same rule the Quizzes and
     * Staircase tabs hold, so the form can never open against the wrong card after a
     * row above it is switched off.
     *
     * @param {Object} row - a distinction row
     * @returns {boolean}
     */
    isEditingDistinction (row) {
      return !!(this.showDistinctionForm && row && this.editingDistinctionId === row.id)
    },

    async saveDistinction () {
      if (!this.distinctionForm.domain) {
        this.$buefy.toast.open({ message: 'Please select a domain.', type: 'is-warning' })
        return
      }
      if (!this.distinctionForm.description.trim()) {
        this.$buefy.toast.open({ message: 'Description is required.', type: 'is-warning' })
        return
      }
      if (this.distinctionForm.triggers.length === 0) {
        this.$buefy.toast.open({ message: 'Add at least one trigger phrase.', type: 'is-warning' })
        return
      }
      if (this.distinctionForm.templates.length === 0) {
        this.$buefy.toast.open({ message: 'Select at least one template to boost.', type: 'is-warning' })
        return
      }

      this.savingDistinction = true
      try {
        if (this.editingPlatformRow) {
          // Editing a platform row saves a firm override (the firm's version
          // replaces the platform original). Only the editable fields are sent.
          await this.api('PUT', `/api/firm-manager/distinctions/platform/${this.editingDistinctionId}`, {
            description: this.distinctionForm.description,
            triggers: this.distinctionForm.triggers,
            templates: this.distinctionForm.templates,
            boost: this.distinctionForm.boost
          })
          this.$buefy.toast.open({ message: 'Distinction updated for your firm.', type: 'is-success' })
        } else if (this.editingDistinctionId) {
          await this.api('PUT', `/api/firm-manager/distinctions/${this.editingDistinctionId}`, this.distinctionForm)
          this.$buefy.toast.open({ message: 'Distinction updated.', type: 'is-success' })
        } else {
          await this.api('POST', '/api/firm-manager/distinctions', this.distinctionForm)
          this.$buefy.toast.open({ message: 'Distinction added.', type: 'is-success' })
        }
        this.closeDistinctionForm()
        this.loadFirmDistinctions()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.savingDistinction = false
      }
    },

    confirmDeleteDistinction (id) {
      this.$buefy.dialog.confirm({
        message: 'Remove this distinction? It will no longer boost templates during scoring.',
        type: 'is-danger',
        confirmText: 'Remove',
        onConfirm: () => this.deleteDistinction(id)
      })
    },

    async deleteDistinction (id) {
      try {
        await this.api('DELETE', `/api/firm-manager/distinctions/${id}`)
        this.$buefy.toast.open({ message: 'Distinction removed.', type: 'is-success' })
        this.loadFirmDistinctions()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      }
    },

    // Switch a platform distinction off for this firm (decline).
    async switchOffDistinction (id) {
      try {
        await this.api('PUT', `/api/firm-manager/distinctions/platform/${id}/decline`, { declined: true })
        this.$buefy.toast.open({ message: 'Distinction switched off for your firm.', type: 'is-success' })
        this.loadFirmDistinctions()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      }
    },

    // Switch a previously declined platform distinction back on.
    async switchOnDistinction (id) {
      try {
        await this.api('PUT', `/api/firm-manager/distinctions/platform/${id}/decline`, { declined: false })
        this.$buefy.toast.open({ message: 'Distinction switched back on.', type: 'is-success' })
        this.loadFirmDistinctions()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      }
    },

    confirmResetDistinction (id) {
      this.$buefy.dialog.confirm({
        message: "Reset this distinction to the platform version? Your firm's edits to it will be discarded.",
        type: 'is-warning',
        confirmText: 'Reset',
        onConfirm: () => this.resetDistinction(id)
      })
    },

    // Remove the firm's override of a platform row — the platform version applies again.
    async resetDistinction (id) {
      try {
        await this.api('DELETE', `/api/firm-manager/distinctions/platform/${id}`)
        this.$buefy.toast.open({ message: 'Reset to the platform version.', type: 'is-success' })
        this.loadFirmDistinctions()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      }
    },

    /**
     * The unified, badged list for ONE domain: every platform row tagged platform /
     * customised (firm-edited) / declined (switched off), then the firm's own rows.
     * Built client-side from the live platform rows + the firm state, so a declined row
     * still shows (greyed) rather than just disappearing.
     *
     * Takes the domain rather than reading the selected one, so the sidebar's update
     * counts are produced by this exact code instead of a second copy of it.
     *
     * @param {string} dom - a distinction domain id
     * @returns {Array<Object>} rows carrying `kind`, and `mentorDrift` where overridden
     */
    distinctionRowsFor (dom) {
      const declined = new Set(this.distinctionState.declinedIds || [])
      const overrides = this.distinctionState.overrides || {}
      const drift = new Set(this.distinctionDriftIds || [])
      const rows = []
      for (const p of (this.livePlatformRows || [])) {
        if (p.domain !== dom) { continue }
        // p carries mentorUpdated / mentorUpdatedAt from the backend (the passive
        // "since your last visit" notice — never set on overridden rows).
        if (declined.has(p.id)) {
          rows.push({ ...p, kind: 'declined' })
        } else if (overrides[p.id]) {
          // Customised row: the firm's version is shown; mentorVersion holds the mentor's
          // CURRENT row (= p, before the override) for the Stage E compare panel, and
          // mentorDrift flags that the mentor changed it since the firm last reviewed.
          rows.push({
            ...p,
            ...overrides[p.id],
            id: p.id,
            kind: 'customised',
            mentorDrift: drift.has(p.id),
            mentorVersion: { description: p.description, triggers: p.triggers, templates: p.templates, boost: p.boost }
          })
        } else {
          rows.push({ ...p, kind: 'platform' })
        }
      }
      for (const o of (this.distinctionState.ownRows || [])) {
        if (o.domain === dom) { rows.push({ ...o, kind: 'firm-own' }) }
      }
      return rows
    },

    // Badge label + Buefy tag type for a unified-list row's kind.
    distinctionBadge (kind) {
      switch (kind) {
        case 'customised': return { label: 'Customised', type: 'is-success' }
        case 'declined': return { label: 'Switched off', type: 'is-warning is-light' }
        case 'firm-own': return { label: 'Your firm', type: 'is-primary is-light' }
        default: return { label: 'Platform', type: 'is-light' }
      }
    },

    // Grey out switched-off rows in the unified list.
    distinctionRowClass (row) {
      return row.kind === 'declined' ? 'distinction-off' : ''
    },

    openMoveDistinction (row) {
      this.moveRow = row
      this.moveTargetDomain = ''
      this.showMoveModal = true
    },

    closeMoveModal () {
      this.showMoveModal = false
      this.moveRow = null
      this.moveTargetDomain = ''
    },

    // Move a distinction into another domain. A platform/customised row goes via the
    // backend move endpoint (firm-own copy in the target + original switched off); a
    // firm-own row is a straight domain change on its own record.
    async confirmMoveDistinction () {
      const row = this.moveRow
      const target = this.moveTargetDomain
      if (!row || !target) { return }
      this.movingDistinction = true
      try {
        if (row.kind === 'firm-own') {
          await this.api('PUT', `/api/firm-manager/distinctions/${row.id}`, {
            domain: target,
            description: row.description,
            triggers: row.triggers,
            templates: row.templates,
            boost: row.boost
          })
        } else {
          await this.api('POST', `/api/firm-manager/distinctions/platform/${row.id}/move`, { targetDomain: target })
        }
        this.$buefy.toast.open({ message: 'Distinction moved.', type: 'is-success' })
        this.closeMoveModal()
        this.loadFirmDistinctions()
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.movingDistinction = false
      }
    },

    // ── Helpers ─────────────────────────────────────────────────────────────
    // ── Team Case Studies (manager review) ──────────────────────────────────
    async loadFirmCases () {
      this.loadingFirmCases = true
      try {
        const data = await this.api('GET', '/api/firm-manager/cases')
        this.firmCases = data.cases || []
      } catch (e) {
        this.$buefy.toast.open({ message: e.message, type: 'is-danger' })
      } finally {
        this.loadingFirmCases = false
      }
    },

    toggleReviewCase (id) {
      this.expandedReviewCaseId = this.expandedReviewCaseId === id ? null : id
    },

    // ── Mentor share (preview → approve → persist) ──────────────────────────
    /** Open the preview modal and fetch the anonymised copy for this case. */
    async openMentorPreview (c) {
      this.mentorPreviewCaseId = c.id
      this.mentorPreview = null
      this.showMentorPreview = true
      this.mentorPreviewLoading = true
      try {
        const data = await this.api('POST', `/api/firm-manager/cases/${c.id}/anonymise-preview`)
        this.mentorPreview = data.anonymised || { summary: '', transcript: [] }
      } catch (e) {
        this.$buefy.toast.open({ message: 'Could not prepare an anonymised copy. Please try again.', type: 'is-danger' })
        this.closeMentorPreview()
      } finally {
        this.mentorPreviewLoading = false
      }
    },

    closeMentorPreview () {
      this.showMentorPreview = false
      this.mentorPreview = null
      this.mentorPreviewCaseId = null
    },

    /** Persist the manager-approved anonymised copy and mark the case shared. */
    async confirmShareWithMentor () {
      if (!this.mentorPreviewCaseId || !this.mentorPreview) { return }
      const id = this.mentorPreviewCaseId
      this.mentorSharing = true
      try {
        await this.api('POST', `/api/firm-manager/cases/${id}/share-with-mentor`, { anonymised: this.mentorPreview })
        const c = this.firmCases.find(x => x.id === id)
        if (c) { c.mentorShared = true; c.mentorSharedAt = new Date().toISOString() }
        this.$buefy.toast.open({ message: 'Shared with mentor.', type: 'is-success' })
        this.closeMentorPreview()
      } catch (e) {
        this.$buefy.toast.open({ message: 'Could not share the case. Please try again.', type: 'is-danger' })
      } finally {
        this.mentorSharing = false
      }
    },

    /** Withdraw a case from the mentor (clears the shared flag and stored copy). */
    async withdrawFromMentor (c) {
      this.mentorActionCaseId = c.id
      try {
        await this.api('DELETE', `/api/firm-manager/cases/${c.id}/share-with-mentor`)
        c.mentorShared = false
        c.mentorSharedAt = null
        this.$buefy.toast.open({ message: 'Withdrawn from mentor.', type: 'is-success' })
      } catch (e) {
        this.$buefy.toast.open({ message: 'Could not withdraw the case. Please try again.', type: 'is-danger' })
      } finally {
        this.mentorActionCaseId = null
      }
    },

    /** Display name for the advisor who saved the case (id until a name lookup exists). */
    caseAdvisorLabel (c) {
      return c.advisorId || 'Unknown advisor'
    },

    /** The advisory area the engine focused on, from the stored trace. */
    traceDomainLabel (trace) {
      const d = (trace && trace.domain) || {}
      return d.label || d.id || '—'
    },

    /** One-line summary of the strategy lenses that shaped the advice. */
    lensSummary (trace) {
      const l = (trace && trace.lenses) || {}
      const parts = []
      if (l.engagementType) { parts.push(l.engagementType) }
      if (l.complexityCeiling) { parts.push(this.$t('decisionTrace.lensCeiling', { level: l.complexityCeiling })) }
      if (typeof l.templateBudget === 'number') {
        // $tc, not $t: "1 template" / "3 templates" — the plural rule belongs to
        // the locale, not to a ternary in this method.
        parts.push(this.$tc('decisionTrace.lensTemplates', l.templateBudget, { count: l.templateBudget }))
      }
      return parts.join(' · ') || '—'
    },

    traceNote (trace) {
      return (trace && trace.distinctions && trace.distinctions.note) || ''
    },

    /**
     * Did the distinction classifier FAIL for this saved case? An empty
     * `boostsApplied` alone cannot answer that — it is equally what a successful
     * call that matched nothing produces (the 2026-08-03 P1).
     * @param {Object} trace the case's saved decisionTrace
     * @returns {boolean} true only when the AI call did not complete
     */
    traceAiFailed (trace) {
      return !!(trace && trace.distinctions && trace.distinctions.aiFailed)
    },

    /** As above, for the cross-domain bridge — a separate call that fails separately. */
    traceNearMissAiFailed (trace) {
      return !!(trace && trace.distinctions && trace.distinctions.nearMissAiFailed)
    },

    /** The distinction boosts applied, as a [{title, boost}] list for display. */
    traceBoosts (trace) {
      const b = (trace && trace.distinctions && trace.distinctions.boostsApplied) || {}
      return Object.keys(b).map(title => ({ title, boost: b[title] }))
    },

    /** Cross-domain near-misses from the trace — the Phase 3 "move it here" candidates. */
    caseNearMisses (c) {
      return (c.decisionTrace && c.decisionTrace.distinctions && c.decisionTrace.distinctions.nearMisses) || []
    },

    // humanizeTraceReasons() lived here and joined the engine's raw codes with
    // commas, so a firm manager read `tag:profit, domain:primary_subsection` on a
    // saved case while the adviser read English. Replaced 2026-08-04 by
    // traceReasonMixin's humanizeReasons(), shared with VirtualAdvisor.

    nearMissKey (c, nm) {
      return `${c.id}::${nm.id}`
    },

    isNearMissMoved (c, nm) {
      return !!this.movedNearMisses[this.nearMissKey(c, nm)]
    },

    /** Human label for a domain id (falls back to the id). */
    domainLabel (id) {
      const d = this.distinctionDomains.find(x => x.id === id)
      return (d && d.label) || id || '—'
    },

    /**
     * Move a near-miss distinction into the case's detected area, so it influences
     * future sessions like this one. Manager-only and confirmed first — it changes
     * the firm's live distinction config. Routes by the row's cascade source
     * (firm-own = domain change; firm-override = platform move) via buildMoveRequest.
     */
    moveNearMiss (c, nm) {
      const trace = c.decisionTrace || {}
      const targetDomain = (trace.domain && trace.domain.id) || null
      if (!targetDomain) {
        this.$buefy.toast.open({ message: 'This case has no recorded area to move into.', type: 'is-danger' })
        return
      }
      const targetLabel = this.traceDomainLabel(trace)
      const fromLabel = this.domainLabel(nm.domain)
      // Buefy renders the dialog message as HTML, so escape the firm-authored
      // description (and truncate) before interpolating it.
      const raw = String(nm.description || 'this distinction')
      const escaped = raw.replace(/[<>&]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[ch]))
      const desc = escaped.length > 80 ? escaped.slice(0, 80) + '…' : escaped
      this.$buefy.dialog.confirm({
        title: 'Move distinction',
        message: `Move "${desc}" from ${fromLabel} into ${targetLabel}? It will then influence future ${targetLabel} sessions instead.`,
        confirmText: 'Move it here',
        cancelText: 'Cancel',
        type: 'is-warning',
        onConfirm: async () => {
          const key = this.nearMissKey(c, nm)
          this.movingNearMissKey = key
          try {
            const req = buildMoveRequest(nm, targetDomain)
            await this.api(req.method, req.path, req.body)
            this.$set(this.movedNearMisses, key, true)
            this.$buefy.toast.open({ message: `Moved into ${targetLabel}.`, type: 'is-success' })
            // Keep the Advisory Distinctions screen in step with the move.
            this.loadFirmDistinctions()
          } catch (e) {
            this.$buefy.toast.open({ message: e.message || 'Could not move the distinction.', type: 'is-danger' })
          } finally {
            this.movingNearMissKey = null
          }
        }
      })
    },

    formatDate (iso) {
      return iso ? new Date(iso).toLocaleDateString() : ''
    },

    /**
     * Open another tab from the Logic-Lab router — "It recommended the wrong
     * template → Advisory Distinctions" has to actually take the manager there,
     * or the page teaches a route it cannot walk.
     *
     * Resolved by LABEL against the tabs Buefy actually rendered, never by a
     * hard-coded index: one tab is hidden behind `v-if="false"`, so an index
     * written today would silently point at the wrong screen the day it comes
     * back. An unknown key does nothing rather than jumping somewhere arbitrary.
     *
     * @param {'distinctions'|'domain-support'|'logic-tables'} key which lever
     */
    goToTab (key) {
      const labels = {
        distinctions: 'Advisory Distinctions',
        'domain-support': 'Domain Support',
        'logic-tables': 'Logic Tables'
      }
      const wanted = labels[key]
      const tabs = this.$refs.hubTabs
      if (!wanted || !tabs || !Array.isArray(tabs.items)) { return }
      const index = tabs.items.findIndex(item => item.label === wanted)
      if (index > -1) { this.activeTab = index }
    }
  }
}
</script>

<style scoped>
.firm-manager-hub {
  background: #f5f5f5;
  min-height: 100vh;
}
/* A distinction layer that was never checked — read as a fault, not as a quiet
   grey note among the other trace lines. Matches VirtualAdvisor's .trace-fault so
   the same failure looks the same on both screens. */
.trace-fault {
  color: #9a3412;
  background: #fff7ed;
  border-left: 3px solid #ea580c;
  padding: 4px 8px;
  border-radius: 3px;
}
/* Case-review near-miss — a distinction filed elsewhere that matched this case
   (the Phase 3 "move it here" candidate); subtle amber highlight, no map-shock. */
.nearmiss-row {
  margin: 3px 0;
  padding: 4px 8px;
  background: #fffbeb;
  border-left: 3px solid #f59e0b;
  border-radius: 3px;
}
.is-family-monospace {
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
}

/* Advisory Distinctions — form + template picker */
.distinction-form { border: 1px solid #dbdbdb; }

/* One distinction per card. Mirrors .q on the Quizzes tab so a manager moving between
   the two tabs meets the same object in the same shape. */
.distinction {
  padding: 0.85rem 0;
  border-bottom: 1px solid #f0f0f0;
}
.distinction-text { font-weight: 600; color: #363636; margin-bottom: 0.5rem; }
.distinction-field { margin-bottom: 0.4rem; }
.distinction-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9a9a9a;
  font-weight: 600;
}
.distinction-value { color: #4a4a4a; }

/* The card being edited, tinted so the form is unmistakably attached to the row the
   manager clicked. Same cue and colour as .q.is-editing on Quizzes. */
.distinction.is-editing {
  background: #f5fbff;
  border-left: 3px solid #3298dc;
  padding-left: 0.6rem;
  margin-left: -0.6rem;
  border-radius: 4px;
}
.distinction-editing-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #3298dc;
  font-weight: 600;
}

/* Switched-off (declined) rows in the unified distinctions list read as muted. */
.distinction-off { opacity: 0.5; }

/* A domain in the sidebar: its name, and the update count pushed to the right so the
   fourteen counts line up as a column the eye can scan in one pass. */
.dist-domain {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
}
.dist-domain-name { flex: 1; }
</style>
