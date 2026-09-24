# OpenAI API reference — parameter excerpts, verbatim, as read 2026-09-24

> **Why excerpts and not the whole pages.** The two reference pages below are machine-generated
> schema: the Chat reference is 231 KB and the Responses "create" reference
> 494 KB, most of it nested type listings for features this app never sends.
> Copying them whole would bury the few lines that matter. So this file quotes, **word for word**,
> only the top-level entry for each setting the app sends or has a reason to watch — each cut where
> the page's first nested bullet begins. Nothing inside a quoted entry is changed.
> **Never edit this copy.** Before relying on a detail, re-read the live page.
>
> What it means for this app: [`../OPENAI-DEVELOPER-DOCS.md`](../OPENAI-DEVELOPER-DOCS.md).

---

## Create chat completion — `POST /v1/chat/completions`

Source: https://developers.openai.com/api/reference/resources/chat.md, section "Create chat completion", "Body Parameters".

- `messages: array of ChatCompletionMessageParam`

  A list of messages comprising the conversation so far. Depending on the
  [model](/api/docs/models) you use, different message types (modalities) are
  supported, like [text](/api/docs/guides/text),
  [images](/api/docs/guides/images-vision), and [audio](/api/docs/guides/audio).

- `model: string or "gpt-6-astra" or "gpt-6-sol" or "gpt-6-luna" or 85 more`

  Model ID used to generate the response, like `gpt-6-astra` or `o3`. OpenAI
  offers a wide range of models with different capabilities, performance
  characteristics, and price points. Refer to the [model guide](/api/docs/models)
  to browse and compare available models.

- `max_tokens: optional number or null`

  The maximum number of [tokens](https://platform.openai.com/tokenizer) that can be generated in the
  chat completion. This value can be used to control
  [costs](https://openai.com/api/pricing/) for text generated via API.

  This value is now deprecated in favor of `max_completion_tokens`, and is
  not compatible with [o-series models](/api/docs/guides/reasoning).

- `max_completion_tokens: optional number or null`

  An upper bound for the number of tokens that can be generated for a completion, including visible output tokens and [reasoning tokens](/api/docs/guides/reasoning).

- `temperature: optional number or null`

  What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.
  We generally recommend altering this or `top_p` but not both.

- `response_format: optional ResponseFormatText or ResponseFormatJSONSchema or ResponseFormatJSONObject`

  An object specifying the format that the model must output.

  Setting to `{ "type": "json_schema", "json_schema": {...} }` enables
  Structured Outputs which ensures the model will match your supplied JSON
  schema. Learn more in the [Structured Outputs
  guide](/api/docs/guides/structured-outputs).

  Setting to `{ "type": "json_object" }` enables the older JSON mode, which
  ensures the message the model generates is valid JSON. Using `json_schema`
  is preferred for models that support it.

- `stream: optional boolean or null`

  If set to true, the model response data will be streamed to the client
  as it is generated using [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format).
  See the [Streaming section below](/api/reference/resources/chat/subresources/completions/streaming-events)
  for more information, along with the [streaming responses](/api/docs/guides/streaming-responses)
  guide for more information on how to handle the streaming events.

- `store: optional boolean or null`

  Whether or not to store the output of this chat completion request for
  use in our [model distillation](/api/docs/guides/supervised-fine-tuning#distilling-from-a-larger-model) or
  [evals](/api/docs/guides/evals) products.

  Supports text and image inputs. Note: image inputs over 8MB will be dropped.

## Create a response — `POST /v1/responses`

Source: https://developers.openai.com/api/reference/resources/responses/methods/create.md, "Body Parameters".

- `input: optional string or array of EasyInputMessage or object { content, role, status, type }  or ResponseOutputMessage or 30 more`

  Text, image, or file inputs to the model, used to generate a response.

  Learn more:

  - [Text inputs and outputs](/api/docs/guides/text)
  - [Image inputs](/api/docs/guides/images-vision)
  - [File inputs](/api/docs/guides/file-inputs)
  - [Conversation state](/api/docs/guides/conversation-state)
  - [Function calling](/api/docs/guides/function-calling)

- `model: optional ResponsesModel`

  Model ID used to generate the response, like `gpt-6-astra`. OpenAI
  offers a wide range of models with different capabilities, performance
  characteristics, and price points. Refer to the [model guide](/api/docs/models)
  to browse and compare available models.

- `text: optional ResponseTextConfig`

  Configuration options for a text response from the model. Can be plain
  text or structured JSON data. Learn more:

  - [Text inputs and outputs](/api/docs/guides/text)
  - [Structured Outputs](/api/docs/guides/structured-outputs)

- `tools: optional array of object { name, parameters, strict, 6 more }  or object { type, vector_store_ids, filters, 2 more }  or object { type }  or 13 more`

  An array of tools the model may call while generating a response. You
  can specify which tool to use by setting the `tool_choice` parameter.

  We support the following categories of tools:

  - **Built-in tools**: Tools that are provided by OpenAI that extend the
    model's capabilities, like [web search](/api/docs/guides/tools-web-search)
    or [file search](/api/docs/guides/tools-file-search). Learn more about
    [built-in tools](/api/docs/guides/tools).
  - **MCP Tools**: Integrations with third-party systems via custom MCP servers
    or predefined connectors such as Google Drive and SharePoint. Learn more about
    [MCP Tools](/api/docs/guides/tools-connectors-mcp).
  - **Function calls (custom tools)**: Functions that are defined by you,
    enabling the model to call your own code with strongly typed arguments
    and outputs. Learn more about
    [function calling](/api/docs/guides/function-calling). You can also use
    custom tools to call your own code.

- `stream: optional boolean or null`

  If set to true, the model response data will be streamed to the client
  as it is generated using [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format).
  See the [Streaming section below](/api/reference/resources/responses/streaming-events)
  for more information.

- `store: optional boolean or null`

  Whether to store the generated model response for later retrieval via
  API.
  Defaults to true when omitted.
  If set to true, response data will be stored for at least 30 days, subject to the [data retention exceptions](/api/docs/guides/your-data#v1responses).

- `max_output_tokens: optional number or null`

  An upper bound for the number of tokens that can be generated for a response, including visible output tokens and [reasoning tokens](/api/docs/guides/reasoning).

- `moderation: optional object { model, policy }  or null`

  Configuration for running moderation on the input and output of this response.

- `service_tier: optional ServiceTier or null`

  Specifies the processing type used for serving the request.

  - If set to 'auto', then the request will be processed with the service tier configured in the Project settings. Unless otherwise configured, the Project will use 'default'.
  - If set to 'default', then the request will be processed with the standard pricing and performance for the selected model.
  - If set to '[flex](/api/docs/guides/flex-processing)', then the request will be processed with the Flex Processing service tier.
  - To opt-in to [Fast mode](/api/docs/guides/fast-mode) at the request level, include the `service_tier=fast` or `service_tier=priority` parameter for Responses or Chat Completions. The response will show `service_tier=priority` regardless of if you specify `service_tier=fast` or `priority` in your request.
  - If set to 'ultrafast', then the request will be processed with the access-controlled Ultrafast Processing service tier. This tier is currently available for `gpt-5.6-sol`; a response served through it will show `service_tier=ultrafast`.
  - When not set, the default behavior is 'auto'.

  When the `service_tier` parameter is set, the response body will include the `service_tier` value based on the processing mode actually used to serve the request. This response value may be different from the value set in the parameter.
