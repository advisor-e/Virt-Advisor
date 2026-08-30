# Working Agreement — how the three divisions hand work to each other

There are three parties working on this codebase:

| Party | Machine / place | Owns |
|---|---|---|
| Design division A | Mike's **desktop** | Course Builder branch |
| Design division B | Mike's **laptop** | Business Performance Report branch |
| Master coding team | outside this repo | UAT and, later, production inside Advisor-e.com |

This document exists because on 2026-07-21 we discovered UAT was running `709bac5` —
**97 commits behind `master`**, predating the entire Business Performance Report
programme and all of Course Builder v2. Nobody did anything wrong. There was simply
never a moment that said *"this version is ready — take it."*

The root cause, stated plainly: **this repo has 527 commits and exactly one pull
request.** Everything else was merged machine-to-machine, so there was no reviewable
unit, no integration point, and no signal for the master team to act on.

Everything below is designed so that gap cannot silently reopen.

---

## The three rules

**1. `master` means releasable.** Anything on `master` is complete, tested, and safe for
the master team to take at any moment. Work in progress never lands there. If it is on
`master`, it is fair game for UAT.

**2. Branches are short-lived and only ever merge into `master`.** Desktop and laptop
never merge into each other. Both merge **from** `master` at the start of every session,
and both reach `master` through a pull request. A branch that lives for weeks and
accumulates twenty commits is a merge conflict waiting to happen.

**3. The master team pulls a tag, never a branch.** `master` moves; a tag does not.
"UAT is on `v0.6.0`" stays true and checkable forever, whereas "UAT is on master" is
meaningless a day later.

---

## How we work here — quality, concise, purposeful

**Mike's ruling, 2026-08-24, after a productivity review measured where a session actually
goes.** It is quoted at the top of both `/startup` and `/shutdown`, so it is read at the
start and the end of every session.

**We write quality, concise, purposeful code.** Every line must earn its place — and so must
every test and every sentence of documentation.

**This code is tested by people in UAT before it ever reaches production.** A test earns its
place when it catches what UAT cannot: a wrong number, an unsafe permission, a malformed AI
response. A test that checks what a person would notice in five seconds on screen is work we
do twice. The coverage targets for maths, permissions and AI-output validation are unchanged
and non-negotiable; see *What a test must earn* in `CLAUDE.md`.

**One fact, one home.** A Brief says how the product works *now* — when something changes,
replace the old sentence rather than adding a new one beneath it.

> **What was measured.** Of the 30 commits before this ruling, **16 changed no code and no
> tests at all** — 2,264 lines of prose about the work rather than the work. The end of a
> session had come to require the same fact in **seven** places; it is now three. The Briefs
> were running at a **94–96% append rate** (528 lines added to Report Models against 19
> removed), which is how a specification turns into a diary. `ACTIONS.md` had reached 7,448
> lines and is now frozen. **85 session-notes files** totalling 11,990 lines had accumulated
> that no checklist ever asked for, and they were not working: on 2026-08-23 two open
> questions for Mike went into one and reached no list. Meanwhile the full test suite —
> 6,255 tests — runs in **30 seconds**, so the tests were never the cost.

---

## Start of session — either machine

Type **`/startup`** and the checklist runs itself. What it does, and why:

1. **Where am I?** — current branch, clean tree, right branch for this machine. Starting
   work on top of unexplained uncommitted changes is how work gets lost.
2. **How far off master am I?** — `npm run check:branch`. *Behind* is the number that
   matters. This is the step that catches drift at 3 commits instead of 97.
3. **Open the Handbook** — `npm run handbook`, republished to its existing link and opened
   in the browser. Because it is rebuilt from committed markdown every session, the page
   cannot drift from the repository, and the link never needs re-sending.
4. **What is open?** — [`features/to-do-items.json`](features/to-do-items.json), which *is*
   the live list, and **both handover notes** —
   [`HANDOVER-desktop.md`](HANDOVER-desktop.md) and [`HANDOVER-laptop.md`](HANDOVER-laptop.md),
   one per machine — so the two machines do not duplicate or contradict each other. Read the
   JSON rather than [`to-do.md`](features/to-do.md): the page is 850 lines of standing
   explanation around a generated ten-row table, and is rebuilt from the JSON anyway.
   **Not `ACTIONS.md`** — frozen as an archive on 2026-08-24. **And there are no session
   notes to read**: the 85 files written before that date stay as history, none is written now.
5. **Catch up if behind** — merge `origin/master`, run the tests, prove nothing broke.

## End of session — either machine

Type **`/shutdown`**. What it does, and why:

1. **What changed?** — every file, in plain English. Anything unapproved is named, not
   buried in the commit.
2. **Is it green?** — full suite. A red suite is never pushed.
3. **Is the Handbook up to date?** — the front door is updated first, into **three places
   and only three** (see *One fact, one home* below). **(a)** The feature's **Brief** — how
   the product works *now*, with the sentence that is no longer true **replaced**, not left
   above a new one. **(b)** [`to-do-items.json`](features/to-do-items.json) — finished work
   **moves** to the done-and-parked page rather than being ticked in place, anything
   discovered is written as *something a person does*, and an open question for Mike is an
   item on this list, never a line in a note. **(c)** The **commit message**.
