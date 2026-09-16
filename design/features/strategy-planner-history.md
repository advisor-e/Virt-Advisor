# Strategy Planner — the History

> **Read [`strategy-planner.md`](strategy-planner.md) first.** That page is the rules. If the
> two disagree, **the Brief wins**.

---

## 0. Superseded by the redirection of 2026-09-17

**The Brief's §2 used to name five capture shapes and call the sixth the last one missing.**
Kept here because a build was made against it and the code still carries those names:

| Shape | What it is | Built for |
|---|---|---|
| `buckets` | ideas sorted under named headings | The 8 Profit Levers |
| `quadrants` | exactly four boxes | SWOT / PEST |
| `forces` | five or six boxes, one marked centre | Porter's 5 Forces |
| `statements` | a short list side by side | Strategic Objective and Strategy |
| `actions` | a rows × columns table | the Action Plan |

*"**`placement`** — a 2×2 an owner is placed on, for the Heald Matrix and Business Dating — is
the one shape still missing."*

**Why it was wrong, and it is a useful lesson rather than a blunder.** Those five were derived
from the app's own short material summaries, because no session could read Mike's source: this
machine had no PDF reader at all until 2026-09-17. Reading the templates gave **21 teaching
forms and 9 capture forms**, and showed two of the five to be wrong against his fill-in tables.
The `placement` line was doubly stale — the Heald Matrix is out of scope entirely, being a tool
for selling a plan rather than making one.

**The 45 was wrong too, and for the same reason.** The Brief's impact test counted 45
frameworks from ADV.0's index. ADV.0 is a *copy* of the decks' contents tables and has drifted
from them — four concepts missing, page references off by one. Counted from the decks
themselves the scope is **51**.

## 1. The measurement that reshaped the task, run before anything was drawn

The Brief (§1) carries the figures. **Recorded here is why they mattered**, because the
alternative design was the obvious one and it was wrong.

Item 15.1 was filed as *"the strategy domain has thirteen materials and no session to run them
in"*. The obvious reading is: build the sessions. Forty-five frameworks, forty-five screens.

Counting first said something different. The zeroes were not *"45 things are missing"* — they
were **one thing missing, forty-five times over**: there was nowhere to put an answer. That
turned the job from forty-five builds into one machine plus one store, and it is the reason
Decision 3 was even asked.

**The count took twenty minutes.** The rule that required it
(`CLAUDE.md` → THE IMPACT TEST) exists because item 7.2's US9 was built without one.

## 2. The claim that had to be corrected before a line was drawn

15.1's own note said `strategy-domain-support.json` *"names every deck he supplied"*. It does
not. **Sales & Marketing Review** is authored in `sales-marketing-domain-support.json` and
**Organisational Review** in `staff-domain-support.json` — two of the four Planning Domains
Mike ruled **are** the session.

A session that trusted that sentence would have built over one file and delivered half the
session while looking complete. It was corrected in the item, in the laptop's handover, and in
the `touches` field, before the drawing began — and the loader now reads all three files so it
cannot quietly become one again.

## 3. Decision 5 — the recommendation that was refused

The drawing recommended **linking out** to the three frameworks that already have calculators,
on the grounds that rebuilding the maths creates a second copy that drifts.

Mike refused it: *"no, it needs to feel inclusive, comprehensive and seamless. I dont want it to
feel like patchwork."*

**He was right and the recommendation had conflated two things.** Seamless describes the
*surface*; the duplication risk is about the *maths*. The card hosts the existing report
component on the **same backend route** as the standalone page — one engine, one golden test,
two surfaces. The two real costs of his ruling are named in the drawing's box: a compact
in-session layout for each of the three, and an entry in the headline consistency guard.

Kept because **a session reading only the recommendations would build the thing he refused.**

## 4. Four faults that running it found, and the suite could not

Every one of these passed a green suite.

1. **The backend would not have started.** Restify refuses a handler that is neither async with
   two arguments nor callback-based with three. `getFrameworks` was a plain two-argument
   function, and mounting it threw at boot — the whole API down, not one route. Caught by
   `serverMounts.test.js`, which exists for this.
2. **The page sent no token and loaded during SSR.** Every call would have returned 401, and
   `fetch()` runs on the server where the browser's `fetch` and `localStorage` do not exist.
3. **"1 frameworks".** Visible in five seconds on screen; invisible to 12,000 assertions.
4. **The same paragraph twice on step 3**, because both closing frameworks point at the same
   source material. The Action Plan is filled in, not taught, so its concept panel went.

## 5. The one that was NOT a fault, and the twenty minutes it cost

Step 3 rendered with its two new cards missing and the wheel's descriptions blank. Everything
pointed at the new frontend code. **The code was correct throughout.**

`npm run dev:all` hot-reloads Nuxt but **not Restify** — it was still serving the version it
booted with. Restarting it fixed it with no change at all.

This is recorded because it **inverts the usual diagnosis**: the evidence points at what you
just wrote, and the answer is a stale process. It is now written into the `run-the-app` skill
so the next session does not spend the same twenty minutes.

## 6. A test that was wrong about a component that was right

A component test asserted `field-opened` fired on focus, and it failed. The first conclusion —
that the capture card's focus handler was broken — was **wrong**.

`wrapper.trigger('focus')` in vue-test-utils dispatches a plain `Event`, which jsdom does not
deliver to a focus listener. A real `FocusEvent` is delivered, and so is a genuine `.focus()` in
a browser. Buefy's own source was read before anything was changed: its textarea binds
`focus: onFocus` and re-emits correctly.

Kept because the failure **looks exactly like a broken component**, and the fix is in the test.

## 7. Two ordering defects the tests did find

- **Sessions opened in the same second had no defined order.** `started_at` is `DATETIME` —
  second precision — so **MySQL would have been as ambiguous as the dev fallback**. Both now
  tie-break on `id`. In UAT this would have surfaced as sessions listed wrongly, intermittently.
- **The two closing frameworks would have appeared on the Session Scope table** as things to
  tick, because they carry `planningDomains` so the plan can group by domain. Excluded in the
  route *and* in the component — two guards, because a closer shown there reads as an ordinary
  choice and ticking it would do nothing.
