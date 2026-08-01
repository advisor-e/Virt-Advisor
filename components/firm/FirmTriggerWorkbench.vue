<template lang="pug">
section.firm-trigger-workbench
  .box
    h3.title.is-6.mb-1 {{ $t('firmTriggerWorkbench.heading') }}
    p.is-size-7.has-text-grey.mb-4 {{ $t('firmTriggerWorkbench.lede') }}

    b-message(v-if="error" type="is-danger" has-icon :closable="false") {{ error }}

    //- ── Tool 1: what does the engine do with this sentence? ──────────────
    //- Works with no table selected: it asks a question about the whole
    //- engine, not about one table.
    .tw-tool
      h4.tw-tool-heading {{ $t('firmTriggerWorkbench.probeHeading') }}
      p.is-size-7.has-text-grey.mb-2 {{ $t('firmTriggerWorkbench.probeHint') }}

      b-field
        b-input(
          v-model="probeText"
          type="textarea"
          rows="2"
          :placeholder="$t('firmTriggerWorkbench.probePlaceholder')"
          :aria-label="$t('firmTriggerWorkbench.probeHint')"
          @keydown.native.enter.exact.prevent="runProbe"
        )
      .tw-actions
        b-button(
          type="is-primary"
          size="is-small"
          :loading="probing"
          :disabled="!probeText.trim() || probing"
          @click="runProbe"
        ) {{ probing ? $t('firmTriggerWorkbench.probeRunning') : $t('firmTriggerWorkbench.probeButton') }}

      p.tw-empty(v-if="!probeResult && !probing") {{ $t('firmTriggerWorkbench.probeEmpty') }}

      .tw-result(v-if="probeResult")
        b-message.mb-3(
          v-if="probeResult.truncated"
          type="is-warning"
          size="is-small"
          :closable="false"
        ) {{ $t('firmTriggerWorkbench.truncated', { count: probeResult.text.length }) }}

        dl.tw-facts
          dt {{ $t('firmTriggerWorkbench.labelDomain') }}
          dd
            span(v-if="probeResult.domains.length")
              b-tag.mr-1(v-for="d in probeResult.domains" :key="d.id" type="is-info is-light") {{ d.label }}
            span.has-text-grey(v-else) {{ $t('firmTriggerWorkbench.noDomain') }}

          dt {{ $t('firmTriggerWorkbench.labelTables') }}
          dd
            span.has-text-grey(v-if="!probeResult.tables.length") {{ $t('firmTriggerWorkbench.noTables') }}
            ul.tw-tablelist(v-else)
              //- The FIRST row is the winner the engine acts on; the rest still
              //- get walked when they score, which is why every scoring table is
              //- listed rather than only the top one.
              li(v-for="t in probeResult.tables" :key="t.id")
                span.tw-tablename {{ t.name || t.id }}
                span.tw-matched(v-if="t.matched && t.matched.length")
                  | {{ $t('firmTriggerWorkbench.matchedOn') }}:
                  span.tw-phrase(v-for="p in t.matched" :key="p") “{{ p }}”

          dt {{ $t('firmTriggerWorkbench.labelProblems') }}
          dd
            span.has-text-grey(v-if="!probeResult.signals.length") {{ $t('firmTriggerWorkbench.none') }}
            ul.tw-signals(v-else)
              li(v-for="s in probeResult.signals" :key="s.name") {{ s.description }}

        //- Wording comes from the server (phraseProbe.NOT_MEASURED) rather than
        //- this locale file on purpose: the API and every surface must state the
        //- same limit, and a second copy here would drift from the engine's.
        .tw-limits(v-if="probeResult.notMeasured && probeResult.notMeasured.length")
          p.tw-limit-line(v-for="n in probeResult.notMeasured" :key="n.layer")
            strong {{ $t('firmTriggerWorkbench.notIncludedLabel') }}
            |  {{ n.reason }}

    //- ── Tool 2: what would this wording change move? ─────────────────────
    //- Needs a table, because a proposal is always a proposal about one table.
    .tw-tool
      h4.tw-tool-heading {{ $t('firmTriggerWorkbench.previewHeading') }}
      p.is-size-7.has-text-grey.mb-2 {{ $t('firmTriggerWorkbench.previewHint') }}

      p.tw-empty(v-if="!table") {{ $t('firmTriggerWorkbench.previewNeedsTable') }}

      div(v-else)
        p.is-size-7.mb-3
          | {{ $t('firmTriggerWorkbench.previewFor') }}
          strong.ml-1 {{ table.label }}

        .columns.is-variable.is-2
          .column
            b-field(:label="$t('firmTriggerWorkbench.addLabel')" label-position="on-border")
              b-input(
                v-model="addText"
                type="textarea"
                rows="3"
                :placeholder="$t('firmTriggerWorkbench.phrasePlaceholder')"
              )
          .column
            b-field(:label="$t('firmTriggerWorkbench.removeLabel')" label-position="on-border")
              b-input(
                v-model="removeText"
                type="textarea"
                rows="3"
                :placeholder="$t('firmTriggerWorkbench.phrasePlaceholder')"
              )

        .tw-actions
          b-button(
            type="is-primary"
            size="is-small"
            :loading="previewing"
            :disabled="!hasPhrases || previewing"
            @click="runPreview"
          ) {{ previewing ? $t('firmTriggerWorkbench.previewRunning') : $t('firmTriggerWorkbench.previewButton') }}
          span.tw-hint(v-if="!hasPhrases") {{ $t('firmTriggerWorkbench.previewNeedsPhrases') }}

        .tw-result(v-if="preview")
          p.is-size-7.has-text-grey.mb-3
            | {{ $t('firmTriggerWorkbench.phraseCount', { before: preview.triggersBefore, after: preview.triggersAfter }) }}

          b-message.mb-3(
            v-if="preview.phrasesIgnored > 0"
            type="is-warning"
            size="is-small"
            :closable="false"
          ) {{ $t('firmTriggerWorkbench.phrasesIgnored', { count: preview.phrasesIgnored, max: preview.caps.maxPhrases }) }}

          h5.tw-res-heading {{ $t('firmTriggerWorkbench.gainedHeading') }} ({{ preview.gained.length }})
          p.tw-none(v-if="!preview.gained.length") {{ $t('firmTriggerWorkbench.gainedNone') }}
          ul.tw-moves(v-else)
            li(v-for="g in preview.gained" :key="g.id" :class="{ 'is-taken': !!g.takenFrom }")
              p.tw-sentence “{{ g.text }}”
              p.tw-move-detail
                | {{ $t('firmTriggerWorkbench.takenFrom') }}:
                strong.ml-1 {{ nameFor(g.takenFrom) }}
              //- Taking a conversation from another table is the expensive
              //- mistake this whole tool exists to catch, so it is called out
              //- rather than left for the reader to spot in a list.
              p.tw-warning(v-if="g.takenFrom") {{ $t('firmTriggerWorkbench.takenWarning') }}

          h5.tw-res-heading {{ $t('firmTriggerWorkbench.lostHeading') }} ({{ preview.lost.length }})
          p.tw-none(v-if="!preview.lost.length") {{ $t('firmTriggerWorkbench.lostNone') }}
          ul.tw-moves(v-else)
            li.is-taken(v-for="l in preview.lost" :key="l.id")
              p.tw-sentence “{{ l.text }}”
              p.tw-move-detail
                | {{ $t('firmTriggerWorkbench.wentTo') }}:
                strong.ml-1 {{ nameFor(l.wentTo) }}

          template(v-if="preview.otherMoves && preview.otherMoves.length")
            h5.tw-res-heading {{ $t('firmTriggerWorkbench.otherHeading') }} ({{ preview.otherMoves.length }})
            ul.tw-moves
              li(v-for="o in preview.otherMoves" :key="o.id")
                p.tw-sentence “{{ o.text }}”
                p.tw-move-detail {{ nameFor(o.before) }} → {{ nameFor(o.after) }}

          p.tw-unchanged {{ $t('firmTriggerWorkbench.unchangedLine', { count: preview.unchanged }) }}

          //- Both limits below are the SERVER's wording, for the same reason as
          //- the probe's: one statement of a limit, not one per surface.
          .tw-limits
            p.tw-limits-heading {{ $t('firmTriggerWorkbench.limitsHeading') }}
            p.tw-limit-line
              strong {{ $t('firmTriggerWorkbench.corpusLabel') }}
              |  {{ preview.corpusLimit }}
            p.tw-limit-line(v-for="n in (preview.notMeasured || [])" :key="n.layer")
              strong {{ $t('firmTriggerWorkbench.notIncludedLabel') }}
              |  {{ n.reason }}
