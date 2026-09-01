# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. This replaces the 85 `SESSION-*.md` files written before 2026-08-24; those stay
> as history and none is written now. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-01 · Laptop · branch `feat/advisor-progress`

Suite **6,647 green** (355 suites). Started 8 ahead / 0 behind `master`, ended **12 ahead / 0
behind**, pushed. Nothing uncommitted. No code was touched all session — `design/` only.

### 🖥 DESKTOP — two things, and the second one affects your screens

**1. Your 4.56 is now 4.57.** Both machines filed a new item as 4.56 today, seven minutes apart,
on branches neither of which had reached `master`. Meeting Review went in at 11:31 (`0f53b8f`),
your CPD-and-replaced-library ruling at 11:38 (`d78941c`). First filing keeps the number, so yours
moved. **Your branch still calls it 4.56** — take 4.57 when you next merge `master`; the item's own
`comment` field explains the renumber. Its text is yours, copied byte for byte, not re-typed. Your
rewritten **4.55 was adopted here verbatim** too, so both lists now match. **4.54 is closed here**
and still open on yours — that one is yours to drop at merge.

**2. 🔴 [`BRAND-TOKENS.md`](BRAND-TOKENS.md) HAS A NEW SECTION — read it before you draw anything.**
Mike ruled today: *"colours can still be consistent — they should be listed in the design
handbook."* So it now carries a **Journey stages** set for multi-stage *feature* screens: Navy
`#002B64` (setup, the existing brand Navy reused), **Teal `#00857A`** (live) and **Violet
`#5B4B9E`** (afterwards) — two new hues, with rules that stop it growing. **Reports are unaffected**
and stay on `REPORT-VISUAL-STANDARD.md`. If you need stage colours, use these three rather than
inventing a set; a fourth stage is a design problem, not a colour problem.

### What happened: Meeting Review moved from paper to a drawing

**[`mockups/meeting-review.html`](mockups/meeting-review.html)** now exists, registered in
[`ARTEFACTS.md`](ARTEFACTS.md), ☐ **still awaiting Mike's approval**. Three stages — the firm sets
its standard, the advisor's meeting, afterwards. **Nothing is built**: no route, no screen, no data
file, no test.

**Six rulings from Mike, so nobody re-asks.** They were put to him one at a time with a
recommendation, which is what `CLAUDE.md` requires and what the first attempt got wrong — that
attempt handed him a table of four open questions instead of asking them.

1. The reports are **Meeting Summary** (client) and **My Coaching Notes** (advisor). *Advisor
   Review* rejected — inside a firm "review" reads as an appraisal.
2. Transcript retention **18 months**, as the platform default.
3. The drawing check does **both**: the words raise it and it says it is guessing, the advisor
   confirms in one tap, and the **confirmation is stored, never the guess**.
4. Manager figures appear only above **5 advisors AND 20 meetings**. A four-advisor firm sees none,
   ever — accepted, and the empty state must say why.
5. A firm **may not edit the consent wording**. One lawyer-checked version per market.
6. **Firm reference material** — an end-of-year script, a conflict protocol: **both audiences,
   advisor first.** Phase 1 the advisor opens it, nothing near the model. Phase 2 the AI checks
   against it, once real scripts exist.

**⚠ One build trap was found while recording ruling 5 and it is written into
[`MEETING-CONSENT-WORDING.md`](MEETING-CONSENT-WORDING.md)'s banner.** The fixed wording quotes the
retention period **aloud to the client**, but P8 lets a firm move that dial. 18 months is a
**default, not a constant** — a build that types it into the string has advisors telling clients
something untrue the day a firm changes the setting, and nothing on screen would say so.

**On ruling 6, the useful finding:** the upload half already exists —
`uploadDocument` in `server/routes/firmManager.js:247`, PDFs, 20 MB a file and 500 MB a firm from
`config/integration.js`. What does **not** exist is the join between a document and a set of
observation points. That is the whole of the new work if it is ever approved.

### Also done

The **Handbook was republished** to its existing URL after the to-do lists were aligned.

**One thing to expect:** this session began in auto mode, whose classifier blocked the Handbook
publish six times and several ordinary shell reads. It is not fixable from inside a session and
`/permissions` does not clear it — it is the mode itself. Mike exited auto mode and it published
first time.
