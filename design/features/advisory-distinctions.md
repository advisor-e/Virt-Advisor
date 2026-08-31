# Advisory Distinctions — the Brief

> **Read this before changing how a distinction is authored, inherited or scored.** Current
> rules only. The history is in
> [`advisory-distinctions-history.md`](advisory-distinctions-history.md).
>
> **Covers:** the plain-English rules that teach the engine what an advisor's words mean, and the
> inheritance mechanism that carries them down the tiers. **Does not cover:** how the score is
> then used ([`advisory-engine.md`](advisory-engine.md)).

---

## 1. Design philosophy

**This is how domain expertise enters the system without a developer.**

A distinction is one plain-English row: *when the advisor says these things, it means this, and
these tools should surface.* No regex, no code. It puts ownership of advisory vocabulary where
it belongs — with the domain expert, not the engineers — and it is the mechanism behind the
product's central promise that a firm can pour its own knowledge in and have it reach its
advisors automatically.

It also solves a real scoring problem. The context domains — conflict, end of year, due
diligence — suppress most signals, leaving very little to discriminate between templates.
Distinctions give those domains their own vocabulary without a code change.

**The inheritance rule is the important part, and it is a statement about who knows best.** A
mentor's row is live for every firm the moment it is published — nobody has to accept anything.
But once a firm has declined or edited a row, **the firm's choice sticks**, and the mentor's
later changes to that row do not overwrite it. The firm is closest to the client and the
advisor, so it has the final say.

**This mechanism became the pattern for everything else.** It was the answer to a question the
whole platform was stuck on: clone down, or layer? Neither. A row nobody has touched stays
current automatically; a row someone edited is protected and the update is *offered*. Every
other cascading block was then brought up to it.

---

## 2. Key principles — the non-negotiables

**P1 · On by default.** A published mentor distinction is immediately live for every firm's
advisors. No firm action is required to receive it.

**P2 · Firm customisation wins and sticks.** Once a level declines or edits a row, later changes
from above do not override that choice. They are **offered** — Adopt or Keep mine — never
applied silently.

**P3 · A level holds only its changes.** An override stores the *edited fields*, not a copy of
the row, so untouched fields keep tracking the level above **per field, not per row**.

**P4 · Stable ids are load-bearing.** Overrides, declines and drift baselines are all keyed to a
row's id. Renaming or renumbering one silently re-points somebody's decision at a different row.

**P5 · When the mentor deletes a row someone customised, keep theirs.** The customised version is
promoted to a standalone own-row **before** the master row is removed, so a failure leaves the
master intact. A level that only *declined* it needs no action; an untouched level simply loses
the default.

**P6 · Every write is scoped to the authenticated level, never a supplied id.** A cross-level
write — the promotion above is one — is guarded like any other.

**P7 · Own-row id prefixes stay distinct per tier**: mentor `ms-`, global `xs-`, group `gs-`,
firm `fs-`. Two tiers sharing a prefix would put two different rows under one identity.

**P8 · A mentor edit is cross-firm and immediate.** Saving a row instantly changes advisor
behaviour at every level that has not customised it. Version history and restore are the safety
net, but **the blast radius is real and should be visible on screen.**

---

## 3. Design considerations

**The mentor screen and the firm screen are the same screen in two modes.** The firm flavour
carries decline / override / reset-to-platform, because a layer sits above it. The mentor sits
at the top, so it gets plain add / edit / move / remove. Every tier below the mentor takes the
firm flavour.

**Drift detection is the one genuinely subtle piece.** Because an override stores only a delta,
nothing in the data records how the row above looked when the edit was made — so nothing can
tell it has since changed. A **baseline is stamped** at override time; current row ≠ stamped
baseline shows the "updated" badge.

**Adopt is whole-row on purpose.** Take the version above entirely, or keep yours entirely.
Field-level cherry-picking is materially more complex and was deliberately left as a possible
later refinement, not a first cut.

**A distinction moves recommendations by design.** It adds a boost straight to a template's
score. That is not a side effect to be tuned away — it is the feature.

**The destination is the feedback loop.** Real case studies from a firm's own advisors feed back
into suggested distinctions, so the system keeps getting better at matching that firm's staff
and client base. Everything here is groundwork for that.

---

## 4. For the coder

### Where things live

| Piece | Path |
|---|---|
| The platform/mentor rows | `data/advisory-distinctions.json` (seed and fallback) |
| Resolution — the inheritance rule | `server/utils/resolveDistinctions.js` |
| Mentor authoring routes | `server/routes/mentor.js` |
| Firm side, overrides, baselines | `server/routes/firmManager.js` |
| Storage, version history, restore | `server/utils/firmOverlay.js` |
| Firm rows loader | `server/utils/firmDistinctions.js` |
| Platform rows loader | `server/utils/platformDistinctions.js` |
| Scoring use | `server/utils/templateResolver.js`, `classifyDistinctions` in `server/advisorEngine.js` |
| The screens | `components/MentorDistinctions.vue`, `components/firm/FirmDistinctionForm.vue` |

### How a row reaches a session

Rows for the detected domain are read at session time and the collected advisor answers are
scanned for their trigger phrases. A match raises the score of the associated templates — the
same mechanism as semantic scoring, but driven by editable data rather than hardcoded patterns.
Classification is semantic, not literal string matching.

### The effective list, stated exactly

All live rows from above, **minus** the ones this level declined, **plus** this level's edited
versions swapped in, **plus** this level's own added rows.

### Traps that have actually bitten

1. **A level's rows never reached advisors at all.** The advisor page derived its firm from a
   URL query, so with no `?firmId=` the firm branch was skipped entirely and a firm's row never
   surfaced. Closed when the advisor route moved behind token auth — identity now comes from the
   verified token and any id in the body is ignored.
2. **The resolver used to silently drop an override with no matching row above.** That is the
   behaviour the keep-theirs promotion replaced. If you touch delete handling, the firm's edits
   must be promoted, not lost.
3. **A domain list drifted between two files** and a write landed in the gap. Both lists now move
   together, pinned by a test.
4. **Version history is free only if you use the shared store.** A new storage path loses it.

### Known state

MySQL has never been provisioned. Every level's rows run on the dev-file fallback, which has **no
version history**. **The mentor's tab says so on screen** when it is serving that file, and names
how many committed rows the file is hiding. Buildable and testable, but not *done* — do not
mistake the fallback for finished.

---

## 5. Related briefs

[`advisory-engine.md`](advisory-engine.md) — how the boost is used ·
[`firm-manager-hub.md`](firm-manager-hub.md) — the screen it is edited on ·
[`tier-cascade.md`](tier-cascade.md) — the inheritance model this feature defined.

**History:** [`advisory-distinctions-history.md`](advisory-distinctions-history.md)
