# Wording — the "Why" column in the decision-trace panel

**Status: RULED and BUILT, 2026-08-04.** All 26 phrases are live in
[`locales/en.json`](../locales/en.json), reached by both screens through
[`mixins/traceReasonMixin.js`](../mixins/traceReasonMixin.js) and the code table in
[`utils/traceReasonCodes.js`](../utils/traceReasonCodes.js).

> **The build was compared against this file phrase by phrase. ONE deviation, named
> here as the rule requires:** the tables below write straight quotes and apostrophes
> (`matches "Cash Flow"`, `client's industry`) because they are markdown; the shipped
> strings use typographic ones (`matches “Cash Flow”`, `client’s industry`) to match
> the rest of `en.json` and the sentence already on this panel. Wording identical,
> punctuation shape different. Nothing else differs.

Written 2026-08-04 (laptop). This file exists because the wording has to be *read*
before it is approved, not described in a chat message — the Save-the-Artefact rule in
`CLAUDE.md`.

---

## What this is about

Two screens show a table called **"How the templates scored"**, with a column headed
**"Why"**:

- the adviser's live **"Why this recommendation"** panel
  ([`VirtualAdvisor.vue`](../components/VirtualAdvisor.vue)), and
- the saved copy of the same trace on a case in Firm Manager
  ([`FirmManagerHub.vue`](../components/FirmManagerHub.vue)).

The engine gives each template a score and records **why** as a list of short codes.
The "Why" column is supposed to turn those codes into plain English.

**The engine writes 26 distinct codes** — from 24 `reasons.push` statements in
[`templateResolver.js`](../server/utils/templateResolver.js), two of which emit two
shapes each. *(An earlier draft of this file said 25; the group-distinction site emits
both `@rf-industry` and `@rf-general`, which the first count merged.)*

**Seven of the 26 are turned into English today, by six handlers. Nineteen are not.**
Those reach a reader exactly as the engine wrote them:

> `primary_issue:strong_match, semantic:4.2, penalty:reports_already_in_use`

