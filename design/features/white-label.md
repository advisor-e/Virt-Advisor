# White-Label & Firm Brand — the Brief

**In anything a client sees, the brand is the advisor's firm — never Advisor-e.** A client is
the advisor firm's client. The plan they keep, the concept drawings inside it and the reports
they are shown all carry that firm's name, colour and logo, and nothing on the page says who
built the software.

Page **16**. Jobs on white-labelling are `16.1`, `16.2`, and so on.

---

## 1. The brand is Advisor-e's data, and this app builds no screen for it

A firm's name, logo and colour live on the firm profile page in the **Advisor-e master app**,
which already holds them and already uses them. This app **reads** them and never offers a
place to set them. A screen here would be a second home for one fact, and the two would drift.

| | |
|---|---|
| Resolver | `firmBrand(firmId)` — [`../../server/utils/firmsDirectory.js`](../../server/utils/firmsDirectory.js) |
| Route | `GET /api/report/firm/brand`, firm-authenticated — [`../../server/routes/firmBrand.js`](../../server/routes/firmBrand.js) |
| Integration seam | `Q-FIRM-BRAND` — [`../../config/integration.js`](../../config/integration.js) |

**`req.firmId` comes from the verified token, never from the query string.** A firm may only
ever read its own brand.

**The query is `SELECT id, name` always**, and adds the logo and colour columns only once the
master team names them through the seam. A firm's real **name** therefore resolves today, and
the image and colour arrive later with no further work on this side.

## 2. A brand never fails a document

Every failure answers **200 with nulls**. A brand is decoration on a page whose figures are what
matter, and a thrown error would take a client's whole plan down over a logo.

- `name` null → the renderer prints the placeholder.
- `logo` / `colour` null → the initials disc and the platform border colour.
- `isDefault: true` distinguishes *"this firm has no logo on file"* from *"we could not look"*.

🔴 **A caller must read a null logo as "fall back to the initials disc", never as "this firm has
no brand."** The two are different states and only one of them is the firm's own doing.

## 3. The mark and the frame on a client's document

**The firm's real logo, in a fixed-height box. The initials disc is a fallback, not a style
choice.** The document's border returns in the firm's colour.

- [`../../components/strategy/StrategyPlanFrame.vue`](../../components/strategy/StrategyPlanFrame.vue)
  — five bars: top, left, right, and a foot that is either whole or broken in two with the
  logo's box between them.
- [`../../components/strategy/StrategyPlanMark.vue`](../../components/strategy/StrategyPlanMark.vue)
  — the mark itself.

🔴 **THE VALUES ARE PORTED FROM [`../mockups/strategy-plan-firm-mark.html`](../mockups/strategy-plan-firm-mark.html),
CHARACTER FOR CHARACTER. They are never recomputed from the source PDF.** The rule is written at
the top of both components. See the History for what re-deriving them costs.

🔴 **A CSS border cannot do this job.** It cannot be inset from the sheet, so there is no relief
outside it; it cannot break for the logo; and nothing can stand on it.

**On a screen**, the inset and thickness come from the **width** on all four sides, and every x
position is the drawing's, untouched. **On a printed sheet** the drawing's own height-based
values stand, because a sheet has a fixed shape.

## 4. The 33 concept drawings — and every caller that reaches one

Every concept drawing takes `firmName`, `firmColour` and `firmLogo`
([`../../components/strategy/StrategyConceptGraphic.vue`](../../components/strategy/StrategyConceptGraphic.vue)).
**A caller that renders one without passing them prints the literal words "Firm logo" against a
disc with no initial in it** — the drawing is correct and the page above it is not.

🔴 **THE WHOLE CHAIN MUST CARRY THE THREE VALUES, INCLUDING COMPONENTS THAT DO NOT USE THEM.**
`StrategyCaptureCard` draws nothing itself; it teaches through `StrategyTeachingSlide`, and until
2026-09-23 it declared none of the three, so the values stopped there even where a caller passed
them.

Four call sites reach a drawing, and all four pass all three:

| Screen | Call site |
|---|---|
| Run session — framework cards | `strategy-capture-card` → `StrategyTeachingSlide` |
| Run session — concept cards | `strategy-concept-capture` |
| Objectives & actions | `strategy-capture-card` |
| Produce plan | `strategy-plan-document` |

Pinned by [`../../tests/unit/strategySessionBrand.test.js`](../../tests/unit/strategySessionBrand.test.js).
⚠ **This is the one case UAT cannot judge**: `firmBrand()` returns nulls until the master team
names the columns, so a correctly wired screen and an unwired one show the identical placeholder.
A tester cannot tell them apart, which is why the wiring is asserted rather than eyeballed.

## 5. Colour

The brand palette is [`../BRAND-TOKENS.md`](../BRAND-TOKENS.md). **Blue `#0070C0` is the primary
interactive colour** — buttons, sliders, links on light.

**Buefy's primary is the brand Blue, not its own violet** (item 16.1, 2026-09-25). The app loads
`assets/css/buefy-brand.css` — Buefy's own stylesheet compiled from its sources with
`$primary: #0070c0` (`assets/css/buefy-brand.scss`, `npm run brand-css`) — so every `is-primary` button,
tick, switch, focus ring and active tab is Blue, with the tints Bulma derives from it. Never edit
the `.css` by hand. `is-info` is Bulma's separate, lighter blue and was not changed.

---

[The History — why these rules exist](white-label-history.md)
