# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-18 · Desktop · branch `feat/firm-quiz-builder-ui`

**Six commits, all pushed.** Suite **12,200 green** (565 suites), lint 0, coverage and audit
gates passed. Tree clean. **6 ahead of `master`, 0 behind. 20 live items.**

🔴 **BOTH MACHINES WERE MERGED TO `master` TODAY — PR #99 (29) and PR #100 (63).** They stood 29
and 57 ahead of a `master` neither had reached. Both are in now, and the Handbook line read *"0
commits"* for both machines for the first time. **This is the 97-commit drift caught at 92**, and
it is why `/startup` step 6 exists. The six commits above are since that merge.

🔴 **"CALCULATOR" IS GONE — MIKE'S RULING** (`b2fbaefb`). *"We have models and templates. A model
includes CALCULATIONS but it is NOT a calculator."* It was **our** word and it had reached the
advisor's screen. The block heading is now **`**A model that fits**`** and there are **zero**
occurrences left in either prompt. ⚠ **The string is load-bearing twice** — the advisor reads it
AND `buildRetryInstruction` names it back to the AI, so renaming one half would have broken the
correction silently. Pinned in `reportModelSummaries.test.js`. **His workbook names stay** (*Quick
Calculator*, *Hrly Rate & Tax Calculator*) — his source material.

🔴 **7.12 IS A DIFFERENT ITEM NOW, AND THE OLD NOTES ARE DELETED** (`4269c663`, `de5d4875`).
Mike's challenge: his original task was *"check the summary page, look it up… and where to find it
in the perf report section"*. **The lookup half was never built.** Four sessions tuned prompt
wording instead; each moved some models and moved others backwards. `/api/report/model-guide`
already serves the records, `injectVideoInfo` is the working pattern for templates, and **his own
ruling of 2026-08-22 is in `pages/model-guide.vue`** saying that page serves the AI as well as a
person. **Build steps now in `advisory-engine.md` §4** — six steps, the three call sites
(`advisorEngine.js` 3075 / 3937 / 4244) each paired with the raw buffer that still holds the
`[[MODEL:]]` marker, and the collision warning moved BEFORE the build instruction. **A half-fix I
built (`repairCalculatorLinks`) was deleted** — it covered 13 of 19 and could not touch the six
collisions, including Sales Dashboard.

🔴 **OPENAI ANSWERED, AFTER this morning's ruling closed the gate** (`b3d7adeb`, `9b948c66`).
§5.3 of `OPENAI-AUDIO-TERMS-EMAIL.md` holds it verbatim. **(a) Human access IS possible** —
employees and third-party contractors, for abuse review. **Never write that no human can see it;
the consent wording makes no such promise and must not gain one.** **(b) The clean transcription
retention does NOT cover this feature** — we send the transcript on to `/v1/chat/completions` for
the two reports, which carries **30-day abuse logs**. **Mike has SENT the reply letter**
(`OPENAI-ZDR-REPLY-LETTER.md`) asking for ZDR on both endpoints and a written confirmation in four
points. **A reply is expected — it is his thread, not ours.**

**15.5 rescored 5 → 1** (`7d929679`). It claimed *"security, privacy or data integrity"* and is a
build-time deck reader no advisor meets. The gap is unchanged and real; only its claim on
attention moved.

**LAPTOP — shared files I changed:** `to-do-items.json`, `to-do.md`, `advisory-engine.md`,
`report-models.md`, `meeting-review.md`, `ARTEFACTS.md`, `CODE-SIZE.md`, and the two prompts
(`discover.txt`, `client.txt`) plus `templateHeadingCheck.js` for the rename. **No `activeOn` is
set on this machine.** Your 7.5, 15.1 and 15.7 are untouched.

**NEXT:** 7.12 is unclaimed and ready to build from the written steps. **15.6 needs Mike** — eight
concepts name a response form the app cannot find, five of them near-misses on a typed name, and
his corrections file is deliberately unapplied.
