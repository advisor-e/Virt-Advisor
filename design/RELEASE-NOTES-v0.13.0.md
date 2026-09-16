# Release notes — v0.13.0

**Cut 2026-09-16 from `master` at the merge commit of [PR #96](https://github.com/advisor-e/Virt-Advisor/pull/96).**
197 commits since `v0.12.0`, from both development machines.

> **Pull the tag `v0.13.0`, not `master`.** Report any UAT bug against the tag number, so a
> report can be matched to exact code.

---

## 🔴 1. Before you install — read these two lines

**✅ NO `npm install` NEEDED.** `package.json` and `package-lock.json` differ from `v0.12.0`
in the `version` field only. No dependency was added, removed, or moved.

🔴 **ONE NEW TABLE MUST BE CREATED: `advisor_model_choices`.** This is the first schema change
since `v0.11.x`. `config/db-schema.sql` gained **59 lines and nothing else** — the table is
purely additive; nothing was altered, renamed or dropped, so existing data and every other
table are untouched.

```sql
-- Run the advisor_model_choices block from config/db-schema.sql against the UAT database.
```

**What happens if you skip it:** the Model Choices record (§3) writes nothing and its screen
stays empty. Everything else in the app runs normally. It is not a boot failure.

## 🔴 2. First check after installing

```
npm run backend      # must print: [restify] virt-advisor-api listening on …
```

**If it exits instead, stop — no screen is worth opening.** This check exists because
`v0.11.0` was tagged with every other gate green and did not start at all. It is now verified
here before the tag, on the exact merge commit this tag sits on, and it passed.

---

## 3. What is new

### The AI engine's middle, and the learning loop made true (item 7.2)

The largest piece of this release, and it changes what an advisor is shown.

- **The engine asks what the problem actually is.** It proposes a primary issue in the
  advisor's own terms and invites a correction, instead of inferring one from a single
  category word. The decision trace shows what was recorded.
- **Learning can lift, not only hold back.** An outcome that keeps landing well now raises a
  template as well as lowering one that does not.
- **The bench is honest.** It reports out-of-sample results and says plainly when a figure is
  in-sample, rather than scoring itself on the data it learned from.
- **A provider outage no longer stops every AI feature.** The last engines fall back, and the
  advisor is told which AI answered them.

### Template Profiles — a new tab on the Mentor Hub

What the AI understands each of the **220 client tools** to be *about*: the problems it
answers, and how strongly. This is the resolver's dominant lever and until now it was visible
on no screen anywhere.

The mentor can author a profile, and the engine reads it over the compiled default — falling
back to the compiled file if the store is unreachable, so a database blip degrades to the
script's guesses rather than emptying the lever. Every save is a version with its author and
reason, and any earlier version can be restored, including the one the compiler wrote.

**55 of the 220 are thin — 44 with no profile at all.** The page says so, and says plainly when
*not* to use it: measured on the 51-case bench, authoring three blank profiles moved score
separation 5.6 → 5.7, and the engine already picked a content-driven top recommendation in
**51 of 51** cases with none authored.

### Wages / Salary Review (item 5.1)

Labour margin and the staff register, with leave valued at the rate **including** pay rises.
Three charts, and the due-diligence gate removed in favour of one button.

### Model Choices (item 7.5) — the new table

Nineteen calculation models are described to the AI on every client conversation, and nothing
recorded which one it named. On 2026-09-15 three live conversations found a governance dispute
offered a cash forecast; nothing logged it, and 11,082 passing tests could not see it, because
they check that the words reach the prompt and never what the model does with them.

**The table holds no advisor's own words** — deliberately. It is read across firms by the
mentor, so the advisor's description of their client stays inside the firm, on their own saved
case.

---

## 4. Faults fixed that a test suite could not see

Every one of these was found by **running the app**, not by the suite:

- a supplier-cost conversation routed to sales and marketing, because *"cost of sales"*
  contains the word *sales*;
- a calculator offered as a template that does not exist;
- the AI offering a model when none fitted, and inventing limits for the ones it named;
- charts drawing a loss as break-even;
- a report header rendering 364px wide in a 1076px column, and the guard that was checking
  six of thirteen screens.

---

## 5. 🔴 Known before testing

- **Eight of nineteen calculators are not offered** when an advisor asks the question they
  answer (item 7.9, measured over 30 live conversations: working capital cycle, EBITDA/DCF,
  lease vs buy, loan estimator, dashboard reports, high-level budget, stock purchasing, sales
  dashboard). How forthcoming the AI should be is a product decision, not a defect to patch.
- **The middle-tier role values are still Advisor-e's to supply.** Global-group and group
  manager hubs fail closed here — by design, not by defect. They log into Advisor-e and have
  for eighteen months; this app has simply not been told which role values their tokens carry.
- **The Adviser Network runs on invented people** until identity is wired (item 11.1). In
  `NODE_ENV=production` it reads and writes nothing, so manager decisions do not persist.
- **14 logic-table branches name documents the template library does not hold** (item 7.1), so
  the gate withholds that advice. The content names tools that are not there; the gate is
  behaving correctly.

---

## 6. Verified before the tag

On the exact merge commit this tag sits on (`ef368ece`):

| Gate | Result |
|---|---|
| **Backend starts and mounts every route** | ✅ `[restify] virt-advisor-api listening on 127.0.0.1:4000` |
| `npm test` | ✅ **11,930 passing / 556 suites**, coverage thresholds met |
| `npm run lint` | ✅ 0 errors |
| `npm run build` | ✅ `Ready to run nuxt start` |
| Critical-audit gate | ✅ PASS |
