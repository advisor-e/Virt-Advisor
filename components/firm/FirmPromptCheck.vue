<template lang="pug">
.pc
  h3.pc-h {{ $t('promptCheck.heading') }}
  p.pc-intro {{ $t('promptCheck.intro') }}
  p.pc-nothing {{ $t('promptCheck.nothingSaved') }}

  //- ── The box ──────────────────────────────────────────────────────────
  //- 🔴 NO `maxlength` HERE, DELIBERATELY. A hard cap would make the
  //- "that is more than we can check at once" message unreachable, and
  //- wording that can never appear is wording nobody ever proves is right.
  //- The counter warns; the check refuses.
  b-input.pc-box(
    v-model="text"
    type="textarea"
    rows="8"
    :disabled="checking"
    :placeholder="$t('promptCheck.placeholder')"
    :aria-label="$t('promptCheck.heading')")

  p.pc-count(:class="{ 'is-over': isOver }") {{ countLabel }}

  //- ── Why we ask for a paste — beside the box, never behind a link ─────
  //- Mike, 2026-08-22: "we explain this to them for their own clients
  //- protection". A help link would satisfy the letter and lose the point.
  .pc-why
    p.pc-why-h {{ $t('promptCheck.whyHeading') }}
    p {{ $t('promptCheck.whyP1') }}
    p {{ $t('promptCheck.whyP2') }}
    p {{ $t('promptCheck.whyP3') }}

  .pc-actions
    b-button(
      type="is-primary"
      :loading="checking"
      :disabled="!canCheck"
      @click="check(false)") {{ $t('promptCheck.checkButton') }}
    span.pc-hint(v-if="!checking") {{ $t('promptCheck.takesAbout') }}

  b-message(v-if="failed" type="is-danger" size="is-small") {{ $t('promptCheck.failed') }}

  //- ── Refused ──────────────────────────────────────────────────────────
  .pc-blocked(v-if="view" :class="view.tone")
    h4.pc-blocked-h {{ view.heading }}

    .pc-part
      span.pc-label {{ $t('promptCheck.labelFound') }}
      p {{ view.found }}
      .pc-quote(v-if="view.quote") {{ view.quote }}
      p.pc-aside(v-if="view.afterQuote") {{ view.afterQuote }}

    .pc-part
      span.pc-label {{ $t('promptCheck.labelWhy') }}
      p {{ view.why }}

    .pc-do
      span.pc-label {{ $t('promptCheck.labelDo') }}
      p {{ view.todo }}
      .pc-actions
        b-button(
          type="is-primary"
          size="is-small"
          :loading="checking"
          @click="act") {{ view.againLabel }}
        //- 🔴 A REAL DESTINATION, NOT A DISCLOSURE. The design forbids a refusal with
        //- no route back to a person, and a button that only reveals a sentence is not
        //- a route. The address comes from data/support-contact.json via the backend.
        b-button(
          v-if="contactEmail"
          tag="a"
          size="is-small"
          :href="contactHref") {{ $t('promptCheck.askSomeone') }}
      p.pc-contact(v-if="contactEmail") {{ $t('promptCheck.askSomeoneBody', { email: contactEmail }) }}

  //- ── Cleared ──────────────────────────────────────────────────────────
  .pc-cleared(v-if="cleared")
    h4.pc-cleared-h {{ $t('promptCheck.clearedHeading') }}
    p {{ $t('promptCheck.clearedBody') }}

  //- ── The review could not be produced ─────────────────────────────────
  //- 🔴 SAID OUT LOUD, NEVER SHOWN AS AN EMPTY REPORT. "We found nothing to
  //- suggest" and "we could not read the answer" are the same picture unless
  //- one of them says so, and the silent version tells an accountant their
  //- prompt is fine on the strength of a broken call.
  b-message(v-if="reviewFailed" type="is-warning" size="is-small")
    | {{ $t('promptCheck.reviewFailed') }}

  //- ── The report ───────────────────────────────────────────────────────
  .pc-report(v-if="hasReport")
    h4.pc-report-h {{ $t('promptCheck.reportHeading') }}
    p.pc-stale(v-if="reviewStale") {{ $t('promptCheck.reviewStale') }}

    .pc-find(
      v-for="(f, i) in review"
      :key="i"
      :class="['is-' + f.kind, { 'is-settled': settled[i] }]")
      .pc-fhead
        span.pc-ftitle {{ f.title }}
        b-tag(:type="tagFor(f.kind).type" size="is-small") {{ tagFor(f.kind).label }}
      p.pc-fbody {{ f.body }}
      .pc-quote(v-if="f.quote") {{ f.quote }}
      .pc-quote.is-suggested(v-if="f.suggestion") {{ f.suggestion }}

      .pc-actions(v-if="canApply(f) && !settled[i]")
        b-button(
          type="is-success"
          size="is-small"
          @click="accept(i)") {{ f.kind === 'clash' ? $t('promptCheck.changeToMatch') : $t('promptCheck.addThis') }}
        b-button(size="is-small" @click="decline(i)")
          | {{ f.kind === 'clash' ? $t('promptCheck.keepMine') : $t('promptCheck.noThanks') }}
      p.pc-settled(v-else-if="settled[i]") {{ settled[i] === 'accepted' ? $t('promptCheck.applied') : $t('promptCheck.leftAlone') }}

    .pc-actions.pc-foot
      b-button(type="is-primary" size="is-small" @click="download")
        | {{ $t('promptCheck.download') }}
      b-button(size="is-small" @click="startAgain") {{ $t('promptCheck.startAgain') }}

  //- ── Read, and nothing worth changing ─────────────────────────────────
  p.pc-nofindings(v-else-if="cleared && !reviewFailed") {{ $t('promptCheck.reviewNothing') }}