</template>

<script>
/**
 * Firm Trigger Workbench — Step 2 of the trigger tooling (ACTIONS
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
  name: 'FirmTriggerWorkbench',

  props: {
    /** Bearer token for the firm-manager API (the server re-checks every call). */
    apiToken: { type: String, required: true },
    /**
     * The logic table currently open in the parent, or null. Only the wording
     * preview needs it — a proposal is always about one table.
     */
    table: {
      type: Object,
      default: null,
      validator: v => v === null || typeof v.id === 'string'
    },
    /**
     * id -> readable table name, supplied by the parent which already holds the
     * list. The preview route names the table a conversation was taken FROM by
     * its internal id (`staff_performance`); showing that to a firm manager
     * would be showing them a database key. Falls back to the id when a name is
     * genuinely unknown, rather than hiding which table was affected.
     */
    tableNames: {
      type: Object,
      default: () => ({})
    }
  },

  data () {
    return {
      error: '',
      /** Tool 1 — the sentence being tried, and the engine's answer. */
      probeText: '',
      probing: false,
      probeResult: null,
      /** Tool 2 — the proposed phrases (one per line) and the resulting preview. */
      addText: '',
      removeText: '',
      previewing: false,
      preview: null
    }
  },

  computed: {
    /** Phrases typed to add, cleaned the same way the server cleans them. */
    addPhrases () { return this.splitPhrases(this.addText) },

    /** Phrases typed to remove. */
    removePhrases () { return this.splitPhrases(this.removeText) },

    /** The preview route rejects an empty proposal, so the button waits for one. */
    hasPhrases () { return this.addPhrases.length > 0 || this.removePhrases.length > 0 }
  },

  watch: {
    /**
     * A preview belongs to the table it was run against. Leaving a stale result
     * on screen after the parent opens a different table would attribute one
     * table's consequences to another — the precise confusion this tool exists
     * to remove.
     */
    table () {
      this.preview = null
      this.addText = ''
      this.removeText = ''
    }
  },

  methods: {
    /**
     * Readable name for a logic table id, for the "taken from" / "went to"
     * lines. Falls back to the id — never to a blank, which would read as
     * "taken from nothing" and is the opposite of the truth.
     *
     * @param {string|null} id
     * @returns {string} the table's name, the id, or the no-table wording
     */
    nameFor (id) {
      if (!id) { return this.$t('firmTriggerWorkbench.takenFromNothing') }
      return this.tableNames[id] || id
    },

    /**
     * Split a textarea into phrases, one per line.
     * @param {string} raw
     * @returns {string[]} non-empty trimmed lines
     */
    splitPhrases (raw) {
      return String(raw || '')
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
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
        this.error = this.$t('firmTriggerWorkbench.checkFailed')
        this.probeResult = null
      } finally {
        this.probing = false
      }
    },

    /** Preview a trigger change against the whole corpus. Saves nothing. */
    async runPreview () {
      if (!this.table || !this.hasPhrases || this.previewing) { return }
      this.previewing = true
      this.error = ''
      try {
        this.preview = await this.api(
          'POST',
          `/api/firm-manager/logic-trees/${encodeURIComponent(this.table.id)}/preview-triggers`,
          { add: this.addPhrases, remove: this.removePhrases }
        )
      } catch (err) {
        this.error = this.$t('firmTriggerWorkbench.checkFailed')
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
