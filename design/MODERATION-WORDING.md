# Moderation — what a person sees when a request is blocked

> ✅ **APPROVED BY MIKE 2026-09-24**, in his words: *"your wording is fine - please proceed"*.
> Item **8.2**. The build follows this file; if a screen's wording differs from it, the screen is
> wrong. Change the wording here first, with Mike's word, and never on a screen alone.
>
> **Why the sentence is quoted back — Mike, 2026-09-24:** a message that does not say what failed
> *"will only frustrate users - you have to tell them what they typed that failed"*. So every
> sentence is scored on its own, in the same single call, and a block names the sentence.

## When a message appears

Only when OpenAI's moderation check flags one of **three** categories. Every other flag is logged
(category and feature, never the words) and the request goes through. Measured before the build:
0 of 204 scenario-lab sentences flagged at all, while ordinary metaphors (*"attack the Auckland
market"*, *"kill the business"*) are flagged as violence — which is why the general flag never
blocks. Rule Z3 of [`OPENAI-ZDR-CONSTRAINTS.md`](OPENAI-ZDR-CONSTRAINTS.md).

When the check itself **cannot be reached**, the request is refused and the screen shows the
AI-unavailable message it already uses. No new wording.

## The five messages

`{…}` is filled in by the app.

| # | When | Wording |
|---|---|---|
| 1 | Something typed; one sentence found | This sentence couldn't be sent to the AI: '{sentence}'. The safety check read it as {category}. If that isn't what you meant, reword that sentence and try again. |
| 2 | Something typed; no single sentence to blame | Your message couldn't be sent to the AI. The safety check read it as {category}, though no single sentence caused it on its own. If that isn't what you meant, reword it and try again. |
| 3 | The app's own material tripped the check, not the user | This request couldn't be sent to the AI because of something in the app's own material — not anything you typed. It has been recorded so it can be fixed. |
| 4 | Meeting transcript; one sentence found | The reports for this meeting couldn't be written. The safety check read this, said by {speaker} at {time}, as {category}: '{sentence}'. The recording and transcript are unchanged. |
| 5 | Meeting transcript; no single sentence to blame | The reports for this meeting couldn't be written. The safety check read the conversation as {category}, though no single sentence caused it on its own. The recording and transcript are unchanged. |

**The quoted sentence loses its own final full stop** (Mike, 2026-09-24): the wording closes the
quote with one, and *"myself.'."* read as a mistake. A question or exclamation mark stays — it is
part of what was said.

**Message 3 is now rare by design.** Since 2026-09-24 only what a person typed, said or uploaded
is checked (ruling 4 in `server/utils/moderation.js`), so the app's own material is no longer
sent to the check at all.

## {category}

| OpenAI's category | Plain phrase |
|---|---|
| `sexual/minors` | sexual content involving a minor |
| `self-harm/instructions` | instructions for self-harm |
| `illicit/violent` | instructions for a violent crime |

## {speaker} and {time} — message 4

✅ **{speaker}: APPROVED BY MIKE 2026-09-24.** The transcript knows only three roles:

| Role in the transcript | Proposed words |
|---|---|
| advisor | the advisor |
| client | the client |
| unknown | an unidentified speaker |

**{time}** is the transcript's own clock from the start of the meeting, `m:ss` — the same format
the approved Meeting Review drawing prints beside each quote.
