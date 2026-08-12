# The Virtual Advisor — the History

> **Read [`virtual-advisor.md`](virtual-advisor.md) first.** That page is the rules. This page
> is why they exist. Nothing here is a current instruction. If this page and the Brief disagree,
> **the Brief wins**.

---

## 1. Why the markdown pipeline is locked

**It has been broken and rebuilt multiple times.** Not once — repeatedly, and each time the
symptom looked like a small formatting glitch and the cause was somewhere else entirely.

The pattern that keeps recurring: an AI model changes the shape of what it emits, the
preprocessor no longer matches it, and the response renders as raw markdown symbols in front of
an advisor. Someone then rewrites the preprocessor from scratch to handle the new shape — and
in doing so removes a rule that existed for an older, still-live shape. **The next model change
brings the old bug back.**

Hence the rule. Every line in `preprocessAIResponse()` maps to a confirmed real-world bug, the
whole function is protected, and a new symptom gets a *targeted addition* after the debugging
protocol has proved what the new pattern is. → Brief **P1**.

**The hardest one to find** was the mid-response fence: the AI writes a paragraph of prose,
then opens a code fence before the structured markdown. Everything after it rendered as a raw
code block with literal `###` symbols. It looked like a markdown-parser problem and was not.

The `disable(['image', 'html_inline', 'html_block'])` call is not formatting at all — it is a
security control preventing AI output from injecting images or raw HTML into the page. It sits
in the locked block for the same reason: it looks removable and is not.

---

## 2. The other faults worth remembering

### The literal word "true" in front of advisors

The recompute error flag is a boolean. It was rendered as a message on a sibling screen, so
advisors saw `true` where an explanation should have been, for a day. The lesson generalises
across the app: **a flag is not a message.**

### A third copy of the mode list

`selectMode()` held its own drifted copy of the panel-mode list, so opening My Progress asked
for a translation key that **had never existed**. Two copies had been kept in step; the third
was forgotten. One list, or it drifts.

### No request had a timeout

An unanswered request left the spinner running for ever, on every screen that fetched. All of
them now use a shared fetch-with-timeout helper.

### Six browser tabs cost an afternoon

Chrome allows six simultaneous connections per host, and in development each open
`localhost:3000` tab permanently holds one for hot-reload. With all six taken, a screen's
request is **queued in the browser and never sent**: endless spinner, nothing red in the
console, nothing in the backend log at all. Opening a fresh tab makes it worse.

Recorded because everything about it points at a broken feature, and nothing points at the
browser. It cannot happen in production.

---

## 3. Decisions taken and closed — do not reopen

| Decision | Ruling |
|---|---|
| May the preprocessor be rewritten when formatting breaks? | **No.** Diagnose the new pattern, add to it. |
| May AI output render images or HTML? | **Never.** Security control, not styling. |
| Does the advisor ever choose between advisory and coaching mode? | **No.** The swap is invisible and re-evaluated every message. |
| Does a mid-conversation swap restart the session? | **Never.** Full history is preserved. |
| Where does the OpenAI key live? | **Backend only.** The middleware is a thin proxy. |

### The OpenAI boundary, and how it was closed

The stack originally specified the OpenAI SDK. That contradicted the locked Node 14.15 runtime —
no version of the SDK runs on it. The coding team's ruling superseded the SDK wording in favour
of calling the REST API directly from the backend, leaving the Node lock untouched.

**That migration is complete.** The SDK dependency is gone, all OpenAI logic and the key live on
the Restify backend, and `server-middleware/advisor.js` is now a thin SSE proxy. The former
boundary violation is closed — and the Brief's P3 exists so it stays closed.

---

## 4. Where the earlier record is wrong

- `virt-advisor-system-design.md` §2.2 describes `server-middleware/advisor.js` as the *"core AI
  sequencer"* holding all four modes. **That was true before the OpenAI migration and is not
  true now** — the sequencer is `server/advisorEngine.js`, and the middleware forwards.
- The same document's §11.1 describes Firm Manager auth as reading role from `localStorage`. The
  JWT work superseded that; identity comes from a verified token.

Both are left in place as records of their own date.

---

## 5. Where the raw material is

**Permanent companions:** `CLAUDE.md` → *Markdown Rendering Pipeline* (the locked list, and the
only authority on it) · [`../virt-advisor-system-design.md`](../virt-advisor-system-design.md)
§3–§7 (the modes and the invisible swap, still the best account) ·
[`../WORDING-TRACE-REASONS.md`](../WORDING-TRACE-REASONS.md) (approved decision-trace copy) ·
[`../WORDING-DISTINCTION-AI-FAILURE.md`](../WORDING-DISTINCTION-AI-FAILURE.md) ·
[`../SAVED-CLIENT-INTAKE-EXPERIENCE-PLAN.md`](../SAVED-CLIENT-INTAKE-EXPERIENCE-PLAN.md).
