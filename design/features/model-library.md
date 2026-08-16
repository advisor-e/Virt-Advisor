# The Model Library — the Brief

> **Read this before changing the reports landing page.** Current rules only. The history is in
> [`model-library-history.md`](model-library-history.md).
>
> **Covers:** the screen an advisor lands on to choose a model, and the catalogue behind it.
> **Does not cover:** the model screens themselves ([`report-models.md`](report-models.md)).

---

## 1. Design philosophy

**An advisor picking from eighteen models needs to know what kind of thing they are opening
before they open it.**

This screen is a shopfront, not a menu. Its job is to let someone find the right model quickly —
by searching, by area of business, and above all by **what class of tool it is**: a teaching aid
with illustrative figures, a decision tool the client's real numbers go into, or a report built
from their accounts. Those are very different things to take into a client meeting, and the
difference has to be visible from the outside.

**It is also where the firm's currency is set**, because money formatting is an account-wide
decision and this is the one page every report user passes through.

**And it is honest about what is not ready.** A model that is coming shows as coming. An advisor
should never click into an empty screen and have to work out whether it is broken.

---

## 2. Key principles — the non-negotiables

**P1 · The catalogue is the single source for what exists.** What is ready, what is coming, what
class each model is, and which route it lives at — all in one file, which the guard tests read.
Nothing else should hold a second list of models.

**P2 · The class shown here must match the class used everywhere else.** It decides the
"Illustrative" badge and the privacy boundary. A model shown as a teaching aid here and badged as
a real report inside is a contradiction the advisor sees in front of a client.

**P3 · Currency is read by anyone signed in, and written by managers only.** Reports are used by
ordinary advisors, so a read must never require a manager role — and must never break a report: a
failure degrades to the default rather than failing the page.

**P4 · The supported currency list has one source**, shared between the backend and the picker,
so the two cannot drift.

**P5 · Every string goes through the wording files.** This screen does it properly and is the
model to copy — the report screens themselves do not, and that is a logged breach.

**P6 · A model that is not ready says so, and cannot be opened.**

---

## 3. Design considerations

**Two filters, and they answer different questions.** The class filter answers *what kind of tool
is this*; the category chips answer *what area of the business is it about*. Both are needed —
collapsing them into one list makes the class invisible, which is the thing that matters most.

**Search must be forgiving.** An advisor knows the concept, not the exact product name.

**The count is announced, not just displayed**, so the screen works for someone using assistive
technology.

**Currency is presented differently by role.** A manager gets a picker; everyone else sees the
setting with a note explaining it is managed for the account. Same information, no dead control.

**This screen sits outside the report visual standard on purpose.** The report standard governs
the model screens; the library is a landing page. Its own dark-mode block is a separate question
that was flagged for a decision rather than swept into the reports migration.

---

## 4. For the coder

### Where things live

| Piece | Path |
|---|---|
| The screen | `components/ModelLibrary.vue` |
| The page | `pages/model-library.vue` |
| The catalogue | `utils/reportModelCatalogue.js` |
| Currency routes | `server/routes/currency.js` |
| Supported currencies | `data/currencies.json` |
| Money formatting | `mixins/currencyMixin.js` |

### What a catalogue row carries

A name, the business area it belongs to, a one-line summary, its readiness, its class, and — when
ready — the route it lives at. The frame guard for the model screens reads the *ready routes*
from this file, so a new model is covered automatically the moment its row flips to ready.

### Traps that have actually bitten

1. **Getting the class wrong is not a style slip.** Stamping "Illustrative" on a report built
   from a client's real accounts tells an advisor, in front of their client, that real figures are
   dummy data.
2. **A second list of models would drift.** The catalogue is read by the guards; anything holding
   its own copy will disagree with them silently.
3. **A currency read must never break a report.** Degrade to the default; do not throw.

---

## 5. Related briefs

[`report-models.md`](report-models.md) — the screens this page opens ·
[`localisation-and-currency.md`](localisation-and-currency.md) — the money and language
machinery.

**History:** [`model-library-history.md`](model-library-history.md)