</template>

<script>
/**
 * Share a prompt — the firm manager's paste-and-check panel.
 *
 * Item 4.31, steps 1–3 of `design/PROMPT-CONTRIBUTION-SAFETY.md` §7. Every sentence on
 * this screen is `design/PROMPT-CONTRIBUTION-WORDING.md`, approved by Mike 2026-08-25;
 * the words themselves live in `locales/*.json` and nothing here hardcodes English.
 *
 * 🔴 THIS COMPONENT SENDS TEXT AND DISPLAYS AN ANSWER. It holds no logic about what is
 * safe — every check is on the Restify backend (`server/utils/promptContribution.js`),
 * where it can be tested and where it cannot be edited by anybody holding the page. A
 * check re-implemented here to save a round trip would be a check an attacker can delete
 * from their own browser.
 *
 * 🔴 ONE DOOR, NOT TWO — a recorded deviation from `mockups/prompt-contribution.html`.
 * The drawing shows a second card, *"I want our advice to work this way"*. That is step 4
 * of the design, it is not built, and a door that does not open teaches somebody to want
 * the risky path before it exists safely. The mockup wrote *"nothing is saved"* on the
 * card this removes, so that line moved into the opening paragraph.
 *
 * ⚠ NOTHING IS STORED, HERE OR AT THE OTHER END. The pasted text lives in this
 * component's own state until the manager leaves the tab.
 */
