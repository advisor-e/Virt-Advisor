# The Tier Cascade — the Brief

> **Read this before building anything that a manager sees, or anything a firm can
> configure.** Current rules only. The arguments, reversals and the two occasions this was
> got wrong are in [`tier-cascade-history.md`](tier-cascade-history.md) — after this page.
>
> **Covers:** the six levels, what flows down to them, what reports back up, and how a level
> is named in storage. **Does not cover:** login, accounts, roles or templates — those are
> Advisor-e's, not ours (see P1).

---

## 1. Design philosophy

**The cascade is a quality feedback loop, not an org chart.**

> *"The information and tools cascade down so we share the tools effectively, the reports
> cascade up so we learn what is working, what isn't, who is failing so we can offer help."*
> — the owner, 2026-08-10

Two directions, one shape. **Tools go down** so that good advisory material reaches everyone
rather than staying with whoever wrote it. **Reports come up** so the people who can help know
who needs it. Take either direction away and the loop stops being a quality system and becomes
either a filing cabinet or a league table.

That is why the tone rule below is not decoration. The typical user of this app is **learning
on the job, in front of a paying client** — not a confident specialist. Advisor-e's promise is
"learning just in time". A report exists to find where the product is failing the learner, so
somebody can act. **A screen written for a confident expert is written for the wrong person.**

The second idea doing a lot of work: **every tier is the same screen, re-scoped.** There is no
per-tier functionality, and there never should be. A firm manager sees their advisers; a group
manager sees their firms; the shape is identical. The moment a tier gets its own feature, the
model has been broken.

---

## 2. Key principles — the non-negotiables

**P1 · If it needs login, accounts, the org chart, roles or templates, it is not ours.**
Advisor-e owns all of it. Do not design a screen for it, do not hold a copy of its data, do not
mint an id for it. This app holds **advisory decision configuration** — the material the AI
draws on, the decision trees, the language, the client journey, the capability questions — and
the record of what people did with them. Nothing else.

**P2 · Never invent or shorten a role name.** The six are fixed:
`mentor` · `global_group_manager` · `group_manager` · `firm_manager` · `advisor` ·
`business_entity`. Spoken: mentor, global group manager, group manager, firm manager, advisor,
business entity. A global group is a **brand**; a group is normally a **country**; a firm is a
**branch**. `tierVocabulary.test.js` fails the build if a superseded spelling appears anywhere
in the source **or** in `design/`.

**P3 · A level holds only its changes, never a copy.** An untouched row keeps receiving the
level above's improvements automatically. A row a level *has* edited is protected, and the
level above's later change is **offered** — Adopt / Keep mine — never silently applied.
Clone-like protection where someone made a decision; automatic freshness where they did not.

**P11 · A level's own additions are pushed down, and the level below owns what it receives.
Nothing is ever enforced — in either direction.** Ruled by Mike: *"everything gets pushed down,
once in place the lower level has the right to edit and refuse future updates"*, and *"under no
circumstance can a lower level push something up or enforce changes upward either."*

- **Downward:** what a level adds or edits is **in force immediately** at the levels below. Once
  it is in place, the level below may **edit it, switch it off, and refuse a later change** to it.
  That is what *never enforce* means — not that material waits for permission to start working,
  but that no level below is ever stuck with it. Editing and declining are free, reversible, and
  change nothing above. The mechanism is §3's: inherited / declined / overridden / own, with
  Adopt or Keep mine when the level above changes a row somebody has already edited.
- **Upward:** ⚠ **do not read this as a hole to plug — it is already closed, structurally.**
  Reports rolling up is the *feedback loop the design exists for* (P4) and is emphatically
  allowed. What is forbidden is a lower level making a document, model or setting a
  **requirement** for a level above. Today every roll-up route is a `GET`
  (`/api/mentor/cases`, `/api/mentor/adoption`, `/api/mentor/logic-lab-report`), and every save
  in the app calls `saveFirmConfig(req.firmId, …)` — the caller's **own** scope, resolved from
  their own token, never a parent and never an id taken from the request body. There is no route
  a firm could use to write into its group, so there is nothing to enforce in code.

🔴 **WHAT P11 DOES NOT TOUCH, and this boundary is the whole point of it.** Ruled by Mike:

> *"the Staircase, Distinctions, Quizzes and Domain Support are software features and ai
> guidance tools to enable software execution — they are not templates like a word doc or excel
> model to work with a client. don't over complicate things"*

**The advisory decision configuration is a shared TOOL, not an offer.** The Advisory Staircase,
Advisory Distinctions, Quizzes, Domain Support and the Logic Tables are what makes the software
execute — §1's *"the tools cascade down so we share the tools effectively"*. They already behave
correctly: they arrive working, a level may switch a row off, edit one, reset it, or add its
own. **That is the design, not a gap in it.** Requiring a firm to accept those rows one by one
before the engine would run is precisely the *"software would be useless for a new firm"* case
Mike ruled out, applied to every firm rather than only new ones.

