# OpenAI developer docs — what they mean for this app

> **Mike's ruling, 2026-09-24:** keep word-for-word, dated copies of the OpenAI developer pages
> this app depends on, plus one working page saying what each means for the app, **every line
> pointing to the passage it came from** — so a session works from OpenAI's words, not from an
> AI's memory of them. This is that working page.
>
> **The copies win.** Where this page and a copy differ, the copy is right and this page is the
> defect. When a copy is refreshed, this page is re-checked in the same change.
>
> The contract and data-controls side lives in [`OPENAI-ZDR-CONSTRAINTS.md`](OPENAI-ZDR-CONSTRAINTS.md)
> and is not repeated here.

## The saved pages

All read 2026-09-24 from `developers.openai.com`, in `design/openai/`.

| Copy | What it is | App code that relies on it |
|---|---|---|
| [`DEPRECATIONS`](openai/DEPRECATIONS-2026-09-24.md) | Every model and endpoint being switched off, with dates | every model name below |
| [`MODEL-PAGES`](openai/MODEL-PAGES-2026-09-24.md) | The five models the app calls, plus the two named replacements for the transcription model | `config/integration.js` `_primaryModels`; `transcriptionClient.js`; `moderation.js`; the three `MODEL = 'gpt-6-astra'` routes |
| [`REF-PARAMETER-EXCERPTS`](openai/REF-PARAMETER-EXCERPTS-2026-09-24.md) | Verbatim entries for the settings the app sends to Chat Completions and Responses — the two pages are too large to keep whole | `server/utils/openaiClient.js` and every call site |
| [`TRANSCRIPTION-GUIDE`](openai/TRANSCRIPTION-GUIDE-2026-09-24.md) · [`SPEECH-TO-TEXT-GUIDE`](openai/SPEECH-TO-TEXT-GUIDE-2026-09-24.md) · [`REF-AUDIO-TRANSCRIPTIONS-CREATE`](openai/REF-AUDIO-TRANSCRIPTIONS-CREATE-2026-09-24.md) | Which transcription model does what, and the request and reply shapes | `server/utils/transcriptionClient.js` (Meeting Review) |
| [`MODERATION-GUIDE`](openai/MODERATION-GUIDE-2026-09-24.md) · [`REF-MODERATIONS-CREATE`](openai/REF-MODERATIONS-CREATE-2026-09-24.md) | The moderation check and its categories | `server/utils/moderation.js` (item 8.2, rule Z3) |
| [`STREAMING-RESPONSES`](openai/STREAMING-RESPONSES-2026-09-24.md) | Streamed replies and their event types | `openaiClient.js` `parseSSEStream`, `stripResponsesStream`, `failureFromEvent` |
| [`RATE-LIMITS`](openai/RATE-LIMITS-2026-09-24.md) · [`ERROR-CODES`](openai/ERROR-CODES-2026-09-24.md) | Limits, the errors they produce, and which may be retried | `server/utils/aiProvider.js` `isRetryable` |
| [`PRODUCTION-BEST-PRACTICES`](openai/PRODUCTION-BEST-PRACTICES-2026-09-24.md) | Account set-up: keys, projects, spend limits | the OpenAI account itself — Mike's, not the code's |

## What the app sends today

Read from the code on 2026-09-24.

| Endpoint | Model | Used for | Where it is set |
|---|---|---|---|
| `/v1/chat/completions` | `gpt-4o-mini` | classify, narrative, report, reading, review | `config/integration.js` `_primaryModels` |
| `/v1/chat/completions` | `gpt-4o` | course | same |
| `/v1/chat/completions` | `gpt-6-astra` | compliance | same |
| `/v1/responses` | `gpt-6-astra` | Economic Analysis (with web search), next-steps draft, depreciation extract, country schedule read | `economicAnalysis.js`, `nextStepsDraft.js`, `depreciationExtract.js`, `countryScheduleRead.js` |
| `/v1/moderations` | `omni-moderation-latest` | the moderation check before every call | `server/utils/moderation.js` |
| `/v1/audio/transcriptions` | `gpt-4o-transcribe-diarize` | Meeting Review's transcript with speaker turns | `server/utils/transcriptionClient.js` |

## What the pages mean for us

