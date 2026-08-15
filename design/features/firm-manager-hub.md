# The Firm Manager Hub — the Brief

> **Read this before adding a tab, changing a gate, or making anything firm-editable.** Current
> rules only. The history is in [`firm-manager-hub-history.md`](firm-manager-hub-history.md).
>
> **Covers:** the one screen every management tier renders, its tabs, and the override machinery
> behind the editable ones. **Does not cover:** what flows between tiers
> ([`tier-cascade.md`](tier-cascade.md)) or the individual editable blocks, which have their own
> briefs.

---

## 1. Design philosophy

**One screen, four tiers, no new functionality.**

> *"Every tier is the same screen, re-scoped… there's no new functionality."* — the owner,
> 2026-07-30

`pages/mentor.vue`, `pages/global-group-manager.vue`, `pages/group-manager.vue` and
`pages/firm-manager.vue` all render the **same component** with a different `scope` prop. A
manager at any level sees the same hub, showing their own configuration and the level below
them. The moment a tier gets a screen of its own, the model is broken and the drift begins.

**The hub exists so a firm can teach the system without a developer.** This is the commercial
heart of the product: the platform ships a strong base, and the reason a firm pays is that they
can pour their own advisory knowledge in and have it reach their advisors automatically. Every
editable block on this screen is a piece of that promise — plain-English editing screens, never
code.

**And every edit is recoverable.** Overrides carry version history and one-click restore for
free, because they all ride one storage mechanism. A manager can change their firm's advisory
configuration knowing they can put it back.

---

## 2. Key principles — the non-negotiables

**P1 · The hub is one component. Do not fork it per tier.** Differences between tiers are
expressed as scope, never as a second screen.

**P2 · Every conditional tab names its tiers positively.** The matrix lives in one place —
`TAB_TIERS`. Never gate a tab on a negative: a `!== 'mentor'` rule answers *yes* for a tier that
does not exist yet, and adding one would switch tabs on silently. Named positively, a new tier
shows up as a **missing** tab, which is visible.

**P3 · Identity comes from the verified token, never from the request.** A route resolves the
caller's tier and scope; it never takes a firm id from a body or query string. This is the guard
against one firm reading or writing another's configuration.

**P4 · A level holds only its changes, not a copy.** Untouched rows keep receiving the level
above's improvements; edited rows are protected and the update is *offered*, not applied. See
[`tier-cascade.md`](tier-cascade.md) P3.

**P5 · Every override goes through the one overlay store**, so version history and restore come
free. Do not invent a second storage path for a new editable block.

**P6 · A tab with nothing to show says so.** An empty roll-up and a broken one must never look
alike.

**P7 · Wording on this screen is approved before it ships** — labels, status pills, failure
messages. Several are recorded verbatim in the design record.

---

## 3. Design considerations

**There are two flavours of the Advisory Distinctions tab, and the difference is structural.**
The firm flavour carries *decline / override / reset-to-platform*, which only mean something
when a layer sits above you. The mentor sits at the top, so its version is plain add / edit /
move / remove. Every tier **below** the mentor takes the firm flavour — including the two middle
tiers.

**Tabs divide into three kinds**, and knowing which you are adding matters more than where it
goes: **cascading config** (edited here, flows down), **firm-local records** (never cascade —
Logic-Lab is one, by nature), and **roll-up reports** (read-only views of the level below).

**Templates & Videos is dormant on purpose.** It is switched off everywhere by an owner decision,
because templates are Advisor-e's entire lifecycle — not ours. It is not a broken tab awaiting
repair.

**Adding a firm-editable block is a known, repeatable job**, not a design exercise. The overlay
mechanism, the version history, the restore and the authorisation guard already exist; a new
block reuses them. The `firm-manager-edit-target` skill is the recipe.

**This component is very large** — over 1,700 lines, with a backend route file over 3,700. Both
are candidates for decomposition, and both are load-bearing. A split needs tests in front of it.

---

## 4. For the coder

### Where things live

| Piece | Path |
|---|---|
| The hub component | `components/FirmManagerHub.vue` |
| Tab bodies | `components/firm/*.vue` |
| The tier pages | `pages/mentor.vue` · `pages/global-group-manager.vue` · `pages/group-manager.vue` · `pages/firm-manager.vue` |
| The backend | `server/routes/firmManager.js`, `server/routes/mentor.js` |
| Override storage + version history | `server/utils/firmOverlay.js` |
| Content resolution | `server/utils/firmContent.js` |
| Auth and scope resolution | `server/middleware/firmAuth.js` |
| The tab matrix | `TAB_TIERS` in `FirmManagerHub.vue` (exported for its test) |

### The tab matrix, as built

Unconditional at every tier: **Domain Support · Logic Tables · Logic-Lab · Advisory Staircase ·
Coaching Reference · Quizzes · Adviser Network**. *(Seven since 2026-08-15, when Coaching Reference
was added — the fifth and last block to join the row-inheritance mechanism, and the only one whose
engine shipped before its screen. It is unconditional for the same reason the Staircase is: the
mechanism means the same thing at every tier with a layer above it, and the mentor edits the
platform rows through the same tab.)*

| Tab | Tiers |
|---|---|
| Advisory Distinctions (firm flavour) | firm, global, group |
| Advisory Distinctions (mentor flavour) | mentor |
| Team Progress · Team Case Studies | firm, global, group |
| Adoption | mentor, global, group |
| Logic-Lab Report · Case Reviews | mentor, global, group |
| Template Check | **mentor only** — the one named exception |
| Templates & Videos | dormant everywhere |

`hubTabTiers.test.js` pins the firm and mentor columns to what they showed *before* the middle
tiers existed — the proof that adding them was behaviour-preserving rather than a claim that it
was.

### Traps that have actually bitten

1. 🔴 **A save can be refused by the database while the screen reports success.** Every store
   falls back to a local dev file when a query fails, and the test used to be "are we in
   production?" — so a genuine refusal looked like "there is no database". The fix
   discriminates on `sqlState`, which only a live server's rejection carries. **It is fixed, and
   the shape to preserve is that a real refusal is never absorbed.** A new tier scope still needs
   its reserved row in `firms` seeded, or its saves are foreign-key refused.
2. **A domain list drifted between two files.** A write landed in the gap between them. There is
   now a test so that gap cannot silently reopen — if you add a domain, both lists move.
3. **Own-row id prefixes must stay distinct per tier**, or one level switching off "its own" row
   drops another's.
4. **The `group` table in the schema is not a management tier.** It is a Collaborate special
   interest group.

### Known state

MySQL has never been provisioned, so every firm-editable block runs on its dev-file fallback and
**no override row exists in any environment**. That is why re-keying storage was cheap; it also
means nothing here has been proven against a real database. Say so rather than reporting a
screen as done.

---

## 5. Related briefs

[`tier-cascade.md`](tier-cascade.md) — what flows through this screen ·
[`advisory-distinctions.md`](advisory-distinctions.md) · [`quizzes.md`](quizzes.md) ·
[`advisor-progression.md`](advisor-progression.md) · [`adviser-network.md`](adviser-network.md).

**History:** [`firm-manager-hub-history.md`](firm-manager-hub-history.md)
