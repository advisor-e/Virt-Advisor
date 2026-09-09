# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-09 (ninth session) · Laptop · branch `feat/advisor-progress`

Suite **8,662 green** (432 suites), lint 0 errors, audit gate clean. **One commit,
`f805933`, pushed.** 13 ahead, 0 behind — started level with `origin/master`, so nothing
was merged in.

**4.78 SLICE 3a IS BUILT — the AI now reads a document.** Four new pieces: the
`depreciation-read` prompt in `data/ai-prompts.json` (all four tiers, so a manager can read
what the machine is told), `server/utils/depreciationExtract.js` (sends the PDF, validates
every field of the answer), `server/utils/depreciationProposals.js` (a proposal store the
rate resolver never reads), and four routes — load, list, approve, reject.

🔴 **A PENDING PROPOSAL CHANGES NO FORECAST, and it is structural.** The approved store
cannot hold an unapproved table, so a proposal is kept somewhere else entirely rather than
behind a flag. A test populates both stores at once and the advisor's read still answers the
app's own six rates. **Do not "tidy" the two stores into one.**

**149 new tests.** `depreciationExtract.js` is at 100% on all four measures — `CLAUDE.md`'s
rule for anything parsing AI output. One test holds the prompt's own list of the six
categories against `CATEGORY_KEYS`: a category the model is never told about can never be
proposed, and no screen would say why.

**NEXT IS SLICE 3b — the screen, and it needs no decisions from Mike.** The upload control,
the proposed-rates table with editable figures, the class-match confirmation, the gaps panel
and Approve. The backend it calls is done and tested. `FirmDepreciationRates.vue` still
carries a header saying the PDF-reading question is open — it is not; Mike ruled it
2026-09-09 and it is built. Fix that line when you touch the file.

⚠ **No real schedule has been read.** Every path is proven against a stubbed model. The
first live run needs a key and a real IR265, which is UAT's, not this machine's — and the
thing to watch first is whether the model picks the right published class for each of the
six categories.

**Also:** `data/dev-depreciation-rates.json` had no `.gitignore` entry from slice 2 — a
firm's approved rates could have been committed by accident. Added, with the new proposals
file. Neither file exists; nothing leaked.

**Open for Mike:** 4.15, 4.58, 4.66 · **whether 4.77 closes into 4.78** (still on 4.77's
note, still not ours to decide) · and **4.81**, the hardcoded NZ tax and GST rates, which
needs a drawing before any build and rides everything 4.78 has now built.

⚠ **Known deviation, unchanged:** the Depreciation Rates tab's strings are hardcoded English
like four of its five siblings, against the i18n standard. Named in the component header.

**DESKTOP:** 🔴 **your note is stale — it is dated 2026-09-04 and describes 5 commits; your
branch is 43 ahead with a commit from today.** Nothing of yours was touched here. Nothing
this session went near quiz screens, and 4.78 is flagged active on the laptop.
