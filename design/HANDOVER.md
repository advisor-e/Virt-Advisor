# Handover — the last session, and only the last session

> **One file, one session. It is replaced each time, not added to.** Anything worth keeping
> beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. This replaces the 85 `SESSION-*.md` files written before 2026-08-24; those stay
> as history and none is written now. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-08-27 · Laptop · branch `feat/advisor-progress`

Suite **6,432 green**, lint 0 errors. Branch **61 ahead, 0 behind** `master`. Nothing
uncommitted. One commit: `48663f8`, pushed.

🔴 **The education gate is GONE — do not look for it and do not rebuild it.** Removed in
full on Mike's instruction (4.52): code, data, tests, wording, screen strings and every
note naming it. He never asked for it and asked four times for it to go. Git history holds
it. The only surviving mention is `CLAUDE.md`'s own "only build what Mike requested" rule,
which uses it as the worked example — that stays, it is his rule.

It set one field, `sequencingRule`, which **nothing reads and has not since 2026-06-23**
(recorded in `virt-advisor-registry.md`). So no advice changed. `sequencingRule` itself was
left in place — it predates the gate and is still inert; the comment now says so.

**4.53 closed.** `resolveRecommendedTemplatesWithSource` in
[`tierLookup.js`](../server/utils/tierLookup.js) now returns `declared` or `prose` beside the
templates; the engine logs it and puts `source` on the decision trace. It does **not** try to
make the model obey — it makes the fallback countable. 5 tests.

⚠ **A brief in-flight scare, resolved.** Mid-removal the engine imported nothing but still
called the gate's functions — the backend would not have started. It is whole now and the
suite proves it, but if you see that shape again, finish or revert; do not leave it.

**Waiting on Mike:** **4.15** (23 template names — needs his search-content update) ·
**4.50** now waits on UAT, not on us. The live list is down to those two.

**Unchanged:** `npm install` still needs npm 8.19.4 on Node 14.15 — [`../.npmrc`](../.npmrc).
