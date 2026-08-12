<template lang="pug">
.tc-evidence
  //- ── What the logic table says ─────────────────────────────────
  //- The sentence the name was written in, with the name marked. For a formal
  //- template-list reference there is no sentence, so what stands in its place is
  //- which branches are asking for the document.
  .tc-part
    p.tc-plab {{ $t('templateCheck.evidence.whatTableSays') }}
    p.tc-sentence
      template(v-for="(part, i) in sentenceParts")
        mark(v-if="part.hit" :key="'s' + i") {{ part.text }}
        span(v-else :key="'p' + i") {{ part.text }}
    p.tc-branchlist(v-if="listBranches.length") {{ listBranches.join(' · ') }}

  //- ── Where it sits in the table ────────────────────────────────
  //- Ruled by Mike 2026-08-12: "just neighbouring branches - 1 above and below
  //- when possible." Nothing is padded — the first and last branch of a table
  //- show two rows, because an absent neighbour is absent, not hidden.
  .tc-part(v-if="finding.neighbours && finding.neighbours.length")
    p.tc-plab {{ $t('templateCheck.evidence.whereItSits') }}
    table.tc-mini
      thead
        tr
          th(style="width:27%") {{ $t('templateCheck.evidence.colBranch') }}
          th(style="width:31%") {{ $t('templateCheck.evidence.colIf') }}
          th(style="width:32%") {{ $t('templateCheck.evidence.colThen') }}
          th(style="width:10%") {{ $t('templateCheck.evidence.colNames') }}
      tbody
        tr(
          v-for="n in finding.neighbours"
          :key="n.ruleId"
          :class="{ 'tc-here': n.state === 'here' }"
        )
          td {{ n.branchName }}
          td {{ n.condition }}
          td {{ n.then }}
          td
            span.tc-unsettled(v-if="n.state === 'here'") {{ $t('templateCheck.evidence.thisRow') }}
            template(v-else-if="n.state === 'open'")
              span.tc-open {{ $t('templateCheck.verdict.' + n.verdict) }}
              br
              span.tc-open-name {{ n.title }}
            span.tc-settled(v-else)
              | {{ n.title ? $t('templateCheck.evidence.settledTitle', { title: n.title }) : $t('templateCheck.evidence.settled') }}
    p.tc-note {{ neighbourNote }}

  //- ── What the app can open ─────────────────────────────────────
  //- Everything that scored, best first, plus the closest the catalogue has where
  //- nothing scored at all. A suggestion that hides its rivals is how "Lite
  //- Fundamentals Data" was offered a framework about winning engagements.
  .tc-part(v-if="finding.candidates && finding.candidates.length")
    p.tc-plab
      | {{ hasStrong ? $t('templateCheck.evidence.whatAppCanOpen') : $t('templateCheck.evidence.weakerMatches') }}
    p.tc-note.tc-note--above(v-if="!hasStrong") {{ $t('templateCheck.evidence.weakerNote') }}
    .tc-cand(
      v-for="(c, i) in finding.candidates"
      :key="c.title + '-' + i"
      :class="{ 'tc-cand--best': i === 0 && !c.weak, 'tc-cand--weak': c.weak }"
    )
      .tc-cand-head
        span.tc-ctitle {{ c.title }}
        span.tc-cpath(v-if="c.path") {{ c.path }}
        span.tc-cwhy {{ c.weak ? c.why + ' · ' + $t('templateCheck.evidence.weakTag') : c.why }}
      p.tc-cpurpose(v-if="c.summary") {{ c.summary }}
</template>

<script>
/**
 * One Template Check row, opened out — the evidence a name is judged from.
 *
 * Built to two approved artefacts, and they are the authority on every word and
 * every column here:
 *   - design/mockups/template-check-evidence-row.html — the sentence, and the
 *     candidates with what each document says about itself.
 *   - design/mockups/template-check-table-context.html — the branch shown among
 *     its neighbours, approved by Mike on 2026-08-12 along with all seven labels
 *     ("good as they are").
 *
 * WHY IT EXISTS. Mike opened the screen on 2026-08-12 and said: "it's too hard to
 * tell what's required since it doesn't indicate against the json search content
 * script." A row gave a name, a branch title and at best a suggested title — never
 * the sentence, never what the suggested document actually is, and nothing at all
 * where no title scored above the confidence bar.
 *
 * The example that settles the design: `Decision Workpaper` matches no document
 * by name and never will — but the branch DIRECTLY ABOVE it is already ruled to
 * FM Board White Paper, and the two names share no words. Reading the table finds
 * it; matching cannot.
 *
 * It decides nothing and writes nothing. Every ruling button stays where it was
 * on the row, and the mini-table is deliberately read-only: editing a logic table
 * stays on the Logic Tables page, which is the whole reason Mike ruled the merge
 * this way round rather than the other.
 */
