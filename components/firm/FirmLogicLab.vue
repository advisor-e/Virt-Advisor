<template lang="pug">
section.firm-logic-lab
  .box
    h3.title.is-6.mb-1 {{ $t('firmLogicLab.heading') }}
    p.is-size-7.has-text-grey.mb-4 {{ $t('firmLogicLab.lede') }}

    b-message(v-if="error" type="is-danger" has-icon :closable="false") {{ error }}

    //- ── Tool 1: what does the engine do with this sentence? ──────────────
    //- Works with no table selected: it asks a question about the whole
    //- engine, not about one table.
    .tw-tool
      h4.tw-tool-heading {{ $t('firmLogicLab.probeHeading') }}
      p.is-size-7.has-text-grey.mb-2 {{ $t('firmLogicLab.probeHint') }}

      b-field
        b-input(
          v-model="probeText"
          type="textarea"
          rows="2"
          :placeholder="$t('firmLogicLab.probePlaceholder')"
          :aria-label="$t('firmLogicLab.probeHint')"
          @keydown.native.enter.exact.prevent="runProbe"
        )
      .tw-actions
        b-button(
          type="is-primary"
          size="is-small"
          :loading="probing"
          :disabled="!probeText.trim() || probing"
          @click="runProbe"
        ) {{ probing ? $t('firmLogicLab.probeRunning') : $t('firmLogicLab.probeButton') }}

      p.tw-empty(v-if="!probeResult && !probing") {{ $t('firmLogicLab.probeEmpty') }}

      .tw-result(v-if="probeResult")
        b-message.mb-3(
          v-if="probeResult.truncated"
          type="is-warning"
          size="is-small"
          :closable="false"
        ) {{ $t('firmLogicLab.truncated', { count: probeResult.text.length }) }}

        dl.tw-facts
          dt {{ $t('firmLogicLab.labelDomain') }}
          dd
            span(v-if="probeResult.domains.length")
              b-tag.mr-1(v-for="d in probeResult.domains" :key="d.id" type="is-info is-light") {{ d.label }}
            span.has-text-grey(v-else) {{ $t('firmLogicLab.noDomain') }}

          dt {{ $t('firmLogicLab.labelTables') }}
          dd
            span.has-text-grey(v-if="!probeResult.tables.length") {{ $t('firmLogicLab.noTables') }}
            ul.tw-tablelist(v-else)
              //- The FIRST row is the winner the engine acts on; the rest still
              //- get walked when they score, which is why every scoring table is
              //- listed rather than only the top one.
              li(v-for="t in probeResult.tables" :key="t.id")
                span.tw-tablename {{ t.name || t.id }}
                span.tw-matched(v-if="t.matched && t.matched.length")
                  | {{ $t('firmLogicLab.matchedOn') }}:
                  span.tw-phrase(v-for="p in t.matched" :key="p") “{{ p }}”

          dt {{ $t('firmLogicLab.labelProblems') }}
          dd
            span.has-text-grey(v-if="!probeResult.signals.length") {{ $t('firmLogicLab.none') }}
            ul.tw-signals(v-else)
              li(v-for="s in probeResult.signals" :key="s.name") {{ s.description }}

          //- Advisory Distinctions — the firm's own IP, and the single biggest
          //- editable lever. Judged by the AI for this sentence, for real.
          dt {{ $t('firmLogicLab.labelDistinctions') }}
          dd
            template(v-if="probeResult.distinctions")
              //- 🔴 FIRST, before every other case. This block used to print "None
              //- matched. The AI read all N in this area." on a call that died in
              //- ~100ms — the sentence Mike watched it produce with a broken
              //- certificate on 2026-08-03. Wording approved the same day (S3):
              //- design/WORDING-DISTINCTION-AI-FAILURE.md
              span.tw-dist-fault(v-if="probeResult.distinctions.aiFailed") {{ $t('firmLogicLab.distAiFailed') }}
              span.has-text-grey(v-else-if="probeResult.distinctions.reason") {{ probeResult.distinctions.reason }}
              template(v-else-if="probeResult.distinctions.matched.length")
                ul.tw-distinctions
                  li(v-for="d in probeResult.distinctions.matched" :key="d.id")
                    span.tw-dist-desc {{ d.description }}
                    b-tag.ml-1(v-if="d.source && d.source !== 'platform'" type="is-warning is-light" size="is-small") {{ $t('firmLogicLab.distYours') }}
                    //- The boost is the whole reason a distinction matters: it is
                    //- what moves a template up the ranking.
                    span.tw-dist-boost {{ $t('firmLogicLab.distBoost', { boost: d.boost, count: d.templates.length }) }}
                p.tw-dist-note {{ $t('firmLogicLab.distConsidered', { count: probeResult.distinctions.considered }) }}
              template(v-else)
                span.has-text-grey {{ $t('firmLogicLab.distNone') }}
                span.tw-dist-note.ml-1 {{ $t('firmLogicLab.distConsidered', { count: probeResult.distinctions.considered }) }}

        //- Wording comes from the server (phraseProbe.NOT_MEASURED) rather than
        //- this locale file on purpose: the API and every surface must state the
        //- same limit, and a second copy here would drift from the engine's.
        .tw-limits(v-if="probeResult.notMeasured && probeResult.notMeasured.length")
          p.tw-limit-line(v-for="n in probeResult.notMeasured" :key="n.layer")
            strong {{ $t('firmLogicLab.notIncludedLabel') }}
            |  {{ n.reason }}

    //- ── Tool 2: what would this wording change move? ─────────────────────
    //- Needs a table, because a proposal is always a proposal about one table.
    .tw-tool
      h4.tw-tool-heading {{ $t('firmLogicLab.previewHeading') }}
      p.is-size-7.has-text-grey.mb-2 {{ $t('firmLogicLab.previewHint') }}

      //- The table is picked HERE. The lab is a tab in the Firm Manager hub, so
      //- it cannot inherit whichever table another screen happened to have open.
      b-field(:label="$t('firmLogicLab.pickTable')" label-position="on-border")
        b-select(
          v-model="selectedId"
          :placeholder="$t('firmLogicLab.pickTableNone')"
          :loading="loadingList"
          expanded
        )
          option(v-for="row in tables" :key="row.id" :value="row.id") {{ row.label }}

      p.tw-empty(v-if="!selectedTable") {{ $t('firmLogicLab.previewNeedsTable') }}

      div(v-else)
        p.is-size-7.mb-3
          | {{ $t('firmLogicLab.previewFor') }}
          strong.ml-1 {{ selectedTable.label }}

        p.tw-current-hint {{ $t('firmLogicLab.currentHint') }}

        //- SAME TWO COLUMNS, SAME LABELS, SAME POSITIONS as the first build. The
        //- only change is that they now hold the table's REAL phrases instead of
        //- two empty text boxes: the left starts prepopulated (green), the right
        //- is what you are taking away (red), and a click moves a phrase either
        //- way. Editing blind, and a removal with no way back, were the faults.
        .columns.is-variable.is-2
          .column
            b-field(:label="$t('firmLogicLab.addLabel')" label-position="on-border")
              .tw-panel.is-keep
                //- Typing a brand-new phrase stays possible — it lands in this
                //- same list, dashed, so your own words are never confused with
                //- the ones the table already carried.
                .tw-newrow
                  b-input(
                    v-model="newPhrase"
                    size="is-small"
                    :placeholder="$t('firmLogicLab.phrasePlaceholder')"
                    @keydown.native.enter.prevent="addNewPhrase"
                  )
                  b-button(
                    size="is-small"
                    type="is-success"
                    :disabled="!canAddNew"
                    @click="addNewPhrase"
                  ) {{ $t('firmLogicLab.addButton') }}
                b-loading(:is-full-page="false" :active="loadingTriggers")
                p.tw-none(v-if="!loadingTriggers && !keptPhrases.length") {{ $t('firmLogicLab.currentNone') }}
                .tw-chips(v-else-if="!loadingTriggers")
                  button.tw-chip.is-keep(
                    v-for="phrase in keptPhrases"
                    :key="phrase"
                    type="button"
                    :class="{ 'is-new': addedPhrases.includes(phrase) }"
                    :title="$t('firmLogicLab.clickToRemove')"
                    @click="markForRemoval(phrase)"
                  )
                    | {{ phrase }}
                    span.tw-chip-arrow →
          .column
            b-field(:label="$t('firmLogicLab.removeLabel')" label-position="on-border")
              .tw-panel.is-drop
                p.tw-none(v-if="!removedPhrases.length") {{ $t('firmLogicLab.removeNone') }}
                .tw-chips(v-else)
                  button.tw-chip.is-drop(
                    v-for="phrase in removedPhrases"
                    :key="phrase"
                    type="button"
                    :title="$t('firmLogicLab.clickToKeep')"
                    @click="keepPhrase(phrase)"
                  )
                    span.tw-chip-arrow ←
                    | {{ phrase }}

        .tw-actions
          b-button(
            type="is-primary"
            size="is-small"
            :loading="previewing"
            :disabled="!hasPhrases || previewing"
            @click="runPreview"
          ) {{ previewing ? $t('firmLogicLab.previewRunning') : $t('firmLogicLab.previewButton') }}
          span.tw-hint(v-if="!hasPhrases") {{ $t('firmLogicLab.previewNeedsPhrases') }}

        .tw-result(v-if="preview")
          p.is-size-7.has-text-grey.mb-3
            | {{ $t('firmLogicLab.phraseCount', { before: preview.triggersBefore, after: preview.triggersAfter }) }}

          b-message.mb-3(
            v-if="preview.phrasesIgnored > 0"
            type="is-warning"
            size="is-small"
            :closable="false"
          ) {{ $t('firmLogicLab.phrasesIgnored', { count: preview.phrasesIgnored, max: preview.caps.maxPhrases }) }}

          h5.tw-res-heading {{ $t('firmLogicLab.gainedHeading') }} ({{ preview.gained.length }})
          p.tw-none(v-if="!preview.gained.length") {{ $t('firmLogicLab.gainedNone') }}
          ul.tw-moves(v-else)
            li(v-for="g in preview.gained" :key="g.id" :class="{ 'is-taken': !!g.takenFrom }")
              p.tw-sentence “{{ g.text }}”
              p.tw-move-detail
                | {{ $t('firmLogicLab.takenFrom') }}:
                strong.ml-1 {{ nameFor(g.takenFrom) }}
              //- Taking a conversation from another table is the expensive
              //- mistake this whole tool exists to catch, so it is called out
              //- rather than left for the reader to spot in a list.
              p.tw-warning(v-if="g.takenFrom") {{ $t('firmLogicLab.takenWarning') }}

          h5.tw-res-heading {{ $t('firmLogicLab.lostHeading') }} ({{ preview.lost.length }})
          p.tw-none(v-if="!preview.lost.length") {{ $t('firmLogicLab.lostNone') }}
          ul.tw-moves(v-else)
            li.is-taken(v-for="l in preview.lost" :key="l.id")
              p.tw-sentence “{{ l.text }}”
              p.tw-move-detail
                | {{ $t('firmLogicLab.wentTo') }}:
                strong.ml-1 {{ nameFor(l.wentTo) }}

          template(v-if="preview.otherMoves && preview.otherMoves.length")
            h5.tw-res-heading {{ $t('firmLogicLab.otherHeading') }} ({{ preview.otherMoves.length }})
            ul.tw-moves
              li(v-for="o in preview.otherMoves" :key="o.id")
                p.tw-sentence “{{ o.text }}”
                p.tw-move-detail {{ nameFor(o.before) }} → {{ nameFor(o.after) }}

          p.tw-unchanged {{ $t('firmLogicLab.unchangedLine', { count: preview.unchanged }) }}

          //- Both limits below are the SERVER's wording, for the same reason as
          //- the probe's: one statement of a limit, not one per surface.
          .tw-limits
            p.tw-limits-heading {{ $t('firmLogicLab.limitsHeading') }}
            p.tw-limit-line
              strong {{ $t('firmLogicLab.corpusLabel') }}
              |  {{ preview.corpusLimit }}
            p.tw-limit-line(v-for="n in (preview.notMeasured || [])" :key="n.layer")
              strong {{ $t('firmLogicLab.notIncludedLabel') }}
              |  {{ n.reason }}
