# OpenAI "Model pages" — verbatim, as read 2026-09-24

> **Source:** https://developers.openai.com/api/docs/models/<model>.md — the `.md` version OpenAI publishes of the page, downloaded 2026-09-24.
> **It is a live web page and OpenAI changes it.** This copy records what it said on this date.
> Before relying on a detail, re-read the live page and add a new dated copy beside this one if
> it has moved. **Never edit this copy** — nothing below the line was changed.
>
> Seven model pages in one file. The first five are every model this app calls; the last two are
> the replacements OpenAI names for `gpt-4o-transcribe-diarize`. Each page follows its own source
> line, byte for byte.
>
> What it means for this app: [`../OPENAI-DEVELOPER-DOCS.md`](../OPENAI-DEVELOPER-DOCS.md).

---



<!-- ===== https://developers.openai.com/api/docs/models/gpt-6-astra.md ===== -->

# GPT-6 Astra

> For the complete documentation index, see [llms.txt](/llms.txt). Markdown versions of documentation pages are available by appending `.md` to the page URL.

> Our most capable model, built for the hardest end-to-end work

Model ID: `gpt-6-astra`

GPT-6 Astra is our most capable model, built for the hardest end-to-end work.
Use it for complex reasoning, coding, computer use, research, and document creation.
`reasoning.effort` supports `low`, `medium`, `high`, `xhigh`, and `max`.

Get started with GPT-6 Astra using the [model guide](/api/docs/guides/latest-model?model=gpt-6-astra).

## Model details

- Default snapshot: `gpt-6-astra`
- Input modalities: text, image
- Output modalities: text
- 1,050,000 context window
- Maximum input tokens: 922,000
- 128,000 max output tokens
- Apr 30, 2026 knowledge cutoff
- Reasoning token support

## Pricing

Pricing is based on the number of tokens used, or other metrics based on the model type. For tool-specific models, like search and computer use, there’s a fee per tool call. See details in the [pricing page](/api/docs/pricing).

### Text tokens

| Metric | Price | Unit |
| --- | ---: | --- |
| Input | $10 | 1M tokens |
| Cached input | $1 | 1M tokens |
| Cache writes | $12.5 | 1M tokens |
| Output | $50 | 1M tokens |

- Prompts with more than 272K input tokens are priced at 2x input and cache rates and 1.5x output for the full request.
- Cache writes are billed at 1.25x the uncached input token rate.
- Batch and Flex are priced at 50% of Standard rates. Fast mode is priced at 2x the applicable rates.

## Endpoints

| Endpoint | Route | Support |
| --- | --- | --- |
| Live | `v1/live/sessions` | Not supported |
| Chat Completions | `v1/chat/completions` | Supported |
| Responses | `v1/responses` | Supported |
| Realtime | `v1/realtime` | Not supported |
| Realtime translation | `v1/realtime/translations` | Not supported |
| Realtime transcription | `v1/realtime/transcription_sessions` | Not supported |
| Assistants | `v1/assistants` | Not supported |
| Batch | `v1/batch` | Supported |
| Fine-tuning | `v1/fine-tuning` | Not supported |
| Embeddings | `v1/embeddings` | Not supported |
| Image generation | `v1/images/generations` | Not supported |
| Videos | `v1/videos` | Not supported |
| Image edit | `v1/images/edits` | Not supported |
| Speech generation | `v1/audio/speech` | Not supported |
| Transcription | `v1/audio/transcriptions` | Not supported |
| Translation | `v1/audio/translations` | Not supported |
| Moderation | `v1/moderations` | Not supported |
| Completions (legacy) | `v1/completions` | Not supported |

## Supported features

- streaming
- structured_outputs
- function_calling
- file_search
- image_input
- web_search
- prompt_caching

## Supported tools

Tools supported by this model when using the Responses API.

- web_search
- file_search
- image_generation
- code_interpreter
- hosted_shell
- apply_patch
- skills
- computer_use
- mcp
- tool_search

## Snapshots

Snapshots let you lock in a specific version of the model so that performance and behavior remain consistent. Below is a list of all available snapshots and aliases for GPT-6 Astra.

