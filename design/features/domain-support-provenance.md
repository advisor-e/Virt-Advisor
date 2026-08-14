# Domain Support Provenance — the Brief

> **Read this before writing or editing any row of domain-support material.** Current rules only;
> the history is in [`domain-support-provenance-history.md`](domain-support-provenance-history.md).
>
> **Covers:** the line between the firm's own material and commentary we author about it, and how
> the second is marked. **Does not cover:** what the material says or how it is used
> ([`domain-support.md`](domain-support.md)).

---

## 1. Design philosophy

**Two different things are being written into the same field, and only one of them is the firm's.**

A domain-support row is a transcription of a source document the firm owns. Reading those sources
alongside the data shows a second kind of sentence mixed in: a short clause explaining *why* a step
matters, written by whoever did the transcription. It is not in the source. It is usually good —
it sharpens a terse instruction into a usable one — and that is exactly why it is dangerous. It
reads as the firm's own thinking because it sits inside the firm's own method, in the firm's own
voice, with nothing to say otherwise.

**The problem is not the sentence. It is the silence about who wrote it.** An advisor repeating it
believes they are repeating their firm. A firm manager reviewing the material has no way to tell
which sentences are theirs to change and which were never theirs at all.

**So the rule is not "stop writing them". It is "say who wrote them".** The owner's ruling of
2026-08-14, in his words: **mark them.** Nothing is deleted, nothing is rewritten, and the
never-invent rule stays exactly as strict as it was — what changes is that authored commentary
stops pretending to be transcription.

---

## 2. Key principles — the non-negotiables

**P1 · The firm's material and our commentary are different things and are stored differently.**
Not distinguished by tone, by convention, or by who remembers writing it — by the data.

**P2 · A sentence that is not in the source is ours until proved otherwise.** The burden runs that
way round. "It was probably in there somewhere" is not a provenance; the check is a search of the
source, and the result is recorded.

**P3 · Marking is not deletion.** A clause found to be ours is kept and labelled. Removing it would
lose real editorial value and — worse — would make the sweep look complete while the same habit
continued in the next row written.

**P4 · This does not relax [`domain-support.md`](domain-support.md) P2.** Inventing the firm's
*method* remains forbidden: if a source has no step, the field stays empty. What is now permitted,
and only when marked, is commentary *about* a step the source does give.

**P5 · A factual claim about a named framework is never ours to author.** The expansion of an
acronym, the members of a list, the count of a model's stages — these are the firm's or they are
wrong. This principle exists because the one confirmed fabrication was exactly that, and it is a
different and more serious failure than an added rationale.

**P6 · The AI is told which is which.** A marked clause reaches the prompt labelled as
commentary. The point of the exercise is lost if both arrive looking identical.

---

## 3. Design considerations

**The additions are a habit, not a set of accidents.** In the one domain swept end to end, nine
clauses across seven of nine rows were found, at roughly one per row, and two rows were completely
clean. A rate that steady is an authorial style, which means it is present wherever the same
process ran — and the same process ran everywhere.

**Most of them are improvements, and that is the trap.** *"rather than one large bet"* genuinely
clarifies what the 8 Profit Levers are for. The instinct to keep such a clause is right; the
instinct to leave it unattributed is what this page exists to correct.

**The 150–200 estimate is WITHDRAWN, not merely unproven.** It was an extrapolation from the one
domain then swept. Eighteen further domains have since been read — 104 of 194 materials — and they
produced **one confirmed clause and seven candidates**, against roughly eighty predicted pro-rata.
Do not quote the old figure.

**The habit tracks the shape of the SOURCE DOCUMENT, not the transcriber.** This is why Strategy
was so misleading a sample. Its source gives terse steps with sub-bullets, so four source steps
became nine of ours — and expanding a terse step is exactly where a "why it matters" tail gets
welded on. Most other domains are transcribed from documents whose steps are **already full prose**
(`Get the Job Content.supt`, `EOY Support`, `Sales & Marketing Support`). There was nothing to
expand, so the transcription is near-verbatim and adds nothing. **Predict the yield of an unread
domain from its source document, not from the app-wide average.**

**A mechanical sweep cannot find these.** This was tested, not assumed. A word-proximity detector
scores known-good transcriptions between 31% and 70% because the material is paraphrased into the
firm's voice by design — so paraphrase and invention are indistinguishable to it. The only method
that works is reading a domain's rows beside its source document.

**A fourth confirmation, now measured rather than argued.** Scoring every clause against every
sentence in all 115 documents, the **nine known marks score between 25% and 75%** — and **61
clauses that are NOT marks fall inside that same band**. No threshold separates them. A score is
only ever a pointer to what to read next.

**What a marker-based sweep *can* do is check the facts.** All 140 marker-carrying claims in the
data — every acronym expansion, counted list, quotation and named authority — were verified present
in the firm's own documents. That half of the problem is measured and clean.

---

## 4. For the coder

### The state of the work

