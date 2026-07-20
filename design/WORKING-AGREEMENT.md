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

## Start of session — either machine

Type **`/startup`** and the checklist runs itself. What it does, and why:

1. **Where am I?** — current branch, clean tree, right branch for this machine. Starting
   work on top of unexplained uncommitted changes is how work gets lost.
2. **How far off master am I?** — `npm run check:branch`. *Behind* is the number that
   matters. This is the step that catches drift at 3 commits instead of 97.
3. **What is open?** — the P1 items in `ACTIONS.md` and the latest session notes, so the
   two machines do not duplicate or contradict each other.
4. **Catch up if behind** — merge `origin/master`, run the tests, prove nothing broke.

## End of session — either machine

Type **`/shutdown`**. What it does, and why:

1. **What changed?** — every file, in plain English. Anything unapproved is named, not
   buried in the commit.
2. **Is it green?** — full suite. A red suite is never pushed.
3. **Is the record up to date?** — `ACTIONS.md` reflects what actually happened,
   including things found but not fixed.
4. **Commit** — message shown and approved first.
5. **Push this machine's own branch only.**
6. **Leave a handover note** — where you stopped, what is half-finished. This is what
   stops the two divisions treading on each other.

If anything is left uncommitted, the session ends by saying so out loud.

---

## Integration — handing a version to the master coding team

When both branches are in and `master` is green:

1. Merge both branches into `master` via pull requests.
2. Cut a version tag: `git tag -a v0.6.0 -m "…"` then `git push origin v0.6.0`.
3. Record the row in [`DEPLOYED-VERSIONS.md`](DEPLOYED-VERSIONS.md).
4. Tell the team the **version number** — not a commit hash, not "latest master".

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
