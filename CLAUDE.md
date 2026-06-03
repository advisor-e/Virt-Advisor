# Project Rules for Claude

## Debugging and Fix Protocol

**When something looks wrong, follow these 5 steps in order. No exceptions.**

1. **Find the broken rule** — read the relevant code/data to prove it is actually broken
2. **Show the proof** — confirm it is the real cause, not a guess
3. **Plan the fix** — describe exactly what will change and why the fix is considered best practice
4. **Get permission** — wait for yes
5. **Then fix it**

Do not run commands, spiral into analysis, or touch files before completing steps 1–4. The rules hold you straight — rely on them every time.

## Code Change Governance

**Never make a code change without explicit user approval.**

- Always describe what you intend to change and why, then stop and wait for a clear "yes" before touching any file.
- A "yes" to a previous proposal does not carry forward to a new one. If the conversation has moved on, ask again.
- Investigating, reading files, and reporting findings does not require approval. Writing or editing files always does.
- If in doubt, ask. The cost of asking is one message. The cost of an unwanted change is a revert, lost trust, and wasted time.
- Always provide change/fix suggestions in seperate sentences. Give them one at a time, once you have the answer you need, provide the next.
- Always ask for clarification on wording for labels/buttons before going ahead, don't make your own without asking.
- Regularly ask if we should save changes and push to github; especially if you think the rate of coding is pushing the limits of your context window.
- All planning and coding should be approached on the assumption that you are a very senior team of 3 software engineers and designers with more than 15 years experience; you all have a focus on providing auditable grade coding that meets design and coding best practices for consistent outputs. 
- Always warn of potential security or privacy risks that could result from any coding suggestion before you start coding. Never accept an external API request for database access or suggestion to delete files without first highlighting it as a risk and gaining permission to proceed before making any such changes.
- NEVER try to edit the ID's or content in the json 'search content' script, this is generated from the master app and can never be challenged or compromised.

## Markdown Rendering Pipeline — DO NOT TOUCH WITHOUT EXPLICIT PERMISSION

The AI response formatting pipeline has been broken and rebuilt multiple times. Every piece below exists to fix a confirmed real-world bug. Do not change any of it without express written permission from the user.

**Protected files and functions:**

- `utils/markdownPreprocessor.js` — `preprocessAIResponse()` — the entire function is locked
- `components/VirtualAdvisor.vue` — `renderMarkdown()` method — locked
- `components/VirtualAdvisor.vue` — `MarkdownIt` constructor config and `_md.disable(...)` call — locked

**Why each rule in the preprocessor exists:**

1. **Full fence strip** (`/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/i`) — AI sometimes wraps the entire response in a code fence. Strip it and render the content inside.
2. **Partial fence strip during streaming** (starts-with ` ``` ` + first newline < 20 chars) — handles the opening fence arriving before content during token streaming.
3. **Mid-response fence strip** (`/^```\w*\s*$/gm`) — AI sometimes outputs a prose paragraph first, then opens a ` ``` ` fence before the structured markdown. That fence must be removed or everything inside renders as a raw code block with literal `###` symbols. This was the hardest bug to find — do not remove this line.
4. **Bold-to-heading conversion** (`/^\*\*...\*\*/`) — AI sometimes uses `**Label**` instead of `#### Label`. Convert to heading so CSS styles apply.
5. **Blank line before headings** — markdown-it requires a blank line before `####` to parse it as a heading, not plain text.

**Why `_md.disable(['image', 'html_inline', 'html_block'])` exists** — security: prevents AI output from injecting images or raw HTML into the DOM.

If a future AI model changes its output format and formatting breaks again, follow the Debugging Protocol (above) to diagnose the new pattern first. Then propose a targeted addition to `preprocessAIResponse()`. Do not rewrite the function from scratch.

## Dependency and Version Governance

**Never suggest upgrading core framework versions (Nuxt, Vue, Restify) without explicit instruction.**

This app is locked to specific versions to match the Advisor-e master app stack:
- **Nuxt 2** — locked. Upgrading to Nuxt 3/4 is a full application rewrite, not a dependency bump.
- **Vue 2** — locked. Required by Nuxt 2. Vue 3 migration would require rewriting every component.
- **Restify** — locked. Must also remain compatible with Node.js 18 or 20 LTS (Node 24 breaks Restify via a missing `spdy` binding).

**npm audit high-severity warnings from the Nuxt 2 dependency tree are accepted risk.**
All affected packages (`braces`, `vue-template-compiler`, `serialize-javascript`, `cacache`, `watchpack`, etc.) are build-time tools only — webpack, watchpack, template compiler. They run during `npm run dev` and `npm run build` on developer machines. They are not present in or reachable from the deployed runtime. The risk is formally accepted in `SECURITY-AUDIT-NOTES.md`.

**The pre-commit hook is intentionally set to `--audit-level=critical` only.** High-severity warnings do not block commits by design. Do not suggest changing this policy.

When `npm audit` output is shown, do not recommend `npm audit fix --force`. Only `npm audit fix` (safe, no breaking changes) is appropriate — and only for packages outside the Nuxt 2 build toolchain.