- `gpt-6-astra`

## Rate limits

Rate limits ensure fair and reliable access to the API by placing specific caps on requests, tokens, audio duration, or other usage within a given time period. Your usage tier determines how high these limits are set and automatically increases as you send more requests and spend more on the API.

### Standard

| Tier | RPM | TPM | Batch queue limit |
| --- | ---: | ---: | ---: |
| Tier 1 | 500 | 500,000 | 1,500,000 |
| Tier 2 | 5,000 | 1,000,000 | 3,000,000 |
| Tier 3 | 5,000 | 2,000,000 | 100,000,000 |
| Tier 4 | 10,000 | 4,000,000 | 200,000,000 |
| Tier 5 | 15,000 | 40,000,000 | 15,000,000,000 |


<!-- ===== https://developers.openai.com/api/docs/models/gpt-4o.md ===== -->

# GPT-4o

> For the complete documentation index, see [llms.txt](/llms.txt). Markdown versions of documentation pages are available by appending `.md` to the page URL.

> Fast, intelligent, flexible GPT model

Model ID: `gpt-4o`

GPT-4o (“o” for “omni”) is our versatile, high-intelligence flagship model.
It accepts both text and image inputs, and produces text outputs (including Structured Outputs).
It is the best model for most tasks, and is our most capable model outside of our o-series models.

## Model details

- Default snapshot: `gpt-4o-2024-08-06`
- Input modalities: text, image
- Output modalities: text
- 128,000 context window
- 16,384 max output tokens
- Oct 01, 2023 knowledge cutoff

## Pricing

Pricing is based on the number of tokens used, or other metrics based on the model type. For tool-specific models, like search and computer use, there’s a fee per tool call. See details in the [pricing page](/api/docs/pricing).

### Text tokens

| Metric | Price | Unit |
| --- | ---: | --- |
| Input | $2.5 | 1M tokens |
| Cached input | $1.25 | 1M tokens |
| Output | $10 | 1M tokens |

## Endpoints

| Endpoint | Route | Support |
| --- | --- | --- |
| Live | `v1/live/sessions` | Not supported |
| Chat Completions | `v1/chat/completions` | Supported |
| Responses | `v1/responses` | Supported |
| Realtime | `v1/realtime` | Not supported |
| Realtime translation | `v1/realtime/translations` | Not supported |
| Realtime transcription | `v1/realtime/transcription_sessions` | Not supported |
| Assistants | `v1/assistants` | Supported |
| Batch | `v1/batch` | Supported |
| Fine-tuning | `v1/fine-tuning` | Supported |
| Embeddings | `v1/embeddings` | Not supported |
| Image generation | `v1/images/generations` | Not supported |
| Videos | `v1/videos` | Not supported |
| Image edit | `v1/images/edits` | Not supported |
| Speech generation | `v1/audio/speech` | Not supported |
| Transcription | `v1/audio/transcriptions` | Not supported |
| Translation | `v1/audio/translations` | Not supported |
| Moderation | `v1/moderations` | Not supported |
| Completions (legacy) | `v1/completions` | Not supported |

## Supported features

- streaming
- structured_outputs
- predicted_outputs
- file_search
- file_uploads
- fine_tuning
- function_calling
- image_input
- web_search

## Supported tools

Tools supported by this model when using the Responses API.

- function_calling
- web_search
- file_search
- image_generation
- code_interpreter
- mcp

## Quick comparison

| Model | Input | Cached input | Output |
| --- | ---: | ---: | ---: |
| GPT-4o | $2.5 | $1.25 | $10 |
| GPT-4o Mini | $0.15 | $0.075 | $0.6 |
| o3-mini | $1.1 | $0.55 | $4.4 |

## Snapshots

Snapshots let you lock in a specific version of the model so that performance and behavior remain consistent. Below is a list of all available snapshots and aliases for GPT-4o.

- `gpt-4o-2024-11-20`
- `gpt-4o-2024-08-06`
- `gpt-4o-2024-05-13`

## Rate limits

