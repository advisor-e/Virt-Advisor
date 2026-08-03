# Wording — the "Why" column in the decision-trace panel

**Status: PROPOSED. Nothing here is built. Awaiting Mike's approval, phrase by phrase.**

Written 2026-08-04 (laptop). This file exists because the wording below has to be
*read* before it is approved, not described in a chat message — the Save-the-Artefact
rule in `CLAUDE.md`.

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

**It currently turns 6 of them into English. The engine writes 25.** The rest reach
the screen exactly as the engine wrote them:

> `primary_issue:strong_match, semantic:4.2, penalty:reports_already_in_use`

On the adviser's screen 6 are translated. On the firm manager's saved case, **none**
are — that view never had the plain-English step at all
([`FirmManagerHub.vue` L1423](../components/FirmManagerHub.vue#L1423) simply joins the
raw codes together).

---

## Two things to decide, not one

**1. The words.** The tables below propose an English phrase for every code.

**2. How much to show at all.** Elsewhere in the app there is a deliberate decision to
show a firm manager only **two** kinds of reason — the firm's own distinctions and the
logic tree — and to hide the rest behind a single "everything else" figure
([`decisionScore.js`](../server/utils/decisionScore.js), where the omission is
commented as intentional). The trace panel shows **all** of them, raw.

So the app currently gives two different answers to *"how much of the engine's
reasoning does a firm manager get to see?"*, and only one of those answers was decided
on purpose. **That file belongs to the Decision Logic work on the desktop, so nothing
here touches it** — but the question is worth answering before this is built, because
the answer might be "show fewer, not translate more."

---

## A. The six that already have English (live today)

These are on screen now. Listed so a change to them is a deliberate choice, not a
side-effect.

| Code | What it means | English today | Proposed |
| --- | --- | --- | --- |
| `distinction:+5` | One of your firm's own advisory distinctions matched, and added 5 points | firm distinction +5 | **firm distinction +5** — no change |
| `domain:primary_subsection` | The template sits in the main area this session is about | core to this area | **core to this area** — no change |
| `history:already_delivered` | This client has had this template before, so it was pushed down the list | already delivered to this client — held back | **no change** |
| `history:went_less_well` | Delivered before, and the adviser's review said it went less well | delivered before and went less well — held back | **no change** |
| `tag:Cash Flow` | The template is tagged with the *solution category* the session is about | matches the area | ⚠ **matches "Cash Flow"** — see note |
| `engagement:primary` | The template fits the type of engagement (advice / project / retainer) | fits the engagement type | ⚠ **fits this engagement type** — see note |

⚠ **Two of the six say less than they know.**

`tag:` says "matches the area", but the code has the actual category to hand — "Cash
Flow", "Pricing" — and "area" is already used on this same panel to mean the advisory
domain, which is a different thing. Proposal: name the category.

`engagement:` covers two different codes, `:primary` and `:secondary`, with one
sentence. Proposal below splits them.

---

## B. The nineteen that reach the screen as raw code

Grouped by what a reader is likely to be asking. Points shown because they explain why
a template rose or fell.

### Where the template sits

| Code | What it means | Proposed English |
| --- | --- | --- |
| `domain:secondary_subsection` (+1) | In a related part of this advisory area, not the main one | in a related part of this area |
| `engagement:secondary` (+1) | Fits this engagement type, but not its main focus | a secondary fit for this engagement type |
| `growth:exact` (+2) | Built for the growth stage the client is at | matches the client's growth stage |

### The client's industry

| Code | What it means | Proposed English |
| --- | --- | --- |
| `industry:title_match` (+8) | The template is *named* for the client's industry | named for the client's industry |
| `industry:tag_match` (+4) | Tagged with the client's industry, though not named for it | tagged for the client's industry |
| `industry:mismatch_specific_model` (−15) | An industry-specific revenue model built for a *different* industry | built for a different industry — held back |
| `industry:wrong_domain_model` (−15) | An industry revenue model that does not belong in this advisory area at all | an industry model, out of place in this area — held back |

### What the adviser described

| Code | What it means | Proposed English |
| --- | --- | --- |
| `primary_issue:strong_match` (+3) | Two or more words from the confirmed problem appear in this template | closely matches the stated problem |
| `primary_issue:partial_match` (+1) | One word from the confirmed problem appears | partly matches the stated problem |
| `semantic:4.2` | The template's subject profile matched the problem signals picked up in conversation, worth 4.2 points | matches the signals in this conversation (4.2) |
| `purpose_fallback:3.0` | This template has no subject profile, so its description was matched on keywords instead — worth 3.0 | matched on its description (3.0) |
| `purpose:Cash Flow` (+1) | The solution category appears in the template's description, but it is not tagged with it | "Cash Flow" appears in its description |

### Your firm's own settings

| Code | What it means | Proposed English |
| --- | --- | --- |
| `tree_hint:+3` | Your firm's logic tree named this template for the situation described | your logic tree named it +3 |
| `distinction:@rf-industry+5` | A firm distinction aimed at the *industry* revenue models as a group, not one named model | firm distinction, industry models +5 |
| `distinction:@rf-general+5` | A firm distinction aimed at the *general* feasibility tools as a group | firm distinction, general models +5 |

### Deliberately pushed down

| Code | What it means | Proposed English |
| --- | --- | --- |
| `penalty:modeling_declined` (−50) | The adviser said revenue modelling is not the answer here, so every revenue model was ruled out | you ruled out revenue modelling — held back |
| `penalty:reports_already_in_use` (−4) | The client already gets regular management reports, so reporting templates add little | client already gets regular reports — held back |
| `advisor:confidence_mismatch` (−1) | The adviser reported low confidence and this template needs experience | needs more experience than reported — held back |

### The adviser's own confidence

| Code | What it means | Proposed English |
| --- | --- | --- |
| `advisor:confidence_match` (+1) | Suits an adviser newer to this area | suits an adviser newer to this area |
| `advisor:confidence_boost` (+1) | The adviser reported high confidence in an area that rewards it | you reported strong confidence here |

---

## C. Three questions inside the wording

**1. Do the point values belong on screen?** Some proposed phrases carry a number
("+3", "4.2"), some do not, following what the six live phrases already do. The
argument for showing them: a firm manager asking "why did *that* one win?" can see the
size of each lever. The argument against: it invites "why is a name match worth 8 and a
distinction worth 5?", which is a real conversation but not one the panel can hold.

**2. Should "held back" stay the word for a penalty?** It is already live on the two
history codes and reads well. The proposals above extend it to five more.

**3. First person or not?** The panel's heading already says "Area **I** focused on",
so the engine speaks as "I". Two proposals above say "**you** ruled out revenue
modelling" and "**you** reported strong confidence" — the adviser's own input handed
back to them. Consistent with the panel's voice, but worth a look.

---

## D. What happens after approval

Once the wording is settled, it is built **once**: one shared piece of code that both
screens call, with the words in `locales/en.json` so all 8 languages get them. Two
copies of this mapping would drift apart — which is exactly how the firm manager's view
ended up with no plain English at all while the adviser's had six phrases.

An unrecognised code will still pass through as-is rather than disappearing, which is
what the adviser's panel does today. A code the engine adds later shows up ugly, not
missing — the same reasoning behind the icon-font guard.
