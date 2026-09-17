# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-18 · Desktop · branch `feat/firm-quiz-builder-ui`

**Six commits, all pushed.** Suite **11,938 green** (558 suites), lint clean, coverage and audit
gates passed. Tree clean. **Thirteen live items — 7.11 filed today.**

🔴 **PR #99 IS OPEN AND THIS BRANCH IS IN IT** — [PR #99](https://github.com/advisor-e/Virt-Advisor/pull/99),
26 commits. Mike asked why a pull request was not part of every startup; it now is. **`/startup`
step 6 proposes one at 10+ commits ahead**, mirroring step 5's merge-when-behind, with the
threshold stated once in `WORKING-AGREEMENT.md` so one number governs both machines. **Your branch
is 49 ahead — expect that prompt on your next startup.**

**7.9: Mike ruled a fitting calculator is ALWAYS offered alongside a template.** Built as one
clause in the instruction block naming the case that was failing — *"INCLUDING WHEN YOU HAVE
ALREADY RECOMMENDED A TEMPLATE"*. Measured on the running app, 6 runs per model, before and after:
Working Capital Cycle **3/6 → 5/6**, Sales Dashboard **1/6 → 3/6**, links **6/24 → 9/24**,
substitutions **9 → 6**. Line 7 (refuse a near-miss) untouched. **7.9's `activeOn` is CLEARED** —
no defined next step, either machine may take it.

⚠ **I touched `data/report-model-summaries.json` again — one line of `instruction[]`, on Mike's
approval. It is under your 7.5.** No names, routes or summaries. Expect a possible conflict there
and keep both sides.

🔴 **TWO WORDING FIXES FAILED TODAY AND BOTH ARE RECORDED SO NOBODY RETRIES THEM.** A sentence
added to High-Level Budget's `useWhen` made the substitution **worse** (4/6 → 6/6) and was reverted
within the hour. **The budget fault is now item 7.11**, cause recorded: Mid-Level's `answers` opens
*"the same question as the High-Level Budget, plus the one that usually matters more"*, so the AI
is told one is strictly better. **That sentence is true and it is Mike's — do not edit it.**

**8.1 is down to TWO gates, not three.** Both OpenAI letters were answered and **neither confirmed
anything**; Mike ruled we have taken all fair and reasonable steps and closed the gate on that
basis. Replies verbatim in `OPENAI-AUDIO-TERMS-EMAIL.md` §5. **Never call it confirmed.** The
lawyer's review **no longer waits on anything**.

**The live Handbook is still your working-tree preview** (47 pages). Mike ruled this morning it
stays until PR #99 merges, rather than being overwritten twice in two days. Item 14.3 unchanged.
