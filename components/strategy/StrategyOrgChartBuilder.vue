<template lang="pug">
.socb
  .socb-app
    .socb-bar
      b-button.socb-btn(
        type="is-primary"
        size="is-small"
        :disabled="!canAdd"
        @click="addRole"
      ) {{ $t('strategyPlanner.orgChart.addRole') }}
      b-button.socb-btn(
        v-if="hasRoles"
        type="is-primary"
        size="is-small"
        outlined
        @click="clearAll"
      ) {{ $t('strategyPlanner.orgChart.clearAll') }}
      b-button.socb-btn(
        v-else
        type="is-primary"
        size="is-small"
        outlined
        @click="startFromExample"
      ) {{ $t('strategyPlanner.orgChart.startFromExample') }}
      span.socb-count {{ countLine }}

    speech-status-line(:state="speechState")
    table.socb-tbl
      thead
        tr
          th.socb-num #
          //- ⚠ "Role" AND "Name" ARE THE TWO WORDS ON THIS SCREEN THAT ARE OURS — ruled
          //- 2026-09-21 (the column heading) and again on the redraw (the person's column).
          //- Mike's sheet heads neither; "Reporting Head" beside them is read off the
          //- workbook and is the only heading here that is his.
          th {{ $t('strategyPlanner.orgChart.role') }}
          th {{ $t('strategyPlanner.orgChart.person') }}
          th {{ headLabel }}
          th.socb-act &nbsp;
      tbody
        tr(v-for="(role, i) in rows" :key="role.id")
          td.socb-num {{ i + 1 }}
          td
            strategy-capture-box(
              :field="boxField(role, 'name')"
              :value="role.name"
              single-line
              :speech-supported="speechSupported"
              :recording="voiceField === boxField(role, 'name').key"
              @toggle-voice="toggleVoiceField"
              @focus-field="onBoxFocus"
              @input-field="onBoxInput"
            )
          //- 🔴 OPTIONAL — Decision B. A client redesigning their structure has positions
          //- before they have people, and his own Board row could never hold one.
          td
            strategy-capture-box(
              :field="boxField(role, 'person')"
              :value="role.person"
              single-line
              :speech-supported="speechSupported"
              :recording="voiceField === boxField(role, 'person').key"
              @toggle-voice="toggleVoiceField"
              @focus-field="onBoxFocus"
              @input-field="onBoxInput"
            )
          td
            b-select.socb-sel(
              size="is-small"
              expanded
              :class="{ 'is-nobody': !role.reportsTo }"
              :value="role.reportsTo"
              @input="onHeadInput(role, $event)"
            )
              //- 🔴 "Nobody", NOT "Reports to…" — Decision C, ruled 2026-09-21 as a wording
              //- question. The option always existed and always worked; it read as a prompt
              //- telling you to pick somebody, so an absence looked like an unanswered
              //- question and Mike reported it missing. A screen can hide what it already does.
              option(value="") {{ $t('strategyPlanner.orgChart.nobody') }}
              option(
                v-for="name in headOptions(role)"
                :key="name"
                :value="name"
              ) {{ name }}
          td.socb-act
            //- The × from the drawing. A role is removed, never emptied: emptying leaves a
            //- numbered row that is not a person.
            button.socb-rm(
              type="button"
              :title="$t('strategyPlanner.orgChart.removeRole')"
              :aria-label="$t('strategyPlanner.orgChart.removeRole')"
              @click="removeRole(role)"
            ) &times;

  //- No roles, no panel. The drawing shows the chart only once there is one to show, and
  //- an empty bordered box under an empty table is a frame around nothing.
  strategy-org-chart(v-if="chart.boxes.length" :roles="roles")

  //- 🔴 A NOTICE, NEVER A BLOCK — Mike's ruling of 2026-09-08 that a check "never blocks
  //- the advisor", applied by the drawing itself. His own worked example raises the first
  //- of these, and the session carries on with what he typed untouched.
  .socb-flag(v-for="note in notices" :key="note.key")
    span.socb-dot &#9679;
    span {{ note.text }}
</template>