P11 governs **content a level authors and offers to other levels** — a contributed prompt, a
resource, material meant to be worked with. It does **not** govern the engine's configuration.

⚠ **Do not open a reconciliation of `resolveInheritedRows`, the tool blocks or the engines on
the strength of P11 — the mechanism is right, and P11 is not about it.** P3 stands unchanged.

**P4 · Every report rolls up, to the level immediately below, summarised.** No per-report
exceptions, ever. Firm manager → its advisers. Group manager → its firms. Global group manager
→ its groups. Mentor → its global groups. Deciding report-by-report which tier "should" see
something invents per-tier functionality and creates an exception list somebody must re-derive
later.

**P5 · Every tab and every report names the tiers it belongs to. Never gate on a negative.**
A gate written as `scope !== 'mentor'` answers *yes* for a tier that does not exist yet. The day
a third scope appears, such a tab switches itself on silently and nothing fails.

**P6 · No new code takes a bare `firmId` as its scope.** A route resolves a **tier** and a
**scope**; a firm is one possible value, never the assumed one.

**P7 · Every cross-firm row carries its origin.** A report that shows something is wrong
without showing **where** is an alarm with no address. The origin is a *path* — the level
immediately below the viewer first, the firm last. Naming a firm to the manager above it is not
a disclosure; what stays hidden is the **adviser** and the **client**.

**P8 · A tier with nothing to show says so on screen.** An empty roll-up and a broken one must
never look alike.

**P9 · Tone is help, never score.** The users are learning. A badge means *act*, not *glance*.

**P10 · Every AI fix surfaces on a hub page — mentor first, cascading down.** Ruled by the
owner, 2026-08-16: *"ALL AI fixes must use hub pages where possible, starting with the mentor
and cascading down as appropriate."* Content that shapes what the AI is shown does not get to
live only in `data/*.json`, and never hardcoded in a prompt builder. Build the **mentor's**
view first and let it cascade — never the firm's copy first, reasoning upward. Which tiers
receive it is a judgement to **state in the same change**, and *"where possible"* is the only
escape, carrying a named reason. **Wiring content into the prompt without a screen is half a
fix** — it makes the content live and still untouchable. The rule is in
[`../../CLAUDE.md`](../../CLAUDE.md); the evidence that forced it is below.

⚠ **The evidence, and it is the twin of the warning in §4.** A sweep found **102 pieces of
authored content reaching no prompt at all**, and no screen rendered any of them — even though
the Domain Support and Logic Tables tabs already existed at every tier. **The pages were there
all along; the fields were never put on them** — which is why "does this block have a screen?"
is the wrong question and "does *this field* have one?" is the right one.
So §4's warning — *a field can be authored, stored, made firm-editable and still reach
nothing* — has a worse sibling: **a field can be authored and reach neither a prompt nor a
screen**, and then no test, no tab and no person can find it.

---

## 3. Design considerations

**The advisor is a pass-through and the business entity is a recipient.** Neither authors
anything here, so neither gets override storage. The business entity is an *entity*, not a
person — it may have several people, which is why the tier is not named after one.

**Arrays deliberately cannot cascade.** An array replaces wholesale, so a level holding a
one-item array would blank the level above's entire set for itself. That is why `templates` and
`logic-lab-accepted` are absent from the cascading keys. A correctness decision, not an
omission.

**Two mechanisms, and they are not interchangeable.** `deepMerge` is for map-shaped config
where an untouched entry falls through to the layer above. `resolveInheritedRows` is for blocks
where each row is a *decision* — switch it off, edit it, reset it, or add your own. Six blocks
cascade: Domain Support, Logic Tables, Section placement, Advisory Distinctions, Advisory
Staircase, Quizzes.

**Own-row id prefixes must stay distinct per tier**, or one level switching off "its own" row
silently drops another's: mentor `ms-`/`mq-`, global `xs-`/`xq-`, group `gs-`/`gq-`, firm
`fs-`/`fq-`. `x` for global, because `g` reads as *group* and the two tiers are adjacent.

**Some roles are real but deliberately unmodelled.** Global Coach, Group Coach and Curator are
genuine Advisor-e roles. They need no pages and no code here. **Do not add them to the code,
and do not delete them from the design record** — the trap runs both ways.

---

## 4. For the coder

### Where things live

| Piece | Path |
|---|---|
| The one seam — parent scope, chain, origin path | `server/utils/tierChain.js` |
| Override storage, version history, restore | `server/utils/firmOverlay.js` |
| Row-level inheritance | `server/utils/resolveDistinctions.js` |
| Scope resolution on a request | `server/middleware/firmAuth.js` |
| The one screen every tier renders | `components/FirmManagerHub.vue` |
| Thin per-tier pages | `pages/mentor.vue` · `pages/firm-manager.vue` · `pages/group-manager.vue` · `pages/global-group-manager.vue` |

