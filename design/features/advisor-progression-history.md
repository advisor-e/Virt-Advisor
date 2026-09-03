# Advisor Progress & CPD — the History

> **Read [`advisor-progression.md`](advisor-progression.md) first.** That page is the rules. If
> the two disagree, **the Brief wins**.

---

## 1. The swallow that made the only real fault invisible

Both read queries ended with a catch that replaced any database error with an empty result set.
So a broken connection and a genuinely new advisor produced **exactly the same screen**: a tidy
page of zeros and "No activity yet".

Somebody looking at that screen sees a working feature with no data in it. In fact the
connection was being refused on every single request.

**It was defensible when it was written** — the concern was not crashing the app in development
without MySQL. It stopped being defensible the moment it hid the only fault the feature had.
The fix was ranked first in the work order for a reason that generalises: **making the failure
honest converts every later step from guesswork into something you can actually see.**

→ Brief **P4**.

---

## 2. Sarah Chen

A second manager-facing screen — a richer team dashboard — did not talk to the backend at all.
It waited 600 milliseconds to imitate a network call and then returned hardcoded advisors named
**Sarah Chen** and **James Park**, with invented courses and scores. Its "AI insight" panel was
not AI: it waited 1200 milliseconds and assembled a sentence from the mock numbers by string
concatenation.

This was **an intentional development stub**, recorded and accepted in the backlog — not an
oversight and not concealed. But it meant there were two manager-facing views: one real, wired
and empty, and one fake and rich. The fake one was the more convincing.

**The rule it produced:** a manager shown Sarah Chen's progress would be looking at fiction on a
screen labelled with their own firm's name. Treating "remove the mock" as a release blocker was
correct.

**Resolved by owner ruling** — the screen was deleted outright, along with the button that opened
it, its panel mode and two backend stub routes it never actually called. The fiction is gone from
the codebase entirely. → Brief **P5**.

---

## 3. The evening that proved the database has never worked

On 2026-07-28 the owner completed two full course sessions in the running app and both writes
failed — the backend log carried an access-denied error for the placeholder database user.
Everything real in this feature is behind provisioning MySQL, and no amount of frontend work
can be proven without it.

---

## 4. Decisions taken and closed — do not reopen

| Decision | Ruling |
|---|---|
| Two manager views, or one? | **One.** The team view is a Firm Manager Hub tab; the personal component is one advisor's own record and nothing else. |
| The fake dashboard | **Deleted**, not wired. |
| Should the per-question record store free text? | **Recommendation on file: no free text.** Advisors write differently once they believe a manager reads their words. Not to be built either way without asking. |
| CPD export format | **Follow the six existing screens' print-to-PDF pattern.** No PDF library on the locked runtime. |
| Is view-as a risk to CPD records? | **No** — the adviser generates and submits their own report and would see a stray entry. Ruled negligible. *One cheap suggestion remains open: stamp each claim with who was signed in when it was made.* |

---

## 5. Faults worth remembering

**Six browser tabs cost an afternoon** — Chrome allows six connections per host and each open
development tab permanently holds one for hot-reload, so a queued request shows nothing red in
the console and nothing in the backend log. The actionable rule is the Brief's trap 4.

---

## 6. Where the earlier record is wrong

Read 2026-08-13. [`../ADVISOR-PROGRESS-HANDOVER.md`](../ADVISOR-PROGRESS-HANDOVER.md) is the
fullest account of this feature and **large parts of it are out of date** — its own header block
says so, and warns that its suggested order of work "would send you into finished work".
Specifically:

- Its §2 file table lists `components/FirmDashboard.vue`. **That file no longer exists** —
  verified 2026-08-13.
- Its §5 describes the fake dashboard as a live problem to solve. It was deleted.
- Its §6 says there are **no component tests** for either screen and that the per-question record
  is the substantive open feature. Both screens have component tests, the logger has 45 of its
  own, and the manager-facing per-question view was built.
- Its §2 describes "both progress screens in one component". They were separated.

**Left in place** — it is a record of its own date, and its §1, §3, §4 and §9 are still the best
statement of what this feature is, how the data flows, why it shows nothing, and how to work on
it.

---

## 7. Where the raw material is

**Permanent companions:**
[`../ADVISOR-PROGRESS-HANDOVER.md`](../ADVISOR-PROGRESS-HANDOVER.md) (read the header block
first) · [`../virt-advisor-system-design.md`](../virt-advisor-system-design.md) §9 (the three
capability levels and the two views) ·
[`../COLLABORATE-MERGE-PLAN.md`](../COLLABORATE-MERGE-PLAN.md) §7 (the CPD export ruling and the
print-to-PDF groundwork) · [`../COVERAGE-DEBT.md`](../COVERAGE-DEBT.md).

## 8. Item 4.50 — the live check of 2026-08-26, and what it corrected

Moved here from the live list on 2026-09-03, when the item was cut to the list's word caps.

- **The marker check was run live on the laptop** against a real OpenAI key: three complete
  client conversations to a Phase 3 recommendation, 17 API calls, 77,605 tokens on gpt-4o-mini.
  (a) The reply streams normally — 435, 1,094 and 792 chunks. (b) No marker text is ever visible —
  not one bracket in 2,321 recorded chunks, tested against every partial prefix of the sentinel,
  the chunks joined, and the final text. Not a vacuous pass: in the succession run the AI
  demonstrably wrote a marker (its declared order differs from the prose-scan order) and none of it
  escaped. Item 4.53 holds the other finding — the AI writes the marker only sometimes, and nothing
  records when it did not.
- **The item's original blocker was wrong.** For a month it said this machine had no
  `OPENAI_API_KEY`. `.env` on the laptop has held a live key since 30 July, `dotenv` loads it in
  `server/restify-server.js`, and the backend logs `OPENAI_API_KEY present=true` on boot.
- **The real blocker is MySQL.** `logVASession` writes the capability record to the activity
  store; on a developer machine that store logs `database unavailable (ECONNREFUSED
  127.0.0.1:3306) — using the dev file`, and all three conversations completed with none recorded —
  no error, the write simply did not happen. Check (c) therefore needs an environment with a
  database, which means UAT.
- **"Team Dashboard" is not a screen.** The words appear only in a JSDoc comment in
  `tierLookup.js`. The screen is the Team tab, fed by `/api/activity/team`.