<script>
/**
 * StrategyOrgChartBuilder — capture form 3 of 9, and the only one that is a small
 * application rather than a page of boxes.
 *
 * 🔴 BUILT FROM THE APPROVED DRAWING:
 * `design/mockups/strategy-capture-parent-child-list.html`, five decisions ruled by Mike
 * 2026-09-21 and approved to build from. Item 15.1, stage 5.
 *
 * 🔴 WHY IT IS NOT A FORM — HIS RULING, 2026-09-21: *"seeing as this needs to be dynamic —
 * perhaps it needs to be built like a 'mini-app' in order to function? … which is why the
 * original is in a spreadsheet"*. Three things make it one:
 *
 * 1. **A row is a person, not a position on a page.** Every other capture form saves a box
 *    by its place in his table and the guard refuses anything else — his sheet stops at row
 *    30, so an advisor adding role 31 would have been told their typing could not be saved.
 * 2. **One answer is constrained by another.** Reporting Head has to name a role that
 *    already exists, so it is a picker and never free text — and never the role in its own
 *    row.
 * 3. **It produces something.** The other eight capture words; this one captures a
 *    structure, and the chart his deck teaches is drawn from it.
 *
 * THE FIVE RULINGS, ALL OF 2026-09-21, EACH AS RECOMMENDED:
 * - **A** — the screen opens EMPTY, with *Start from the example* loading all 24 roles in
 *   one click. An org chart is the client's own.
 * - **B** — the unheaded column is headed *Role*. The one word here that is ours.
 * - **C** — his empty fourth column is DROPPED. That alone removes 32 of the old 49 boxes.
 * - **D** — the app works out the number down the left and renumbers on every change. His
 *   tenths (1.0, 2.0) are therefore NOT carried across.
 * - **E** — the client's plan carries the drawn chart with the list beneath it. That is
 *   `StrategyPlanDocument`, using the same `StrategyOrgChart` the advisor sees here.
 *
 * ⚠ IT HOLDS NO STATE OF ITS OWN. The roles are computed from `entries`, exactly as every
 * other capture surface reads its boxes, so what is on screen and what is stored cannot
 * drift apart. The one exception is the opening blank row, which is local until the advisor
 * types into it — see `rows`.
 *
 * Vue 2, Options API, Pug. No DOM access at all.
 */
import speechMixin from '~/mixins/speechMixin'
import StrategyCaptureBox from '~/components/strategy/StrategyCaptureBox.vue'
import StrategyOrgChart from '~/components/strategy/StrategyOrgChart.vue'
import SpeechStatusLine from '~/components/base/SpeechStatusLine.vue'
import {
  ROSTER_KEY,
  MAX_ROLES,
  roleKey,
  rolesFrom,
  nextRoleId,
  entriesForRoles,
  renameCascade,
  layout,
  checks
} from '~/utils/orgChart'

