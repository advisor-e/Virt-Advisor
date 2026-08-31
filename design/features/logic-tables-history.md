# Logic Tables — the History

> **Read [`logic-tables.md`](logic-tables.md) first.** That page is the rules. If the two
> disagree, **the Brief wins**.

---

## 1. Why a tree may name a tool that does not exist

This looks like a bug and is a deliberate design decision, so it gets re-discovered and
"fixed" unless it is written down.

The source logic tables name tools in their then-column — *"then deploy the risk management
cover matrix"* — that the master catalogue has never published under that title. There were two
options: edit the tree to name something that does exist, or keep the tree faithful and hold the
name back.

**Keeping the tree faithful won**, because the alternative quietly rewrites the advisory thinking
to fit an accident of publishing. The availability gate stops an unpublished name reaching an
advisor, so nobody is ever sent looking for a page they cannot open — and **when the catalogue
catches up, the name starts flowing with no edit to the tree and no edit to the gate.**

---

## 2. The gate was raised as a live fault, and it is not one

The gate validates against the project's mirror of the catalogue rather than the raw export, and
that difference was reported as a defect. **Measured, it proved inert**: of the titles present in
the mirror but not the export, **zero** are named by any branch of any tree, and **zero** are
produced by running the app's own name-extraction over every field. A latent weakness, not a
defect — it would only bite if one of those names were written into a tree. The ruling and the
mirror rationale are Brief **P5** and trap 3.

> The owner's response when it was raised — *"prove to me its not working first"* — is the
> correct default, and the measurement is recorded so nobody re-derives it.

---

## 3. The gap that "built and working" was hiding

Learn mode was reported as built and working. True — for the original coaching trees.

**Seven advisor-development tables, a second shape imported seven weeks earlier, were loaded but
reached no consumer at all**, and had been counted as empty. They are now wired, and gated so
they can never leak into a client session.

**The transferable part: the claim was accurate about the part that had been looked at.** A
coverage claim needs to name what it covers.

---

## 4. Content filed into the wrong lane is invisible

Told in full in [`advisory-engine.md`](advisory-engine.md) §3 and the Brief's trap 1. The
routing report exists so the next case is noticed by automation instead of by a person reading
code: it is **generated**, its rules live in code that the build guard also reads, and it
currently classifies 491 content assets with **zero unknown**.

**A lane is not a quality mark.** Briefing content is doing its job by not selecting templates.

---

## 5. Decisions taken and closed — do not reopen

| Decision | Ruling |
|---|---|
| Edit a tree to match today's catalogue? | **No.** Keep the transcription faithful; gate the name. |
| Recommend something not in the firm's published content? | **Never.** *"Hold it back."* |
| Validate the gate against the mirror or the export? | **The mirror** — the export is not committed, so the gate would silently switch itself off. |
| Do the Logic Tables cascade? | **Yes**, field by field. |
| Does the Logic Lab cascade? | **No** — firm-local by nature, and its accepted list is array-shaped. |
| Does Template Check roll up the tiers? | **No — mentor only.** It improves the system and has no firm dimension. |
| Should trees emit signals rather than names? | **Yes, as intent.** The build emits names; the intent is not re-specified downward. |

---

## 6. Where the earlier record is wrong

Read 2026-08-13. **Left in place** — records of their own date:

- `virt-advisor-system-design.md` §2.4 describes the design intent that trees emit signals and
  then records the as-built drift in the same row. It is accurate and worth reading precisely
  because it refuses to reconcile the two — *"do NOT re-spec the intent to match the drift."*
- The same document's build-status table predates several features and should not be read as
  current.

---

## 7. Where the raw material is

**Permanent companions:** [`../CONTENT-ROUTING.md`](../CONTENT-ROUTING.md) (**generated** —
`npm run routing`; the per-asset lane table, with each tree's node count and shape) ·
[`../TREE-RECOMMENDATION-REVIEW.md`](../TREE-RECOMMENDATION-REVIEW.md) (the named-but-unpublished
tools) · [`../TREE-PDF-FIDELITY-SWEEP-2026-06-23.md`](../TREE-PDF-FIDELITY-SWEEP-2026-06-23.md)
(transcription fidelity against the source documents) ·
[`../LOGIC-LAB-BUILD-VS-MOCKUP.md`](../LOGIC-LAB-BUILD-VS-MOCKUP.md) and
[`../LOGIC-LAB-ACCEPT-AND-PUSH.md`](../LOGIC-LAB-ACCEPT-AND-PUSH.md) ·
[`../TEMPLATE-CHECK-ALREADY-ANSWERED.md`](../TEMPLATE-CHECK-ALREADY-ANSWERED.md),
[`../TEMPLATE-CHECK-REMAINING-58.md`](../TEMPLATE-CHECK-REMAINING-58.md),
[`../TEMPLATE-CHECK-THE-LAST-12.md`](../TEMPLATE-CHECK-THE-LAST-12.md) (the rulings queue —
**parked until after UAT testing**).

**The source documents themselves** — the `Logic Tables/` PDFs — are the authority on what a
table should say. The Read tool renders them, so they can be checked directly rather than through
a derivative.