</template>

<script>
/**
 * Firm Logic-Lab — named by Mike, 2026-08-02 (ACTIONS
 * #trigger-vocabulary-sweep). Step 1 built the backend on 2026-08-01
 * (`754d204`); this is the screen for it, and the first time any of it can be
 * seen.
 *
 * WHY IT EXISTS. Which logic table opens is decided by literal matching against
 * ~1,000 firm-editable trigger phrases across 42 tables, and nothing on any
 * screen showed that. On 2026-07-31 it produced two P1 defects in one day:
 * eight correct branches sat in a table that never opened, and short triggers
 * fired inside unrelated words. Both were found by a person reading code.
 *
 * TWO TOOLS, deliberately separate questions:
 *   1. "Try a sentence"      — what does the engine do with these words?
 *   2. "Try a wording change" — if I add or remove phrases, what moves?
 *
 * NOTHING HERE WRITES. Both routes are read-only; the preview merges its
 * proposal in memory for the length of the request and throws it away. The
 * component holds no save path at all, which is why it is safe to sit beside
 * the editor.
 *
 * It lives INSIDE the Logic Tables tab rather than becoming a third tab —
 * FIRM-EDITABLE-TABLES-PLAN §0.6 rules the hub to two tabs (Domain Support and
 * Logic Tables), and this is about logic-table triggers.
 *
 * HONEST LIMITS ARE PRINTED FROM THE SERVER, not from this locale file. The API
 * owns the wording of `notMeasured` and `corpusLimit` precisely so the engine
 * and every surface state the same limit; a second copy here would drift from
 * the thing it describes. UI chrome around them is translated as normal.
 */
