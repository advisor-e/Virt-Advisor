# The Virtual Advisor — the Brief

> **Read this before touching the AI conversation screen.** Current rules only. The formatting
> pipeline has been broken and rebuilt several times; that story is in
> [`virtual-advisor-history.md`](virtual-advisor-history.md) — after this page.
>
> **Covers:** the conversation screen an advisor talks to — its six modes, streaming, how AI
> output is rendered, and the boundary it must not cross. **Does not cover:** how the
> recommendation is decided ([`advisory-engine.md`](advisory-engine.md)) or the course interface
> ([`course-builder.md`](course-builder.md)).

---

## 1. Design philosophy

**One conversation. The advisor never sees the machinery.**

All the complexity — domain detection, signal extraction, strategy resolution, template scoring,
the swapping of the AI's instruction set mid-sentence — is invisible. The advisor asks a
question and gets an answer. They never switch screens, never pick a mode mid-flow, and never
learn how it works. If a change would make the advisor aware of a pipeline stage, it is the
wrong change.

**The most important behaviour on this screen is the invisible mode swap.** After a
recommendation lands, the advisor keeps talking. Every follow-up is tested for two things at
once: are they asking *how*, and are they referring to a tool? If both, the AI is silently
handed the coaching instruction set instead of the advisory one, and the advisor gets practical
delivery guidance — what to say, how to open the session. Ask a *why* question next and it swaps
straight back. **The full conversation history is preserved through every swap.** Nothing
restarts, nothing is lost, and no transition is visible.

**The screen renders; it does not decide.** This is a Nuxt component. It holds no business
logic, no database access and no API key. Everything of substance happens on the Restify
backend, and this screen streams the result.

---

## 2. Key principles — the non-negotiables

**P1 · 🔴 The markdown rendering pipeline is LOCKED.** `preprocessAIResponse()` in
`utils/markdownPreprocessor.js`, the `renderMarkdown()` method, and the `MarkdownIt`
constructor config with its `disable(...)` call are all protected. **Do not change any of it
without express written permission.** Every rule in it exists because of a confirmed real-world
bug. If formatting breaks again because a model changed its output shape, follow the debugging
protocol, diagnose the new pattern, and propose a *targeted addition* — never a rewrite.

**P2 · Images and raw HTML are disabled in AI output, and that is a security control.**
`_md.disable(['image', 'html_inline', 'html_block'])` stops AI output injecting images or markup
into the page. Anything rendered with `v-html` is sanitised first.

**P3 · No OpenAI here, ever.** No SDK import, no API key, no direct call — not in this
component, not in a plugin, not in `server-middleware/`. The middleware is a **thin streaming
proxy** to Restify and nothing more. Business logic in the proxy is a boundary violation.

**P4 · Every mode switch and every new question aborts the stream in flight.** An old response
must never land in a fresh conversation.

**P5 · No hardcoded English.** Every user-facing string goes through `$t()` and lives in the
locale files. The bulk of this screen's strings live in `advisor.*`, but a handful are still
hardcoded — see the known open gap in §4.
⚠ **A wrong key does not throw; vue-i18n prints the key on screen.** So this principle is held by
a test that walks every `$t()` in the component against the real locale file
(`tests/unit/i18nMessages.test.js`), not by the suite passing. Add to that walk in the same change
as any new screen.

**P9 · 🔴 The advisor must be able to correct the AI's read in their own words, and the matching
must be forgiving.** The engine asks *"I'm reading this as a **X** situation — have I got that
right?"*, and that answer re-routes the entire recommendation. A correction that fails to register
fails silently — the advisor believes they were understood and the advice stays wrong.

**The counter-rule, and it is not optional: a WRONG switch is worse than no switch.** So
`resolveDomainCorrection` moves only on an unambiguous signal — exactly one *other* area named and
the current one not named. *"Yes, staff costs are squeezing their margins"* names both and is
agreement with detail, not a correction. When it holds, nothing is lost: the words still reach
`problemSignals`, and an outright rejection is still caught by `detectContradiction`.

**P6 · A failed call must never produce a silently empty screen.** Loading and error states are
both handled, always, with a message the advisor can act on.