export default {
  name: 'StrategyOrgChartBuilder',

  components: { StrategyCaptureBox, StrategyOrgChart, SpeechStatusLine },

  mixins: [speechMixin],

  props: {
    /** What is already captured for this concept, keyed by field key. */
    entries: {
      type: Object,
      default: () => ({})
    },

    /**
     * The shape the backend serves for this form — his own column heading and his 24-role
     * worked example, both read off `Org Chart.xlsx` rather than written anywhere.
     */
    shape: {
      type: Object,
      default: () => ({}),
      validator: s => !!s && typeof s === 'object'
    }
  },

  computed: {
    /**
     * His one column heading, read off the workbook. Never worded here.
     * @returns {string}
     */
    headLabel () {
      return this.shape.headLabel || ''
    },

    /**
     * The roles the session holds, in the advisor's own order.
     * @returns {Array<{id: number, name: string, reportsTo: string}>}
     */
    roles () {
      return rolesFrom(this.entries)
    },

    /** @returns {boolean} */
    hasRoles () {
      return this.roles.length > 0
    },

    /**
     * The rows on screen.
     *
     * ⚠ THE OPENING BLANK ROW IS NOT SAVED, AND THAT IS DELIBERATE. Decision A opens the
     * screen empty; writing a row into a client's session merely because a card came into
     * view would put a record there that nobody asked for. It becomes real the moment
     * anything is typed into it — `saveBox` carries the roster along in the same save.
     *
     * @returns {Array<{id: number, name: string, reportsTo: string}>}
     */
    rows () {
      if (this.roles.length) { return this.roles }
      // The entries go in as well as the roster: a session whose every role has been removed
      // still holds their boxes, and reusing an id would bring one of them back.
      return [{ id: nextRoleId([], this.entries), name: '', person: '', reportsTo: '' }]
    },

    /** @returns {boolean} false once the ceiling is reached */
    canAdd () {
      return this.roles.length < MAX_ROLES
    },

    /**
     * The chart these roles draw — computed once and shared, so the toolbar's count and the
     * panel below it can never describe different charts.
     * @returns {object}
     */
    chart () {
      return layout(this.roles)
    },

    /**
     * "24 roles · 7 levels", as the drawing's toolbar reads it. Levels are only named
     * once there is a chart to have them.
     * @returns {string}
     */
    countLine () {
      const roles = this.$tc('strategyPlanner.orgChart.roleCount', this.chart.roleCount, { count: this.chart.roleCount })
      if (!this.chart.levels) { return roles }
      const levels = this.$tc('strategyPlanner.orgChart.levelCount', this.chart.levels, { count: this.chart.levels })
      return this.$t('strategyPlanner.orgChart.countLine', { roles, levels })
    },

    /**
     * What the chart is worth saying about — never what it refuses.
     *
     * ⚠ THESE THREE SENTENCES ARE LIFTED FROM THE APPROVED DRAWING'S OWN PROSE, which is
     * the only place on this screen where the words are neither Mike's document's nor
     * separately ruled. They are marked as such in the locale file.
     *
     * @returns {Array<{key: string, text: string}>}
     */
    notices () {
      const found = checks(this.roles)
      const out = []
      if (found.outside.length) {
        out.push({
          key: 'outside',
          text: this.$tc('strategyPlanner.orgChart.noticeOutside', found.outside.length, {
            names: this.listOf(found.outside)
          })
        })
      }
      if (found.looped.length) {
        out.push({
          key: 'looped',
          text: this.$t('strategyPlanner.orgChart.noticeLoop', { names: this.listOf(found.looped) })
        })
      }
      if (found.tops.length > 1) {
        out.push({
          key: 'tops',
          text: this.$t('strategyPlanner.orgChart.noticeTops', {
            count: found.tops.length,
            names: this.listOf(found.tops)
          })
        })
      }
      return out
    }
  },

  methods: {
    /**
     * A list of names as one string. Separated rather than worded, so nothing is written
     * here that a locale file cannot change.
     * @param {string[]} names
     * @returns {string}
     */
    listOf (names) {
      return names.join(this.$t('strategyPlanner.orgChart.nameSeparator'))
    },

    /**
     * The field one of a role's two boxes saves into — the shape `StrategyCaptureBox` expects.
     * @param {{id: number}} role
     * @param {'name'|'person'} part
     * @returns {{key: string, example: string}}
     */
    boxField (role, part) {
      // No placeholder: his worked example is a whole chart, loaded by the button above,
      // never a ghost word inside an empty row.
      return { key: roleKey(role.id, part), example: '' }
    },

    /**
     * Who this role may report to — every OTHER role already entered, and whatever it
     * already holds.
     *
     * 🔴 A PICKER, NEVER FREE TEXT, AND NEVER ITS OWN ROW — the drawing's rule. It is
     * excluded by id and not by name, or two roles a client has given the same name would
     * remove each other from the list.
     *
     * ⚠ AND WHATEVER IS ALREADY HELD STAYS IN THE LIST EVEN WHERE IT IS NOT A ROLE. His own
     * example puts `Shareholders` here and `Shareholders` is not one of the 24; dropping it
     * because the picker could not have produced it would silently delete the top of his
     * chart the first time the row was touched.
     *
     * @param {{id: number, reportsTo: string}} role
     * @returns {string[]}
     */
    headOptions (role) {
      const seen = {}
      const out = []
      const held = String(role.reportsTo || '').trim()
      if (held) { seen[held] = true; out.push(held) }
      this.roles.forEach((r) => {
        const name = String(r.name || '').trim()
        if (!name || r.id === role.id || seen[name]) { return }
        seen[name] = true
        out.push(name)
      })
      return out
    },

    /**
     * Save one box, and the roster with it where the roster does not yet name this role.
     *
     * 🔴 THE ROSTER IS WHAT MAKES A ROW REAL. The opening blank row exists only on screen
     * until this runs, so the first keystroke has to record that the role exists as well as
     * what it holds — two entries, one save, or a reload would lose the row.
     *
     * @param {{id: number}} role
     * @param {'name'|'head'} part
     * @param {string} value
     */
    saveBox (role, part, value) {
      const known = this.roles.some(r => r.id === role.id)
      const entries = [{ fieldKey: roleKey(role.id, part), value }]
      if (!known) {
        entries.unshift({
          fieldKey: ROSTER_KEY,
          value: this.roles.map(r => r.id).concat([role.id]).join(',')
        })
      }
      // { entries: [{ fieldKey, value }] } — one or more boxes, saved together
      this.$emit('fields-changed', { entries })
    },

    /**
     * The row and the column a box belongs to.
     *
     * Resolved from the field key rather than passed down the template, because
     * `StrategyCaptureBox` emits `(field, value)` and an inline handler would receive only
     * the first of them — which silently saves a field object where a role name belongs.
     *
     * @param {{key: string}} field
     * @returns {?{role: object, part: string}}
     */
    boxOfField (field) {
      const key = (field && field.key) || ''
      const parts = ['name', 'person']
      for (let i = 0; i < parts.length; i++) {
        const role = this.rows.find(r => roleKey(r.id, parts[i]) === key)
        if (role) { return { role, part: parts[i] } }
      }
      return null
    },

    /**
     * The advisor typed in one of a role's two boxes.
     * @param {{key: string}} field
     * @param {string} value
     */
    onBoxInput (field, value) {
      const hit = this.boxOfField(field)
      if (!hit) { return }
      if (hit.part === 'name') { this.onNameInput(hit.role, value) } else {
        // A person's name is only ever their own; nothing else in the chart points at it.
        this.saveBox(hit.role, 'person', String(value === null || value === undefined ? '' : value))
      }
    },

    /**
     * The advisor typed a role's name.
     *
     * 🔴 A RENAME CARRIES TO EVERYONE WHO REPORTS TO IT. Reporting Head holds a NAME, so
     * renaming "COO" would otherwise leave four roles reporting to a role that no longer
     * exists — they would drop off the chart and reappear under a dashed outside parent
     * called COO. This is the one behaviour the drawing does not describe; it is here
     * because the alternative is a wrong chart arrived at silently.
     *
     * @param {{id: number, name: string}} role
     * @param {string} value
     */
    onNameInput (role, value) {
      const next = String(value === null || value === undefined ? '' : value)
      const was = String(role.name || '').trim()
      const moved = (was && was !== next.trim())
        ? renameCascade(this.roles, role.id, next).filter((r) => {
          const before = this.roles.find(x => x.id === r.id)
          return before && r.id !== role.id && before.reportsTo !== r.reportsTo
        })
        : []

      if (!moved.length) {
        this.saveBox(role, 'name', next)
        return
      }

      const entries = [{ fieldKey: roleKey(role.id, 'name'), value: next }]
      moved.forEach((r) => {
        entries.push({ fieldKey: roleKey(r.id, 'head'), value: r.reportsTo })
      })
      this.$emit('fields-changed', { entries })
    },

    /**
     * The advisor chose who this role reports to.
     * @param {{id: number}} role
     * @param {string} value
     */
    onHeadInput (role, value) {
      this.saveBox(role, 'head', String(value === null || value === undefined ? '' : value))
    },

    /**
     * The advisor moved into one of a role's boxes — Decision 11's timeline, unchanged.
     * @param {{key: string}} field
     */
    onBoxFocus (field) {
      // { fieldKey } — which box is now open, so spoken words can reach it later
      this.$emit('field-opened', { fieldKey: field.key })
    },

    /**
     * Spoken words, for the box that was tapped. Saved on the same event as typing, so a
     * dictated role and a typed one are the same thing to everything downstream.
     * @param {string} fieldKey
     * @param {string} transcript
     */
    emitVoice (fieldKey, transcript) {
      this.onBoxInput({ key: fieldKey }, String(transcript || ''))
    },

    /** One more role, at the end of the list. */
    addRole () {
      const id = nextRoleId(this.roles, this.entries)
      if (!id) { return }
      this.$emit('fields-changed', {
        entries: [{ fieldKey: ROSTER_KEY, value: this.roles.map(r => r.id).concat([id]).join(',') }]
      })
    },

    /**
     * Remove a role.
     *
     * Only the roster changes: the role's own boxes are left where they are and never read
     * again, because `nextRoleId` issues an id above every one this session has EVER used —
     * which is why it is given the entries and not just the roster. That is what lets a row
     * be removed with no DELETE route and no risk of a later role inheriting a removed one's
     * name. Get that wrong and removing the last role, then adding one, hands the advisor a
     * "blank" row with the removed person still in it.
     *
     * @param {{id: number}} role
     */
    removeRole (role) {
      const left = this.roles.filter(r => r.id !== role.id)
      if (left.length === this.roles.length) { return }
      this.$emit('fields-changed', {
        entries: [{ fieldKey: ROSTER_KEY, value: left.map(r => r.id).join(',') }]
      })
    },

    /**
     * Decision A of 2026-09-21: his 24 roles, in one click.
     *
     * 49 entries — the roster, and the two boxes of his that hold anything. His workbook names
     * no PEOPLE at all, so the third box of each role is empty and is not written; that is
     * what keeps this inside the route's ceiling of 60 for one save. See `entriesForRoles`.
     */
    startFromExample () {
      const example = Array.isArray(this.shape.example) ? this.shape.example : []
      if (!example.length) { return }
      const roles = example.slice(0, MAX_ROLES).map((r, i) => ({
        id: i + 1,
        name: r.name || '',
        // His document is roles, not people. Nothing invents a person here.
        person: '',
        reportsTo: r.reportsTo || ''
      }))
      this.$emit('fields-changed', { entries: entriesForRoles(roles) })
    },

    /** Back to one empty row. The roster is emptied; nothing else needs saying. */
    clearAll () {
      this.$emit('fields-changed', { entries: [{ fieldKey: ROSTER_KEY, value: '' }] })
    }
  }
}
</script>

