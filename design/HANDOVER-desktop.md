# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-03 · Desktop · branch `feat/firm-quiz-builder-ui`

Suite **7,470 green** (388 suites), lint 0 errors, every coverage threshold met.
Five commits this session; pushed only if the push step below was approved — check
`git status -sb` before trusting this line.

**Merged master** (was 46 behind). Both machines had built item 4.54 in the same week;
Mike ruled to keep master's, PR #55 closed. What PR #55 had beyond it is in merge
commit `f503e70` for a later decision.

**The list is readable again** (Mike: *"thrown out the window"*): six items cut to word
caps the guard test now enforces; `rankedByMike: false` on the four items he never
ranked; `activeOn: { machine, since }` and an "Active on" column on page and control;
`npm run check:branch` prints an ACTIVE ITEMS box (the other machine's items are off
limits, a stale claim on this machine is flagged).

**Hooks changed**: pre-commit is `scripts/quick-gate.js` (staged-file lint + related
tests, seconds); the full gate moved to pre-push (~9 min, once). Commit from
PowerShell, never the Bash tool — its sandbox throttles Node file I/O to nothing.

**Business Entity Reports**: designed, six rulings, screens approved, **stub BUILT**
(`design/features/business-entity-reports.md` §4): client sign-in fail-closed until the
master team supplies a role value (dev token `dev-local-entity`), `/my-reports`, the
"Client access" switch on every report header. 🔴 **Not yet eyeballed by Mike** — a
production build, signed in as the dev client. Part 2 (saved reports) is **4.62**, not
started, no `activeOn`.

**LAPTOP:** 4.61 is yours and marked active; the desktop touched none of its files.
`firmAuth` gained `entityAuth` and now REFUSES a business-entity token by name — merge
master before touching auth. The Handbook is republished by both machines at startup and
the tool refuses the second publisher; it shows whichever branch published last until
both meet on master.