**P7 · Nothing browser-only runs at the top level.** No `window`, `document`, `navigator` or
`localStorage` in `data()`, `computed` or `created()` — this app renders on the server first.
DOM access belongs in `mounted()` or behind an explicit client-only check.

**P8 · Wording is approved before it ships.** On-screen copy — labels, buttons, error messages,
the decision-trace notices — is confirmed with the owner rather than invented. Several strings on
this screen are approved verbatim and marked as such in the code.

---

## 3. Design considerations

**Six modes share this one screen**, chosen from the opening cards: *client* (a client
situation), *discover* (find a template), *plan* (plan your own practice), *learn* (develop your
skill), *course* (hand off to the course builder) and *progression* (My Progress). The first
four are conversations with different instruction sets; the last two hand off to other
components.

**The template section boundary applies here too.** Client mode may only ever surface
client-facing tools. Learn and Plan work from the advisor-development library. Crossing that
line puts an internal sales script in front of a client.

**The decision trace is a real feature, not debug output.** The "Why this recommendation" panel
is populated from the stream. It is what makes a recommendation explainable to the advisor — and
explainability is the point of the whole engine.

**Speech is browser-only and optional.** It lives in a mixin and must degrade silently where the
browser does not support it.

**This component is very large.** It is over 3,000 lines and doing several jobs. Splitting it is
a real improvement — but it is the most heavily-used screen in the app and it has the most
fragile history, so a split is a planned piece of work with tests in front of it, not a tidy-up
done in passing.

---

## 4. For the coder

### Where things live

| Piece | Path |
|---|---|
| The screen | `components/VirtualAdvisor.vue` |
| The page | `pages/advisor.vue` |
| 🔴 Locked preprocessor | `utils/markdownPreprocessor.js` |
| Thin SSE proxy | `server-middleware/advisor.js` |
| The engine it talks to | `server/advisorEngine.js` |
| Speech, locale, trace-reason helpers | `mixins/speechMixin.js`, `localeMixin.js`, `traceReasonMixin.js` |

### The five locked preprocessor rules, and why each exists

1. **Full fence strip** — the AI sometimes wraps its entire response in a code fence.
2. **Partial fence strip during streaming** — the opening fence arrives before the content does.
3. **Mid-response fence strip** — the AI writes a prose paragraph, then opens a fence before the
   structured part. Without this, everything after renders as a raw code block with literal
   `###` symbols on screen. **This was the hardest bug in the file to find. Do not remove it.**
4. **Bold-to-heading conversion** — the AI sometimes emits `**Label**` where a heading was
   wanted; converting it makes the styling apply.
5. **Blank line before headings** — the markdown parser needs one, or the heading renders as
   plain text.

### Streaming

The screen holds an `AbortController` and aborts it on mode change, on a new question, and on
teardown. The proxy has client-disconnect cleanup. A malformed line in the stream is skipped
with a warning rather than killing the response.

### Traps that have actually bitten

1. **`error` flags are booleans, not messages.** Rendering one put the literal word `true` in
   front of advisors on a sibling screen for a day.
2. **A duplicated mode list drifted.** A third copy of the panel-mode list existed and asked for
   a translation key that had never existed. If you add a mode, there must be one list.
3. **No timeout meant an eternal spinner.** An unanswered request left the loading state running
   for ever. Requests go through the shared fetch-with-timeout helper.
4. ⚠ **Before concluding a screen is broken in development, close every other `localhost:3000`
   tab.** Chrome allows six connections per host and each open tab holds one for hot-reload. With
   all six taken, a request is queued in the browser and **never sent** — endless spinner, nothing
   in the console, nothing in the backend log. A fresh tab makes it worse. This cost an
   afternoon. It cannot happen in production.

### Known open gap

Some user-facing strings on this screen are still hardcoded English rather than going through
`$t()`. It is a logged breach of the Stack Constitution — do not copy the pattern into new work.

---

## 5. Related briefs

[`advisory-engine.md`](advisory-engine.md) — what answers this screen ·
[`course-builder.md`](course-builder.md) — the mode this screen hands off to ·
[`advisor-progression.md`](advisor-progression.md) — the My Progress mode.

**History — the formatting pipeline's rebuilds:**
[`virtual-advisor-history.md`](virtual-advisor-history.md)
