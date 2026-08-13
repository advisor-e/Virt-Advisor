# The Model Library — the History

> **Read [`model-library.md`](model-library.md) first.** That page is the rules. If the two
> disagree, **the Brief wins**.

---

## 1. Why the class is on the card

The three classes were settled with the owner on 2026-07-13, and the reason they surface on this
screen came out of the same conversation.

The build had been heading toward treating **every** model as a report that a client's accounts
get fed into. The owner stopped it: several models are **teaching tools**, not reports. The
evidence agreed — roughly two thirds of the figures those models need do not exist in any
accounting export, because they are pricing and operational assumptions rather than accounting
outputs.

The recommendation that followed was that **the library should show the class on each card**, so
an advisor choosing from nineteen knows whether they are opening a teaching aid, a decision tool
or a client report *before* they open it. It was proposed as a build change and it is now how the
screen works.

**The trap it guards against, in the owner's framing:** a model must not serve as a teaching aid
one minute and be mistaken for the client's real position the next. That is exactly how an
illustrative number ends up in front of a client as though it were fact. Every model gets **one**
class; where a model genuinely has two uses it is split, or it must know which mode it is in and
say so on screen. **It is never left ambiguous.**

---

## 2. Decisions taken and closed — do not reopen

| Decision | Ruling | Date |
|---|---|---|
| Are the teaching models "reports"? | **No** — teaching tools, and the input inventory proved it. | 2026-07-13 |
| Does the class show on the card? | **Yes** — before the advisor opens it. | 2026-07-13 |
| Who may change the firm's currency? | **Managers only.** It is account-wide. | — |
| Who may read it? | **Any signed-in firm user** — a read must never require a manager role or break a report. | — |
| Does the library follow the report visual standard? | **No** — it is a landing page, not a model screen. Its own dark-mode block was flagged for a separate decision rather than swept into the reports migration. | 2026-07-27 |

---

## 3. Where the earlier record is wrong

Read 2026-08-13:

- `MODEL-CLASSIFICATION.md` lists the models as **19 catalogued** with three built, and says
  *"all three built models are Education."* **Nine are live now, across all three classes.** The
  classification itself is unchanged and still correct; only the build count has moved.
- Its point 4 describes showing the class on the card as *"proposed build change; not yet
  approved."* It is built.

**Left in place** — a record of its own date, and still the clearest statement of what the three
classes mean and why privacy is triggered by real client numbers rather than by a file upload.

---

## 4. Where the raw material is

**Permanent companions:** [`../MODEL-CLASSIFICATION.md`](../MODEL-CLASSIFICATION.md) (the three
classes, the owner-classified list of nineteen, and the reasoning) ·
[`../REPORT-DATA-MODEL.md`](../REPORT-DATA-MODEL.md) §2 (the figure inventory that proved the
teaching models are not reports) ·
[`../REPORT-VISUAL-STANDARD.md`](../REPORT-VISUAL-STANDARD.md) Part 4 step 4 (where the library's
own dark block was set aside for a separate call).
