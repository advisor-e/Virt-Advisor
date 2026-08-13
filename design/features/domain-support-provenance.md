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

**The estimate for the rest of the app is an extrapolation, not a measurement.** One domain of
twenty-nine has been swept. On the observed rate the app-wide figure is of the order of 150–200
clauses. That number must not harden into a fact through repetition — it has one domain behind it.

**A mechanical sweep cannot find these.** This was tested, not assumed. A word-proximity detector
scores known-good transcriptions between 31% and 70% because the material is paraphrased into the
firm's voice by design — so paraphrase and invention are indistinguishable to it. The only method
that works is reading a domain's rows beside its source document.

**What a marker-based sweep *can* do is check the facts.** All 140 marker-carrying claims in the
data — every acronym expansion, counted list, quotation and named authority — were verified present
in the firm's own documents. That half of the problem is measured and clean.

---

## 4. For the coder

### The state of the work

| Piece | State |
|---|---|
| The ruling | Given 2026-08-14 — *mark them* |
| Strategy domain | **Swept.** 9 rows against `Domain Support/Strategic Planning Support.pdf`; 9 clauses found |
| The other 28 domains | **Not swept.** Estimated 150–200 clauses on the observed rate |
| The marking mechanism | **Not designed.** Where a marked clause lives in the JSON, and how the prompt labels it, are both open |
| Fact-level claims | **Swept and clean** — 140 of 140 verified against the firm's documents |

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

**Order by content weight.** After Strategy the largest are Seminar, EOY, and Sales & Marketing.

### Traps

1. **Do not report the 150–200 estimate as a count.** It rests on one domain.
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