| Piece | State |
|---|---|
| The ruling | Given 2026-08-14 — *mark them* |
| Strategy domain | **Swept, all 13 rows.** The original 9 (against `Strategic Planning Support.pdf`) yielded the 9 marks; its other 4 rows come from four *different* documents, were never in that sweep, and are clean |
| 18 further domains | **Read 2026-08-14, 104 of 194 materials** — 1 confirmed clause, 7 candidates. Full record: [`../DOMAIN-SUPPORT-SWEEP-PROGRESS.md`](../DOMAIN-SUPPORT-SWEEP-PROGRESS.md) |
| The remaining 10 domains | **Not read.** people-power · fm-coach-culture · org-board-pack · get-marketing · org-firm-strategy · raising-capital · succession · systems · org-capacity-planner · org-leadership |
| The marking mechanism | **Built 2026-08-14** to the approved artefact [`../mockups/domain-support-authored-commentary.html`](../mockups/domain-support-authored-commentary.html) — see §4.1 below |
| Fact-level claims | **Swept and clean** — 140 of 140 verified against the firm's documents |

**P7 · A mark goes in `steps`, never in `summary` or `who_when`.** All nine originals are in
steps. The other two fields are our own descriptive rewriting of each source's "Benefits" block in
*every* domain — so if they were in scope, every row in the app would carry a mark, which is not
what was ruled. `tests/unit/authoredCommentary.test.js` permits all three fields deliberately, to
keep an existing mark checkable if this ever widens; the permission is not an invitation.

### 4.1 · The mechanism, as built

**A mark records the words, never a step number.** The screen lets steps be reordered, so an index
would quietly come to mean a different sentence. The cost of anchoring on the words is that an edit
can orphan a mark — closed two ways: `tests/unit/authoredCommentary.test.js` fails the build if a
platform mark's words are missing or ambiguous, and `livingCommentary()` checks presence at the
point of use, so a firm's edited copy — which no test can reach — simply stops showing the note.

```json
"authored_commentary": [
  {
    "text": "so purchasing blockages are removed rather than competed against",
    "checked": "2026-08-14",
    "searched": "all 115 firm documents — zero matches"
  }
]
```

Additive, per material, beside `steps`. **A material with no marks is byte-for-byte what it was**,
which is why the other 28 areas are untouched until they are swept.

| Piece | Where |
|---|---|
| The marks | `data/*-domain-support.json`, per material |
| Presence check + prompt block | `server/utils/domainSupport.js` — `livingCommentary`, `formatMaterialLines` |
| Screen note and control | `components/firm/FirmDomainSupport.vue` |
| Wording | `locales/en.json` → `firmDomainSupport.mark*` |
| Guards | `tests/unit/authoredCommentary*.test.js` |

**What the AI is told.** The steps reach it **unchanged** — the method still reads as one
instruction — and a block after them names what was ours: *"Not the firm's own words — commentary
added by Advisor-e. Do not present these as the firm's method."* Both prompt paths get it, the
advisor engine and the course session, because both format through `formatMaterialLines`.

**What a person sees.** Under the step, quiet and not alarming: *"Our wording, not yours — change or
remove it freely:"* followed by the clause. Mike's wording, chosen 2026-08-14. **The mentor is the
only person who sees it** — see *Who may see* below.

**Who may see a mark.** The platform only — `canSeeMarks` is `scope === 'mentor'`. **Nothing in the
running app writes into anyone's material.** The AI reads this material to brief itself and is told
which words were ours; it never writes back. The clauses came from *our own transcription* of the
firm's source documents, which is a development activity that ends when the transcription ends. So
below the mentor a mark is a record of finished work rather than a tool — it fails the
marketability test ([`product-principles.md`](product-principles.md)): a manager cannot act on it,
so it is screen space spent on nothing. **The cost is named, not hidden:** a firm manager editing a
step will not know a clause was ours and may adopt it as their firm's wording. That is the very
silence §1 objects to, accepted here because the clause is one the owner has already ruled worth
keeping.

⚠ **This is a trigger, not a preference.** The day anything in the app drafts or extends material
**for** a firm, `canSeeMarks` must widen — that firm would then need to see which words it did not
write. Pinned by the *"a manager below the mentor sees no note at all"* case in
`tests/unit/authoredCommentaryScreen.test.js`, which carries the same note.

**Who may mark.** The platform only, for now — `canMark` is `scope === 'mentor'`, named
**positively** because Tier Cascade P5's trap is that a negative gate answers *yes* for a tier that
does not exist yet. **Kept as a second computed rather than folded into `canSeeMarks`:** they answer
different questions, and seeing will widen before marking does. A firm marking commentary **it**
wrote is a real case and will come; the label above is the platform speaking to a firm and would
read wrong in a firm's own voice, so **that wording is asked for, never invented**. A firm that
disagrees with a mark is not stuck — rewriting the sentence clears it, and the words genuinely
become theirs at that point. What a firm cannot do is un-tick a mark while keeping our words: that
would leave something known to be false standing at every other firm, and would silently cost that
firm every future improvement to the whole area (`domain-support.md` P4 — arrays replace wholesale).