export default {
  name: 'FirmLogicLab',

  props: {
    /** Bearer token for the firm-manager API (the server re-checks every call). */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      error: '',
      /** Every logic table, for the picker the wording half needs. */
      tables: [],
      loadingList: false,
      selectedId: null,
      /** The picked table's existing trigger phrases, shown so edits are not blind. */
      currentTriggers: [],
      loadingTriggers: false,
      /** Tool 1 — the sentence being tried, and the engine's answer. */
      probeText: '',
      probing: false,
      probeResult: null,
      /**
       * Tool 2 — the proposal, held as LISTS rather than free text. The two boxes
       * show the table's real phrases and a click moves one between them, so the
       * on-screen state and what gets sent can never drift apart.
       */
      addedPhrases: [],
      removedPhrases: [],
      /** The box for typing a phrase the table does not carry yet. */
      newPhrase: '',
      previewing: false,
      preview: null
    }
  },

  computed: {
    /**
     * The picked table, or null. "Try a sentence" never needs one; a wording
     * proposal is always a proposal about exactly one table.
     * @returns {{id:string,label:string}|null}
     */
    selectedTable () {
      if (!this.selectedId) { return null }
      const row = this.tables.find(t => t.id === this.selectedId)
      return row ? { id: row.id, label: row.label } : null
    },

    /**
     * id -> readable name. The preview route names the table a conversation was
     * taken FROM by its internal id (`staff_performance`); showing that to a
     * firm manager would be showing them a database key.
     * @returns {Object<string,string>}
     */
    tableNames () {
      const map = {}
      for (const row of this.tables) { map[row.id] = row.label }
      return map
    },

    /**
     * The left-hand list: what this table would open on if the change were saved
     * — its existing phrases, less anything marked for removal, plus anything
     * typed. This is the whole point of prepopulating: the box shows the RESULT,
     * not a blank to guess into.
     * @returns {string[]}
     */
    keptPhrases () {
      const gone = this.removedPhrases
      return this.currentTriggers
        .filter(p => !gone.includes(p))
        .concat(this.addedPhrases.filter(p => !gone.includes(p)))
    },

    /** A phrase the table already carries cannot be "added" again. */
    canAddNew () {
      const v = this.newPhrase.trim().toLowerCase()
      if (!v) { return false }
      return !this.currentTriggers.concat(this.addedPhrases)
        .some(p => p.toLowerCase() === v)
    },

    /** The preview route rejects an empty proposal, so the button waits for one. */
    hasPhrases () { return this.addedPhrases.length > 0 || this.removedPhrases.length > 0 }
  },

  watch: {
    /**
     * A preview belongs to the table it was run against. Leaving a stale result
     * on screen after a different table is picked would attribute one table's
     * consequences to another — the precise confusion this tool exists to remove.
     */
    selectedId () {
      this.preview = null
      this.addedPhrases = []
      this.removedPhrases = []
      this.newPhrase = ''
      this.currentTriggers = []
      this.loadTriggers()
    }
  },

  mounted () {
    this.loadTables()
  },

  methods: {
    /**
     * Fill the picker from the logic-table list route. A failure is shown, never
     * swallowed: an empty dropdown with no message reads as "this firm has no
     * logic tables", which would be false.
     */
    async loadTables () {
      this.loadingList = true
      try {
        const data = await this.api('GET', '/api/firm-manager/logic-trees')
        this.tables = [...(data.doTheJob || []), ...(data.getTheJob || []), ...(data.getOrganised || [])]
          .map(row => ({ id: row.id, label: row.label }))
          .sort((a, b) => String(a.label).localeCompare(String(b.label)))
      } catch (err) {
        this.error = this.$t('firmLogicLab.listFailed')
      } finally {
        this.loadingList = false
      }
    },

    /**
     * Readable name for a logic table id, for the "taken from" / "went to"
     * lines. Falls back to the id — never to a blank, which would read as
     * "taken from nothing" and is the opposite of the truth.
     *
     * @param {string|null} id
     * @returns {string} the table's name, the id, or the no-table wording
     */
    nameFor (id) {
      if (!id) { return this.$t('firmLogicLab.takenFromNothing') }
      return this.tableNames[id] || id
    },

    /**
     * The picked table's existing trigger phrases. Read-only; the same detail
     * route the branch editor uses, which now returns `entryTriggers`.
     */
    async loadTriggers () {
      if (!this.selectedId) { return }
      this.loadingTriggers = true
      try {
        const detail = await this.api('GET', `/api/firm-manager/logic-trees/${encodeURIComponent(this.selectedId)}`)
        this.currentTriggers = Array.isArray(detail.entryTriggers) ? detail.entryTriggers.slice().sort() : []
      } catch (err) {
        this.currentTriggers = []
        this.error = this.$t('firmLogicLab.currentFailed')
      } finally {
        this.loadingTriggers = false
      }
    },

    /**
     * Move a phrase from the left box to the right: this table would stop
     * opening on it. A phrase you typed yourself is simply discarded — it was
     * never one of the table's phrases, so listing it as "removed" would be a
     * lie about what the change does.
     * @param {string} phrase
     */
    markForRemoval (phrase) {
      const own = this.addedPhrases.indexOf(phrase)
      if (own > -1) {
        this.addedPhrases.splice(own, 1)
        return
      }
      if (!this.removedPhrases.includes(phrase)) { this.removedPhrases.push(phrase) }
    },

    /**
     * Move a phrase back to the left box — the undo for a mis-click, which the
     * first build had no way to offer.
     * @param {string} phrase
     */
    keepPhrase (phrase) {
      const at = this.removedPhrases.indexOf(phrase)
      if (at > -1) { this.removedPhrases.splice(at, 1) }
    },

    /** Add a phrase the table does not carry yet; it joins the left box. */
    addNewPhrase () {
      if (!this.canAddNew) { return }
      this.addedPhrases.push(this.newPhrase.trim())
      this.newPhrase = ''
    },

    /** Run one sentence through every deterministic layer. Read-only. */
    async runProbe () {
      const text = this.probeText.trim()
      if (!text || this.probing) { return }
      this.probing = true
      this.error = ''
      try {
        this.probeResult = await this.api('POST', '/api/firm-manager/logic-trees/probe', { text })
      } catch (err) {
        this.error = this.$t('firmLogicLab.checkFailed')
        this.probeResult = null
      } finally {
        this.probing = false
      }
    },

    /** Preview a trigger change against the whole corpus. Saves nothing. */
    async runPreview () {
      if (!this.selectedTable || !this.hasPhrases || this.previewing) { return }
      this.previewing = true
      this.error = ''
      try {
        this.preview = await this.api(
          'POST',
          `/api/firm-manager/logic-trees/${encodeURIComponent(this.selectedTable.id)}/preview-triggers`,
          { add: this.addedPhrases, remove: this.removedPhrases }
        )
      } catch (err) {
        this.error = this.$t('firmLogicLab.checkFailed')
        this.preview = null
      } finally {
        this.previewing = false
      }
    },

    /**
     * Thin authenticated fetch — mirrors FirmLogicTables so this component can
     * be mounted and tested on its own; the backend re-checks authorisation on
     * every call regardless of what the browser sends.
     *
     * @param {string} method HTTP verb
     * @param {string} path same-origin API path (proxied to Restify)
     * @param {Object} [body] JSON body
     * @returns {Promise<Object>} parsed JSON
     */
    async api (method, path, body) {
      const opts = { method, headers: { Authorization: `Bearer ${this.apiToken}` } }
      if (body) {
        opts.headers['Content-Type'] = 'application/json'
        opts.body = JSON.stringify(body)
      }
      const res = await fetch(path, opts)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err.error && err.error.message) || err.message || res.statusText)
      }
      return res.json()
    }
  }
}
</script>

