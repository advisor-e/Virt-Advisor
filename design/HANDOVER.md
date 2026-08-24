# Handover — the last session, and only the last session

> **One file, one session. It is replaced each time, not added to.** Anything worth keeping
> beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. This replaces the 85 `SESSION-*.md` files written before 2026-08-24; those stay
> as history and none is written now. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-08-24 · Laptop · branch `feat/advisor-progress`

**What happened.** A productivity review, then the six changes it recommended. No product
code was touched — only the rules and the records. Nothing is half-built.

**What the other machine needs to know:**

- **Session-notes files are over.** Write your handover here, replacing this. `/startup` no
  longer reads `SESSION-*.md`.
- **`ACTIONS.md` is frozen** — add nothing. The live list is `to-do-items.json`. The three
  rules in `CLAUDE.md` that still told you to write to it now point at the live list.
- **Briefs are edited, not appended to.** Replace the sentence that is wrong; superseded
  text goes to the feature's history page.
- **New tests must not pin on-screen wording, CSS classes, or file existence.** Existing
  ones stay. Maths, permissions and AI-output validation are unchanged — full coverage.
- **The hub-page cascade defaults to the mentor tier alone**, with one line saying why the
  other three are or are not needed.

**Three items raised, all on the live list (13 items now):** **4.37** the five drivers
defined in two places and **4.38** whether Learning Psychology reaches the AI on every
recommendation — both carried from 2026-08-23 notes where they had reached no list, which is
the fault this session fixed. **4.39** sweep the frozen `ACTIONS.md` for anything genuinely
still open: 65 pointers across the repo say "logged in ACTIONS.md", and freezing it does not
prove it was empty. **Until 4.39 is done, the honest statement is that the live list holds
everything anyone has looked at recently, not everything that is open.**

**Not ours to close:** `v0.10.0` has awaited pull by the master team since 2026-08-22, with
three earlier releases also unpulled.
