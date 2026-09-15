# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-16 · Desktop · branch `feat/firm-quiz-builder-ui`

**Two commits, pushed** (`98185ce4`, `9a082620`). Suite **11,255 green** (530 suites), lint 0,
coverage and audit gates passed. **Eleven live items** — 7.5 is new. **4.97 / 7.2 is 55 of 67.**
`activeOn` KEPT on this machine: T057 is next and the work is in hand.

🔴 **US9 IS READ-ONLY BY MIKE'S RULING.** He stopped the build mid-task to ask *"are you building
something that will interfere with the working model?"* — and it would have. **T058 wires authored
profiles into `advisorEngine.js`**, changing what every advisor is recommended, on the resolver's
dominant lever, with no test able to judge whether a weight is right. **T058 and the authoring half
of T057 are NOT built and must not be**, until he has seen the screen and decided the authoring
(44 tools of data entry) is worth his time. The engine still reads the compiled file.

**T060a done.** The compiler re-run moved the counts the OPPOSITE way to the task's prediction:
199 → 205 entries, and hand-authoring rose **38 → 44**, because all six additions have no summary
to compile from. No existing profile changed.

🔴 **NEW ITEM 7.5, and Mike corrected the diagnosis TWICE.** Advisor-e issues an ID per **page**
and a page legitimately holds several templates — 220 tools on 205 pages. It is **not** an export
defect, and the shared profile is **correct**: tools on one page share one AI profile. What is left
is naming every tool on a page.

⚠ **I then reproduced 7.5 myself within the hour** — the store's first draft read `templateRegistry`
(a Map keyed by page) and silently returned 205 tools, losing 15. It now reads `data/templates.json`
directly; a test pins all 220 so the "simplification" back onto the registry fails loudly.

**FOR MIKE, NOT OURS:** four tools are listed **twice** in the library under one title
(`Capacity, Capability, Opportunity`, `IT Services`, and two spelling variants). Harmless; his to
settle in Advisor-e. The screen shows them rather than hiding them.

**NEXT JOB: T057**, the read-only route `GET /api/mentor/semantic-profiles` under `mentorGuard`.

**LAPTOP:** your note is dated **2026-09-13** but your branch had a commit on 2026-09-16 — stale
for the fifth session running. Shared files I touched: none. Everything new is
`server/utils/semanticProfiles.js` and its test.
