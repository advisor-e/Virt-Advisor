# Coaching Reference — the History

> **Read [`coaching-reference.md`](coaching-reference.md) first.** That page is the rules. If the
> two disagree, **the Brief wins**.

---

## 1. It ran for months with no Brief, and the name drifted from the content

**It was the only content page in the hub with none.** Every other tab had someone write down what
it was for; this one never did, and the consequence is legible in its own title.

Its own code has always been clear. [`../../server/utils/coaching.js`](../../server/utils/coaching.js):
*"the template-selection guidance injected into the Phase 3 prompt"* … *"it is the menu the AI picks
a template FROM"*. Its screen lede is clear too: *"The guidance the AI works to when it decides
which template to put in front of a client."* **The only thing that says "coaching" is the tab.**

**How the gap surfaced.** Only a placement question exposed it:
[`../HUB-PAGE-PURPOSES.md`](../HUB-PAGE-PURPOSES.md) could say what the page is **not** (*"Not
coaching, despite the name"*), and when Mike asked why **Facilitation 101** sits under Domain
Support rather than here, the answer was sound — but it was the name that had invited the
question. §5 of the Brief now carries the boundary as a table.

**The lesson worth keeping: a missing Brief does not announce itself.** Nothing failed for months.
The page worked, its code was well documented, and the drift only showed when somebody tried to
answer a *placement* question and had nothing to answer it from.

---

## 2. It was the last block into the cascade, and the hole was invisible

Ruled 2026-07-30: five content blocks join one firm-editable mechanism. This was the **fifth and
last**, built 2026-08-15 as item **4.9**.

Until then the fifteen rows in `data/coaching-reference.json` reached the model **exactly as
shipped, for every firm on the platform**. The mentor could not edit them. A group could not. A
firm could only ever *add* to them, through promotion. The cascade had a hole in it and nothing
said so, because a block nobody can edit looks identical to a block nobody has edited.

It was modelled deliberately on `staircaseConfig.loadBlendedStaircase` — the same recursion up the
tier chain, the same "a scope that has decided nothing gets the layer above untouched", the same
refusal to let a storage fault stop a session. **Copying the proven shape was the point**; a second
way of doing inheritance is how two mechanisms drift apart.

---

## 3. 🔴 Two authored fields reached no prompt at all — and this is why 4.16 exists

Closing 4.9 found that **`howItHelps` and `deliveryNotes` were authored, stored, firm-editable and
sent to the AI nowhere.** A firm manager could open the tab, read the field, edit it, save it, watch
it appear on screen with a "firm-override" badge — and the model never saw a word of it.

**The mechanism is the trap.** `formatEntry` names the fields it emits, one by one. A field added to
the data and not to that function is silently skipped. Nothing throws, nothing logs, no test fails,
and the screen shows the edit exactly as if it had worked.

**That finding became item 4.16** — *check every block's authored fields actually reach the prompt*
— and the sweep it triggered found **102 pieces of authored advisory content reaching no prompt at
all** across the whole app. This page's two fields were the first two.

It is also part of why **AI fixes now surface on a hub page** (ruled 2026-08-16): wiring content
into the prompt without a screen leaves it live and untouchable, and a screen without the wiring
leaves it visible and inert. These two fields were the second kind.

---

## 4. Why the promoted entries were separated, and then capped

**The separation, 2026-08-03.** An earlier promote flow appended to the platform file itself. That
made **one firm's client observations visible in every other firm's prompts** — and the unlocked
file write had no history and no concurrency safety. Promoted entries moved to a per-firm overlay
under their own key, fenced as untrusted text, and the platform base became read-only at runtime.

**The cap, measured the same day.** Promotion is unbounded by design — nothing expires. Left whole,
a firm promoting one case a week adds **~18,400 tokens to every eligible prompt within a year**, and
the newest lesson competes with forty-nine older ones for the model's attention. Hence: this
session's topic, newest first, **eight at most**.

🔴 **And the platform base was deliberately exempted from both**, which is the more interesting half.
Capping it would have been the consistent-looking choice. It was rejected because hiding part of a
menu by topic could suppress a template that should have been weighed — *a correctness risk taken
against a cost problem that does not exist*, since only a developer can add to the base.

**The cap logs when it bites.** A silent trim would mean a firm's older lessons quietly stop
reaching the AI, with the screen still showing them all.

---

## 5. Related

[`advisory-engine-history.md`](advisory-engine-history.md) · [`tier-cascade.md`](tier-cascade.md) ·
[`case-reviews-history.md`](case-reviews-history.md) ·
[`../METHOD-GUIDES-SCREEN.md`](../METHOD-GUIDES-SCREEN.md) — where Facilitation 101 went, and why.

**The Brief:** [`coaching-reference.md`](coaching-reference.md)