Rate limits ensure fair and reliable access to the API by placing specific caps on requests, tokens, audio duration, or other usage within a given time period. Your usage tier determines how high these limits are set and automatically increases as you send more requests and spend more on the API.

### default

| Tier | RPM | TPM | Batch queue limit |
| --- | ---: | ---: | ---: |
| Tier 1 | 500 | 30,000 | 90,000 |
| Tier 2 | 5,000 | 450,000 | 1,350,000 |
| Tier 3 | 5,000 | 800,000 | 50,000,000 |
| Tier 4 | 10,000 | 2,000,000 | 200,000,000 |
| Tier 5 | 10,000 | 30,000,000 | 5,000,000,000 |


<!-- ===== https://developers.openai.com/api/docs/models/gpt-4o-mini.md ===== -->

# GPT-4o Mini

> For the complete documentation index, see [llms.txt](/llms.txt). Markdown versions of documentation pages are available by appending `.md` to the page URL.

> Fast, affordable small model for focused tasks

Model ID: `gpt-4o-mini`

GPT-4o Mini (“o” for “omni”) is a fast, affordable small model for focused tasks.
It accepts both text and image inputs, and produces text outputs (including Structured Outputs). 
It is ideal for fine-tuning, and model outputs from a larger model like GPT-4o can be distilled to GPT-4o-Mini to produce similar results at lower cost and latency.

## Model details

- Default snapshot: `gpt-4o-mini-2024-07-18`
- Input modalities: text, image
- Output modalities: text
- 128,000 context window
- 16,384 max output tokens
- Oct 01, 2023 knowledge cutoff

## Pricing

Pricing is based on the number of tokens used, or other metrics based on the model type. For tool-specific models, like search and computer use, there’s a fee per tool call. See details in the [pricing page](/api/docs/pricing).

### Text tokens

| Metric | Price | Unit |
| --- | ---: | --- |
| Input | $0.15 | 1M tokens |
| Cached input | $0.075 | 1M tokens |
| Output | $0.6 | 1M tokens |

## Endpoints

| Endpoint | Route | Support |
| --- | --- | --- |
| Live | `v1/live/sessions` | Not supported |
| Chat Completions | `v1/chat/completions` | Supported |
| Responses | `v1/responses` | Supported |
| Realtime | `v1/realtime` | Not supported |
| Realtime translation | `v1/realtime/translations` | Not supported |
| Realtime transcription | `v1/realtime/transcription_sessions` | Not supported |
| Assistants | `v1/assistants` | Supported |
| Batch | `v1/batch` | Supported |
| Fine-tuning | `v1/fine-tuning` | Supported |
| Embeddings | `v1/embeddings` | Not supported |
| Image generation | `v1/images/generations` | Not supported |
| Videos | `v1/videos` | Not supported |
| Image edit | `v1/images/edits` | Not supported |
| Speech generation | `v1/audio/speech` | Not supported |
| Transcription | `v1/audio/transcriptions` | Not supported |
| Translation | `v1/audio/translations` | Not supported |
| Moderation | `v1/moderations` | Not supported |
| Completions (legacy) | `v1/completions` | Not supported |

## Supported features

- predicted_outputs
- streaming
- function_calling
- fine_tuning
- file_search
- file_uploads
- web_search
- structured_outputs
- image_input

## Supported tools

Tools supported by this model when using the Responses API.

- function_calling
- web_search
- file_search
- image_generation
- code_interpreter
- mcp

## Quick comparison

| Model | Input | Cached input | Output |
| --- | ---: | ---: | ---: |
| GPT-4o Mini | $0.15 | $0.075 | $0.6 |
| GPT-4o | $2.5 | $1.25 | $10 |
| o3-mini | $1.1 | $0.55 | $4.4 |

## Snapshots

Snapshots let you lock in a specific version of the model so that performance and behavior remain consistent. Below is a list of all available snapshots and aliases for GPT-4o Mini.

- `gpt-4o-mini-2024-07-18`

## Rate limits

Rate limits ensure fair and reliable access to the API by placing specific caps on requests, tokens, audio duration, or other usage within a given time period. Your usage tier determines how high these limits are set and automatically increases as you send more requests and spend more on the API.

