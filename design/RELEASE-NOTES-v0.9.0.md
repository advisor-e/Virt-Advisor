# Release Notes — v0.9.0

**Tag:** `v0.9.0` · **Cut:** 2026-08-17 ·
**Previous release:** [`v0.8.0`](RELEASE-NOTES-v0.8.0.md) (`e3b7a21`, 2026-08-13) —
cut and offered, **never pulled**. Pulling v0.9.0 covers both.

**85 commits since v0.8.0** — 32 code, 53 documentation.

> ✅ **NO `npm install` REQUIRED.** Not one dependency was added, removed or moved.
> `package.json` differs from v0.8.0 only in its `version` field and three helper
> `scripts` entries (`handbook`, `to-do`, `feature`) that are developer tooling and are
> never run in a deployment. `package-lock.json` is untouched.
>
> This is called out every release because v0.7.0 added `@mdi/font` and, without the
> install, the Hub's tab icons rendered blank — which reads as a broken build rather than
> a missing package.

**Verified at tag time, on the tagged commit:** 5,745 tests green across 321 suites · lint
0 errors · critical-audit gate PASS · `nuxt build` green. Runtime target unchanged:
**Node 14.15**, backend CommonJS, Nuxt 2 / Vue 2 / Restify 9.1.0 per the Stack
Constitution.

---

## What this release is about, in one paragraph

**v0.8.0 shipped the management cascade. v0.9.0 fills it with the content that was
already written and was never reaching anybody.** An audit asked a simple question of
every block the AI reads — *does the authored text actually arrive in the prompt?* — and
found **102 pieces of advisory content that reached no prompt at all**, plus a second
half nobody had predicted: **no screen rendered them either**, so nobody could see or
correct them in the other direction. This release closes almost all of it. Nothing is
being invented here; it is content Mike authored, connected to the model and put on a
screen for the first time.

---

## 🔴 READ THIS FIRST — what carries over from v0.8.0

**v0.8.0 was never pulled**, so its three "read this first" items still apply in full and
are **not repeated here**. Read [`RELEASE-NOTES-v0.8.0.md`](RELEASE-NOTES-v0.8.0.md) §
*READ THIS FIRST* before testing:

1. **Nothing in the app links to the hub screens — type the addresses.** `/mentor`,
   `/global-group-manager`, `/group-manager`, `/firm-manager`.
2. **The two middle-tier hubs fail closed here**, and that is not a bug — this app has not
   been told which role values those managers' tokens carry. Use `ALLOW_DEV_AUTH=true` in a
   non-production environment with the dev bearer tokens. *(Corrected 2026-09-02 — this said
   the managers "cannot be logged into"; they log into Advisor-e and have for 18 months.)*
3. **Seed the reserved `firms` row for every tier BEFORE testing a save**, or MySQL
   rejects the write with a foreign-key error.

Loading instructions: [`UAT-LOAD-PACK.md`](UAT-LOAD-PACK.md).

---

## 1. The 102 — content that was authored, read by nobody, and shown to nobody

Every item below was proved the same way: **render the real prompt and search it for the
authored string**. Not by reading the code, which is how all of this stayed hidden.

| What | How many | Where it now appears |
|---|---|---|
| **Method guides** — the thirteen deep coaching documents | **116 lines** in 13 guides | Domain Support tab, opened from a framework row |
| **Diagnostic branches** — what to do, given the client's situation | **65** across 19 domains | Domain Support tab, above the materials table |
| **Entry questions** — the question an advisor is asked first | **26** | the same block |
| **Stage entry questions** — where in the method the advisor already is | **13** | Logic Tables tab |
| **Standing rules** on a staged table | **2** | Logic Tables tab |
| **The staircase selector question** | **1** | Advisory Staircase tab |
| **The awareness-branch reasoning** | 1 block | reaches the model on the branch that needs it |

### 1a. The thirteen method guides — 155,000 characters nobody could see

Thirteen deep method guides go to the advisors' AI every time it coaches — the Conflict
Meeting, Dashboard Discussions, the Working Capital Cycle, Ratio Analysis and nine more.
**No screen in the application rendered any of them, at any tier**, and 116 of their 954
authored lines reached no prompt either.

The cause is worth knowing because it will look familiar: each guide had a hand-written
formatter naming the fields it emitted **one by one**, so a field authored into the file
afterwards was silently never mentioned again. Every one of Dashboard Discussions' twelve
metrics carries the questions an advisor puts to the client — none were sent.

All thirteen are now rendered by **one walk of the document's own structure**, which
cannot skip a field because it never names one, and the **same walk builds both the prompt
and the screen** so the two cannot disagree.