export default {
  name: 'FirmPromptCheck',

  props: {
    /** Bearer token for the manager-scoped backend routes. */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      text: '',
      checking: false,
      failed: false,
      cleared: false,
      refusal: null,
      /**
       * Where a refused manager is told to write. Comes from the backend so the address
       * lives in ONE editable place (`data/support-contact.json`) rather than in eight
       * locale files. Empty until the first answer arrives, and the link is hidden until
       * then — a mail button with no address is worse than no button.
       */
      contactEmail: '',
      /**
       * The exact text the manager pressed *"Take them out and check it again"* on.
       *
       * 🔴 STORED AS THE TEXT, NOT AS A FLAG. A flag has to be cleared when the box
       * changes, and clearing it in a watcher races the check that set it — Vue 2 runs
       * watchers on the next tick, so a press that follows a keystroke closely enough
       * had its consent wiped a moment after it was given. Comparing strings has no
       * ordering to get wrong: consent applies to these words and to no others.
       */
      consentFor: null,
      /** The findings the review produced, already validated on the backend. */
      review: [],
      /** True when the review could not be produced at all — never inferred from []. */
      reviewFailed: false,
      /**
       * The text the report was produced for. Kept so the report can say it is about an
       * earlier version rather than silently describing words that have changed — the
       * same string-comparison trick as `consentFor`, and for the same reason.
       */
      reviewFor: '',
      /** Per-finding: 'accepted', 'declined', or undefined. */
      settled: {},
      /** The cap the backend reported, so the counter cannot drift from the check. */
      limit: 6000
    }
  },

  computed: {
    /** Characters typed, counted the way the backend counts them. */
    used () { return this.text.length },

    isOver () { return this.used > this.limit },

    countLabel () {
      return this.$t('promptCheck.charactersUsed', { used: this.used, limit: this.limit })
    },

    canCheck () { return this.text.trim() !== '' && !this.checking },

    hasReport () { return this.review.length > 0 },

    /** The report describes words the manager has since changed. Said, not hidden. */
    reviewStale () { return this.hasReport && this.reviewFor !== this.text },

    /**
     * The mail link. The subject names the app so the message is recognisable; the
     * PROMPT ITSELF IS NEVER PUT IN THE BODY — it may hold the very client details we
     * just refused, and pre-filling a mail client with them would move the problem
     * rather than solve it.
     */
    contactHref () {
      return 'mailto:' + this.contactEmail +
        '?subject=' + encodeURIComponent(this.$t('promptCheck.askSomeoneSubject'))
    },

    /**
     * The refusal, turned into the six strings the screen shows.
     *
     * Every branch names its own heading, its own quote and its own button, because the
     * three parts of a refusal are the same shape but never the same words. A missing
     * branch returns null rather than a half-filled panel — a refusal we cannot describe
     * is a refusal we must not display.
     *
     * @returns {object|null}
     */
    view () {
      const r = this.refusal
      if (!r) { return null }
      const t = (k, params) => this.$t('promptCheck.' + k, params)

      if (r.kind === 'length') {
        return {
          tone: 'is-limit',
          heading: t('lengthHeading'),
          found: t('lengthFound', {
            characters: this.approximate(r.characters),
            limit: r.limit,
            pages: Math.max(1, Math.round(r.characters / 3000))
          }),
          quote: '',
          afterQuote: '',
          why: t('lengthWhy'),
          todo: t('lengthDo'),
          againLabel: t('lengthBack'),
          again: 'edit'
        }
      }

      const heading = t('refusedHeading')

      if (r.kind === 'link') {
        return {
          tone: 'is-stop',
          heading,
          found: t(r.variant === 'email' ? 'linkEmailFound' : 'linkWebFound', { line: r.line }),
          quote: r.quote,
          afterQuote: '',
          why: t('linkWhy'),
          todo: t('linkDo'),
          againLabel: t('linkAgain'),
          again: 'edit'
        }
      }

      if (r.kind === 'invisible') {
        return {
          tone: 'is-stop',
          heading,
          found: t('invisibleFound', { count: r.count, line: r.line }),
          quote: '',
          afterQuote: '',
          why: t('invisibleWhy'),
          todo: t('invisibleDo'),
          againLabel: t('invisibleAgain'),
          again: 'strip'
        }
      }

      if (r.kind === 'secret') {
        return {
          tone: 'is-stop',
          heading,
          found: t('secretFound', { line: r.line }),
          quote: r.quote,
          afterQuote: t('secretShortened'),
          why: t('secretWhy'),
          todo: t('secretDo'),
          againLabel: t('secretAgain'),
          again: 'edit'
        }
      }

      if (r.kind === 'fence') {
        return {
          tone: 'is-stop',
          heading,
          found: t('fenceFound', { line: r.line }),
          quote: r.quote,
          afterQuote: '',
          why: t('fenceWhy'),
          todo: t('fenceDo'),
          againLabel: t('fenceAgain'),
          again: 'edit'
        }
      }

      if (r.kind === 'personal') {
        const found = r.variant === 'taxNumber'
          ? 'personalTaxFound'
          : (r.variant === 'name' ? 'personalNameFound' : 'personalAddressFound')
        return {
          tone: 'is-stop',
          heading,
          found: t(found, { line: r.line }),
          quote: r.quote,
          afterQuote: '',
          why: t('personalWhy'),
          todo: t('personalDo'),
          againLabel: t('personalAgain'),
          again: 'edit'
        }
      }

      return null
    }
  },

  watch: {
    /**
     * A verdict belongs to the text it was given. The moment the manager edits, the
     * message on screen is about words that no longer exist — so it goes, along with
     * any consent they gave about the previous version.
     */
    text () {
      this.refusal = null
      this.cleared = false
      this.failed = false
    }
  },

  methods: {
    /**
     * The label on a finding. Three kinds, three labels, and nothing else is drawable.
     * @param {string} kind
     * @returns {{type: string, label: string}}
     */
    tagFor (kind) {
      if (kind === 'good') { return { type: 'is-success', label: this.$t('promptCheck.kindGood') } }
      if (kind === 'clash') { return { type: 'is-danger', label: this.$t('promptCheck.kindClash') } }
      return { type: 'is-warning', label: this.$t('promptCheck.kindGap') }
    },

    /**
     * Whether this finding can actually be acted on.
     *
     * 🔴 A CLASH IS ONLY APPLIABLE WHEN WE CAN FIND THE MANAGER'S OWN LINE. "Change it to
     * match our protocol" has to change something, and the only honest way to do that is
     * to replace the exact words the model quoted. A model that paraphrased the line
     * gives us nothing to replace, so the button is not offered rather than appending a
     * second, contradictory sentence to their prompt and calling it a change.
     *
     * @param {object} finding
     * @returns {boolean}
     */
    canApply (finding) {
      if (finding.kind === 'good') { return false }
      if (!finding.suggestion) { return false }
      if (finding.kind === 'clash') {
        return Boolean(finding.quote) && this.text.includes(finding.quote)
      }
      return true
    },

    /**
     * Take a suggestion.
     *
     * ⚠ THIS CHANGES THEIR COPY AND NOTHING ELSE. Not this app, not their firm, not the
     * AI — the words in the box on their screen. That is the whole of what is built, and
     * it is why it is safe.
     *
     * @param {number} i - index into `review`
     */
    accept (i) {
      const finding = this.review[i]
      if (!this.canApply(finding)) { return }

      this.text = finding.kind === 'clash'
        ? this.text.split(finding.quote).join(finding.suggestion)
        : (this.text.replace(/\s+$/, '') + '\n\n' + finding.suggestion)

      this.$set(this.settled, i, 'accepted')
    },

    /**
     * Leave a suggestion. Recorded rather than hidden, so the manager can see what they
     * have already decided about on a long report.
     * @param {number} i
     */
    decline (i) {
      this.$set(this.settled, i, 'declined')
    },

    /** Clear everything and start on another prompt. */
    startAgain () {
      this.text = ''
      this.review = []
      this.reviewFailed = false
      this.reviewFor = ''
      this.settled = {}
      this.focusBox()
    },

    /**
     * Hand the manager their own prompt as a file.
     *
     * ⚠ CLIENT-ONLY BY CONSTRUCTION — it runs from a click, never from `created()`, so
     * there is no server-side render in which `document` or `URL` is missing.
     */
    download () {
      const blob = new Blob([this.text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'my-prompt.txt'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    },

    /**
     * Rounds a character count to something a person would say out loud.
     * @param {number} n
     * @returns {number}
     */
    approximate (n) {
      return n >= 10000 ? Math.round(n / 1000) * 1000 : Math.round(n / 100) * 100
    },

    /**
     * Send the prompt to be checked.
     *
     * @param {boolean} removeInvisible - True only when the manager has pressed
     *   *"Take them out and check it again"*. Never set by this component on its own:
     *   the design requires a refusal to be shown, not quietly worked around.
     */
    async check (removeInvisible) {
      if (!this.canCheck && removeInvisible !== true) { return }
      this.checking = true
      this.failed = false
      this.cleared = false
      this.refusal = null
      this.review = []
      this.reviewFailed = false
      this.settled = {}
      try {
        if (removeInvisible === true) { this.consentFor = this.text }
        const data = await this.api('POST', '/api/firm-manager/prompt-check', {
          text: this.text,
          removeInvisible: this.consentFor === this.text
        })
        if (typeof data.limit === 'number') { this.limit = data.limit }
        if (typeof data.contactEmail === 'string') { this.contactEmail = data.contactEmail }
        if (data.ok) {
          this.cleared = true
          this.review = Array.isArray(data.review) ? data.review : []
          this.reviewFailed = data.reviewFailed === true
          this.reviewFor = this.text
        } else {
          this.refusal = data.refusal || null
          // A refusal shape this build cannot describe must not render as an empty
          // panel — say the check failed, which is the honest thing at that point.
          if (!this.view) { this.failed = true; this.refusal = null }
        }
      } catch (err) {
        this.failed = true
      } finally {
        this.checking = false
      }
    },

    /**
     * The primary button on a refusal. Two behaviours, and only one of them alters text:
     * *strip* re-checks with the invisible characters removed, which the manager has just
     * asked for; *edit* simply clears the message and returns them to their own words.
     */
    act () {
      if (this.view && this.view.again === 'strip') {
        // The text in the box is untouched — the backend does the removal, so the
        // manager's own words are never rewritten by pattern-matching in the browser.
        this.check(true)
        return
      }
      this.refusal = null
      this.focusBox()
    },

    /** Put the cursor back where the work is. Client-only by construction. */
    focusBox () {
      this.$nextTick(() => {
        const el = this.$el.querySelector('textarea')
        if (el) { el.focus() }
      })
    },

    /**
     * Thin authenticated fetch — mirrors `FirmAiPrompts`'s helper so this panel behaves
     * the same way on a failure as the tab it sits on.
     *
     * @param {string} method
     * @param {string} path
     * @param {object} [body]
     * @returns {Promise<object>}
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
.pc { margin-top: 2.25rem; padding-top: 1.75rem; border-top: 1px solid #e2e6ec; }

.pc-h {
  font-size: 1.05rem;
  font-weight: 600;
  color: #002b64;
  margin-bottom: 0.35rem;
}
.pc-intro { font-size: 0.86rem; color: #5a6b82; margin-bottom: 0.4rem; }
.pc-nothing { font-size: 0.86rem; color: #002b64; font-weight: 600; margin-bottom: 0.9rem; }

.pc-box { margin-bottom: 0.3rem; }
.pc-count { font-size: 0.74rem; color: #8a94a3; margin-bottom: 1rem; }
.pc-count.is-over { color: #b35309; font-weight: 600; }

.pc-why {
  border: 1px solid #9cc4e8;
  border-left: 4px solid #0a5ea8;
  background: #eef5fc;
  border-radius: 6px;
  padding: 0.85rem 1rem;
  margin-bottom: 1.1rem;
}
.pc-why p { font-size: 0.82rem; color: #5a6b82; margin-bottom: 0.5rem; }
.pc-why p:last-child { margin-bottom: 0; }
.pc-why-h { font-weight: 600; color: #002b64; font-size: 0.88rem; }

.pc-actions { display: flex; gap: 0.55rem; flex-wrap: wrap; align-items: center; }
.pc-hint { font-size: 0.79rem; color: #7a869a; }

/* A refusal and a limit are not the same thing and must not look the same. */
.pc-blocked { border-radius: 8px; padding: 1.1rem 1.2rem; margin-top: 1.3rem; }
.pc-blocked.is-stop { border: 2px solid #e2a0a0; background: #fdf3f3; }
.pc-blocked.is-limit { border: 2px solid #b8c6d8; background: #f3f6fa; }

.pc-blocked-h { font-size: 1rem; font-weight: 600; margin-bottom: 0.4rem; }
.pc-blocked.is-stop .pc-blocked-h { color: #a02b2b; }
.pc-blocked.is-limit .pc-blocked-h { color: #002b64; }

.pc-part { margin-bottom: 0.85rem; }
.pc-part p { font-size: 0.86rem; color: #363636; }

.pc-label {
  display: block;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 0.15rem;
}
.pc-blocked.is-stop .pc-label { color: #a02b2b; }
.pc-blocked.is-limit .pc-label { color: #5a6b82; }

.pc-quote {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.78rem;
  background: #f6f7f9;
  border: 1px solid #d8dce3;
  border-radius: 4px;
  padding: 0.45rem 0.6rem;
  margin-top: 0.4rem;
  color: #363636;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
.pc-aside { font-size: 0.8rem; color: #5a6b82; margin-top: 0.4rem; }

.pc-do {
  background: #fff;
  border: 1px solid #e2a0a0;
  border-radius: 5px;
  padding: 0.75rem 0.85rem;
  margin-top: 0.9rem;
}
.pc-blocked.is-limit .pc-do { border-color: #b8c6d8; }
.pc-do p { font-size: 0.86rem; color: #363636; margin-bottom: 0.7rem; }
.pc-contact { font-size: 0.82rem; color: #5a6b82; margin-top: 0.7rem; margin-bottom: 0; }

.pc-cleared {
  border: 1px solid #63c48d;
  background: #eefaf2;
  border-radius: 8px;
  padding: 1rem 1.15rem;
  margin-top: 1.3rem;
}
.pc-cleared-h { font-size: 0.98rem; font-weight: 600; color: #1f7a45; margin-bottom: 0.3rem; }
.pc-cleared p { font-size: 0.86rem; color: #363636; }

/* The report. A finding's stripe carries its kind, so the shape of the page says
   what the labels say — good, worth adding, conflicts. */
.pc-report { margin-top: 1.5rem; }
.pc-report-h { font-size: 1rem; font-weight: 600; color: #002b64; margin-bottom: 0.5rem; }
.pc-stale {
  font-size: 0.8rem;
  color: #b35309;
  background: #fffaf3;
  border: 1px solid #ffb870;
  border-radius: 5px;
  padding: 0.45rem 0.6rem;
  margin-bottom: 0.8rem;
}

.pc-find {
  border: 1px solid #e2e6ec;
  border-left: 3px solid #b8c6d8;
  border-radius: 0 6px 6px 0;
  background: #fff;
  padding: 0.8rem 0.95rem;
  margin-bottom: 0.65rem;
}
.pc-find.is-good { border-left-color: #63c48d; }
.pc-find.is-gap { border-left-color: #ffb870; }
.pc-find.is-clash { border-left-color: #e2a0a0; }
.pc-find.is-settled { opacity: 0.72; }

.pc-fhead { display: flex; gap: 0.6rem; align-items: baseline; flex-wrap: wrap; }
.pc-ftitle { font-weight: 600; color: #002b64; font-size: 0.9rem; flex: 1 1 auto; }
.pc-fbody { font-size: 0.83rem; color: #5a6b82; margin-top: 0.3rem; }

/* A suggested sentence is set apart from a quotation of their own words: one is
   ours to offer, the other is theirs, and they must not read as the same thing. */
.pc-quote.is-suggested { background: #eefaf2; border-color: #63c48d; }

.pc-settled { font-size: 0.79rem; color: #7a869a; margin-top: 0.55rem; margin-bottom: 0; }
.pc-foot { border-top: 1px solid #e2e6ec; padding-top: 0.9rem; margin-top: 1rem; }
.pc-nofindings { font-size: 0.85rem; color: #5a6b82; margin-top: 0.9rem; }
</style>
