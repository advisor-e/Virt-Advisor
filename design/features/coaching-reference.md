# Coaching Reference — the Brief

> ## 🔴 THIS FEATURE NO LONGER EXISTS
>
> **Removed on 2026-08-20 (item 4.24, Mike's Option D).** The hub tab, the fifteen platform rows,
> the prompt block, the seven routes and the firm-editable cascade are all gone. **Everything below
> describes a screen nobody can open and code that is no longer in the repository.** It is kept
> because the mechanism it documents was real, and because the reasoning that ended it is only
> legible beside it.
>
> **What replaced it.** The seven pieces worth keeping were folded into the logic trees that had
> superseded them — `reveal_growth_curve`, `eoy_meeting`, `working_capital_cycle`,
> `client_planning`, `trial_fit`, `dashboard_discussions` and `cashflow`. Choosing a template is
> Logic Tables' job by Mike's own ruling, and it is now Logic Tables' job in the code too.
>
> **What survived, and is NOT described by this page's tab sections.** A firm's **promoted case
> observations** — an adviser's free text about a real client, reaching the model FENCED, per firm,
> uninherited. Different key, different loader, untouched by the removal. See
> [`server/utils/coaching.js`](../../server/utils/coaching.js).
>
> **Where the account is:** [`../COACHING-REFERENCE-EVIDENCE.md`](../COACHING-REFERENCE-EVIDENCE.md)
> (origin, arithmetic, measurement, control, decision) and the **4.24** entry on
> [`to-do-done-and-parked.md`](to-do-done-and-parked.md) §2 (what was read, what moved where, and
> the two things the evidence page got wrong).
>
> ⚠ **Do not use this Brief to rebuild the feature.** It describes the mechanism faithfully and
> never established the purpose — nothing in the repository ever did, which was the finding.

---

> **Historical, as at 2026-08-19 — a hub tab at all four tiers.** The history is in
> [`coaching-reference-history.md`](coaching-reference-history.md).
>
> **Covered:** the guidance the AI read when it decided *which template to put in front of this
> client*, and the firm's own promoted observations that sat beside it. **Did not cover:** how a
> chosen template is then run ([`domain-support.md`](domain-support.md)), or which template a
> scenario routes to ([`logic-tables.md`](logic-tables.md)) — which is now where this went too.
>
> ⚠ **This Brief was written on 2026-08-19, later than the feature.** Until then it was the only
> content page in the hub with none — see §6.
>
> ⚠ **§1's "design philosophy" is the code's sentence, not a decision anyone took.** The 15 rows
> are a PowerPoint converted to JSON in the repository's first commit and never reviewed. Seven of
> them name no template that exists.

---

## 1. Design philosophy

**It is the menu the AI picks a template FROM.**

That is the code's own sentence ([`../../server/utils/coaching.js`](../../server/utils/coaching.js)
line 176), and it is the whole feature in eight words. Fifteen entries, one per template, each
saying what that template is good for and which client it suits. The model reads all fifteen and
chooses.

**The three AI-facing content pages answer three different questions, and the boundary is the point
of this page having a Brief at all:**

| Page | Its question |
|---|---|
| **Logic Tables** | *Which template, in which scenario?* — the routing rule |
| **Coaching Reference** | *Which tool fits this client?* — the flat menu it chooses from |
| **Domain Support** | *How do I run this, step by step?* — once chosen |

**A menu is not a manual.** Content that explains how to deliver something belongs on Domain
Support even when the word "coaching" would fit it comfortably. Content that helps the model
*choose* belongs here even when it reads like technique.

**Two layers that must never merge.** The platform's fifteen are curated guidance the model is meant
to act on. A firm's promoted entries are an advisor's own free-text words about a real client —
evidence to weigh, never instructions to follow. They enter the prompt differently on purpose, and
§2 P4 is why folding them together would be a security hole rather than a tidy-up.

---

## 2. Key principles — the non-negotiables

**P1 · Every entry is about CHOOSING, and it is answerable in one sentence.** *Does this help the
model pick?* If the answer is no, the content belongs on another page. Five of the six fields
choose a tool; only **Delivery notes** says how to run one, and it earns its place by being the
part of delivery that changes *whether the template fits* — the practice it needs, the setting it
needs — not by being how-to.

**P2 · The platform base is read-only at runtime.** Only a developer adds to
[`../../data/coaching-reference.json`](../../data/coaching-reference.json). The app never appends to
it. Every level edits it through the overlay mechanism instead, and never by writing the file.

**P3 · It cascades like every other block** — mentor → global → group → firm, each level able to
edit, decline or add, a level that has decided nothing taking the layer above untouched. It was the
**fifth and last** block to join that one mechanism; before 2026-08-15 the fifteen rows reached the
model exactly as shipped for every firm on the platform.

**P4 · A firm's promoted entries are FENCED; the platform's are not.** Curated guidance goes in
unfenced because the model is meant to act on it. Promoted entries are user text about a real
client, so they are wrapped by `fenceUntrusted()` as hostile input. **They are stored under a
different key, resolved by a different function and rendered into a different prompt section, and
they are neither inherited nor overridable.** Merging the two paths would turn an advisor's free
text into instructions the model follows.

**P5 · The platform base is never filtered or capped.** Promoted entries are capped at **eight**,
newest first, filtered to the session's topic — an untagged entry always passes, because a missing
tag is not evidence of irrelevance. **The base is exempt from both**, and the reason is a rule, not
an oversight: hiding part of the menu by topic could suppress a template that should have been
weighed. That is a correctness risk taken against a cost problem that does not exist.

