# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. This replaces the 85 `SESSION-*.md` files written before 2026-08-24; those stay
> as history and none is written now. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-08-30 · Laptop · branch `feat/advisor-progress`

Suite **6,432 green**, lint 0 errors, `npm run build` succeeds on Node 14.15.0, and all
**16 screens pass `npm run visual`** in a real Chromium. Nothing uncommitted, everything
pushed. Two code commits — `5f3f528` and `f14ff02` — plus this note.

**All of it is on `master`**, merged the same day, so a branch cut from `master` has it.

### 🖥 DESKTOP — READ THIS FIRST, IT IS WHY THIS NOTE EXISTS

**`master` moved today for the first time since 22 August.** PR #46 merged the laptop's
**62 commits** into it; `master` is now `0d5199d`. Before today every course-builder branch
was 599–708 commits behind it.

**You are not blocked and never were** — all three course-builder branches are **0 commits
ahead** of `master`, so nothing the desktop has ever pushed is stranded. Run these three,
in order:

```sh
git fetch origin
git status
git log --oneline origin/feat/course-builder-v3..HEAD
```

**The third command is the one that matters.** It shows work committed on the desktop that
was never pushed — the one thing nobody can see from the laptop.

- **Prints nothing (expected):** start fresh from today's `master`, do **not** revive v3:

  ```sh
  git switch -c feat/course-builder-v4 origin/master
  ```

  `feat/course-builder-v3` is **662 behind and 0 ahead** — it holds nothing `master` lacks,
  so merging it would mean resolving 662 commits of conflicts to gain nothing.

- **Prints any commits:** stop and say so before creating anything. That is unpublished
  desktop work and it needs handling first.

### What changed today

**`5f3f528` — first-load JS 312 KB → 277 KB gzipped**, back under the 300 KB budget in
`CLAUDE.md` → Performance. `plugins/buefy.js` registers the 21 Buefy plugins this app
actually uses instead of all ~40 (24 tags in use, derived by scanning all 101 `.vue`
files, plus Dialog and Toast for `$buefy.dialog` / `$buefy.toast`).

> 🔴 **Adding a new `b-*` tag? Register it in `plugins/buefy.js` first.** An unregistered
> Buefy component throws no exception — Vue renders **nothing** and the control is simply
> absent.
>
> **You will be warned, but only while developing.** Vue logs `Unknown custom element:
> <b-datepicker>` under `npm run dev`, naming the component. That warning is compiled
> **out** of the production build, so the mistake is loud on the machine that makes it and
> invisible from UAT onwards. **No test catches it either:**
> `tests/helpers/mountComponent.js` installs the FULL Buefy into its own `localVue` and
> never loads that plugin.
>
> A guard test was considered and **deliberately not written** (Mike, 2026-08-30): it would
> duplicate a warning the developer already gets by name, which is work done twice. Revisit
> only if someone actually trips over it. *(There is no date-picker bug — `b-datepicker` is
> only the worked example.)*

**`f14ff02` — the two mentor screens now go through `$t()`.** `MentorDistinctions.vue` had
**513 lines and not one `$t()` call**; `MentorReview.vue` had 2. Now 56 and 19, with 80 new
keys in `locales/en.json`. **No wording changed** — every sentence is the one that was on
screen. `mixins/localeMixin.js` gained 74 lines of JSDoc.

> **Why this was worth more than a standards tick, and it is worth knowing before editing
> any screen:** only `en.json` is authored. `loadDynamicLocale` sends the **whole** English
> locale to `/api/translate/locale`, translates on demand and caches per browser. So **a
> string in `en.json` can become any language; a string hardcoded in a template stays
> English for ever.** The other seven locale files hold 51 keys each against English's
> 2,321 — they are seeds, not the mechanism.

Left in English on purpose, each with a reason recorded beside it: the 14 domain names
(canonical taxonomy shared with the backend), the item-4.17 dev-file warning (renders only
when a gitignored local file exists on a developer's machine), and the `#` table header.

### Two things to know before you trust a green run

**`tests/unit/activityStore.cpd.devfallback.test.js` is flaky on Windows.** It failed the
pre-commit gate **twice** with `EPERM` opening its own temp file, then passed on the third
run with nothing changed. It passes standalone every time. It is a file-locking race in
that test, not a fault in the code under it. Nothing was filed and `--no-verify` was never
used — if it blocks you, run the commit again.

**`chore/i18n-jsdoc-cleanup` (1 ahead, 860 behind) — do not merge or cherry-pick it, and
this is now a checked judgement rather than a guess.** It was read in full on 2026-08-30.
Of its four screens, `FirmDashboard.vue` **no longer exists in `master`** (676 of its lines
target a deleted file) and `AdvisorProgression.vue` already carries the work. Its two mentor
screens and its `localeMixin` JSDoc are **done as of `f14ff02`, written fresh against
today's code**. What genuinely remains undone from it is JSDoc only:

| File | `master` today | That branch |
|---|---|---|
| `mixins/caseMixin.js` | 6 lines | 69 |
| `mixins/speechMixin.js` | 8 | 29 |
| `server-middleware/advisor.js` · `course.js` | 10 each | 26 each |

### Waiting on someone else — unchanged

**4.15** (23 template names — needs Mike's search-content update) · **4.50** (needs a
database, so UAT rather than a developer machine). The live list is still those two.

### Decided today, so nobody reopens them

- **Today's work goes to `master` — done.** It was nearly missed: this very note was written
  on the branch, so a desktop following the instructions above would have cut from `master`
  and read the **27 August** handover instead. The instruction and the thing that delivers it
  were the same commit. Worth remembering next time a handover carries an instruction.
- **The Buefy guard test: deliberately NOT written** — see the red box. It would duplicate a
  warning the developer already gets by name.

**Unchanged:** `npm install` still needs npm 8.19.4 on Node 14.15 — [`../.npmrc`](../.npmrc).
