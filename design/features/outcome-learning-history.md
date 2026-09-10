# Outcome Learning — the History

> Read [`outcome-learning.md`](outcome-learning.md) first. This page is why the task exists and
> how it was framed; the Brief is the rules.

---

## 1. Where it came from — 2026-09-10

Mike asked for an audit of three claims he wanted to market: that the app is a world-class AI
coach built from hard-coded logic, AI, and robust learning loops. The audit
([the report](https://claude.ai/code/artifact/9be3c34f-fcb1-45ae-b9de-382d4bf60057), read
against the code the same day) found the first two claims hold and the third holds partly:
the case review records a per-template verdict and the engine reads it back for the same
client, but nothing crosses clients, firms or the platform.

His response, verbatim: *"now i want to build a prompt to develop the task to enable real
machine learning - such that it does, indeed, get smarter with use. Not just from one firm,
but from all those who consent to help develop the model by sharing annomised data"*.

The prompt was drafted from what the code already holds, pasted by Mike to
`/speckit-specify`, and is kept verbatim in the Brief §4. Item **4.87** was filed in his
words the same day; the spec is `specs/002-outcome-learning/spec.md`, with two decisions
open for him: the evidence floor, and whether adjustments hold back only or also lift.

## 2. The framing decision, made before the spec

"Machine learning" was deliberately framed as explainable counting and weighting through the
seam Advisory Distinctions already use, not a trained model. Two reasons, both on the record:
the engine's boundary — the engine decides, the AI writes — is not to be moved; and nothing
that trains a model runs on the locked Node 14.15 runtime. A trained model is named in the
spec as a fresh decision for Mike, never an assumption.
