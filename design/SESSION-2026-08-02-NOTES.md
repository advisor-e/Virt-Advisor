# Session Notes — 2026-08-02 · Desktop (the day a measurement was nearly reported wrong)

> **Nothing is unsaved.** Branch `feat/firm-quiz-builder-ui` = `origin`, **3 ahead / 0 behind
> `master`**, working tree clean. Suite **3,652 green / 221 suites**, lint 0 errors, audit gate PASS.
>
> **PR [#29](https://github.com/advisor-e/Virt-Advisor/pull/29) merged the desktop's 25 commits to
> `master`** (`9661b0b`), cut as the frozen snapshot `release/firm-quiz-builder-2026-08-02`. The
> trigger workbench, Domain Support and Logic Tables Slice A are all in `master` now.
>
> **🔴 LAPTOP: merge `origin/master` before starting.** It now carries the desktop's work.

---

## The one thing to carry out of today

**A cheap measurement nearly cancelled a feature.**

The question on the table was whether the firm-editable levers move template selection enough to
justify building a Decision Logic page at all. Measured with the AI layer **off** — because the
repo's own notes framed a live AI run as an avoidable cost — the answer looked like **16%** of cases
and **4.9%** of the winning score. On those numbers the honest recommendation would have been that
the page barely justifies the work.

Measured properly, with the live AI layer on: **59%** and **37.5%**.

Wrong by nearly four times, and wrong in the direction that makes the firm's own editing work look
worthless. The cause is structural: Advisory Distinctions are **AI-judged**, so an AI-off run
measures the single largest editable lever as exactly zero.

Mike's ruling, and it is now in `CLAUDE.md`-adjacent form in `ACTIONS.md`:

> *"I have NEVER said to save a few bucks on tokens and avoid live AI — if live AI testing is
> required for best practice, do it without asking — always."*

He had never set that constraint. It had accreted into **four** places in the repo as though it were
policy, two of which advertised the AI-off run as the recommended one (`scenario-lab.js` and
`quiz-lab.js` both headed *"RUN (deterministic, free)"*). All four corrected in `22934aa`.

---

## What happened today

**`/startup` clean.** 26 ahead / 0 behind. The other machine's branch was checked by hand, because
the [`startup-blind-to-other-machine`](ACTIONS.md#startup-blind-to-other-machine) P1 is still unbuilt —
`feat/advisor-progress` was 0 ahead, so nothing was hiding.

**The workbench placement question turned out to be the wrong question.** Mike's answer to "where
should it go" was that the workbench was built *instead of* what he asked for: a read-only page
showing all the mechanics and pathways that decide a template. Finding the record proved him right —
the only written trace of the request is a **one-line paraphrase**, and commit `754d204` already
called it "the workbench Mike asked for". **The narrowing happened before any code was written, and
every gate still passed, because the gates check the code against the note and the note was already
wrong.** Logged as [`request-compressed-to-one-line`](ACTIONS.md#request-compressed-to-one-line).

**The DECISION LOGIC page was designed and ruled** —
[`decision-logic-page`](ACTIONS.md#decision-logic-page) has the full record. Headlines: **Plan B**
(only the deliberately-editable blocks, never the algorithm as a whole — the growth stages, the 3
engagement types, the Advisory Staircase and the question order stay hidden); **grouped by what each
lever changes**, because the five editable blocks do three different jobs and a flat list would teach
something false about two of them; **the firm's own live configuration, always** (*"of course it
needs to be accurate for them — always"*); the hidden remainder shown as an unnamed total that still
carries its number; and a **fail-closed allowlist** so a future scoring rule cannot leak the IP by
being forgotten.

**A find worth having: the engine already explains itself.**
[`templateResolver.js`](../server/utils/templateResolver.js) L567 returns `matchReasons` per template
with the real numbers — `distinction:+5`, `tree_hint:+3`, `penalty:*` — computed on **every** session
since it was written, and thrown away. That is the raw material for the page.

**Two harness faults were caught before either became a "finding".** The first measurement copied
`scenario-lab.js`, which builds its case state directly and never passes `treeHintNames`, so the
logic-table lever read **0%** — an artifact, not a result. The second ran with the AI layer nominally
on while every call failed, so distinctions read **0/51**. Both were caught by an explicit rule in the
harness: **a layer producing no effect at all is a probable harness fault, not a measurement.** Worth
keeping — `classifyDistinctions` swallows its own errors and returns `{}`, so the run *completed
successfully* with everything measuring zero.

**The TLS blocker, fixed and documented (`152c1bb`).** Live OpenAI calls failed
`UNABLE_TO_VERIFY_LEAF_SIGNATURE` in **~20 ms** — fast enough to read as a network outage, which is
how it was first misdiagnosed. Cause: `api.openai.com` is re-signed by **Avast Web/Mail Shield Root**,
and the committed `certs/digicert-bundle.pem` is DigiCert roots only. **The recipe documented in this
repo cannot work on this machine.** Fixed for the run by exporting the Avast root from Windows' own
trust store to a file *outside* the repo; TLS verification was never disabled. The correct recipe now
lives in [`HANDOFF.md`](HANDOFF.md). Stated narrowly on purpose: that bundle **does** satisfy the npm
registry chain — the audit gate passes with it — so "the bundle is broken" would misdirect the next
reader.

---

## What is NOT done

**The trigger workbench has still never been seen by anyone.** It is in `master`, at the bottom of the
Logic Tables tab (Firm Manager → Logic Tables, both with no table selected and with one open). This
was the first task of today's session and it did not happen, because the session went where Mike's
questions led. **It is the first task of the next one** — what he makes of it shapes how the "test a
change" section of the new page should behave.

**The Decision Logic page has no spec document and no code.** Every decision it needs is ruled and
recorded; nothing is built.

**Read `6b9d4d2` before writing that spec.** It came in with PR #29 and changed what the routing
report claims to cover — and that report is the page's raw material.

---

## Process notes, recorded rather than buried

- **The Edit tool failed with `EUNKNOWN: fsync` on every write to the E: drive**, repeatedly, on files
  from 1 KB to 452 KB. `touch` worked, so the files were writable. Everything today was applied via a
  node script doing a verified literal replacement — refusing unless the old text matched **exactly
  once**, and normalising the patch to the target's line endings (repo files are CRLF). Slower, but it
  cannot half-apply, and it caught nothing wrong. Worth knowing on the next session on this machine.
- **A bash quoting trap:** a first attempt at editing `MEMORY.md` inline let bash interpret the
  backticks in the replacement text as command substitution, silently stripping every commit hash from
  the new content. Corrected by moving the text into a script file. Never put backticked content
  through `node -e` inside double quotes.
- **No dev server was started today** — no screen work was done, so none was needed. Nothing was left
  running by this session.
- Two memory files were written outside the repo (the live-AI ruling and the Avast TLS recipe), and
  `MEMORY.md` was compacted after a hook flagged it over its size limit. Every entry was kept; only
  over-long hooks were shortened.