### default

| Tier | RPM | RPD | TPM | Batch queue limit |
| --- | ---: | ---: | ---: | ---: |
| Tier 1 | 500 | 10,000 | 200,000 | 2,000,000 |
| Tier 2 | 5,000 | - | 2,000,000 | 20,000,000 |
| Tier 3 | 5,000 | - | 4,000,000 | 40,000,000 |
| Tier 4 | 10,000 | - | 10,000,000 | 1,000,000,000 |
| Tier 5 | 30,000 | - | 150,000,000 | 15,000,000,000 |


<!-- ===== https://developers.openai.com/api/docs/models/gpt-4o-transcribe-diarize.md ===== -->

# GPT-4o Transcribe Diarize

> For the complete documentation index, see [llms.txt](/llms.txt). Markdown versions of documentation pages are available by appending `.md` to the page URL.

> Transcription model that identifies who's speaking when

Model ID: `gpt-4o-transcribe-diarize`

GPT-4o Transcribe Diarize is an automatic speech recognition (ASR) model with built-in speaker diarization, meaning it associates audio segments with different speakers in a conversation. This model is only available in the Transcription API.

## Model details

- Default snapshot: `gpt-4o-transcribe-diarize`
- Input modalities: text, audio
- Output modalities: text
- 16,000 context window
- 2,000 max output tokens
- Jun 01, 2024 knowledge cutoff

## Pricing

Pricing is based on the number of tokens used, or other metrics based on the model type. For tool-specific models, like search and computer use, there’s a fee per tool call. See details in the [pricing page](/api/docs/pricing).

### Audio tokens

| Metric | Price | Unit |
| --- | ---: | --- |
| Input | $2.5 | 1M tokens |
| Output | $10 | 1M tokens |

## Endpoints

| Endpoint | Route | Support |
| --- | --- | --- |
| Live | `v1/live/sessions` | Not supported |
| Chat Completions | `v1/chat/completions` | Not supported |
| Responses | `v1/responses` | Not supported |
| Realtime | `v1/realtime` | Not supported |
| Realtime translation | `v1/realtime/translations` | Not supported |
| Realtime transcription | `v1/realtime/transcription_sessions` | Not supported |
| Assistants | `v1/assistants` | Not supported |
| Batch | `v1/batch` | Not supported |
| Fine-tuning | `v1/fine-tuning` | Not supported |
| Embeddings | `v1/embeddings` | Not supported |
| Image generation | `v1/images/generations` | Not supported |
| Videos | `v1/videos` | Not supported |
| Image edit | `v1/images/edits` | Not supported |
| Speech generation | `v1/audio/speech` | Not supported |
| Transcription | `v1/audio/transcriptions` | Supported |
| Translation | `v1/audio/translations` | Not supported |
| Moderation | `v1/moderations` | Not supported |
| Completions (legacy) | `v1/completions` | Not supported |

## Snapshots

Snapshots let you lock in a specific version of the model so that performance and behavior remain consistent. Below is a list of all available snapshots and aliases for GPT-4o Transcribe Diarize.

- `gpt-4o-transcribe-diarize`

## Rate limits

Rate limits ensure fair and reliable access to the API by placing specific caps on requests, tokens, audio duration, or other usage within a given time period. Your usage tier determines how high these limits are set and automatically increases as you send more requests and spend more on the API.

### default

| Tier | RPM | TPM |
| --- | ---: | ---: |
| Tier 1 | 500 | 10,000 |
| Tier 2 | 5,000 | 100,000 |
| Tier 3 | 5,000 | 400,000 |
| Tier 4 | 10,000 | 2,000,000 |
| Tier 5 | 10,000 | 6,000,000 |


<!-- ===== https://developers.openai.com/api/docs/models/omni-moderation-latest.md ===== -->

# omni-moderation

> For the complete documentation index, see [llms.txt](/llms.txt). Markdown versions of documentation pages are available by appending `.md` to the page URL.

> Identify potentially harmful content in text and images

Model ID: `omni-moderation-latest`

