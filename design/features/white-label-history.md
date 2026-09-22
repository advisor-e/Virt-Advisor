# White-Label & Firm Brand — the History

Nothing here is a current instruction. If this and the Brief disagree, the Brief wins.

---

## Why this page exists at all

**It was the only subject with live tasks and no Handbook page.** When page numbers were adopted
on 2026-09-23 — Mike's ruling that a task's number is its Handbook page — white-labelling held
number **16** and three live tasks (`16`, `16.1`, `16.2`) against no page. Under that ruling a
subject with tasks and no page cannot stand, so the page was written.

Its content was not invented for it. It was gathered from
[`strategy-planner.md`](strategy-planner.md), [`../ARTEFACTS.md`](../ARTEFACTS.md),
[`../mockups/strategy-plan-firm-mark.html`](../mockups/strategy-plan-firm-mark.html) and the
three items' own notes — which is the point the ruling makes: the material existed and had
nowhere to be read.

## 2026-09-18 — the rule, in Mike's words

> *"in client dealings, Advisor-e ALWAYS clones and shows that ADVISORS firm logo — never
> advisor-e."*

## 2026-09-20 — the cost was paid before the benefit arrived

The 33 concept drawings were redrawn so a client sees their own advisor's firm rather than
Advisor-e, and the source deck images were deleted on 2026-09-18 on the strength of it. Nothing
in this app then held a firm's name, logo or colour, so **every document printed the words "Firm
logo" against an empty disc.** The drawings took `firmName` and `firmColour`; the pages above
them passed neither.

This was found while wiring the first four drawings, filed as item `16` on Mike's yes, and is
recorded here because it is the ordinary shape of the failure: the half that costs work was
done, and the half that delivers it was not commissioned.

## 2026-09-22 — no screen, and that is a ruling

An earlier note on item 16 said a place to hold the brand was ours to build either way. **That
was wrong and was replaced.** Mike:

> *"Advisor-e already picks up the colour and brands the border to suit."*

The values live on the firm profile page in the master app. Our side is a stub connection to it,
exactly as his 2026-08-15 ruling describes. What remains on item 16 is the master team's: the
two column names, asked as question 8 of the integration email.

## 2026-09-22 — seven frames were built and rejected in one session

**Every one of them was re-derived from `Advance.6.Organisational Review.pdf` instead of ported
from the drawing Mike had already approved.** Each rebuild lost something different — the
relief, then the break, then the logo's place on the bar, then the proportions.

**Six of the seven used a CSS border.** A border cannot be inset from the sheet, cannot break for
the logo, and cannot be stood on. The frame is five bars.

The rule now sits at the top of both components and in the Brief: **port the values, never
recompute them.** It is the reason that instruction is shouted rather than stated.

### The screen ruling, the same day

> *"i dont care about the page size until it comes to printing. so long as the border is same
> distance from outer edge, has the logo in bottom left as agreed."*

So a screen takes its inset and thickness from the width on all four sides; a printed sheet keeps
the drawing's height-based values, because a sheet has a fixed shape.

## 2026-09-21 — the violet that nobody chose

`BRAND-TOKENS.md` names Blue `#0070C0` as the primary interactive colour. Buefy ships `#7957D5`
and `nuxt.config.js` loads `buefy.css` unmodified, so every `type="is-primary"` button renders
violet.

Measured on the Run session screen: the header button was violet while the stage rail and the Org
Chart toolbar were brand blue, because those two were written against the brand file and the
buttons were not. **The sharpest instance is `SalesBlog.vue`**, where two adjacent main actions
carry `is-primary` and `is-info` — so *Write the outline* is violet and *Write the article* is
blue, a distinction that does not exist.

It was found by opening the page. **The tests pass on it**, and would on any colour.

This is item `16.1`. It is one line of override and 84 files' worth of consequence, which is why
it is not folded into other work: Mike sees the whole app recoloured before it ships. Two things
are already brand blue deliberately and are not to be changed back — the stage rail's current
segment, and the Org Chart Builder toolbar, which follows its approved drawing.

---

## Where the source documents have gone stale

- **Item 16's first note** claimed a place to hold the brand was ours to build. Superseded by
  Mike's 2026-09-22 ruling above; the item was corrected the same day.
- **`ACTIONS.md`** is a frozen archive as of 2026-08-24. Anything it says about firm branding is
  a claim to check against the code, never a status.
