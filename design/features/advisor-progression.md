# Advisor Progress & CPD — the Brief

> **Read this before touching progress tracking, the team view or the CPD record.** Current
> rules only. The history is in
> [`advisor-progression-history.md`](advisor-progression-history.md).
>
> **Covers:** the record of what an advisor actually did — sessions, courses, quiz results — the
> advisor's own view of it, the manager's view, and the CPD export. **Does not cover:** what
> rolls further up the tiers ([`tier-cascade.md`](tier-cascade.md)).

---

## 1. Design philosophy

**A firm should be able to see its people getting better at advising, on evidence rather than
impression.**

Every time an advisor finishes a client session or a course session, the app records what
advisory tools were involved, what capability level those tools sit at, and how they scored.
Two views read that record: the advisor's own, and their manager's.

**The tone rule is not decoration — it is the design.** These users are learning on the job, in
front of paying clients. The record exists so that somebody can **offer help**, not so anybody
can be ranked. A badge on this screen means *act*, not *glance*. A screen written as a league
table is the wrong screen, however accurate its numbers.

**And an empty screen must never look like a working one.** The single most damaging thing this
feature can do is show a tidy page of zeros when in truth the database refused every request —
because it looks exactly like a new advisor with nothing recorded yet. Honest failure is worth
more here than a graceful-looking blank.

---

## 2. Key principles — the non-negotiables

**P1 · Identity comes from the verified token, never the request.** Both read paths derive the
advisor and the firm from the login token, so nobody can ask for someone else's record by
changing a parameter. If you add a route, take identity from the resolved values — never from a
body or query string.

**P2 · The capability level is computed at write time and stored in the row.** The tool catalogue
changes over time, and a record of what an advisor did in March must not silently change level in
July because a tool was re-filed.

**P3 · Logging is fire-and-forget on purpose.** A database failure must never interrupt a live
advisor session. Which means the failure has to be **loud in the log**, since it is silent on
screen.

**P4 · A failed query and an empty result must never look the same.** Distinguish "the query ran
and returned nothing" from "the query could not run", and say the second one out loud.

**P5 · No invented people, ever.** A manager shown fictional advisors on a screen carrying their
own firm's name is looking at fiction presented as their team.

**P6 · A fabricated score is worse than a missing one.** Ungraded results stay ungraded and are
excluded from averages and certificates.

**P7 · Every request has a timeout.** An unanswered call must never leave a spinner running for
ever.

---

## 3. Design considerations

**There are two screens, and they are deliberately separate.** The advisor's own record is one
component and nothing else. The manager's team view is a **Firm Manager Hub tab** — not a mode
of the advisor's screen. Keeping the team table inside the personal component is what made both
harder to reason about, and it was removed.

**The manager can open one advisor's detail** — a topic roll-up, weakest first, then the
sessions themselves — from the team view.

**The record is only ever a score, and that is the substantive open limit.** Course logging sends
the quiz score and nothing else, so the tables have never seen an individual question. Every
screen therefore shows averages, and a manager can see *that* an advisor scored 73 but not *what*
they got wrong.

⚠ **If the per-question record is built, do not store the advisor's own written answer without
asking.** The recommendation on file is **no free text**: advisors write differently once they
believe a manager reads their words, which degrades the very signal the record exists to collect.
Text can be added later; it cannot be un-stored.

**The CPD export follows the existing pattern.** Six screens already export by printing to PDF
from the browser behind a Download button with a print stylesheet. Adding a real PDF library
would be a fight on the locked Node runtime. **Honest limit:** the browser makes the file and the
advisor saves it — there is no server-side copy of what was sent, and layout depends on their
browser. If a professional body ever needs a document the firm can vouch for independently, that
is a much bigger job.

---

## 4. For the coder

### Where things live

| Piece | Path |
|---|---|
| The advisor's own record | `components/AdvisorProgression.vue` |
| The manager's team view | `components/firm/FirmTeamProgress.vue` |
| One advisor's detail | `components/firm/FirmAdvisorQuestions.vue` |
| The CPD record | `components/CpdRecord.vue` |
| Routes | `server/routes/activity.js` |
| The two writes | `server/utils/activityLogger.js` |
| Level lookup | `server/utils/tierLookup.js` |
| Tables | `config/db-schema.sql` — `advisor_va_sessions`, `advisor_course_completions` |
| Shared fetch timeout | `utils/fetchWithTimeout.js` |

### How the data is meant to flow

An advisor finishes a client session → the engine logs it. An advisor finishes a course session
→ the course screen posts it. Both land in their table. The advisor's own view and the team view
then read them back, each scoped by the token.

### Traps that have actually bitten

1. 🔴 **The read routes used to swallow database errors** and substitute an empty result, so a
   refused connection and a genuinely new advisor produced **exactly the same screen**. That was
   defensible when the concern was "don't crash in dev without MySQL" and indefensible once it
   made the only real fault invisible. Fixed — keep it fixed.
2. **A fictional team once shipped as a dev stub.** A rich manager dashboard returned hardcoded
   invented advisors after a fake 600ms delay, and its "AI insight" panel was string
   concatenation over those invented numbers after a fake 1200ms delay. It was recorded and
   accepted at the time, and it has since been **deleted entirely**. Do not build another.
3. **No request had a timeout.** All three activity screens now use the shared helper.
4. ⚠ **Before concluding a screen is broken in development, close every other `localhost:3000`
   tab.** Six connections per host, each open tab holds one — the seventh request is queued in
   the browser and never sent. Endless spinner, nothing in the console, nothing in the backend
   log.

### Known state

**Nothing has ever been written to a database.** The credentials are still placeholders and no
row has ever landed — there is direct evidence: two real course sessions were completed in the
running app and both writes failed with an access-denied error in the backend log. Both screens
will show their error message until MySQL exists. **That is them working correctly.**

---

## 5. Related briefs

[`course-builder.md`](course-builder.md) — where completions come from ·
[`virtual-advisor.md`](virtual-advisor.md) — where client sessions come from ·
[`firm-manager-hub.md`](firm-manager-hub.md) — where the team view lives ·
[`tier-cascade.md`](tier-cascade.md) — how it rolls up.

**History:** [`advisor-progression-history.md`](advisor-progression-history.md)
