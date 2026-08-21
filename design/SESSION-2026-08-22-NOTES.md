# Session Notes — 2026-08-22 · Laptop, Session 79

> **Branch `feat/advisor-progress`.** Suite **323 suites / 5,942 tests green**, lint 0 errors,
> tree clean. **56 ahead of `master`, 0 behind.**
>
> 🔴 **No application code was written this session.** Eight commits, all design documents and
> drawings. That is the correct outcome — every one of them exists because Mike read something
> and ruled on it — but it must not be mistaken for progress on the build.

---

## 🔴 FIRST TASK NEXT SESSION

**Item 4.28 — redraw the AI Prompts tab for an accountant, then build it.**

The drawing exists ([`mockups/ai-prompts-tab.html`](mockups/ai-prompts-tab.html), `1819597`) and
Mike read it. His verdict is the item's real next step and it is **already approved**:

> *"who is supposed to be working with this page? A computer coder or an accountant who has been
> given a word doc with some ai / claude prompts on it and told the prompts need to be included
> for their protection? If its the latter (and it is) then your version risks being too
> complicated for them."*

**What changes, agreed with him and not yet done:**

- **The cash flow prompt stays as drawn.** *Materiality*, *three-way forecast*, *draft and
  publish*, *auditability* are an accountant's own vocabulary. Seeing it reassures them.
- **The security prompt does not.** *"Hardening an assistant against the lethal trifecta"*,
  *"Inventory the three legs"*, *"Gate the sinks, not the reads"*, *"Taint-gate memory writes"*
  — that is **7 of the 19 sections a firm manager sees**, in a different profession's language.
  It does the opposite of reassuring: a list of alarming things they cannot evaluate.
- **It becomes one plain-English panel** — *"How your clients' information is protected"*, four
  sentences — and the **technical version stays mentor-only**.
- **The manager's page then holds one prompt and three settings**, so the two-card picker goes
  with it.
- ⚠ **Ask his word on two labels.** *Materiality threshold* is his profession's word and stays.
  *Reporting granularity* is not — an accountant says "monthly or quarterly". Propose plainer
  wording for that and for *currency and units*, marked as ours.

---

## What shipped — eight commits, no code

| Commit | What |
|---|---|
| `1819597` | The AI Prompts tab drawn **before** building it, plus its artefact-register row |
| `28cb249` | Two editable boxes that controlled nothing, removed |
| `10c4505` | Logins are Advisor-e's — and the Brief had been understating what already works |
| `4a7c47e` | The accountant contribution design and screen |
| `9ede8fa` | Paste-only ruled; uploads removed, not deferred |
| `a2197fd` | The approval queue removed — it was against the product |
| `dce2fe5` | P11 written into the Tier Cascade Brief |
| `44b490b` | P11 scoped to authored content — the correction |

---

## 1. 🔴 The session's real lesson, and it is mine

**I wrote a rule into the Brief that would have broken four working features.** `dce2fe5` gave
P11 a closing paragraph naming nine source files — `resolveInheritedRows`,
`resolveDistinctions`, `staircaseConfig`, `quizConfig`, `firmDistinctions`, `firmStaircase`,
`firmQuizzes`, `firmManager`, `advisorEngine` — as an unreconciled gap between the code and
Mike's new cascade ruling. **The Brief is the ruleset.** The next session to read it would have
taken that as a job.

Mike stopped it:

> *"the Staircase, Distinctions, Quizzes and Domain Support are software features and ai guidance
> tools to enable software execution - they are not templates like a word doc or excel model to
> work with a client. don't over complicate things and make sure you properly read all hierarchy
> notes - you are getting close to making a huge fuck up that i'll have to fix later"*

He is right, and **P1 of the same Brief says it one line above where I typed P11**: *"If it needs
login, accounts, the org chart, roles or **templates**, it is not ours."* §1 says why the tools
cascade the way they do: *"the tools cascade down so we share the tools effectively."* Requiring
a firm to accept those rows one at a time before the engine runs is the *"software would be
useless for a new firm"* failure he had ruled out an hour earlier — applied to every firm.

⚠ **How it happened, because it is not the usual failure.** Every fact in `dce2fe5` was checked
against the code before I wrote it. Nothing was taken from a document on trust. **The failure was
scope, not verification:** a ruling given about one kind of content was generalised across the
whole app without ever asking what kind of content the rule was about. *Reading the code told me
how the cascade **works**. Only §1 and P1 say what it is **for**, and I wrote a principle without
reading them.*

