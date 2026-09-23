# OpenAI ZDR — feature design constraints

> **Mike's ruling, 2026-09-24:** keep a record of the ZDR amendment he is signing and the page it
> points to *"as future 'feature design constraints' so any future feature design is sure to
> comply"*.
>
> **Every feature that sends anything to OpenAI is checked against this page at scoping,
> before any design** — in the same message as the impact test (`CLAUDE.md`). A design that
> breaks a rule here does not go ahead, and the answer is never to reword the rule. If a
> feature genuinely needs something forbidden here, that is a question for Mike, and possibly a
> fresh request to OpenAI. It is never an inference.
>
> **The sources, verbatim — this page is the reading of them, and they win if the two differ:**
> - [`openai/ZDR-AMENDMENT-2026-09-24.md`](openai/ZDR-AMENDMENT-2026-09-24.md) — the contract, cited below as **A§**
> - [`openai/DATA-CONTROLS-PAGE-2026-09-24.md`](openai/DATA-CONTROLS-PAGE-2026-09-24.md) — OpenAI's data-controls page, which A§7 and the definitions point to, cited as **DC**

## Status on 2026-09-24

- **Approved** by OpenAI; the amendment is **sent to Mike for signature and not yet executed**.
- **ZDR is not in force** until the amendment is executed **and** the Account Console shows it
  switched on for the Org **and the Project** (A§2). Until both are true, nothing may be
  described as covered by ZDR.
- **Not yet compliant:** A§4.3 moderation — item **8.2** on the live list.
- **To be confirmed by Advisor-e's master team:** A§4.2 login recording or MFA — the login is
  theirs, not this app's.

## The rules

| # | Rule for any feature that calls OpenAI | Source | How this app stands on 2026-09-24 |
|---|---|---|---|
| **Z1** | **Only ZDR-eligible endpoints carry customer content.** Allowed: `/v1/chat/completions`, `/v1/responses`, `/v1/audio/transcriptions`, `/v1/moderations`, `/v1/embeddings`. **Never:** assistants, threads, agents, conversations, chatkit, vector stores, files, batches, fine-tuning, evals, videos — these keep data even under ZDR. | A§8 "Zero Data Retention"; DC table | ✅ Uses only chat/completions, responses and audio/transcriptions (`server/utils/openaiClient.js`, `transcriptionClient.js`). |
| **Z2** | **No Responses "background mode", no remote MCP tool, no hosted containers** (Code Interpreter, hosted shell, hosted skills) for customer content. Each keeps data or sends it to a third party. | DC /v1/responses | ✅ None used. |
| **Z3** | **Every request carrying user or client content passes a moderation check first** — OpenAI's `/v1/moderations` (ZDR-eligible, keeps nothing) or equal tooling. Notable spikes in high-severity abuse are reported to OpenAI. | A§4.3; DC "responsible for… moderation" | 🔴 **Not built — item 8.2.** A new AI feature ships with the check or waits for 8.2. |
| **Z4** | **No general-purpose chat.** Every conversational surface is restricted to a topic or grounded in trusted documents — the firm's templates, frameworks or the user's own material. | A§4.1, A§5.1 | ✅ Every AI surface is advisory, course, meeting or report-bound. A new "ask anything" box breaks this. |
| **Z5** | **Every route that reaches OpenAI requires a login.** Users are internal, or signed in with MFA, single sign-on, or a password whose logins are recorded. No public, anonymous or link-only route may reach the model. | A§4.2, A§5.2 | ✅ All AI routes sit behind `firmAuth`/`fmGuard` (`server/restify-server.js`). ⚠ Login recording/MFA is Advisor-e's to confirm. Any **client-facing** AI feature must be checked here specifically. |
| **Z6** | **The app never generates code for users**, and never converts plain English to SQL, converts between programming languages, or writes docstrings. | A§4.4, A§5.3 | ✅ None. |
| **Z7** | **Images and files sent to OpenAI are limited and topical.** Any upload that reaches the model has technical limits (type, size, who may upload). **Images and files are outside ZDR:** they are scanned and can be kept for human review if flagged. So client personal data should reach the model as **text**, not as an uploaded document, wherever that is possible. | A§4.5, A§5.4, A§7; DC "Image and file inputs" | ✅ No images. The only file input is the depreciation-schedule PDF (`server/utils/depreciationExtract.js`), manager-only and tax-schedule content. **Audio sent for transcription is not in DC's file-input list and keeps nothing** (DC table). |
| **Z8** | **No routing platform** — the app never offers firms or anyone else general access to AI models as a service. Choosing a provider internally (`server/utils/aiProvider.js`) is fine. | A§5.5 | ✅ |
| **Z9** | **All traffic needing ZDR goes to the approved Org and a Project that shows ZDR switched on.** A new API key, a new Project, or a Project set to "None" breaks it silently. | A§2, A§3; DC "Configuring" | ⚠ The whole app uses one key, `OPENAI_API_KEY` (`config/integration.js`). Its Project must show ZDR in the Console before any feature relies on it. |
| **Z10** | **Never write that no human can see the content**, and never write that "nothing is stored anywhere". Flagged images and files are kept for human review. "Safety Retention" can allow retention and review after written notice. Prompt caching holds encrypted working data on OpenAI machines for up to 24 hours. | DC "Image and file inputs", "Safety Retention", prompt caching | Carries the standing prohibition on item 8.1 (`features/to-do-done-and-parked.md`). |
| **Z11** | **Misuse can switch everything off.** OpenAI may suspend ZDR **or all API access** (A§6). One key serves the whole app, so a breach by one feature stops every AI feature. | A§6 | Design consequence: Z3–Z7 are not per-feature choices. |
| **Z12** | **New Zealand is not a data-residency region.** OpenAI's written position is that NZ use is offshore processing. No feature may claim local or regional storage. | DC "Data residency" | Consistent with the NZ privacy assessment behind item 8.1. |

## When to re-read the sources

- **OpenAI changes the page.** DC is a live document. Before relying on a detail — especially
  the endpoint table — re-read the live page, and if it has moved, add a new dated copy under
  `openai/`.
- **The amendment is signed.** If the signed copy differs from the one sent for signature, add
  it beside the original and correct this page.
- **A feature needs a new endpoint, tool, model family or upload type.** Check it against DC
  **first**. Image generation, for example, is ZDR-compatible only with the models DC names.