**What a tester will see change:** in a Learn-mode conversation about Dashboard
Discussions, Working Capital Cycle or Ratio Analysis, the AI now quotes Mike's authored
material where before it improvised. Verified on the running app before this tag —
Dashboard Discussions returned 6/6 tactical options and 3/3 discussion questions verbatim;
Working Capital Cycle returned 9/9 causes.

### 1b. What to do, depending on the situation

65 authored branches across 19 domains — *"if the client is in an entrenched position with
loss of self, do NOT try to resolve the substance first"* and the like — reached no prompt
at all, and no screen. They now do both, and a firm may add its own situation.

**They are not duplicates of the logic tables.** That was assumed, tested, and proved
wrong: the tree says WHICH conversation this is, the branch says WHAT TO DO once you are
in it. Only one of the seven suspected duplicate sets actually was one.

---

## 2. A new tab: Coaching Reference

The fifteen rows that tell the model which template to reach for had **no screen anywhere**
— the mentor could not edit them, a group could not, and a firm could only add to them.
There is now a **Coaching Reference tab** on every management hub, inheriting down the
cascade exactly as the Advisory Staircase and Advisory Distinctions already do.

Closing it found two authored fields that were stored, firm-editable, and reaching no
prompt — which is what started the audit in §1.

---

## 3. Smaller things a tester may notice

- **The advisor screen's wording moved into the locale files**, so it can be translated
  and corrected. No behaviour change intended; worth a glance for anything that reads oddly.
- **The AI answers a calm correction as well as an annoyed one.** It used to need
  irritation before it would re-read what the advisor actually asked.
- **Domain-support commentary now says who wrote it** — platform or this firm — and cannot
  come adrift from the row it describes.
- **`NUXT_HOST` / `NUXT_PORT` / `HOST` / `PORT` are honoured again.** They were being
  silently ignored: `nuxt.config.js` is merged over Nuxt's defaults, so setting `host`
  there discarded Nuxt's own env lookup. A deployment that set `HOST=0.0.0.0` saw no change
  and would reasonably have read it as a broken build. Unset behaviour is unchanged —
  `::1` and port 3000.

### Bundle size — unchanged in character, and still over the target

The first-load JS is dominated by the Buefy/Bulma vendor chunk (`vendors~app`, 1.07 MiB
uncompressed) and predates this release; webpack flags it `[big]`, as it did at v0.8.0.
This release adds two small components to the Firm Manager chunk and no new dependency, so
nothing here moved it materially. **It is over the 300 KB-gzipped target the coding
standards set, and that is stated rather than left for someone to discover** — it is not a
regression introduced by v0.9.0, and reducing it is its own piece of work.

---

## 4. 🔴 Known issues — read before reporting

### 4a. The AI can invent content that reads as authored

Found on 2026-08-17 while verifying §1a. A Dashboard Discussions question was routed by
the engine to the **Ratio Analysis** coaching tree, and the AI then produced its own
plausible "tactical options" and "discussion questions" rather than saying it had none for
that metric. The authored content was correct and reachable — **the wrong guide was
selected**, and the model filled the gap.

**This is coaching-tree detection, not the guides.** It is logged and not yet fixed. If a
tester sees advisory content that looks right but does not match the source material,
this is the likeliest cause and it is worth reporting with the exact question asked.

### 4b. A screen can show one row when 67 exist, and say nothing

A local, git-ignored development file is deliberately preferred over the shipped content
when there is no database. One stale row in it shadowed all 67 platform Advisory
Distinctions — **with nothing on screen saying so**. This affects developer and demo
machines, not a properly provisioned environment, but **anyone reviewing on a machine
without MySQL should not trust a suspiciously short list**. Fix is filed, not shipped.

### 4c. The engagement types still have no screen

Three engagement types carry 18 authored fields that reach no prompt and appear on no
page. It is the one part of the §1 audit still open, and it waits on a product decision
rather than on work.

---

## 5. For the person doing the pull

1. `git fetch --tags && git checkout v0.9.0` — **the tag, not `master`.** A branch keeps
   moving; a tag does not. (v0.7.0 was pulled from `master` at a point in time, which was
   harmless but made it harder to trace.)
2. **No `npm install` needed** — see the box at the top.
3. **Write the row.** [`DEPLOYED-VERSIONS.md`](DEPLOYED-VERSIONS.md) — date, environment,
   exact commit hash, who pulled it, notes. *A deployment is not complete until its row is
   written*, and the ledger is maintained on this side because the master team has no
   commit access here. If you pull and tell us, we will write it.
4. **Tell us what you find**, including anything in §4 — those are known and we would
   rather hear a duplicate than miss a new one.