**The wrong version is described in the Brief rather than deleted**, with an explicit *do not open
a reconciliation of these nine files on the strength of P11* — because someone reading P11 alone
would reach my conclusion again by honest reasoning.

⚠ **I made a second scope error the same session**, which is why the session was stopped: I
implied the upward direction needed checking. It does not. *"current code permits reports to flow
up as feedback loops - they do NOT allow a lower level to create a document or model etc and make
it a requirement for levels above them. read the code correctly - do not jump to conclusions."*
Verified afterwards and now written into P11: every roll-up route is a `GET`, and every save calls
`saveFirmConfig(req.firmId, …)` — the caller's own scope from their own token. There is no route
a firm could use to write into its group.

---

## 2. Mike's rulings this session — all four are in Briefs, not here

1. **Every manager-hub login is provided by Advisor-e** (`tier-cascade.md`, *Logins are
   Advisor-e's*). P1 applied to the hubs. What they supply is named and small: two role values
   and the brand/country claims.
2. **P11 — a level's own additions are OFFERED downward and must be accepted; nothing is enforced
   in either direction** (`tier-cascade.md` P11). Scoped to **authored content**, not the engine.
   The platform baseline is the product and simply works — *"else the software would be useless
   for a new firm."*
3. **Pasted text only, no file uploads ever** (`PROMPT-CONTRIBUTION-SAFETY.md` §1a).
4. **Nobody above signs a firm's contribution off** — *"many firms in corporate groups will have
   their own opinion so will want it their own way."*

---

## 3. What the drawings found that no test could

**Two dead controls, both found by Mike looking at a picture.**

The security prompt shipped two editable boxes — a fetch burst limit of 6 and a 60-second window
— belonging to a step marked *does not apply here*, because this app's AI cannot fetch anything.
**They worked perfectly.** They validated, they saved, they inherited down the tiers, they had
unset rules. They were attached to nothing. A manager could have typed a number, pressed Save,
and believed they had hardened something.

🔴 **A test can prove a control works. It cannot ask whether the thing it controls exists.**
`AI-PROMPTS-PAGE.md` §5 had already ruled it — *"the numeric thresholds **where one does**
apply"* — and the build did not follow. Removed in `28cb249`; the reasoning lives in
`data/ai-prompts.json` beside the empty `variables` array, with the condition under which they
may return.

**And the Brief was understating what works.** It said the middle tiers *"cannot be demonstrated
by logging in as a group manager, because no such login exists."* Four invented dev tokens have
existed since v0.8.0 — `dev-local-bypass`, `dev-local-mentor`, `dev-local-global`,
`dev-local-group` — behind `ALLOW_DEV_AUTH` and non-production, each attaching the real scope id.
That stale sentence taught **every session that read it** to write a weaker caveat than the truth,
including three documents this week and my own commit message. **A Brief that understates what
works costs as much as one that overstates it, and it costs it quietly.**

---

## 4. For the other machine

Nothing here touches Course Builder or the Business Performance Report.

⚠ **`design/features/tier-cascade.md` has a new principle, P11, and a boundary paragraph under
it.** Read the boundary before acting on the principle. It is the only thing standing between a
future session and the nine-file mistake described in §1.

⚠ **`design/features/to-do-items.json` has a new item, 4.31**, and 4.28's and 4.30's notes grew.
The list is 13 items. Regenerate with `npm run to-do` after any edit — the build fails if the
page and the data drift apart.

⚠ **`design/PROMPT-CONTRIBUTION-SAFETY.md` and `design/mockups/prompt-contribution.html` are
new**, and `design/ARTEFACTS.md` carries rows for both new mockups.

---

## 5. Where the work stopped

**Nothing is half-built, because nothing was built.** Every design is committed and internally
consistent; the two drawings match the documents that describe them. The next session starts
clean at 4.28's redraw.

**Everything is committed. Nothing is pushed.** If this machine were not opened for a week, the
work would still be here — but `master` and the other machine would know none of it, including
P11 and its boundary paragraph. **The boundary paragraph is the part that matters:** without it
in `master`, the other machine could read a Brief that does not yet carry the correction.
