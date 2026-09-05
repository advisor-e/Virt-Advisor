# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-06 · Laptop · branch `feat/advisor-progress`

Suite **7,893 green** (410 suites), lint clean, audit gate clean. Branch is **9 ahead /
0 behind** master, everything pushed. Nothing is uncommitted.

### 🔴 4.66 IS ACTIVE ON THE LAPTOP — `activeOn` is set

A build touches `ThreeWayForecastIntake.vue`, which you are already in. Do not start it.
Everything else on the list is free.

### What today produced — design only, no app code

**4.66 has a prompt and screens, and both wait on Mike.** Nothing else stands between it
and a build.

- `design/ECONOMIC-ANALYSIS-PROMPT.md` — seven sections, Mike's paragraph as §1.
- `design/ECONOMIC-ANALYSIS-TEST-RUNS.md` — four live API runs, two fictional businesses,
  ~£1.10 all in.
- `design/mockups/three-way-forecast-economic-analysis.html` — six screens, showing run 4's
  real output rather than invented text.

**Three rulings worth knowing before you touch anything near this.** Privacy: the advisor
writes the brief and sees the exact words sent; the app sends nothing about the client on
its own — so no new PII exception. Editing: firm managers, not advisors. Two ticks: run it,
and include it — the second **is** the approval gate, so there is no separate Approve button.

🔴 **The citation fault, because it will look like tidiness and is not.** Runs 1–3 each put
a correct figure beside the *wrong* source, always in a restatement. Three instruction-level
fixes failed. Run 4 fixed it by forbidding §4 of the output to restate any figure at all.
**Do not "improve" §4 by putting the numbers back.** It rests on one clean run and needs
re-checking when built.

### Next

Mike's approval of the prompt and the drawing. Both are in the Handbook.

**4.15, 4.50, 4.58, 4.60, 4.65 unchanged and untouched today.** Seven items live.