Moderation models are free models designed to detect harmful content.
This model is our most capable moderation model, accepting images as input as well.
You can find the model card [here](https://cdn.openai.com/API/docs/omni_moderation_information_for_developers.pdf).

## Model details

- Default snapshot: `omni-moderation-2024-09-26`
- Input modalities: text, image
- Output modalities: text

## Endpoints

| Endpoint | Route | Support |
| --- | --- | --- |
| Live | `v1/live/sessions` | Not supported |
| Chat Completions | `v1/chat/completions` | Not supported |
| Responses | `v1/responses` | Not supported |
| Realtime | `v1/realtime` | Not supported |
| Realtime translation | `v1/realtime/translations` | Not supported |
| Realtime transcription | `v1/realtime/transcription_sessions` | Not supported |
| Assistants | `v1/assistants` | Not supported |
| Batch | `v1/batch` | Supported |
| Fine-tuning | `v1/fine-tuning` | Not supported |
| Embeddings | `v1/embeddings` | Not supported |
| Image generation | `v1/images/generations` | Not supported |
| Videos | `v1/videos` | Not supported |
| Image edit | `v1/images/edits` | Not supported |
| Speech generation | `v1/audio/speech` | Not supported |
| Transcription | `v1/audio/transcriptions` | Not supported |
| Translation | `v1/audio/translations` | Not supported |
| Moderation | `v1/moderations` | Supported |
| Completions (legacy) | `v1/completions` | Not supported |

## Supported features

- image_input

## Snapshots

Snapshots let you lock in a specific version of the model so that performance and behavior remain consistent. Below is a list of all available snapshots and aliases for omni-moderation.

- `omni-moderation-2024-09-26`

## Rate limits

Rate limits ensure fair and reliable access to the API by placing specific caps on requests, tokens, audio duration, or other usage within a given time period. Your usage tier determines how high these limits are set and automatically increases as you send more requests and spend more on the API.

### default

| Tier | RPM | RPD | TPM |
| --- | ---: | ---: | ---: |
| free | 250 | 5,000 | 10,000 |
| Tier 1 | 500 | 10,000 | 10,000 |
| Tier 2 | 500 | - | 20,000 |
| Tier 3 | 1,000 | - | 50,000 |
| Tier 4 | 2,000 | - | 250,000 |
| Tier 5 | 5,000 | - | 500,000 |


<!-- ===== https://developers.openai.com/api/docs/models/gpt-transcribe.md ===== -->

# GPT-Transcribe

> For the complete documentation index, see [llms.txt](/llms.txt). Markdown versions of documentation pages are available by appending `.md` to the page URL.

> High-accuracy speech-to-text model for file and Realtime input transcription

Model ID: `gpt-transcribe`

GPT Transcribe is a speech-to-text model for completed audio files, streamed file transcripts, and committed turns in Realtime sessions over WebSocket. It supports unstructured context, keyword hints, and multiple language hints to improve transcription of domain terms, multilingual audio, and code-switching.

## Model details

- Default snapshot: `gpt-transcribe`
- Input modalities: audio, text
- Output modalities: text

## Pricing

Pricing is based on the number of tokens used, or other metrics based on the model type. For tool-specific models, like search and computer use, there’s a fee per tool call. See details in the [pricing page](/api/docs/pricing).

### Transcription audio duration

| Metric | Price | Unit |
| --- | ---: | --- |
| Price | $0.0045 | minute |

## Endpoints

| Endpoint | Route | Support |
| --- | --- | --- |
| Live | `v1/live/sessions` | Not supported |
| Chat Completions | `v1/chat/completions` | Not supported |
| Responses | `v1/responses` | Not supported |
| Realtime | `v1/realtime` | Not supported |
| Realtime translation | `v1/realtime/translations` | Not supported |
| Realtime transcription | `v1/realtime/transcription_sessions` | Supported |
| Assistants | `v1/assistants` | Not supported |
| Batch | `v1/batch` | Not supported |
| Fine-tuning | `v1/fine-tuning` | Not supported |
| Embeddings | `v1/embeddings` | Not supported |
| Image generation | `v1/images/generations` | Not supported |
| Videos | `v1/videos` | Not supported |
| Image edit | `v1/images/edits` | Not supported |
| Speech generation | `v1/audio/speech` | Not supported |
| Transcription | `v1/audio/transcriptions` | Supported |
| Translation | `v1/audio/translations` | Not supported |
| Moderation | `v1/moderations` | Not supported |
| Completions (legacy) | `v1/completions` | Not supported |

## Supported features

- streaming

## Snapshots

Snapshots let you lock in a specific version of the model so that performance and behavior remain consistent. Below is a list of all available snapshots and aliases for GPT-Transcribe.

- `gpt-transcribe`

## Rate limits

Rate limits ensure fair and reliable access to the API by placing specific caps on requests, tokens, audio duration, or other usage within a given time period. Your usage tier determines how high these limits are set and automatically increases as you send more requests and spend more on the API.

### default

| Tier | RPM | TPM |
| --- | ---: | ---: |
| Tier 1 | 500 | 200,000 |
| Tier 2 | 5,000 | 2,000,000 |
| Tier 3 | 5,000 | 4,000,000 |
| Tier 4 | 10,000 | 10,000,000 |
| Tier 5 | 30,000 | 150,000,000 |


<!-- ===== https://developers.openai.com/api/docs/models/gpt-live-transcribe.md ===== -->

# GPT-Live-Transcribe

> For the complete documentation index, see [llms.txt](/llms.txt). Markdown versions of documentation pages are available by appending `.md` to the page URL.

> Low-latency speech-to-text model for realtime transcription

Model ID: `gpt-live-transcribe`

GPT Live Transcribe is a streaming speech-to-text model for applications that need low-latency transcript deltas from live audio. It supports tunable latency, unstructured context, keyword hints, and multiple language hints.

## Model details

- Default snapshot: `gpt-live-transcribe`
- Input modalities: audio, text
- Output modalities: text

## Pricing

Pricing is based on the number of tokens used, or other metrics based on the model type. For tool-specific models, like search and computer use, there’s a fee per tool call. See details in the [pricing page](/api/docs/pricing).

### Realtime audio duration

| Metric | Price | Unit |
| --- | ---: | --- |
| Price | $0.017 | minute |

## Endpoints

| Endpoint | Route | Support |
| --- | --- | --- |
| Live | `v1/live/sessions` | Not supported |
| Chat Completions | `v1/chat/completions` | Not supported |
| Responses | `v1/responses` | Not supported |
| Realtime | `v1/realtime` | Not supported |
| Realtime translation | `v1/realtime/translations` | Not supported |
| Realtime transcription | `v1/realtime/transcription_sessions` | Supported |
| Assistants | `v1/assistants` | Not supported |
| Batch | `v1/batch` | Not supported |
| Fine-tuning | `v1/fine-tuning` | Not supported |
| Embeddings | `v1/embeddings` | Not supported |
| Image generation | `v1/images/generations` | Not supported |
| Videos | `v1/videos` | Not supported |
| Image edit | `v1/images/edits` | Not supported |
| Speech generation | `v1/audio/speech` | Not supported |
| Transcription | `v1/audio/transcriptions` | Not supported |
| Translation | `v1/audio/translations` | Not supported |
| Moderation | `v1/moderations` | Not supported |
| Completions (legacy) | `v1/completions` | Not supported |

## Supported features

- streaming

## Snapshots

Snapshots let you lock in a specific version of the model so that performance and behavior remain consistent. Below is a list of all available snapshots and aliases for GPT-Live-Transcribe.

- `gpt-live-transcribe`

## Rate limits

Rate limits ensure fair and reliable access to the API by placing specific caps on requests, tokens, audio duration, or other usage within a given time period. Your usage tier determines how high these limits are set and automatically increases as you send more requests and spend more on the API.

### default

| Tier | RPM | TPM |
| --- | ---: | ---: |
| Tier 1 | 500 | 60,000 |
| Tier 2 | 2,000 | 210,000 |
| Tier 3 | 5,000 | 390,000 |
| Tier 4 | 10,000 | 600,000 |
| Tier 5 | 10,000 | 780,000 |