<style scoped>
.tw-tool {
  padding-top: 1rem;
  margin-top: 1rem;
  border-top: 1px solid #ededed;
}
.tw-tool:first-of-type {
  padding-top: 0;
  margin-top: 0;
  border-top: 0;
}
.tw-tool-heading {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 0.15rem;
}
.tw-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.25rem;
}
.tw-hint,
.tw-empty {
  font-size: 0.75rem;
  color: #7a7a7a;
}
.tw-empty {
  margin-top: 0.75rem;
  font-style: italic;
}
.tw-result {
  margin-top: 1rem;
}

/* Facts grid — label column narrow, value column takes the rest. */
.tw-facts {
  display: grid;
  grid-template-columns: 9rem 1fr;
  gap: 0.4rem 1rem;
  font-size: 0.8rem;
}
.tw-facts dt {
  font-weight: 600;
  color: #4a4a4a;
}
.tw-facts dd {
  margin: 0;
}
.tw-distinctions {
  margin: 0;
  padding: 0;
  list-style: none;
}
.tw-distinctions li { margin-bottom: 0.35rem; }
.tw-dist-desc { font-weight: 600; }
.tw-dist-boost {
  display: block;
  color: #7a7a7a;
  font-size: 0.72rem;
}
.tw-dist-note {
  color: #8a94a3;
  font-size: 0.7rem;
  margin: 0.2rem 0 0;
}
/* "Could not be checked" is a fault, and must not read like the grey result
   notes above it — the whole defect was a fault dressed as a result. */