### Scope identity

Reserved scope ids ride the **existing `firm_id` column** — the owner's reserved-row ruling, no
schema change:

| Tier | Scope id |
|---|---|
| Mentor | `__platform__` |
| Global group manager | `__global__:<brand>` |
| Group manager | `__group__:<brand>:<country>` |
| Firm manager | the real firm id |

Double underscores make a collision with a real Advisor-e firm id impossible.

### Traps that have actually bitten

1. 🔴 **A new tier scope needs its reserved row in `firms` seeded**, or its saves are
   foreign-key refused — loudly, because `dbFailure.js` discriminates on `sqlState`.
2. ✅ **The negative tab gates are FIXED — keep them that way.** `TAB_TIERS` in
   `FirmManagerHub.vue` is the whole matrix in one place, **every entry names its tiers
   positively**, and `hubTabTiers.test.js` pins the firm and mentor columns. Adding a new scope
   shows up as a **missing** tab, which is visible, rather than one that appears uninvited.
   **Do not reintroduce a `v-if` gate on a negative** — P5 carries the rule and the reason.
3. ⚠ **`config/db-schema.sql` has a `group` table and it is NOT a management tier.** It is a
   Collaborate Special Interest Group — social. Reading it as a tier would be a correctness bug.
4. **`assertNoPersonalFields` throws rather than filters.** Leave it that way. A silent filter
   would hide the day the payload shape changed.

### The one named exception to "every report rolls up"

**Template Check is mentor-only**, and the owner narrowed it himself the day after ruling that
every report rolls up: *"we use it to improve the overall system. it does not relate to
people/advisor performance or group manager selection/access permission to templates."* It is
also the only report with **no firm dimension** — it scans the shared master catalogue against
the logic tables, so there is nothing in it belonging to a group that could be shown to that
group. Its routes keep the mentor-role guard rather than the managing-tier guard the other
reports moved to. This makes each middle hub **12 tabs, not the 13 first drawn**.

### Logins are Advisor-e's to provide

🔴 **Ruled by Mike, 2026-08-22: every manager-hub login is provided by Advisor-e.** Not by us,
not by a screen in this app, and not by a table we own.

This is **P1 applied to the hubs**, not a new rule — P1 already says login, accounts and roles
are Advisor-e's. It is repeated here because P1 is a principle and this is the case that keeps
being met: three documents in this folder describe the missing logins as an unowned gap, which
invites somebody to fill it. It is not a gap. It is a settled division of responsibility, and
the correct response to it is to wait, not to build.

What Advisor-e supplies is small and named: the two role values in
[`config/integration.js`](../../config/integration.js) — `globalManagerRole` and
`groupManagerRole` — plus the brand and country claims on the token. **Nothing else changes when
they arrive.** Both ship as empty strings, which match no role, so until then no real token can
resolve to a middle tier and no save can land in a group's storage by accident. That failure
mode is not hypothetical: see *Traps that have actually bitten*.

### The honest limit

**The middle-tier hubs are built and approved** — `pages/global-group-manager.vue` and
`pages/group-manager.vue` render the same hub at the new scopes (Mike, 2026-08-10) — **and they
hold no real firm data yet.** The two things that would fill them are Advisor-e's and Mike has
PARKED both ([`to-do.md`](to-do.md) 3.2 and 3.3: *"already provided for by the master app"*). Until
they arrive `parentScopeOf` returns the mentor scope for every firm and the chain runs mentor →
firm, exactly as it did before the chain existed — the safe direction to fail.

⚠ **This is not a gap in our work and must never be reported as one.** See `CLAUDE.md` § "The four
tiers are settled and built".

⚠ **In development the two middle hubs show INVENTED firms.** Membership is seeded from
`data/dev-firm-membership.json` — 27 invented firms across 3 brands and 5 countries — and the
server says so loudly at startup. Do not read those screens as real firms, and do not
demonstrate them to anyone as though they were.

✅ **The two middle tiers CAN be opened and worked on today, with made-up logins.**
[`server/middleware/firmAuth.js`](../../server/middleware/firmAuth.js) carries four invented
dev tokens — `dev-local-bypass` (firm manager), `dev-local-mentor`, `dev-local-global`,
`dev-local-group` — active only when `ALLOW_DEV_AUTH=true` **and** `NODE_ENV` is not
production, so they cannot exist in a deployed environment. Each attaches the **real scope id**
via the same `tierChain` helpers a real token will use, so what a developer exercises is the
genuine storage path rather than a special case.

