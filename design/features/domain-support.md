# Domain Support — the Brief

> **Read this before adding or editing the material the AI draws on.** Current rules only. The
> history is in [`domain-support-history.md`](domain-support-history.md).
>
> **Covers:** the per-area reference material that briefs the AI — what it is for, what it must
> never do, and how a firm adds its own. **Does not cover:** what selects a template
> ([`advisory-engine.md`](advisory-engine.md), [`logic-tables.md`](logic-tables.md)).

---

## 1. Design philosophy

**This is the firm's advisory knowledge, in the AI's hands at the moment it writes.**

One file per advisory area, holding the frameworks an advisor would actually use — what each one
is, who it is for and when, and the steps to run it. When the engine has decided what to
recommend, this material is what lets the AI explain **how to approach it** in the firm's own
language rather than in generic business-school prose.

**It briefs. It does not select.** That line is the single most important thing on this page and
the most commonly misunderstood. Nothing in these files influences which templates a client is
recommended — selection is the resolver, the logic tables and the distinctions, and none of them
read this material. Changing it changes the *wording and depth* of what the AI says, never *what
it picks*.

**It is also the most editable thing in the product.** A firm adding its own frameworks here is
the promise the platform is sold on: pour your own knowledge in, and it reaches your advisors
automatically, without a developer.

**Which is why a blank is better than a guess.** Where a source document carries no method,
those cells were left empty for the owner to fill rather than written by anyone else. Filling
them from general knowledge would put invented material in front of advisors under the firm's
name.

---

## 2. Key principles — the non-negotiables

**P1 · Domain support briefs the AI and selects nothing.** No template selection reads these
files. A lane is not a quality mark — this material is doing its job by not selecting.

**P2 · Never invent the firm's material.** If a source has no method, the field stays empty. An
empty cell is honest; a plausible one is a fabrication under the firm's name. **Commentary we
author *about* a step the source does give is permitted — and only when it is marked as ours.**
Unmarked, it is indistinguishable from the firm's own thinking, which is the whole fault. Ruled
2026-08-14; see [`domain-support-provenance.md`](domain-support-provenance.md), which also lists
the nine found in Strategy.

**P3 · An authored override is untrusted input and is fenced before it reaches a prompt.**
Platform data in the project is trusted; anything authored by a level above or below is not.

**P4 · Overrides are sparse and merge per field.** A level stores only what it changed, and the
rest keeps tracking the platform. **Arrays are the exception — they replace wholesale**, so
overriding a list means every item in it is now firm-authored, all or nothing.

**P5 · One firm's edits can never reach another.** Only the platform base is cached; merged
copies are built fresh per call and never cached.

**P6 · Section placement cascades with the content.** Where an item sits on screen inherits the
same way the item does.

**P7 · The material is briefing, not a script.** The AI is not to quote it as though it were
something the advisor was handed — invented quotations are a known failure and there is a watch
for them.

---

## 3. Design considerations

**Every row wants four things:** what the framework is, who it is for and when, the steps to run
it, and where it came from. Most rows have all four. The ones that do not are known and listed —
they are not an oversight.

**The gaps are concentrated, not scattered.** Sixteen rows are missing their steps and **all
sixteen are in one area**, because that area's source is a bare index with a summary and a
benefit per framework and no method at all. No other area has a single blank.

**Two rows have no source behind them** and are live engine content today. They were carried
across rather than quietly deleted, and whether they belong is an open question for the owner —
not something to resolve by deleting.

**Where a row came from is not recorded in the data.** There is no field for provenance, which
means any claim about a row's source has to be checked against the source document rather than
looked up. That is a real limitation and it is why one claim about unsourced rows elsewhere
remains unconfirmed rather than repeated as fact.

**Adding an area is a whole job, not one file.** A new advisory area spans its registration, a
set of companion files, and a few places in the code that carry hardcoded lists. There is a
recipe.

---

## 4. For the coder

### Where things live

| Piece | Path |
|---|---|
| The material | `data/*-domain-support.json` — one file per area |
| Loader, merge, formatting | `server/utils/domainSupport.js` |
| Area definitions | `data/domains.json` |
| Level merge | `server/utils/firmContent.js`, `deepMerge.js` |
| Prompt fencing | `server/utils/promptSafety.js` |
| Invented-quotation watch | `server/utils/fabricationWatch.js` |
| Firm-facing screen | `components/firm/FirmDomainSupport.vue` |
| Lane classification | `server/utils/contentRouting.js` |

### How a firm's edit is handled

Every reader takes an optional override map and blends the firm's sparse override over the
platform base **at the point of use**. The cache holds the platform base only. Whether a given
field came from the firm is tracked, because that decides whether it must be fenced before
reaching a prompt.

### The numbers, as measured

29 areas, 181 material rows, **165 of them complete on all four fields**. 16 rows missing steps,
all in one area. 2 rows with no source document. Domain support is classified as **AI-briefing**
across the board — 29 assets, none of them selecting a template.

### Traps that have actually bitten

1. 🔴 **A fabricated detail was found living in this data, presented as the firm's own
   material.** One confirmed instance, corrected. ⚠ **The blast radius has never been
   measured** — no sweep has checked the other rows for the same class of invention. That is the
   open task, and it is a verification pass, not a fix.
2. **The confirmed instance was reported as the app's top open defect three days after it had
   been fixed.** Check the data before repeating a backlog entry.
3. **Overriding an array is all-or-nothing.** A level that edits one item in a list now owns the
   whole list and stops receiving improvements to any of it.
4. **Adding an area touches more than its file** — several code paths carry hardcoded lists, and
   a write once landed in the gap between two of them. There is now a test so that gap cannot
   silently reopen.

---

## 5. Related briefs

[`advisory-engine.md`](advisory-engine.md) — where this material is injected ·
[`logic-tables.md`](logic-tables.md) — the other content driver ·
[`firm-manager-hub.md`](firm-manager-hub.md) — where it is edited ·
[`tier-cascade.md`](tier-cascade.md) — how edits inherit.

**History:** [`domain-support-history.md`](domain-support-history.md)