4. **Commit** — message shown and approved first.
5. **Push this machine's own branch only.**
6. **Leave the handover** — in this machine's own file,
   [`HANDOVER-desktop.md`](HANDOVER-desktop.md) or [`HANDOVER-laptop.md`](HANDOVER-laptop.md),
   each carrying one session: where you stopped, what is half-finished. You write only your
   own, exactly as you push only your own branch. This is what stops the two divisions
   treading on each other, and it is the only narrative file a session writes.

If anything is left uncommitted, the session ends by saying so out loud.

---

## The running application — who owns it

Added 2026-07-21, after an afternoon was lost to this. The rules above cover the *code*:
branch, tests, commits, handover. They said nothing about the *running app*, and that gap
is where the damage happened.

**Starting the app is a normal request — just do it.** Use `npm run go`, say which
address is live, and check the server is actually reachable before saying it is.

> **Removed 2026-08-03 by Mike.** This section used to say *"the dev server belongs to
> the human; an AI assistant never starts, stops or restarts it."* **Mike never asked for
> that** — an AI session wrote it into this agreement on 2026-07-21 (`ec081ed`) after
> losing an afternoon to an IPv6/IPv4 binding fault, and it then got quoted back at him as
> though it were his own instruction. Recorded rather than silently deleted so no future
> session re-derives it from the same afternoon. The lessons from that day that are about
> *evidence* are kept below; the one that was about *permission* is gone.

**Never run `nuxt build` while a dev server is running.** They share the `.nuxt` folder.
A build against a live dev server can leave it serving a mixture of old and new code —
which then looks exactly like a code bug and gets debugged as one.

**A server is only "reachable" at the address the user's browser actually uses.** Testing
`localhost` and getting HTTP 200 proves nothing if the browser resolves to a different
address. On 2026-07-21 every check returned 200 over IPv6 while the browser got nothing
over IPv4, and that mismatch was mistaken for a healthy server four times over. Test the
exact URL the person is typing, or say plainly that you have not.

**When a symptom is "I can't see it" and the code provably compiled, get the actual error
text before theorising.** "Nothing loads", "blank page", "connection refused" and "spinner
forever" have different causes. Three rounds of guesswork cost more than one question
asking what the screen says.

**Verification that only a human can perform must be named as such.** The test suite
cannot see a visual change. When a change is only provable by eye, say so, say which
screens, and do not describe the work as verified until someone has looked.

## Integration — handing a version to the master coding team

When both branches are in and `master` is green:

1. Merge both branches into `master` via pull requests.
2. **Run `npm run build` and see it succeed.** Only then cut the tag.
3. Cut a version tag: `git tag -a v0.6.0 -m "…"` then `git push origin v0.6.0`.
4. Record the row in [`DEPLOYED-VERSIONS.md`](DEPLOYED-VERSIONS.md).
5. Tell the team the **version number** — not a commit hash, not "latest master".

> 🔴 **Why step 2 exists (Mike, 2026-08-25).** **Nothing else on our side ever builds the
> app.** The pre-commit hook runs lint and the tests; the tests exercise the logic and never
> assemble the bundle, so **all 6,285 can pass on a branch where `nuxt build` fails.** CI is
> the master team's — checks before UAT, a fuller set before production — which means without
> this step the first person to discover a broken build is *them*, after we have told them a
> version is ready. One command, about a minute, and the failure lands on our desk instead of
> at their gate. See the Enforcement section of [`../CLAUDE.md`](../CLAUDE.md).

**What we ask of the master team:**

- Pull the **tag** we name, not `master` directly.
- Reply with the tag installed, so both sides hold the same record.
- Report UAT bugs **against the tag number**, so a report can be matched to exact code.

> **Honest limit.** The master team works outside this repository, so none of our hooks
> or checks ever run for them. Their side of this agreement is co-operation, not
> enforcement. That is exactly why we give them an immutable tag number and maintain
> [`DEPLOYED-VERSIONS.md`](DEPLOYED-VERSIONS.md) **on our side** — a rule that depended on
> them writing rows into a repo they cannot commit to would fail silently, which is the
> failure mode this whole document exists to prevent.

---

## What is enforced mechanically

Documentation gets ignored. These do not:

| Layer | Where | What it does |
|---|---|---|
| `/startup`, `/shutdown` | `.claude/commands/` | The checklists run as commands, not from memory. Committed to the repo, so both machines get them. |
| **pre-push hook** | `.husky/pre-push` → `scripts/check-branch-state.js` | **Refuses** a push that is behind `origin/master`, and **refuses** a direct push to `master`. |
| pre-commit hook | `.husky/pre-commit` | Lint, full test suite, critical-severity audit gate. |

Two honest limits on the hook: `git push --no-verify` bypasses it, and if the machine is
offline it cannot check, so it warns loudly and allows the push rather than blocking on a
network hiccup. It stops accidents and forgetfulness — which is the actual failure mode
here — not deliberate override.

Run the check any time with **`npm run check:branch`**.
