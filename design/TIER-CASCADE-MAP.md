# The tier cascade map — what flows down, what flows up

> **Purpose.** One page that answers, checkably: *for each thing the Hub does, does it
> cascade down the management tiers, and does anything about it report back up?* Written
> 2026-08-10 at Mike's request, read out of the code rather than out of the plans.
>
> **Status of the tiers themselves.** The mechanism is built and tested
> ([`MENTOR-TIER-CHAIN-PLAN.md`](MENTOR-TIER-CHAIN-PLAN.md), shipped `fbaafb5`). The two
> middle tiers hold nothing today — see [§4](#4-the-honest-limit).

---

## 1. There is one screen, not four

There are no separate pages per tier, and none are needed.
[`pages/mentor.vue`](../pages/mentor.vue) and [`pages/firm-manager.vue`](../pages/firm-manager.vue)
both render the **same** component, [`components/FirmManagerHub.vue`](../components/FirmManagerHub.vue),
with a different `scope` prop.

That is Mike's ruling of 2026-07-30 — *"every tier is the same screen, re-scoped… there's no
new functionality"* — and it is why the global-manager and group-manager tiers require no new
pages to be built. They inherit this one.

The tier order, highest authority first
([`server/utils/tierChain.js`](../server/utils/tierChain.js) `TIERS`):

```
mentor  →  global_manager  →  group_manager  →  firm_manager  →  advisor
```

Reserved scope ids: `__platform__` (mentor), `__global__:<brand>`,
`__group__:<brand>:<country>`. A real firm id is the fourth. All four ride the existing
`firm_id` column per Mike's reserved-row ruling of 2026-08-09.

---

## 2. What cascades DOWN

**The rule underneath every "yes" row is one sentence, ruled by Mike on 2026-08-09:**
*a firm holds only its changes, not a copy.* So a mentor's later edit keeps reaching a firm
for everything that firm has not touched, and a firm's own change still wins and sticks.

| Tab / block | What it controls | Cascades? | Mechanism |
|---|---|---|---|
| **Domain Support** | The material the AI draws on, per advisory area | ✅ Yes | `deepMerge`, field by field |
| **Logic Tables** | The decision trees behind the advice | ✅ Yes | `deepMerge`, field by field |
| **Section placement** | Where items sit on the screen (both of the above) | ✅ Yes | `deepMerge`, field by field |
| **Advisory Distinctions** | The phrases marking advisory from compliance | ✅ Yes | `resolveInheritedRows` |
| **Advisory Staircase** | The client journey steps | ✅ Yes | `resolveInheritedRows` |
| **Quizzes** | The capability questions | ✅ Yes | `resolveInheritedRows` |
| **Logic-Lab** | How a decision was reached; attach a distinction | ❌ No | Firm-local by nature; its accepted-list is array-shaped |
| **Coaching reference** | 15 coaching rows | ⚠ Not yet | *Could* — all 15 rows carry `cr-` ids. It simply never joined the mechanism, and its firm side is append-only |
| **Templates & Videos** | — | ❌ Cannot | Tab is dormant (`v-if="false"`); its 291 records carry **zero** ids, so there is nothing to inherit *by* |

### 2.1 The two mechanisms, and why there are two

- **`deepMerge`** — for map-shaped config, where each entry has an id and an untouched entry
  falls through to the layer above. The four keys are listed in
  [`firmOverlay.js`](../server/utils/firmOverlay.js) `CASCADING_CONFIG_KEYS`:
  `domain-support`, `logic-trees`, `domain-support-sections`, `logic-tree-sections`.
- **`resolveInheritedRows`** — for the blocks where each row is a *decision*: switch it off,
  edit it, reset it, or add your own. A tier's decisions resolve against the tier above as
  its base.

⚠ **Array-valued keys deliberately cannot cascade.** Arrays replace wholesale, so a firm
holding a one-item array would blank the mentor's whole set for itself rather than adding to
it. That is why `templates` and `logic-lab-accepted` are absent, and it is a correctness
decision, not an omission.

### 2.2 Own-row id prefixes must stay distinct per tier

When a tier adds a row of its own, the id is minted per scope. Two tiers sharing a prefix
would put two different rows under one identity — a firm switching off "its own" step would
silently drop the mentor's. Hence:

| Tier | Staircase | Quizzes |
|---|---|---|
| mentor | `ms-` | `mq-` |
| global manager | `xs-` | `xq-` |
| group manager | `gs-` | `gq-` |
| firm manager | `fs-` | `fq-` |

`x` for global, because `g` reads as *group* and those two tiers are adjacent. A test fails
if anyone reuses a letter.

---

## 3. What flows UP (reporting)

| Tab | Visible at | What crosses the firm boundary |
|---|---|---|
| **Adviser Network** | Every tier | The only tab that **already** rolls up automatically. `GET /api/people/*` resolves the caller's tier from the verified token — a firm manager sees their firm, the levels above see a roll-up |
| **Team Progress** | Firm only | **Nothing.** It lists advisers *by name*, so it deliberately stops at the firm |
| **Team Case Studies** | Firm only | **Nothing** |
| **Adoption** | Mentor | Counts only — how many advisers, how many sessions, how recently. Firms silent for **60 days** are flagged |
| **Case Reviews** | Mentor | Only the anonymised copy of a case, and only where two separate people said yes |
| **Logic-Lab Report** | Mentor | What every firm pushed back on — configuration only, never people |
| **Template Check** | Mentor | The rulings queue (93 rows awaiting Mike) |

### 3.1 The pattern worth naming

**Content flows down freely. People never flow up.** Everything that goes upward is either a
count, a setting, or something a human deliberately handed over. Where a roll-up would have
been the obvious move, it was refused on purpose:

- **Team Progress was NOT widened to the mentor.** Doing so would have put every firm's
  advisers in front of Advisor-e. The Adoption tab — the same activity, counted one level up
  and stripped of *who* did it — answers the mentor's actual question and crosses nothing.
- **Case sharing is double opt-in** ([`caseStore.js`](../server/utils/caseStore.js)): the
  adviser decides whether a case is visible to their firm at all, and the firm **manager**
  separately decides whether it goes to the mentor. The mentor only ever sees the anonymised
  copy written on the manager's approval — never the raw text.
- **Two of the three cross-firm reads enforce the line in code, not by convention.**
  `assertNoPersonalFields` (in both [`mentorLogicLabReport.js`](../server/utils/mentorLogicLabReport.js)
  and [`mentorAdoption.js`](../server/utils/mentorAdoption.js)) **throws** rather than
  filtering — a silent filter would hide the day the shape changed.

---

## 4. The honest limit

The middle two tiers are built, tested and ready. **They hold nothing today**, and both
reasons belong to the Advisor-e master team, not to us:

1. **No one can log in as one.** `roles.js` maps only `platform_admin` → mentor and
   `firm_manager` → firm_manager. No role value anywhere produces `global_manager` or
   `group_manager`. (⚠ `mentor` was never added either — it is still borrowing
   `platform_admin`.)
2. **Nothing in our data says which firms are in which group.** The `firms` table has no
   country, group or parent column.

Until both arrive, `parentScopeOf` returns the mentor scope for every firm — which is exactly
what four call sites hardcoded before the tier chain existed. **So the chain runs mentor → firm,
two levels, precisely as it did.** That is not a fallback bolted on; it is the property that let
the entire pre-existing test suite pass unmodified.

The joining instructions for the master team are written into
[`config/db-schema.sql`](../config/db-schema.sql), beside the insert they already have to run.

⚠ **This cannot be demonstrated by logging in as a group manager, because no such login
exists.** It is evidenced by tests against a seeded membership map — a weaker claim than a
live screen, and recorded as one here rather than glossed.

---

## 5. Related records

- [`MENTOR-TIER-CHAIN-PLAN.md`](MENTOR-TIER-CHAIN-PLAN.md) — how the cascade was widened
- [`MENTOR-SAVE-SCOPE-PLAN.md`](MENTOR-SAVE-SCOPE-PLAN.md) — where a mentor's save goes
- [`mockups/mentor-adoption-view.html`](mockups/mentor-adoption-view.html) — the Adoption
  screen's four ruled decisions
- [`SESSION-2026-08-10-NOTES.md`](SESSION-2026-08-10-NOTES.md) — the session that built the chain
