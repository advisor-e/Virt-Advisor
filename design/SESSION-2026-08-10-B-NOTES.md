# Session Notes — 2026-08-10 · Laptop, Session 40

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, suite **4,845 green / 282 suites**,
> **30 ahead / 0 behind `master`**.
>
> **No application code was touched this session.** Five commits, all design and record. The
> build they describe has **not started** — it starts at part 1 with a fresh window.

---

## 🔴 FIRST THING NEXT SESSION — ASK MIKE, BEFORE DESIGNING ANYTHING

**Mike asked (2026-08-10) to be asked about the DESIGN LOGIC OF ADVISOR-E — the basic rules
around editability and the like — at the start of the next session.**

**Ask it before opening a file, and certainly before drawing a screen.** This is not a
formality and it is not a topic for later: *who may edit what, at which level, and what a level
may never change* is the same family of question this session got wrong twice by reasoning it
out instead of asking. Both times the answer already existed — once in Mike's head, once written
down since 2026-07-30 — and neither the code nor any test could have contradicted the guess.

**Mike, this session, in as many words:** *"if you don't know — ask. never ever assume."*

Suggested opening: *"Before I design anything today — talk me through Advisor-e's design logic
and the basic rules around editability."* Then let him talk, and write down what he says as an
artefact before building from it.

---

## What the next session most needs to know

**The answer was already written down, and I drew the opposite of it — twice.**

Mike asked for the two middle-tier hub pages. I designed them, and left Team Progress, Team
Case Studies and the three accuracy reports **out** of both new tiers. He challenged it. I
explained my reasoning; he told me to go and read the Collaborate notes. They contain his
ruling of 2026-07-30, in his own words:

> *"Documents cascade DOWN — mentor authors, each level clones the level above. **Reporting
> rolls UP — each level sees a summarised view of the level below.**"*

and §4.3 names **Team Progress specifically** as one of the tabs that must roll up.

**Where the wrong idea came from.** The ruling of 2026-08-09 that kept Team Progress away from
the mentor — which was about an **outside party**, Advisor-e, seeing a customer's staff. A
global group is a **brand** (seeded: Advisor-e, BDO, Lindt & Co), so a global or group manager
is the **customer's own senior person** looking at **their own** firms. An external-party
privacy boundary applied to internal managers inverts it. **Nothing in the code could have
noticed**, and no test could have failed.

🔴 **The governing principle, which settles anything an artefact does not say explicitly
(Mike, 2026-08-10):**

> *"Every quality system requires a feedback loop, a way to make sure we can improve. The
> information and tools cascade down so we share the tools effectively, the reports cascade up
> so we learn what is working, what isn't, who is failing so we can offer help."*

**Down is sharing; up is learning.** A report withheld from a level is a hole in the loop — that
level can still be held accountable for what it can no longer see. It is also why the tone is
*offer help*, never *score*.

**Ruled 2026-08-10: EVERY report rolls up, no exceptions**, each level seeing the level
immediately below it **summarised** — firm→advisers, group→firms, global→groups,
mentor→global groups.

---

## What was done

Five commits, no code:

- `d54f95c` — [`TIER-CASCADE-MAP.md`](TIER-CASCADE-MAP.md): per Hub tab, does it cascade down and
  does it report up. Read out of the code, not the plans.
- `0bf282f` — the **Global Groups** membership screen design. **Superseded within the hour** (see
  below). Kept, not deleted.
- `dcf811a` — [`mockups/tier-hub-pages.html`](mockups/tier-hub-pages.html): the two middle-tier
  hubs. **This is the artefact the build works from.**
- `efa5c72` — the "every report" ruling recorded, and **both of my errors corrected in place**.
- (this commit) — the `ACTIONS.md` row [`tier-hub-pages`](ACTIONS.md#tier-hub-pages) and this note.

### The superseded screen, and why it is worth reading about

I proposed a mentor screen for assigning firms to global groups, on the reasoning that our
`firms` table has no group column so "nothing in our data says which firms are in which group".
**That was true and the conclusion was wrong** — it only ever meant *we don't hold a copy*. Mike:
*"are you aware all login and user creation functionality already exists in the master code in
advisor-e?"* The screen would have been a second, drifting copy of an org chart Advisor-e owns.
`roles.js` says where the real data lives: firm is the Advisory **`branch`**, country is
**`country-address`**.

---

## Where the work stopped

**Cleanly, before any code.** The build is designed, approved and logged; not one line of it is
written. Nothing is half-finished.

**Start at [`ACTIONS.md` → `tier-hub-pages`](ACTIONS.md#tier-hub-pages), then open the artefact.**
The five parts, in order: (1) the two thin pages; (2) tab conditions rewritten to name their
tiers; (3) tier + scope resolved at login; (4) fail-closed roles **and the reserved `firms` row
per group**; (5) the six report routes made tier-aware.

⚠ **Part 2 is not cosmetic and should not be done last.** Three tabs are gated on
`scope !== 'mentor'`. The moment a third scope exists, Team Progress and Team Case Studies appear
at the new tiers **on their own**, and Advisory Distinctions **vanishes** from them. Nothing
errors; no test fails.

⚠ **Part 4's reserved row is the one that must not be skipped.** Without it a tier's save is
FK-refused **while the dev fallback reports success** — the exact trap that ran the mentor's own
saves broken for weeks. Third time this trap has been written down.

⚠ **Part 5 cannot show real data** until the master team supplies which firms sit where, and per
`COLLABORATE-MERGE-PLAN.md` §4.3 it must **say so on screen** rather than show an empty roll-up
that looks like real data with nothing in it.

## On conflicts

**Only `design/` files were touched** — `ACTIONS.md` is where a conflict would land, as always.
No `server/`, no `components/`, no `pages/`. **Logic Lab and the firm-side logic-table screens
remain the DESKTOP's**; nothing here went near them.

## Open for Mike

- **Ask the master team for the two role values + which group a manager manages** — §5 of the
  artefact is written so it can be sent as it stands. ⚠ **`mentor` was never added either.**
  *(Carried from session 39; the Wednesday deadline rests on it.)*
- **The build itself** — approved, not started.
- **Rule the 93 Template Check rows** — the queue stays empty until he does. *(Carried.)*
- **Reply to Carl about `npm install`** — v0.7.0 adds `@mdi/font`. *(Carried.)*
- **Raise the export gap with the master-app team — SEVEN tools.** *(Carried.)*
- **Decide on the `/startup` change** in
  [§approved-mockup-stranded-on-a-branch](ACTIONS.md#approved-mockup-stranded-on-a-branch).
  *(Carried.)*

## ~~One loose end, deliberately left~~ — ✅ THERE IS NO LOOSE END (corrected session 41)

> **Corrected 2026-08-10 by the next session.** This section said: *"A **git stash** holds a
> half-written `APPROVED` banner for the superseded Global Groups mockup. It is rubbish and
> should simply be dropped (`git stash drop`)."*
>
> **`git stash list` is empty on this machine.** Nothing is holding anything, and there is
> nothing to drop. Either it never survived the session or it was cleared before the handover
> was written.
>
> The sentence is corrected here rather than removed, because a future session reading these
> notes would otherwise go looking for the stash all over again. The mockup itself
> ([`mockups/global-groups-membership.html`](mockups/global-groups-membership.html)) is
> untouched and deliberately kept.
