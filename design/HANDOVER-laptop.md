# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-12 (twenty-second session) · Laptop · branch `feat/advisor-progress`

Suite **9,977 green** (482 suites), lint 0, tree clean, level with `master`. **PR #88 merged**
— 3 commits, documentation only, no application code touched. Four live items; **none is
workable on this machine.**

🔴 **4.58 GATE 1 IS SENT — AND THE STRONGEST POINT IS IN NEITHER LETTER.** Both went
2026-09-12 and both are recorded in full, not paraphrased:
[`OPENAI-AUDIO-TERMS-EMAIL.md`](OPENAI-AUDIO-TERMS-EMAIL.md) §2 (the live sales enquiry) and
§3 (the first letter). **The point to press is §1.1 D** — the DPA's Schedule 1 says *"no
sensitive data is intended to be transferred unless the user includes it unexpectedly in
unstructured data"*, and Meeting Review transfers it **by design**. Verified against three
published versions. It goes to `privacy@openai.com` in the reply thread, never to support.

**Routing, so nobody re-derives it.** `privacy@openai.com` is the DPA's own **Data Protection
Officer** address — correct, but it auto-triages into the consumer queue and answers about
ChatGPT accounts. The account controls (Zero Data Retention, Eyes Off, a named region) are
granted by **sales**, and OpenAI publishes **no sales email address**: it is the form at
`openai.com/contact-sales`, in two steps. Both routes are live and they carry different things.

🔴 **AN AI READ THAT FAILS SILENTLY — CHECK LOADS AGAINST RECORDS.** Mike reported the IRD PDF
taking "a massive amount of time". It was not slow: two of three reads **failed** before
`bec650b` (the discarded-refusal fix), each still spending one of the 20 daily readings, and the
one after it took **18 seconds**. The tell is `data/dev-ai-load-budget.json` against the
proposals store — **loads consumed vs records written**. Three loads, one document. A service
failure records nothing by design, so the screen shows no row and the budget is the only trace.

**Three records corrected, each proven by running the code rather than reading a note:**
`CLAUDE.md` was telling every session the stack was out of compliance (`engine-strict` has been
ON since 2026-08-24 — verify any time with `npm run check:engines`); `/startup` claimed step 3
writes nothing to the repository; and a typed "6,255 tests" was dropped rather than reset.

⚠ **BOTH MACHINES:** `npm run handbook` **regenerates `design/CODE-SIZE.md`**. The tree comes
back dirty from the startup checklist, and the pre-commit hook refuses any commit that leaves a
modified tracked file behind. Expect it; put it to Mike with the session's other changes.

**Waiting on Mike:** OpenAI's written reply (gate 1), the lawyer per market (gate 2, held
deliberately behind that reply because it can change the wording), the staff consultation (gate
3, waiting on neither) — and whether that OpenAI account had credit on 11 September.

**DESKTOP:** none of your files were touched. `CLAUDE.md`, `WORKING-AGREEMENT.md` and
`.claude/commands/startup.md` changed — merge `master` in at startup.