**P6 · A cap that bites says so.** When promoted entries are dropped, it is logged with the counts.
A silent trim means a firm's older lessons stop reaching the AI and nobody ever learns.

**P7 · The screen's field order IS the prompt's field order.** A manager editing top to bottom is
editing the prompt top to bottom. Changing one without the other breaks the only mental model the
screen offers.

**P8 · Every authored field reaches the prompt.** Two of the six did not until 2026-08-16 — see
§6 — and this is now the standing rule for any field added here.

---

## 3. Design considerations

**Its name is the weakest thing about it.** *Coaching Reference* promises coaching and delivers a
selection menu, and that has already sent content to the wrong page in conversation. The naming
decision is open and is Mike's — recorded at §6 rather than settled here.

**Fifteen entries is small, and that is a feature.** The model reads all of them every time. A menu
that grows without limit stops being a menu; P5's exemption from capping is affordable precisely
because a developer is the only one who can add to the base.

**Promotion is the loop's second half.** A case review produces a lesson; promotion is how that
lesson reaches the AI. The cap and the topic filter exist because that loop has no natural end.

---

## 4. For the coder

| Piece | Path |
|---|---|
| Platform base — the fifteen | `data/coaching-reference.json` |
| Prompt rendering, cap, topic filter, fencing | `server/utils/coaching.js` |
| The tier cascade | `server/utils/coachingConfig.js` — `loadResolvedCoaching` |
| A firm's own decisions | `server/utils/firmCoachingReference.js` |
| Routes (7) | `server/restify-server.js` — `/api/firm-manager/coaching*` |
| The screen | `components/firm/FirmCoachingReference.vue` |
| Where it enters the prompt | `server/advisorEngine.js` — `## Coaching Reference` |

**The six fields**, in the one order the screen and the prompt share: **template name · How it
helps · What to look for · When to use it (`scenarios`) · Where it may lead · Delivery notes**.

**Traps.**

- 🔴 **Do not fold the promoted entries into `coachingConfig`.** They look like the same data and
  are not: different key, different resolution, fenced, uninherited. The header of
  `firmCoachingReference.js` says why at length.
- 🔴 **`formatEntry` names its fields one by one.** A field added to the data and not to that
  function is authored, stored, firm-editable and invisible to the AI, with nothing failing. That
  is exactly how P8's two fields went missing.
- **The tab is ungated** — no `TAB_TIERS` entry, so it appears at all four tiers. That is
  deliberate: the mechanism means the same thing at every level, and the mentor edits the platform
  rows through the same screen.

**Known state.** Firm entries fall back to a gitignored development file when MySQL is unavailable
and it is not production; a real database refusal propagates rather than falling back.

---

## 5. 🔴 What belongs here, and what does not

**The test is P1: does it help the model CHOOSE?**

| Content | Where it goes | Why |
|---|---|---|
| *"This template suits a client unsure where to start"* | **Here** | Chooses |
| *"Free-draw is best; takes practice, rehearse the story"* | **Here** (Delivery notes) | Changes whether it fits |
| *"The universal 3-stage protocol for introducing any concept"* — Facilitation 101 | **Domain Support** | Pure how-to; helps no one pick |
| *"IF the client is unaware THEN use Cautious Reveal"* | **Logic Tables** | A routing rule, not a menu entry |
| An advisor's note about how a real client reacted | **Here, promoted** — fenced, capped, uninherited | Evidence, not guidance |

⚠ **This table exists because the name misleads.** Asked in the abstract, *"where does a
facilitation guide live?"* answers itself wrongly: the tab called *Coaching Reference* sounds like
the home of anything that coaches. The question to ask instead is P1's.

---

## 6. 🔴 Open — the name, and what it cost to have no Brief

**This was the only content page in the hub with no Brief.** Nobody ever wrote down what it was
for, and the likeliest consequence is the one visible in its own title: **the name promises coaching
and the code calls it a selection menu.**

**The naming decision is Mike's and is NOT settled here.** The options, recorded so they exist
before anyone chooses:

| | Option | What it costs |
|---|---|---|
| **A** | **Keep "Coaching Reference"** and let §5's table carry the boundary | Nothing to change; the name keeps misdirecting, and §5 has to be found |
| **B** | **"Template Selection"** — what the code calls it | Truest to the content; loses the word Mike's advisors may already use |
| **C** | **"Which Tool Fits This Client"** — the question, as the heading | Self-explaining, needs no Brief to decode; longest, and unlike its neighbours |
| **D** | **"Choosing a Template"** | Short, plainly about choosing, sits naturally beside *Logic Tables* |

⚠ **Renaming touches the tab label, the screen heading, its lede and seven route paths** — the
routes are internal and need not follow the label. It is a wording decision, not a technical one.

---

## 7. Related briefs

[`domain-support.md`](domain-support.md) — how to run what was chosen ·
[`logic-tables.md`](logic-tables.md) — which template a scenario routes to ·
[`advisory-engine.md`](advisory-engine.md) — where this block enters the prompt ·
[`case-reviews.md`](case-reviews.md) — where a promoted lesson comes from ·
[`tier-cascade.md`](tier-cascade.md) — the mechanism it cascades on ·
[`firm-manager-hub.md`](firm-manager-hub.md) — the screen it is a tab of ·
[`../HUB-PAGE-PURPOSES.md`](../HUB-PAGE-PURPOSES.md) — the twelve tabs, one question each.

**History:** [`coaching-reference-history.md`](coaching-reference-history.md)