.tw-dist-fault {
  display: block;
  color: #9a3412;
  background: #fff7ed;
  border-left: 3px solid #ea580c;
  padding: 0.35rem 0.5rem;
  border-radius: 3px;
}

.tw-tablelist,
.tw-signals {
  margin: 0;
  padding: 0;
  list-style: none;
}
.tw-tablelist li {
  margin-bottom: 0.3rem;
}
.tw-tablename {
  font-weight: 600;
}
.tw-matched {
  display: block;
  color: #7a7a7a;
  font-size: 0.72rem;
}
.tw-phrase {
  margin-left: 0.35rem;
}

/* The two boxes. Green on the left is what the table opens on; red on the right
   is what you are taking away. Colour carries the meaning, so the state is
   readable without reading a label. */
.tw-panel {
  position: relative;
  border: 1px solid #dbdbdb;
  border-radius: 5px;
  padding: 0.6rem;
  min-height: 9rem;
  max-height: 22rem;
  overflow-y: auto;
}
.tw-panel.is-keep { border-color: #63c48d; background: #f7fdfa; }
.tw-panel.is-drop { border-color: #f0879e; background: #fffafb; }

.tw-newrow {
  display: flex;
  gap: 0.35rem;
  align-items: center;
  margin-bottom: 0.6rem;
}
.tw-newrow > .control,
.tw-newrow > :first-child { flex: 1; }

.tw-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}
.tw-chip {
  border: 1px solid;
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
  font-size: 0.72rem;
  font-family: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
.tw-chip.is-keep { color: #1f7a45; background: #eefaf2; border-color: #63c48d; }
.tw-chip.is-keep:hover { background: #dcf3e6; }
/* A phrase the firm typed: same list, dashed edge, so their own words are never
   confused with the ones the table already carried. */
.tw-chip.is-keep.is-new { border-style: dashed; font-weight: 700; }
.tw-chip.is-drop {
  color: #cc0f35;
  background: #feecf0;
  border-color: #f0879e;
  text-decoration: line-through;
}
.tw-chip.is-drop:hover { background: #fcdde4; }
.tw-chip-arrow { opacity: 0; font-weight: 700; text-decoration: none; }
.tw-chip:hover .tw-chip-arrow { opacity: 1; }

.tw-current-hint {
  font-size: 0.72rem;
  color: #7a7a7a;
  margin: 0 0 0.6rem;
}

/* Move lists — one card per affected sentence. */
.tw-res-heading {
  font-size: 0.8rem;
  font-weight: 700;
  margin: 0.9rem 0 0.35rem;
  color: #363636;
}
.tw-none {
  font-size: 0.78rem;
  color: #7a7a7a;
}
.tw-moves {
  margin: 0;
  padding: 0;
  list-style: none;
}
.tw-moves li {
  border-left: 3px solid #dbdbdb;
  padding: 0.4rem 0 0.4rem 0.6rem;
  margin-bottom: 0.4rem;
}
.tw-moves li.is-taken {
  border-left-color: #ff9f43;
  background: #fffaf3;
}
.tw-sentence {
  font-size: 0.78rem;
  margin: 0;
}
.tw-move-detail {
  font-size: 0.72rem;
  color: #7a7a7a;
  margin: 0.1rem 0 0;
}
.tw-warning {
  font-size: 0.72rem;
  color: #b35309;
  margin: 0.15rem 0 0;
  font-weight: 600;
}
.tw-unchanged {
  font-size: 0.75rem;
  color: #7a7a7a;
  margin-top: 0.75rem;
}

/* Limits — quiet, but never collapsible: a limit that can be hidden is a limit
   that will be missed, which is the failure this whole workbench guards. */
.tw-limits {
  margin-top: 1rem;
  padding: 0.6rem 0.75rem;
  background: #f7f7f9;
  border-radius: 5px;
}
.tw-limits-heading {
  font-size: 0.75rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}
.tw-limit-line {
  font-size: 0.72rem;
  color: #5a5a5a;
  margin: 0.15rem 0 0;
}
</style>
