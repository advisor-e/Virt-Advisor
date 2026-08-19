# Session Notes — 2026-08-19 · Laptop, Session 73

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, pushed. Suite **5,872 green / 325
> suites**, audit gate PASS.
>
> ✅ **Item 4.23 built and closed** — the hub sidebar and the duplicate cases tab.
> ✅ **Coaching Reference finally has a Brief** — and then Mike challenged whether the page should
> exist at all. **He was right. See §3.**

---

## 🔴 FIRST TASK NEXT SESSION

**Item 4.24 — fold the Coaching Reference into Logic Tables.** Mike's Option D, chosen 2026-08-19
on the evidence in [`COACHING-REFERENCE-EVIDENCE.md`](COACHING-REFERENCE-EVIDENCE.md).

🔴 **THE FIRST STEP IS READING, NOT DELETING.** Eight of the fifteen rows name a live template.
Each gets read against the logic tree covering the same ground so anything genuinely unique
**moves** rather than vanishes. Only then does the block come out.

⚠ **Still carried, now a fourth time: Mike has not sat down with the Property Tax Rules tab.** He
saw enough of it this session to find a live defect in it, which is not the same as reviewing it.

---

## What shipped

### 1. The hub sidebar — item 4.23, phases 1 and 2 (`85097e9`, `86692e5`)

The horizontal tab band is a grouped Buefy `b-menu` sidebar at all four tiers. Firm 3 headings /
11 items, mentor 3 / 12, group and global 4 / 13 — the design's own counts, asserted **off the
rendered screen** rather than off `TAB_TIERS`.

**No tab body moved.** Every panel sits where its `b-tab-item` stood; only one is ever shown, so
the order a manager reads comes from `NAV_GROUPS` alone. Seventeen single-line swaps instead of an
1,800-line reindent — and it is why `activeTab` is a key rather than an index.

**The duplicate is gone.** `teamCaseStudies` is `['firm']`. Not a breach of "every report rolls
up": those cases still reach every tier above the firm through Case Reviews. One door closed, not
the room.

**Every difference from the approved mockup is named** at
[`HUB-NAVIGATION-GROUPING.md`](HUB-NAVIGATION-GROUPING.md) §8 — including **"Show menu"**, the one
label never put to Mike, because the mockup only ever draws the menu open.

### 2. 🔴 Two faults found by Mike opening the screen — neither catchable by any test

- **Quizzes had no *Hide list* control.** Domain Support and Logic Tables did. The design file
  claimed **four** tabs had it; only two ever did. Now three, each with its own storage key, and a
  test that fails if they are ever shared. Advisory Distinctions deliberately gets none —
  *"the others don't need it due to layout"*.
- **The interest-deductibility phasing boxes showed no number.** Five inputs share a slot sized
  180px for one, leaving ~31px each — narrower than the spinner inside them. It held and saved the
  right value the whole time. **Not caused by the sidebar** (that column is a fixed width); it had
  been so since the tab shipped on 2026-08-17.

🔴 **Jest does not lay a page out.** Nothing in 5,872 tests could have seen either.

### 3. 🔴 The Coaching Reference — a Brief, and then the question the Brief could not answer

The Brief was written because Mike asked why **Facilitation 101** sits under Domain Support. The
answer held. Then he read the Brief and challenged the page itself:

> *"if it truly aids the AI in guidance then it would need one for every tool in the app — close to
> 300. I think this has developed out of miscommunication — find me the notes to prove it's
> essential."*

**The notes do not exist.** What does:

- The fifteen rows are a PowerPoint — *Quickfire Advisory Directory* — converted to JSON in the
  **first commit of the repository**, 2026-03-30. Edited once since, to add ids.
- **7 of the 15 name no template in the 291-template catalogue.** One is about Covid.
- The same deck now exists as **logic tree 0, `quickfire`**, with branching and an explicit
  title/tags/purpose matching rule.
- Mike had already ruled the boundary: *"the if-then-else logic of which template to use in which
  scenario vs another template is provided by the logic tables."*
- Every note about the page is about plumbing. **None asks what the coverage rule is.**

**Measured, not asserted.** Two identical backends, one variable, six questions in discover mode.
🔴 **And a control — the same six questions run twice against the live engine, changing nothing** —
because a with/without difference is meaningless until you know how much the engine differs from
itself.

| Run | What changed | Template differences |
|---|---|---|
| Test 1 | the 15 rows removed | **9** |
| Test 2 | the 15 rows removed | **12** |
| Control 1 | nothing | **11** |
| Control 2 | nothing | **7** |

**Removing 3,200 tokens of guidance changes the recommendations no more than asking the same
question twice does.** ⚠ Not proof of no effect — six questions, one mode, four runs, and it
measures which templates are named, not tone. What it establishes is that **the first attempt to
detect an effect could not find one.**

✅ **Mike chose Option D**: fold what is worth keeping into Logic Tables. Filed as **4.24**.

---

## The rules earned, and where they live

**Not in this note.** A rule left in a session note is a rule nobody finds.

- [`HUB-NAVIGATION-GROUPING.md`](HUB-NAVIGATION-GROUPING.md) §8 — every difference from the
  artefact, and the §3 correction that four rails were really two.
- [`features/firm-manager-hub.md`](features/firm-manager-hub.md) — the duplicate fixed with its
  reason, the counts as built, and **which tabs can hide their own list — two, not four**.
- [`features/coaching-reference.md`](features/coaching-reference.md) — the Brief, headed with a
  warning that it describes the mechanism and **does not justify the purpose**.
- [`COACHING-REFERENCE-EVIDENCE.md`](COACHING-REFERENCE-EVIDENCE.md) — the origin, the arithmetic,
  the measurement, the control, and Mike's decision.
- [`features/to-do.md`](features/to-do.md) — **4.23 closed, 4.24 filed.** Eleven live items.

---

## 🔴 The pattern of this session, worth naming

**Four faults surfaced. Not one was found by a test.**

| Found by | What |
|---|---|
| Mike, on the running screen | the missing *Hide list*; the unreadable phasing boxes |
| Mike, reading a document | that the Coaching Reference has no justification |
| A test, once the tab bar went | that `nav.tabs li` matched **nothing** and an order assertion had been passing on two empty arrays |

Three of the four needed a person to look. The fourth is the warning: **a selector that matches
nothing is indistinguishable from agreement**, and it had been green.