**Hiding the note touches the screen and nothing else.** The marks are still stored, still saved by
a firm's edit, and still reach the AI labelled as ours — none of that reads the tier.

⚠ **A mark made on the screen is not the same claim as a mark made in a sweep**, and the data says
so: its `searched` reads *"marked on screen — no corpus search recorded"*. Do not read the two as
equivalent evidence.

### The nine found in Strategy

All are in `data/strategy-domain-support.json`. Each was checked against all 115 firm documents
converted to text; every one returned **zero** matches. The word *dismantled* appears nowhere in
the firm's material at all.

| Row | Step | The clause we added |
|---|---|---|
| `strategy-planning-outcomes-review` | 9 | *"a belief that has just been dismantled needs space before the next domain is opened"* |
| `strategy-planning-outcomes-review` | 3 | *"rather than jumping between them"* |
| `strategy-business-dating` | 3 | *"Setting the valuation at the start is what stops the trial itself becoming the negotiation."* |
| `strategy-profit-levers-blue-ocean` | 4 | *"which is what captures accumulative incremental growth rather than one large bet"* |
| `strategy-profit-levers-blue-ocean` | 2 | *"so purchasing blockages are removed rather than competed against"* |
| `strategy-orientation-part-1` | 4 | *"A goal that fails any one of the three is not an operational objective."* |
| `strategy-swot-pest` | 4 | *"recording in the moment rather than reconstructing afterwards"* |
| `strategy-pivot` | 4 | *"set before the trial starts, not judged after it"* |
| `strategy-porters-pine` | 4 | *"rather than staged ones"* |

**`strategy-business-targets` and `strategy-orientation-part-2` are clean** — every clause traced
to the source.

### How to sweep the next domain

Convert the sources once with `pdftotext` (available on this machine), then read a domain's rows
beside its own source document and list what is not there. Search the whole corpus before calling
a clause ours — several turned out to be genuine material that had simply moved between documents,
which is a different finding and not a fault.

**Order by content weight.** After Strategy the largest are Seminar, EOY, and Sales & Marketing —
all now read. Of what remains, people-power (26) and fm-coach-culture (20) are the largest.

**Build the corpus first — it makes `searched` reproducible.** `pdftotext -layout` over all 115
PDFs in the repo (`Domain Support/`, `Logic Tables/`, `Central Frameworks/`, `Course Builder Quiz/`)
converts cleanly, none image-only. **Those 115 files ARE the "115 firm documents"** named in every
mark's `searched` field, so the phrase is a checkable claim rather than a form of words.

**Find each material's source without trusting a filename.** Every firm document shares one shape —
title, `Benefits`, a step header (about fourteen wordings of it), then numbered steps. **A section
starts at the non-empty line above each `Benefits` line.** Sectioning that way and matching on word
overlap identifies the true source of every material, and re-derives the known Strategy mapping
exactly. Several documents (Risk, Valuation, Stock Purchasing, Due Diligence, Sales & Marketing)
have **no `Benefits` blocks at all** and must be read whole — do not let a bad section match stand
in for a source.

**Recording what you find.** Add an `authored_commentary` entry beside that material's `steps`
(shape in §4.1). Copy the clause **exactly** — the guard test fails on a fragment that is not in the
material, or that appears twice. Write `searched` as what you actually did, not as a formula: it is
the difference between a checked finding and an assertion. Then run
`npx jest tests/unit/authoredCommentary.test.js` before moving to the next area, so a mistyped
fragment is caught in the domain you are holding rather than a week later.

### Traps

1. **Do not report the 150–200 estimate at all — it is withdrawn.** Eighteen further domains
   failed to reproduce it. See §3.
1a. **`grep -E "a\|b"` treats `\|` as a LITERAL pipe, not alternation.** Two "this phrase appears
   nowhere in the 115 documents" results were produced this way on 2026-08-14 and **both were
   wrong** — *"3-ton loads"* and a clause about guilt are the firm's own words. Under `-E` use `|`,
   never `\|`, and **re-run any zero-match result before believing it.** A false positive here
   attributes the firm's own writing to us, which is the exact error this page exists to prevent.
2. **Do not treat absence from the source as proof of invention.** A clause may live in another
   firm document — the valuation overview's *MBO / BIMBO / Newco* sentence is real firm material
   that came from the Specialist Tools Quiz, not from the valuation source.
3. **Do not build a detector and trust it without controls.** Two were built here and the first
   scored a nonsense invented framework at 67% "sourced". Both were only exposed by running the
   known fabrication and a made-up control through them.

---

## 5. Related briefs

[`domain-support.md`](domain-support.md) — the material this governs, and the never-invent rule
this page refines · [`advisory-engine.md`](advisory-engine.md) — where the material reaches a
prompt · [`logic-tables.md`](logic-tables.md) — the other content driver, not yet examined for the
same habit · [`to-do.md`](to-do.md) — item 4.6, which this page is the answer to.

---

**History:** [`domain-support-provenance-history.md`](domain-support-provenance-history.md)