⚠ **What the dev tokens do NOT prove.** They borrow `platform_admin` to get past
`requireManagerRole`, because the real role values do not exist yet. So the *scope* behaviour is
genuinely exercised and the *role gate* is not. When Advisor-e supplies the two values, the gate
is the one thing still to be tested — and it is the thing the trap below is about.

### The coaching reference — the fifth block, and the last to join

**It inherits, at every tier, and it has a screen.** Its 15 rows carry stable `cr-` ids and it
resolves through `resolveInheritedRows`. A firm can switch an entry off, edit one, reset it, or
add its own, exactly as it can the Advisory Staircase — `server/utils/coachingConfig.js`,
`server/utils/firmCoachingReference.js`, `components/firm/FirmCoachingReference.vue`.

🔴 **TWO KINDS OF COACHING ROW LIVE UNDER SIMILAR NAMES AND MUST NEVER BE FOLDED TOGETHER.** The
obvious wiring was to inherit through the existing `coaching-reference` key. That key does not hold
platform guidance — it holds a firm's **promoted case observations**, an adviser's own free text
about a real client, which reaches the model **fenced** as untrusted. Folding them together would
have stripped the fence off every promoted entry: a prompt-injection hole with nothing on screen to
notice it by. They now live under different keys (`coaching-declines` / `coaching-overrides` /
`coaching-own` versus `coaching-reference`), resolve through different code, and render into
different prompt sections. Tests fail if they ever meet.

**A firm may not retitle an inherited entry's `template`, and that is not tidiness.** The field
names a template in the library, and the whole purpose of the block is to steer the model toward
that template *by name*. Retitling an inherited row would leave Advisor-e's id attached to guidance
pointing somewhere else, and the model would be coached toward a template that may not exist. A
firm wanting different guidance switches the entry off and adds its own — which it may title
freely, because no platform id sits behind it. Enforced three times over: the route refuses it, the
read strips it, and the form renders it locked *with the reason beside it*.

⚠ **A field can be authored, stored, made firm-editable and still reach nothing.** `howItHelps` and
`deliveryNotes` were all four, and no prompt builder rendered either until 2026-08-15 — so a firm
could have rewritten the longest field on the tab and changed nothing about the advice. Every test
was green, because every test asked whether the field was *saved*. **When a block joins the
mechanism, check its fields against the prompt builder, not against the store.**

### Property tax rules — the sixth block, and the first that is SETTINGS rather than ROWS

The tax settings behind the Multiple Property Assessment cascade
group → firm, and the advisor types over them on the report. Ruled by Mike 2026-08-17
([`../MULTIPLE-PROPERTY-ASSESSMENT.md`](../MULTIPLE-PROPERTY-ASSESSMENT.md) §8 Q6) —
`server/utils/propertyTaxRules.js`, `server/routes/propertyTaxRules.js`,
`components/firm/FirmPropertyTaxRules.vue`.

🔴 **THE MECHANISM IS `deepMerge`, NOT `resolveInheritedRows`, AND THE CHOICE IS THE WHOLE POINT.**
The five blocks above are **rows**, each carrying its own decision, so a level switches one off,
edits one, or adds its own. These are **map-shaped settings**: there is nothing to switch off and
nothing to add. A group that sets only `lossTreatment` must keep receiving the platform's value for
everything else, which is P3 stated for a shape P3 was not written against. ⚠ **Do not reach for
the row mechanism because five blocks already use it** — a settings block forced through
`resolveInheritedRows` would need a synthetic id per field and an off-switch that means nothing.

⚠ **`phasingTable` is an array and replaces wholesale.** That is `deepMerge`'s rule and it is the
right one here: a phasing schedule half from one country and half from another is a schedule no tax
authority has ever written.

**The mentor is excluded** — see [`firm-manager-hub.md`](firm-manager-hub.md) §4 for the ruling and
the option turned down. **The advisor is still a pass-through**: their override is the report's own
card and is never stored, so §3 above stands unamended.

⚠ **This block is where the missing firm-to-country map bites first** — a group is normally a
country, and country is exactly what the chain cannot yet resolve, so `parentScopeOf` returns the
platform scope and the chain runs mentor → firm. **It fails toward the shipped New Zealand
defaults, never toward a guess.** The map is Advisor-e's and Mike has PARKED it
([`to-do.md`](to-do.md) 3.3); the evidence here is tests against a seeded membership map, which is
a weaker claim than a live screen and is stated as one.

---

## 5. Related briefs

[`firm-manager-hub.md`](firm-manager-hub.md) — the screen every tier renders ·
[`advisory-distinctions.md`](advisory-distinctions.md) — the row-inheritance mechanism the rest
came up to · [`collaborate.md`](collaborate.md) — the roll-up that already works and is the
model for the others.

**History, and the two occasions this was got wrong:**
[`tier-cascade-history.md`](tier-cascade-history.md)