And that is only the adviser's screen. On the firm manager's saved case, **none** of
the 26 are translated — that view never had the plain-English step at all
([`FirmManagerHub.vue` L1423](../components/FirmManagerHub.vue#L1423) simply joins the
raw codes together).

---

## The five rulings (Mike, 2026-08-04)

**1. Show all 26, in English.** Nothing is hidden, and the reasons that pushed a
template *down* stay visible. *(The alternative — showing a firm manager only its own
levers, as the Decision Logic page deliberately does — was offered and declined.)*

**2. Point values only on the firm's own levers.** Numbers appear on advisory
distinctions and the logic tree, because those are what a firm can actually change.
Everything else is words alone. This dropped the figure from the two phrases drafted
with one (`semantic`, `purpose_fallback`).

**3. Keep the second person.** Where a reason came from the adviser's own input, the
panel hands it back as "you" — matching the panel's own heading, "Area **I** focused
on".

> ⚠ **Known reading, accepted with the ruling.** On a saved case in Firm Manager,
> "you ruled out revenue modelling" refers to the **adviser who ran the session**, not
> to the manager reading it weeks later. Mike was shown this trade-off and chose the
> second person anyway. Recorded so it is not mistaken later for an oversight.

**4. Both vague live phrases change.** `tag:` names its category instead of saying
"matches the area" — the panel already uses "area" to mean the advisory domain, so one
word was doing two jobs. And the two engagement codes stop sharing one sentence.

**5. "Held back" is the standard word for a penalty**, across all seven of them. It
reads as a deliberate act rather than a fault with the template, which is accurate: a
held-back template is still in the list, still scored, just lower.

---

## The final list — all 26

`LIVE` = on screen today and unchanged · `CHANGED` = live today, reworded under ruling 4
· everything else is new.

### Where the template sits

| Code | What it means | English |
| --- | --- | --- |
| `domain:primary_subsection` (+2) | Sits in the main area this session is about | core to this area `LIVE` |
| `domain:secondary_subsection` (+1) | In a related part of this area, not the main one | in a related part of this area |
| `engagement:primary` (+2) | Fits the main focus of this engagement type | fits this engagement type `CHANGED` |
| `engagement:secondary` (+1) | Fits the engagement type, but not its main focus | a secondary fit for this engagement type `CHANGED` |
| `growth:exact` (+2) | Built for the growth stage the client is at | matches the client's growth stage |

### The client's industry

| Code | What it means | English |
| --- | --- | --- |
| `industry:title_match` (+8) | The template is *named* for the client's industry | named for the client's industry |
| `industry:tag_match` (+4) | Tagged with the client's industry, though not named for it | tagged for the client's industry |
| `industry:mismatch_specific_model` (−15) | An industry-specific revenue model built for a *different* industry | built for a different industry — held back |
| `industry:wrong_domain_model` (−15) | An industry revenue model that does not belong in this advisory area at all | an industry model, out of place in this area — held back |

### What the adviser described

| Code | What it means | English |
| --- | --- | --- |
| `primary_issue:strong_match` (+3) | Two or more words from the confirmed problem appear in this template | closely matches the stated problem |
| `primary_issue:partial_match` (+1) | One word from the confirmed problem appears | partly matches the stated problem |
| `semantic:4.2` | The template's subject profile matched the problem signals picked up in conversation | matches the signals in this conversation |
| `purpose_fallback:3.0` | This template has no subject profile, so its description was matched on keywords instead | matched on its description |
| `tag:Cash Flow` (+3) | Tagged with the solution category the session is about | matches "Cash Flow" `CHANGED` |
| `purpose:Cash Flow` (+1) | The category appears in its description, but it is not tagged with it | "Cash Flow" appears in its description |

### Your firm's own settings — the two that carry numbers

| Code | What it means | English |
| --- | --- | --- |
| `distinction:+5` | One of your firm's advisory distinctions matched | firm distinction +5 `LIVE` |
| `distinction:@rf-industry+5` | A firm distinction aimed at the *industry* revenue models as a group | firm distinction, industry models +5 |
| `distinction:@rf-general+5` | A firm distinction aimed at the *general* feasibility tools as a group | firm distinction, general models +5 |
| `tree_hint:+3` | Your firm's logic tree named this template for the situation described | your logic tree named it +3 |

### Held back

| Code | What it means | English |
| --- | --- | --- |
| `history:already_delivered` | This client has had this template before | already delivered to this client — held back `LIVE` |
| `history:went_less_well` | Delivered before, and the review said it went less well | delivered before and went less well — held back `LIVE` |
| `penalty:modeling_declined` (−50) | The adviser said revenue modelling is not the answer here | you ruled out revenue modelling — held back |
| `penalty:reports_already_in_use` (−4) | The client already gets regular management reports | client already gets regular reports — held back |
| `advisor:confidence_mismatch` (−1) | Low confidence reported, and this template needs experience | needs more experience than reported — held back |

### The adviser's own confidence

| Code | What it means | English |
| --- | --- | --- |
| `advisor:confidence_match` (+1) | Suits an adviser newer to this area | suits an adviser newer to this area |
| `advisor:confidence_boost` (+1) | High confidence reported in an area that rewards it | you reported strong confidence here |

---

## What is deliberately NOT decided here

**How much of the engine's reasoning a firm manager should see, app-wide.**
[`decisionScore.js`](../server/utils/decisionScore.js) shows a firm manager only two
kinds of reason and hides the rest behind one figure, with a comment saying the
omission is intentional. This panel now shows all 26. Those are two different answers
to the same question, and only one of them was arrived at on purpose.

Ruling 1 settles it **for this panel**. It does not settle it for the Decision Logic
page, which is the desktop's work — **nothing here touches that file.** If the two are
ever meant to agree, that is a conversation across both machines.

---

## How it gets built

One shared piece of code that both screens call, with the words in
[`locales/en.json`](../locales/en.json) so all 8 languages get them. Two copies of this
mapping would drift apart — which is exactly how the firm manager's view ended up with
no plain English at all while the adviser's had six phrases.

An unrecognised code still passes through as-is rather than disappearing, which is what
the adviser's panel does today: a code the engine adds later shows up ugly, not
missing. Same reasoning as the icon-font guard.
