# Answer Bench — the judge's checklist (item 7.19)

**Status: points 1–5 and 7 ✅ APPROVED BY MIKE 2026-10-01 ("yes"), as committed in `fd417a13`.
Point 6 REDRAFTED the same day at his request — ☐ awaiting his approval.** Its first wording
judged every answer as if a business owner read it, but both the client chat and Discover answer
the advisor. Until point 6 is approved, no bench run counts as a result. The judge uses these
points word for word; a change to them is a fresh approval.

The answer bench asks the real advisory chat the 51 invented Scenario Lab cases and scores each
written recommendation two ways (Mike's ruling, 2026-10-01):

1. **Code checks** — exact and free: every template and model named exists; no more templates
   than the case's meeting budget; a crisis case leads with a survival tool; the AI's pick
   matches what the engine ranked highest; the detected area matches the case's area.
2. **An AI judge** — a stronger model reads each answer against the checklist below. It is the
   only automatic way to judge whether the advice is any good.

The judge is given the case (the client's situation, what they already tried, whether it is a
crisis) and the answer. It marks each point **met** or **not met** with a one-line reason, and
never rewrites the answer. A run's score is the share of points met across all cases, so two
runs can be compared.

## The seven points

| # | Point | Met when |
|---|---|---|
| 1 | **About this client** | The answer refers to this client's actual situation — their industry and the problem the advisor described — not advice that would fit any business. |
| 2 | **Respects what was tried** | It does not recommend what the client already tried, unless it says plainly what would be different this time. |
| 3 | **Reasons match the tools** | Each template or model it names is recommended for a reason that matches what that tool is for. |
| 4 | **Right urgency** | In a crisis it puts survival first; outside a crisis it does not alarm. |
| 5 | **Something to do next** | The advisor could act on it at the next meeting: it says what to do first. |
| 6 | **Plain for its reader** | An advisor could follow it at a glance. Specialist terms are fine, but anything the advisor is meant to say to the client is in words the client would understand. |
| 7 | **No invented certainty** | It claims no figures, results or facts about the client that it was not given. |

## What the judge never sees

Nothing real: the cases are invented, and no firm, advisor or client data is involved. The
judge runs on OpenAI under the same rules as every other call (`OPENAI-ZDR-CONSTRAINTS.md`).