export default {
  name: 'TemplateCheckEvidence',

  props: {
    /**
     * One finding, exactly as GET /api/mentor/template-check returns it.
     * Carries `sentence`, `listedIn`, `candidates`, `neighbours` and
     * `tableBranches` alongside the fields the collapsed row already shows.
     */
    finding: { type: Object, required: true }
  },

  computed: {
    /**
     * The sentence, split so the name it was written in can be marked without
     * v-html — no user or AI text is ever put into the DOM as markup here.
     *
     * @returns {Array<{text: string, hit: boolean}>}
     */
    sentenceParts () {
      if (this.finding.sentence) {
        return this.highlight(this.finding.sentence, this.finding.name)
      }
      const listed = this.finding.listedIn
      if (!listed) { return [{ text: '', hit: false }] }
      // A formal reference has no sentence around it, and saying so plainly is
      // better than an empty panel that reads as missing evidence.
      const n = (listed.branches || []).length
      const field = listed.field || ''
      const text = this.$tc('templateCheck.evidence.namedInList', n, { field, n })
      return this.highlight(text, field)
    },

    /** The branches asking for the same document — a list reference only. */
    listBranches () {
      const listed = this.finding.listedIn
      return (listed && Array.isArray(listed.branches)) ? listed.branches : []
    },

    /**
     * Whether anything scored above the confidence bar. When nothing did, the
     * block is headed "Weaker matches" and says so, rather than presenting the
     * closest guesses as though they were suggestions.
     *
     * @returns {boolean}
     */
    hasStrong () {
      return (this.finding.candidates || []).some(c => !c.weak)
    },

    /**
     * How much of the table is on screen. A table with three branches shows all
     * three, and the note must not call that a sample.
     *
     * @returns {string}
     */
    neighbourNote () {
      const shown = (this.finding.neighbours || []).length
      const total = this.finding.tableBranches || shown
      if (shown >= total) { return this.$t('templateCheck.evidence.wholeTable') }
      return this.$t('templateCheck.evidence.neighbourNote', { shown, total })
    }
  },

  methods: {
    /**
     * Split text around every occurrence of a needle, case-insensitively.
     *
     * @param {string} text - the sentence.
     * @param {string} needle - the name as written in the table.
     * @returns {Array<{text: string, hit: boolean}>}
     */
    highlight (text, needle) {
      const t = String(text || '')
      const n = String(needle || '')
      if (!t || !n) { return [{ text: t, hit: false }] }
      const lower = t.toLowerCase()
      const ln = n.toLowerCase()
      const parts = []
      let i = 0
      while (i < t.length) {
        const at = lower.indexOf(ln, i)
        if (at < 0) {
          parts.push({ text: t.slice(i), hit: false })
          break
        }
        if (at > i) { parts.push({ text: t.slice(i, at), hit: false }) }
        parts.push({ text: t.slice(at, at + n.length), hit: true })
        i = at + n.length
      }
      return parts
    }
  }
}
</script>

<style scoped>
.tc-evidence {
  background: #fff;
}
.tc-part {
  padding: 1.05rem 0;
  border-bottom: 1px solid #f2f4f7;
}
.tc-part:first-child { padding-top: 0.2rem; }
.tc-part:last-child { border-bottom: 0; }

.tc-plab {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #002b64;
  font-weight: 700;
  margin: 0 0 0.55rem;
}

.tc-sentence {
  background: #f3f6fa;
  border-left: 3px solid #b8c6d8;
  border-radius: 0 4px 4px 0;
  padding: 0.7rem 0.9rem;
  font-size: 0.87rem;
  margin: 0;
}
.tc-sentence mark {
  background: #ffe9b8;
  padding: 0 0.15rem;
  border-radius: 2px;
  font-weight: 600;
}
.tc-branchlist {
  font-size: 0.79rem;
  color: #7a869a;
  margin: 0.6rem 0 0;
}

/* ── The branch among its neighbours ─────────────────────────── */
.tc-mini {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.79rem;
  border: 1px solid #e2e6ec;
  background: #fff;
  table-layout: fixed;
}
.tc-mini th {
  text-align: left;
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #002b64;
  background: #f4f6f9;
  padding: 0.4rem 0.55rem;
  border-bottom: 1px solid #d5dbe4;
}
.tc-mini td {
  padding: 0.5rem 0.55rem;
  border-bottom: 1px solid #eef1f5;
  vertical-align: top;
  color: #7a869a;
  word-break: break-word;
}
.tc-mini tr:last-child td { border-bottom: 0; }
.tc-mini tr.tc-here td {
  background: #fffdf5;
  color: #363636;
}
.tc-mini tr.tc-here td:first-child {
  box-shadow: inset 3px 0 0 #ffb870;
  font-weight: 600;
  color: #002b64;
}
.tc-settled { color: #1f7a45; font-weight: 600; }
.tc-unsettled { color: #a32020; font-weight: 600; }
.tc-open { color: #b35309; font-weight: 600; }
.tc-open-name { color: #7a869a; font-size: 0.72rem; }

.tc-note {
  font-size: 0.8rem;
  color: #7a869a;
  margin: 0.55rem 0 0;
}
.tc-note--above { margin: 0 0 0.7rem; }

/* ── The candidates ──────────────────────────────────────────── */
.tc-cand {
  border: 1px solid #e2e6ec;
  border-radius: 6px;
  padding: 0.8rem 0.95rem;
  margin-bottom: 0.7rem;
}
.tc-cand:last-child { margin-bottom: 0; }
.tc-cand--best {
  border-color: #63c48d;
  background: #eefaf2;
}
.tc-cand--weak {
  background: #f6f7f9;
  border-style: dashed;
}
.tc-cand-head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.45rem;
}
.tc-ctitle { font-weight: 700; color: #002b64; font-size: 0.9rem; }
.tc-cpath { font-size: 0.74rem; color: #7a869a; }
.tc-cwhy { font-size: 0.73rem; color: #5a6b82; margin-left: auto; }
.tc-cpurpose { font-size: 0.83rem; margin: 0.5rem 0 0; color: #363636; }
</style>
