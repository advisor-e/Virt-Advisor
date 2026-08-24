# Handover — the last session, and only the last session

> **One file, one session. It is replaced each time, not added to.** Anything worth keeping
> beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. This replaces the 85 `SESSION-*.md` files written before 2026-08-24; those stay
> as history and none is written now. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-08-25 · Laptop · branch `feat/advisor-progress`

**Seven items closed; the live list is 17 → 10.** Nothing is half-finished and nothing is
uncommitted. Branch **25 ahead, 0 behind** `master`. Suite **6,274 green**, lint 0 errors.

**Closed today:** **4.30** (the invisible-character strip ran on *no* path at all — now at the
OpenAI client door, so all seven AI output paths are covered) · **4.41** (`@types/node` pinned
down to 14.18.63) · **4.40** (defu advisory reviewed, accepted, two recorded facts corrected) ·
**4.44** (`npm run check:engines`) · **4.37** (the five drivers are defined once) · **4.27** and
**4.38** (Mike's rulings recorded).

🔴 **THREE THINGS THE OTHER MACHINE MUST KNOW.**

1. **`npm install` still only works with npm 8.19.4 on Node 14.15.0.** Unchanged from
   yesterday; [`../.npmrc`](../.npmrc) explains why. Nothing today made that easier.
2. **Your next install will move 20 packages.** `@types/node` is now pinned in `overrides`:
   one hoisted copy at 25.9.3 is replaced by 20 nested copies at 14.18.63, and `undici-types`
   leaves with it. **That is expected, not a fault.** Confirm the tree with
   **`npm run check:engines`** — new today, and it also looks for the packages req 2 bans.
3. **Do not add per-engine output stripping.** `stripInvisible` runs inside
   `server/utils/openaiClient.js`, so anything new that calls OpenAI is cleaned automatically.
   A second strip inside an engine would be dead code that reads as protection.

**Nothing waits on Mike.** All three open questions were answered today.

**Next up, all ours:** **4.15** (21 logic-tree branches naming pages nobody can open) ·
**4.25** (nothing checks that a screen *looks* right) · **4.18** (the AI invents advice when
it is routed to the wrong method).
