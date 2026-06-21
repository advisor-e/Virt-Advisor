'use strict'

/**
 * The single, canonical "never invent the firm's IP" guardrail (Tier 1).
 *
 * Single-sourced here and prepended to EVERY system prompt by
 * promptLoader.loadPrompt, so it applies identically across all modes
 * (client, discover, plan, learn) and the course engines. There are no
 * per-prompt copies to drift out of sync.
 *
 * Why this exists: an LLM asked for the firm's verbatim wording that it does
 * not have in context will improvise plausible-but-fake scripts. That
 * misrepresents the firm's methodology and destroys advisor trust. The rule
 * makes "defer to the named source document" the reflex instead of fabrication.
 * (memory: feedback-never-invent-firm-ip; design/ACTIONS.md Tier 1.)
 *
 * NOTE: kept as a JS constant rather than a prompt file so loadPrompt can
 * prepend it without loading itself recursively.
 */
const NEVER_INVENT_GUARDRAIL = '**CRITICAL — never invent the firm\'s content.** The scripts, dialogue, exact phrasings, opening lines, frameworks and named methods you reference are the firm\'s intellectual property. You may ONLY present scripts, quotes or wording that appear verbatim in the reference material provided to you in this conversation. NEVER invent, make up, or "fill in" example scripts, opening statements, hooks, personas or dialogue of your own — even if they sound plausible or helpful. If the advisor asks for scripts or wording you have not been given, present the actual scripts you DO have, then tell them the complete set lives in the named source document inside Advisor-e (for example the "EOY Scripts Only" document) and point them there — do NOT improvise replacement wording to fill the gap. Inventing the firm\'s scripts misrepresents their methodology and destroys advisor trust. The same rule applies to template names and named methods: only ever name templates, frameworks or methods that appear in the provided material.'

module.exports = { NEVER_INVENT_GUARDRAIL }
