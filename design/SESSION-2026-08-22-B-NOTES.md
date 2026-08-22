# Session Notes — 2026-08-22 · Laptop, Session 80

> **Branch `feat/advisor-progress`.** Suite **326 suites / 6,037 tests green**, lint 0 errors,
> tree clean, everything pushed.
>
> 🔴 **`v0.10.0` IS CUT AND ON `origin`** — tagged on `458cf9e`, the merge commit of
> [PR #45](https://github.com/advisor-e/Virt-Advisor/pull/45). 60 commits. `master` has moved for
> the first time since 2026-08-17. **The master team has not been told yet** — Mike parked the
> email; the ledger row records it as *Awaiting pull*.

---

## 🔴 FIRST THING THE DESKTOP MUST DO

**Merge `master` before touching anything.** `master` moved from `d4284e6` to `458cf9e` — sixty
commits, including the whole property portfolio, the hub menu regrouping, the Coaching Reference
removal, and two new AI features. The desktop has been off that line since 17 August.

```
git fetch origin
git merge origin/master
npm test
```

⚠ **`npm install` IS REQUIRED after that merge.** `playwright` was added as a devDependency
(exact `1.34.3`) and `package-lock.json` changed. It downloads **no browser** —
`playwright_skip_browser_download=1` in `.npmrc` suppresses the 604 MB fetch. This is the first
release in three that needs an install, and the last two conditioned everyone to skip it.

---

## What shipped — three items closed, one release

| Commit | What |
|---|---|
| `4f08827` | **4.28** — the AI Prompts tab, at all four manager tiers |
| `8fea2d1` | **4.29 + 4.32** — the ten calculators the AI had never heard of, and the invitation to name one |
| `3554818` | **v0.10.0** prepared — version, notes, ledger row ahead of the tag |
| `458cf9e` | PR #45 merged |
| `e417ca7` | Ledger row backfilled with the real hash |

---

## 1. 🔴 The lesson, and it is the same shape twice in one day

**A control that does nothing, and a sentence that promises something nothing does, are the same
defect.** Mike found the first by looking at a drawing on 22 August: two editable boxes on the AI
Prompts page — a fetch-burst limit and its window — belonging to a step marked *does not apply
here*. They validated, saved, cascaded and inherited perfectly. They controlled nothing.

**I then shipped the second one myself, and caught it before it left.** The protection panel's
fourth sentence read *"Nothing is treated as final until a person has approved it."* The panel's
own lede promises these things are **applied by the system every time**. That sentence is enforced
**nowhere** — it restates the prompt's own Draft-and-Publish section, which is *advice to a model*,
and P1 of that Brief exists precisely to say those are not the same thing.

**What changed because of it:** every line of that panel now declares the module that performs it
(`backedBy`) and the exact export or call that proves it (`provenBy`), and a test opens the file to
check. A sentence whose protection is deleted now fails the build instead of going quietly false.
That is **P8** of [`features/ai-prompts.md`](features/ai-prompts.md).

⚠ **No test can ask whether the thing a control controls exists.** Both faults needed a person
reading the screen. That is item **4.25**, still open — the driver is in, the checks are not.

---

## 2. The half-fix that was caught, and the one that was not

**4.29 finished with the content in the prompt, the tests green, and the advisor no better off.**
Ten built calculators became readable by the AI — and no mode prompt invited it to say so. Asked
live about a builder short of cash, it returned three templates and no calculator, correctly,
because `discover.txt` ends *"Do not add any other sentence after it. End there. Full stop."*

**It became item 4.32 rather than a quiet widening of 4.29**, because editing a mode prompt changes
what a deployed screen says to real advisers. Mike ruled *"yes and both if its appropriate"* the
same afternoon and it was built.

🔴 **The closing rule was not loosened.** The calculator block sits **above** the closing line, and
a test asserts both that the rule is still there and that the block precedes it. A rule that exists
to make the AI stop talking is not collateral in a feature that wants it to say one more thing.

---

## 3. Where I was wrong, kept because it transfers

**I told Mike the AI had invented a "24-minute tutorial video". It had not.** `videoInjector.js`
appends that sentence itself, after the AI has finished writing, from real template data. The video
is real; what is wrong is which line it lands on — two model names are also template names.

**Three rounds of prompt wording were spent before I read `videoInjector.js`.** One of them made
things worse: telling the AI not to bold a model name stripped the bold off the **template** name
too, which is exactly what the injector reads. Reverted.

🔴 **The transferable part is about where a rule can live.** Nothing said to the AI can reach a
step that runs after it. That is now item **4.33**, and the item says so in terms.

---

## 4. Documents corrected — reported, not quietly reworded

- **`features/report-models.md` §5** said *"no browser driver is installed in this repository"*.
  `playwright` landed the **day after** that sentence was written (2026-08-21, `7fa5e9a`). Item
  4.25 already had it right; the Brief did not. **A Brief that understates what works costs as
  much as one that overstates it** — the same finding session 79 made about the dev logins.
- **`features/report-models.md` §3** described an editable surface on the security prompt that was
  never validly there.
- **`hubTabTiers.test.js`** asserted a conditional-tab count while its headline total lived only in
  prose. The total is now **derived from `NAV_GROUPS`** — and doing that immediately caught a
  second error: a comment claiming seven unconditional tabs when Coaching Reference left on
  2026-08-20 and there are six.

---

## 5. For the other machine

Nothing here touches Course Builder or the Business Performance Report **directly** — but `master`
moved by 60 commits, so almost every shared file has changed. Merge first, read second.

⚠ **`data/prompts/client.txt` and `data/prompts/discover.txt` both changed.** They are the AI's
system prompts. `client.txt` gained hard rule **R18**; `discover.txt` gained a block inside its
output format and three rules. If either is being edited on the desktop, read the new rules before
merging — R18 states in terms that it is **not** an exception to R17, and that sentence is
load-bearing.

⚠ **`components/FirmManagerHub.vue`** gained a tab, a `TAB_TIERS` entry and a `NAV_GROUPS` item.
The AI Prompts entry was **appended**, so nothing already on a manager's screen moved.

⚠ **`features/tier-cascade.md` still carries session 79's P11 and its boundary paragraph.** Read
the boundary before acting on the principle — it is the only thing standing between a future
session and a nine-file mistake.

---

## 6. Where the work stopped

**Nothing is half-built and nothing is uncommitted.** The three items closed today are closed with
their closure records written on `to-do-done-and-parked.md`, not ticked and left.

**Twelve live items. Three need Mike:** 4.16 (the engagement-types scope call), 4.26 (the Model
Library card still promising one rental property), 4.27 (the per-property tax override the drawing
promises and nothing builds).

**One thing is owed and is deliberately parked:** the master team has not been told v0.10.0 exists.
Mike chose to leave the email for now. The ledger row says *Awaiting pull*, so it is visible in the
record rather than only in a conversation.