<style scoped>
/* The builder, from the approved drawing: a bordered card whose toolbar sits on the
   same wash as every other heading strip on these screens. */
.socb-app {
  border: 1px solid #d5e1ee;
  border-radius: 11px;
  overflow: hidden;
  margin: 12px 0 14px;
}

.socb-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 11px 14px;
  background: #f1f6fb;
  border-bottom: 1px solid #d5e1ee;
}

/* The drawing puts both toolbar buttons on the brand's Blue — `#0070C0`, which
   BRAND-TOKENS.md names as "Primary interactive (buttons, sliders, links) on light".
   Buefy's stock `is-primary` is its own violet, so the class alone would not draw what
   was approved. Scoped to this toolbar; nothing else on the page is touched. */
.socb-bar .socb-btn {
  background: #0070c0;
  border-color: #0070c0;
  color: #fff;
}

.socb-bar .socb-btn.is-outlined {
  background: #fff;
  color: #0070c0;
}

.socb-bar .socb-btn.is-outlined:hover {
  background: #0070c0;
  color: #fff;
}

.socb-count {
  margin-left: auto;
  font-size: 12px;
  color: #6b7f99;
}

.socb-tbl {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.socb-tbl th {
  text-align: left;
  background: #f1f6fb;
  color: #002b64;
  font-size: 13.5px;
  padding: 9px 12px;
  border-bottom: 2px solid #0070c0;
  vertical-align: top;
}

.socb-tbl td {
  border-top: 1px solid #d5e1ee;
  padding: 7px 10px;
  vertical-align: middle;
}

.socb-tbl th.socb-num,
.socb-tbl td.socb-num {
  width: 54px;
  text-align: center;
}

.socb-tbl td.socb-num {
  color: #6b7f99;
  font-size: 12px;
}

.socb-tbl th.socb-act,
.socb-tbl td.socb-act {
  width: 46px;
  text-align: center;
}

.socb-rm {
  border: 0;
  background: none;
  color: #c0392b;
  font-size: 17px;
  line-height: 1;
  opacity: 0.55;
  cursor: pointer;
  padding: 0 4px;
}

.socb-rm:hover,
.socb-rm:focus {
  opacity: 1;
}

/* The notice from the drawing: amber, and never in the way. */
.socb-flag {
  display: flex;
  gap: 9px;
  align-items: flex-start;
  border: 1px solid #f0d8a8;
  background: #fdf8ec;
  border-radius: 9px;
  padding: 10px 13px;
  margin: 0 0 10px;
  font-size: 13px;
  color: #23405f;
}

.socb-dot {
  color: #d79a1d;
  font-size: 15px;
  line-height: 1.2;
}

@media (max-width: 720px) {
  .socb-count {
    margin-left: 0;
  }
}
</style>