| # | Fact | Source |
|---|---|---|
| **O1** | 🔴 **Meeting Review's transcription model is switched off on 26 Feb 2027.** `gpt-4o-transcribe-diarize` is on the deprecations list with that shutdown date. | DEPRECATIONS, "2026-08-26: Transcription models" |
| **O2** | 🔴 **No named replacement labels speakers.** The replacements named are `gpt-transcribe` and `gpt-live-transcribe`. OpenAI's own transcription guide, read the same day, still sends speaker-labelled transcripts to the model being retired. `gpt-transcribe` lists one supported feature, streaming. `gpt-live-transcribe` does not support `/v1/audio/transcriptions` at all. **Item 8.3 on the live list.** | TRANSCRIPTION-GUIDE, "Choose a specialized capability"; MODEL-PAGES, `gpt-transcribe` "Supported features" and `gpt-live-transcribe` "Endpoints" |
| **O3** | **No other model the app calls is on the deprecations list.** `gpt-4o` resolves to its `2024-08-06` snapshot. The `gpt-4o-2024-05-13` snapshot, retiring 23 Oct 2026, is named nowhere in the app. | DEPRECATIONS; MODEL-PAGES, `gpt-4o` "Default snapshot" |
| **O4** | 🔴 **A Responses call is stored by OpenAI for at least 30 days unless `store` is false**, and `store` defaults to true when omitted. Once ZDR is switched on, `store` is always treated as false. **The app sends `store: false` on every Responses call** (`openaiClient.js` `createResponse`, overriding any caller, 2026-09-24), pinned by `tests/unit/openaiClient.test.js`. | REF-PARAMETER-EXCERPTS, Responses `store`; `openai/DATA-CONTROLS-PAGE-2026-09-24.md`, "/v1/responses" |
| **O5** | 🔴 **The diarizing model refuses any request without `chunking_strategy`.** Proven live 2026-09-24: a three-minute browser recording came back *"chunking_strategy is required for diarization models"*. `transcriptionClient.js` now sends `chunking_strategy=auto`, pinned by `tests/unit/transcriptionClient.test.js`. The same recording then returned 54 segments, 2 speakers, advisor and client attributed correctly. A file is still capped at **25 MB**. | SPEECH-TO-TEXT-GUIDE, "Speaker diarization" and "Longer inputs" |
| **O6** | **`gpt-4o-transcribe-diarize` takes no prompt.** Hints about names or terms cannot be passed to it. | SPEECH-TO-TEXT-GUIDE, "Prompting" |
| **O7** | **`max_tokens` is deprecated on Chat Completions** in favour of `max_completion_tokens`, with no shutdown date. It is not compatible with o-series models. Where the app caps a chat reply it uses `max_tokens`; nothing in `server/` sends `max_completion_tokens`. | REF-PARAMETER-EXCERPTS, Chat `max_tokens` |
| **O8** | **Moderation's limit at Tier 2 is 20,000 tokens a minute.** That is the figure the app measured on 2026-09-24 (rule Z3). The match suggests the account is at Tier 2; the Console is the only proof. | MODEL-PAGES, `omni-moderation-latest` "Rate limits"; RATE-LIMITS, "Usage tiers" |
| **O9** | **Moderation can also run inside a Responses call**, through a `moderation` setting, with scores for both the input and the output. The app uses the standalone endpoint, which checks before anything is sent. | MODERATION-GUIDE, "Moderate generated content"; REF-PARAMETER-EXCERPTS, Responses `moderation` |
| **O10** | **Billing and quota errors are never retried against OpenAI** — `credit_balance_exhausted` and the spend-limit and usage-limit codes need a person. A `429` or `503` that is a rate limit or an overload may be retried, after the `Retry-After` header. `aiProvider.isRetryable` sends a `429` to the *other* provider, which is failover rather than a retry. | ERROR-CODES, "API errors"; RATE-LIMITS, "Retrying with exponential backoff" |
| **O11** | **An error after a stream has started arrives as an event, not an HTTP status**, and a request must not be replayed once its output has been consumed. `openaiClient.failureFromEvent` reads the `error` and `response.failed` events. | RATE-LIMITS, "Update existing error handlers"; STREAMING-RESPONSES, "Read the responses" |
| **O12** | **Account hygiene is the account holder's:** an expiry date on project keys with a rotation routine, separate projects for staging and production, and spend alerts. Relevant to rule Z9, which notes the app runs on one key. | PRODUCTION-BEST-PRACTICES, "API keys", "Staging projects", "Managing billing limits" |

## When to re-read the sources

- **At every release cut, read the live Deprecations page** and compare it with the model table
  above. OpenAI gives at least six months' notice for a generally available model and three
  for a specialised one (DEPRECATIONS, "Model deprecation notice periods"). A release cut is the
  moment that notice can be caught.
- **A feature needs a new endpoint, model or setting.** Read that page first and save a dated
  copy here, then add its line above.
- **How to fetch a page word for word:** add `.md` to any `developers.openai.com` address. The
  site's index of every page is `https://developers.openai.com/api/llms.txt`.
