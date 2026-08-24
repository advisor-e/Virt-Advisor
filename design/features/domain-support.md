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
empty cell is honest; a plausible one is a fabrication under the firm's name.

**P3 · An authored override is untrusted input and is fenced before it reaches a prompt.**
Platform data in the project is trusted; anything authored by a level above or below is not.

**P3a · The diagnostic entry reaches the AI and is editable — both, or neither.** Each area's
entry question and its situation guidance (*"if it's this kind of problem, do this"*) go into
**all three** prompt paths, and the same content is edited on the Domain Support tab. **The screen
shows the block under exactly the condition the engine reads it**, so an edit can never reach
nothing. Ruled by Mike, 2026-08-16; artefact
[`../DOMAIN-DIAGNOSTIC-BRANCHES.md`](../DOMAIN-DIAGNOSTIC-BRANCHES.md).

**P3b · An inherited situation's NAME is read-only, and it cannot be removed.** The name is the
key its guidance is filed under, so renaming would repoint inherited content; and because
overrides merge per field (P4), a removed inherited row simply returns on the next load. The
screen therefore does not offer either — **never offer a control that does not work.** A level's
OWN situations can be renamed and removed freely. Removing an inherited one needs a different
store, not a button, and is an open decision.

**P3c · A method guide surfaces on this tab, from the framework row it belongs to.** The deep method
guides are the full version of a framework this tab already lists, so such a guide opens from that
row rather than living on a page of its own — *"how do I run this session"* is this tab's question.
**They get the same tiers as the materials table around them:** the mentor authors, and global
group, group and firm managers each inherit and may reword their own copy. ⚠ **That is the opposite
of P3a's block**, which was ruled mentor-only because it is routing logic — the ruling was *asked*
rather than carried across, and asking changed the answer. Ruled by Mike, 2026-08-17; artefact
[`../METHOD-GUIDES-SCREEN.md`](../METHOD-GUIDES-SCREEN.md).

**P3d · THREE guides belong to no domain and are pages in their own right, listed above the
domains under *Applies to every domain*.** In this order, which is the order on screen:

| | Page | Why it belongs to no single domain |
|---|---|---|
| 1 | **Facilitation 101** | The universal 3-stage protocol for introducing *any* concept to a client. Ruled 2026-08-17. |
| 2 | **The 3 Engagement Types** | Whether the work is Education, Facilitation or Advice — the relationship, not the subject. Ruled 2026-08-23. |
| 3 | **Learning Psychology** | The psychology both of the above rest on: how a person reacts to learning, and what turns a decision into a habit. Ruled and named 2026-08-23. |

🔴 **"Under" means listed beneath, NOT opened from.** Mike ruled this three times on 2026-08-23,
after a build that read it the other way: each of the three is **its own page**, reached from the
list. None is a tab, a section or a panel inside another. A future change that nests one inside
another is a regression, and `tests/unit/methodGuides.test.js` fails on the order.

⚠ **P3c's "from the framework row it belongs to" therefore describes twelve of the fifteen, not
all of them.** A guide with no row renders as a standing page instead; the screen reads the
`standing` flag from the data rather than naming any guide, so a fourth would need no code change
here.

**P3e · What each of the three sends to the AI, which is not the same for all three.**

- **Facilitation 101** — reaches the prompt through its own learn tree, as every row-attached guide does.
- **The 3 Engagement Types** — reaches the CLIENT-mode situation brief, replacing a hardcoded
  three-line paraphrase that had stood in for the authored fields (item 4.16 D). Only the type the
  engine selected is sent, not all three.
- **Learning Psychology** — reaches the prompt **only** alongside Facilitation 101's learn
  reference. It is ~6,000 characters; attaching it to every learn tree would spend that on guides it
  has nothing to do with, and attaching it to every client recommendation would spend it on every
  answer the product gives. ✅ **Ruled by Mike 2026-08-25 (item 4.38): leave it there.** The learn
  path is where how a person reacts to learning actually bears on how advice is delivered. Changing
  the reach is a decision to put to him, not a tune.

✅ **The five drivers are defined once, and code enforces it.** Learning Psychology holds the source
definitions, transcribed from the master app's own template. The *"5 Drivers of Human Output —
Performance Diagnosis"* row in
[`../../data/staff-domain-support.json`](../../data/staff-domain-support.json) used to paraphrase
them in its own words; it now declares `definitions_from` and `domainSupport.formatDefinitionsFrom`
renders the block from the guide at prompt-build time. **Any material may name a guide block this
way** — it is the general mechanism, not a one-off, and it lives in `formatMaterialLines`, the one
point every material passes through. Ruled by Mike 2026-08-25 (item 4.37). A test pins every
definition the AI receives to the source character for character, so editing either file alone goes
red. ⚠ It reads the **platform base**: a firm override of a guide does not flow through here yet.

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
5. 🔴 **There are THREE prompt formatters in this file and they had drifted apart.** Two emitted
   the entry question and stopped; the **advisor path — the one an adviser's own session reads —
   emitted neither the question nor the 65 situation branches.** So the largest loss was on the
   path that mattered most, and no test noticed, because every test asked whether a field was
   *saved* and none asked whether it was *used*. Fixed 2026-08-16 by one shared formatter called
   from all three. **When adding a field here, change the shared formatter, never one caller.**
6. 🔴 **A formatter that lists the fields it emits BY HAND goes quiet on every field authored
   afterwards.** Trap 5 above is one instance; the thirteen method guides are the same fault at
   scale. Each has a hand-written formatter naming its fields one by one, and **116 of the 954
   authored lines across them reach no prompt** — 62 in Dashboard Discussions, 29 in Working
   Capital Cycle, 20 in Ratio Analysis, including the discussion questions authored against every
   dashboard metric. Nothing failed, because a formatter cannot notice a field it was never told
   about. **The test is not "does the file reach the AI" but "does every line in it".** Render the
   prompt and search it for each authored string; measured at
   [`../METHOD-GUIDES-SCREEN.md`](../METHOD-GUIDES-SCREEN.md) §2.
7. 🔴 **"It duplicates the logic table" is a claim to test, not to accept.** A committed spec said
   ~55 of the 65 branches duplicated tree routing and proposed deleting them. Tested text by text,
   the claim failed: the tree says *which* conversation this is, the branch says *what to do* once
   you are in it, and their words overlap only because they share a subject. **The comparison had
   been made on node NAMES.** One genuine duplicate existed in the whole sweep. Evidence:
   [`../DOMAIN-DIAGNOSTIC-BRANCHES.md`](../DOMAIN-DIAGNOSTIC-BRANCHES.md) §1.

---

## 5. Related briefs

[`advisory-engine.md`](advisory-engine.md) — where this material is injected ·
[`logic-tables.md`](logic-tables.md) — the other content driver ·
[`firm-manager-hub.md`](firm-manager-hub.md) — where it is edited ·
[`tier-cascade.md`](tier-cascade.md) — how edits inherit.

**History:** [`domain-support-history.md`](domain-support-history.md)
