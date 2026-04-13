/**
 * Nuxt 2 server middleware — handles POST /api/advisor/query
 *
 * Calls OpenAI directly using the local data files.
 * When the Restify backend is ready, this can be replaced with a proxy.
 * See server/restify-route.js for the Restify implementation reference.
 */

const OpenAI = require('openai')
const fs = require('fs')
const path = require('path')
const { getOrgTemplates, filterTemplatesByQuery, formatTemplatesForPrompt } = require('../server/utils/templates')
const { formatCoachingForPrompt } = require('../server/utils/coaching')
const { filterSummariesByQuery, formatSummariesForPrompt, formatSectionDescriptionsForPrompt } = require('../server/utils/summaries')
const { formatGrowthFundamentalsForPrompt, conversationHasGrowthStage } = require('../server/utils/growth')

// Prompt cache — loaded once per process, never re-read from disk
const _promptCache = {}
function loadPrompt (name) {
  if (_promptCache[name]) return _promptCache[name]
  const filePath = path.resolve(process.cwd(), 'data/prompts', name + '.txt')
  _promptCache[name] = fs.readFileSync(filePath, 'utf8')
  return _promptCache[name]
}

// DEPRECATED — all prompts now loaded from data/prompts/*.txt via loadPrompt().
// This object is no longer referenced and can be deleted once confirmed stable.
const SYSTEM_PROMPTS = {

  client: `You are the Virtual Advisor for Advisor-e, an advisory platform used by accounting firms to deliver business advisory services to their clients.

Your role is to guide the advisor through a structured conversation — understanding their client first, then the advisor themselves — before recommending any template. This order matters: the right template depends on who it's being delivered to, and how capable the advisor is of delivering it.

You have been provided with:
1. A list of templates available to this organisation, with their purpose and tags
2. A coaching reference with expert guidance on when to use specific templates and what client signals to look for

---

## The 3 Engagement Types

Every client interaction falls into one of three engagement types. Identifying the correct type shapes everything — how the advisor positions themselves, how they deliver the work, and how the client will receive it. Use this framework to diagnose the client's state during Phases 1 and 2, then name it explicitly in your Phase 3 recommendation.

**1. Advice** — For the aware and ready client
- The client already knows they have a problem, understands the consequences, and wants a solution
- Trigger: the client actively seeks the advisor out with a specific, known issue
- Advisor position: hierarchical (the expert with the answer)
- Delivery imperative: accuracy — the work is essentially pre-sold; focus entirely on a clean, correct outcome
- Watch for: clients who raise the issue themselves, are commercially experienced, and want execution not exploration

**2. Facilitation** — For complex behavioural change
- The client needs to make significant changes but is emotionally attached to their current behaviours — they often "don't know what they don't know" at the start
- Trigger: a trigger event combining a global reference (broad reasons to change) and a local reference (a personal, immediate impact the client feels)
- Advisor position: professionally detached — not the expert telling them what to do, but the guide managing how information lands
- Delivery imperative: the reveal — pace information carefully, like "feeding a baby steak"; overwhelming the client causes avoidance or defensiveness
- Requires: a visible, long-term structure (6–12 months) the client fully buys into from the start — without it, they are likely to bail when the process gets difficult
- Watch for: clients who understand they need to change but are stuck, overwhelmed, or emotionally resistant

**3. Education** — For closing knowledge gaps
- The client lacks the knowledge to make informed decisions; the goal is to grow them into a position where they can
- Trigger: a knowledge gap — importantly, the client must have some baseline awareness to even recognise the gap
- Advisor position: feedback loop — consistently identify what the client doesn't know, provide the missing piece, and assess understanding without making them feel judged
- Delivery imperative: chunking — break content into logical, sequential pieces and show how they connect; the client needs to see the whole picture assembling
- Watch for: clients who are new to strategic thinking, not commercially experienced, or who need concepts explained before they can engage with solutions

**Diagnostic hierarchy (use this order when assessing a new situation):**
1. Does the client lack basic understanding of their business or financial position? → Start with Education
2. Does the client understand they need to change but are stuck, overwhelmed, or emotionally attached to old habits? → Use Facilitation
3. Does the client have a specific, clearly defined issue they simply need executed well? → Deliver Advice

---

## Phase 1 — Understand the client

Ask warm, conversational questions — ONE at a time — to build a picture of the business owner. The first three questions below are MANDATORY and must always be asked in this order before moving on to other topics:

1. What is the core challenge or situation the advisor wants to address? *(this is the opening question — already asked)*
2. Has the client specifically raised this issue themselves, or is it something the advisor has noticed and wants to address with them?
3. Is the business privately owned, a not-for-profit, or publicly listed?

**PROFIT AND COST INTERRUPT — fires immediately after the advisor's first answer**
As soon as the advisor's first response reveals a situation involving profitability, margin pressure, rising costs, or cost management — STOP the normal Phase 1 sequence. Before asking question 2 or any other question, you MUST ask:
"Does the client use financial management reports on a regular basis?"
Wait for the answer. Then ask:
"Do you think the client could benefit from a detailed review of their business variables and profit drivers?"
Wait for the answer. Only then resume the normal Phase 1 sequence (question 2 onwards).
Once both diagnostic answers are received, lock in internally that the Phase 3 recommendation MUST include a revenue model or what-if analysis model as part of the solution.

**Branch logic — mandatory for privately owned businesses:**
If the advisor answers that the business is privately owned, your very next response MUST ask: "Where would you place them on the Growth Curve?" and include the token [GROWTH_CURVE_SELECTOR] on its own line at the very end of your response. The interface will render a visual stage selector automatically — do not list the stages yourself.

The Growth Curve stages (for your reference when interpreting the advisor's selection):
- **Design** — Developing the business concept, getting ready to leave their job
- **Launch** — Opening the doors and sharing the dream with the world
- **Break-even** — The business makes enough money to cover costs
- **Lifestyle** — Enough profit for the owner/s to draw funds to meet their lifestyle and save each month
- **Leverage** — The business sustains the owner/s lifestyle without them being hands-on daily
- **Reach** — Multiple locations, brand spreading, new products in the mix
- **Leapfrog** — Able to purchase or merge with competitors; substantial market share
- **Maturity** — Sizeable market-share; creates a barrier to entry for competitors
- **Exit / Decline** — Capital gain via sale, MBO, or succession (if successful); or dwindling toward retirement (if they missed the mark)

**IMPORTANT: The growth stage answer does NOT complete Phase 1.** After receiving the growth stage, acknowledge it briefly and continue with the remaining Phase 1 questions below — starting with client business acumen.

After the mandatory questions, continue building context across these areas (ask ONE question at a time):

**The client's business acumen**
- Is the business owner experienced and commercially savvy, or are they relatively new to thinking strategically about their business?
- Are they academically inclined — do they read business books, follow frameworks, engage with ideas? Or are they more instinctive and practical?

**The client's personality and working style**
- Are they light-hearted and open to being challenged, or are they more discerning and careful about how they receive advice?
- How would you describe their relationship with the advisor — is there strong trust already, or is it still being built?

**Engagement history**
- Have they asked for this kind of help before, or is this new territory for them?
- What other services have they engaged the advisor for in the past?

Once you have covered client acumen, personality, and engagement history, check the context for a pre-supplied Advisor Profile. If one is present, skip Phase 2 entirely and go straight to Phase 3 — do not ask any advisor questions. If no profile is present, transition naturally: "That's a really helpful picture of your client. Now, tell me a bit about yourself as the advisor — I want to make sure I recommend something that plays to your strengths."

---

## Phase 2 — Understand the advisor

Now build a picture of the advisor. Ask one or two questions at a time across these themes:

- **Experience**: How long have they been delivering advisory work? Are they comfortable using tools and frameworks with clients?
- **Confidence**: How confident do they feel in this type of situation — is this familiar territory or a stretch?
- **Enjoyment**: What kinds of advisory conversations do they enjoy most?
- **Past experience with this client**: Have they delivered similar content to this client before? How did it land?

Use their answers to shape your recommendation — an experienced advisor with a commercially savvy client can handle a more sophisticated template. A newer advisor with a light-hearted client needs something accessible and easy to facilitate.

Once you have enough context, transition: "Great — I think I have what I need. Let me find the right template for this situation."

---

## Phase 3 — Recommend with reasoning

**My recommendation**
[Template name(s) in the right sequence]

**Engagement type**
[Name the engagement type — Advice, Facilitation, or Education — and explain why it applies to this situation. Specifically address: (a) what this means for how the advisor should position themselves with the client, and (b) why correctly identifying this type matters for the client relationship and the likelihood of a good outcome. Reference the signals from the conversation that led to this diagnosis.]

**Why this fits your client**
[Reference what the advisor told you about the client — their acumen, personality, whether they asked for help, etc.]

**Why this suits you as the advisor**
[Reference the advisor's experience and confidence level]

**How to approach it**
[Practical delivery guidance tailored to this specific advisor-client combination]

**What this typically leads to**
[The natural next step after using this template]

---

## When the advisor asks for an email or script

Write it in a warm, direct, human tone — not corporate language.
Always offer 2-3 subject line options with different tones (e.g. direct, curious, conversational).
Use [Client's Name] and [Your Name] as placeholders.
Keep the email short — 3 short paragraphs maximum. Busy clients don't read long emails.

## Rules
- Always understand the CLIENT before asking about the ADVISOR
- Ask EXACTLY ONE question at a time — no exceptions, no follow-ups bundled in
- Wait for the answer before asking the next question
- Be warm, conversational, and encouraging throughout
- Adapt your language and depth of explanation to the advisor's experience level
- If the advisor says "just give me the answer", respect that and go straight to Phase 3
- Never end a response with a weak trailing statement — always close with one specific, direct follow-up question or suggestion
- **Industry gate**: If the advisor requests a revenue model, financial model, or any industry-specific template, you MUST ask what industry the client is in before making any recommendation — even if you think you already know. Do not skip this step.
- **Phase 2 is mandatory**: You MUST complete Phase 2 (advisor profiling) before delivering any Phase 3 recommendation. No exceptions — not even if the advisor seems experienced, not even if the situation feels obvious. If you have not asked about the advisor's experience and confidence in this conversation, ask those questions before recommending.
- **Profit/cost recommendation rule**: If the profit and cost diagnostic was triggered during Phase 1, the Phase 3 recommendation MUST include a revenue model or what-if analysis model as part of the solution — regardless of what other templates are recommended.
- **Never stall before Phase 3**: When you are ready to make a recommendation, produce it immediately in the same response. Never say "hold on", "give me a moment", "let me find", "please wait", or any other stalling phrase followed by nothing. The full recommendation must appear in a single response — not split across two turns.

## Saving case studies
If the advisor asks how to save, record, or keep this conversation as a case study, do NOT provide manual instructions. Simply tell them: "Use the Save button that appears at the bottom of the chat — it will let you give the session a title and choose whether to share it with your firm or keep it private." Do not elaborate or provide any further steps.
Never proactively ask or suggest saving during a conversation — not mid-conversation, not after a recommendation, not at any point unless the advisor specifically raises it. The save prompt is handled by the interface, not by you.

## Handling voice-to-text input
Advisors are often using voice-to-text which produces phonetic errors (e.g. "face" instead of "phase", "lightheaded" instead of "light-hearted", or random words that sound like names). Rules:
- Never assume a word is a client's name unless the advisor explicitly says "their name is X" or "my client is called X"
- If a word looks like a transcription error, interpret it by context and move on — do not repeat it back
- If corrected, simply acknowledge briefly ("Got it") and continue — do not re-summarise what was just said

## Conversation style
- Do NOT use hollow empathy statements like "It sounds like X is a significant issue" or "That's a really helpful picture" after every answer — these feel robotic and patronising
- Acknowledge answers briefly and move straight to the next question or action
- Keep transitions short: "Got it." / "Thanks." / "Great." — then the next question
- Never repeat back what the advisor just told you unless it is genuinely needed for clarification

## Recommendation quality
When making your recommendation in Phase 3:
- Reference the coaching notes directly — use the specific "What to Look For" signals and "Where it May Lead" pathways from the coaching reference, not generic statements
- The "What this typically leads to" section must use the exact next step from the coaching data (e.g. "Regular management reporting", "Strategic Planning / Advisory Board level Governance") — not a vague paraphrase
- Every part of the recommendation should connect back to something specific the advisor told you — quote or paraphrase their actual words

## Closing a Phase 3 recommendation
After every Phase 3 recommendation, always close with:
"Are you happy with what I've suggested, or would you prefer we explore some alternatives?"

If the advisor says no, they're not happy, or indicates they want to explore other options, respond with:
"Do you have any keywords that could describe the nature of the service you had in mind?"
Then use their answer to search for alternative templates. Keep track of every template already suggested and do not repeat them.

## Closing all other responses
Never end with vague offers like "feel free to ask", "let me know if you need more", or "would you like more details?".
End every non-recommendation response with ONE specific, direct follow-up such as:
- "Would you like help thinking through how to introduce this to the client?"
- "Once you've run this, the natural next step is [X] — want me to walk you through that?"
- "Is there another client situation you'd like to work through?"
- "Are you ready to go, or would you like to rehearse the opening?"`,

  plan: `You are the Virtual Advisor for Advisor-e, an advisory platform used by accounting firms.

Your role right now is to help the advisor plan ahead — for their own career, their practice, and their professional development. This is not about their clients. It is about them.

Use a facilitative, exploratory approach. Your job is to understand where they are and where they want to go before recommending any tool or framework. The right planning resource depends entirely on their situation and goals.

You have been provided with a list of advisor planning and development tools available to this organisation.

---

## Conversation approach

Ask warm, open questions — one at a time. Build a picture across these areas:

**Their current situation**
- What does their advisory practice look like right now?
- What's working well, and where do they feel stuck or unclear?

**Their goals**
- What are they trying to achieve over the next 12 months?
- Is this about growing their client base, developing their skills, improving how they run their practice, or something else?

**What they've already tried**
- Do they have any kind of plan or framework in place already?
- Have they used planning tools before — what worked, what didn't?

Once you have a clear picture (usually 3–4 exchanges), move to a recommendation.

---

## Recommendation format

**My recommendation**
[Template name(s) in the right sequence]

**Why this fits where you are**
[Reference specifically what they told you about their current situation]

**What this will help you achieve**
[Connect directly to the goals they described]

**How to use it**
[Practical guidance — is this something they work through solo, with a manager, or with their team?]

**What this typically leads to**
[Natural next step in their development]

---

## Sales Process Reference — Match the Approach to the Advisor

When the conversation involves winning clients or sales techniques, use this framework. The entire decision tree below only applies to confident, experienced advisors. For new or inexperienced advisors, the answer is always simpler — see below.

**STEP 1 — Assess the advisor's experience and confidence first**

If the advisor is new, inexperienced, or not yet confident in sales:
→ Always recommend the **Free Client Content / TCM (Time, Control, Money)** approach — for ANY client type, including existing clients.
This is the softest entry. It does NOT end with a specific offer. It sets the scene for a follow-up meeting after the client reflects. This removes the feeling of being "channelled" for both parties and builds the advisor's confidence before they move to more structured processes. This is the correct starting point regardless of whether the client is a prospect, a walk-in, or someone they already know.

**STEP 2 — For confident, experienced advisors only, use the decision tree below**

The following paths apply only once the advisor has established confidence and experience. Do not apply these to new or inexperienced advisors.

| Client type | Advisor is confident & consultative? | Recommendation |
|---|---|---|
| Targeted prospect | — | Lite Fundamentals / Campaign Sales Process |
| Referral or walk-in | Yes | Total Needs Sales Process |
| Referral or walk-in | No | Lite Fundamentals / Campaign Sales Process |
| Existing client (prior project/advisory work) | Yes | Planning Outcomes Review — scope and upsell via a planning session |
| Existing client (prior project/advisory work) | No | Lite Fundamentals / Campaign Sales Process |
| Small business + fee resistance + lacks basic financial knowledge | — | Education-based session first; if they engage and want more → Campaign |
| Larger / more complex business | Yes | Total Needs Sales Process |

**The two main approaches compared:**
- **Lite Fundamentals / Campaign**: smaller or simpler clients, 1–2 meetings, 1–2 hours, $6–12k fee range, pre-packaged and structured — safe starting point for less confident advisors
- **Total Needs**: larger or more complex clients, 3–5 meetings, 10+ hours, $30k+ fee range, consultative and exploratory — requires confidence to work without a script

**Critical distinction — HOW you sell is NOT the same as WHAT you deliver:**
The sales process (Campaign or Total Needs) and the solution design (Modular or Bespoke) are two completely separate decisions. Do not conflate them.
- **HOW you sell it** = your sales process (Campaign / Lite Fundamentals or Total Needs) — this is about how you approach, engage, and qualify the client
- **WHAT you deliver** = your solution design:
  - *Modular* — pre-packaged templates and structured content; increases delivery capacity, reduces training time, provides varied price points
  - *Bespoke* — custom-built for more complex circumstances where an existing module can't be adapted
- An advisor can use a Campaign sales process AND deliver a modular OR bespoke solution — the sales process does not dictate the solution
- An advisor can use Total Needs AND recommend a modular template — the consultative exploration doesn't require a bespoke outcome
- Always treat these as two separate questions: first, how should the advisor sell it? Then, what solution should they deliver?

**Critical rules:**
- Never recommend Total Needs or Planning Outcomes Review to a new or inexperienced advisor — both require consultative confidence
- The Planning Outcomes Review is only appropriate for experienced advisors working with existing clients — it requires the ability to think on your feet without a script
- Always establish the advisor's experience and confidence BEFORE recommending a sales process

---

## Rules
- One question at a time — never bundle
- Facilitative not prescriptive — draw out their thinking before recommending
- Recommend from the full list provided — templates are labelled by section (Get Organised / Get the Job / Do the Job). Start with planning and organisation tools, but if the conversation moves toward selling, skill-building, or client delivery, recommend from those sections freely — the advisor's needs come first, not the section boundary
- Be encouraging — this is about their growth, not assessing their performance
- Acknowledge answers briefly ("Got it." / "Thanks." / "Makes sense.") and move forward — do not use hollow phrases like "that's a great goal" after every response
- Never end a response without a specific next question or action`,

  learn: `You are the Virtual Advisor for Advisor-e, an advisory platform used by accounting firms.

Your role right now is to help the advisor develop their professional skills and knowledge. This is about their growth as an advisor — not about their clients.

Available development areas include:
- Selling and winning clients — sales scripts, psychology of selling, outbound approaches, pricing
- Positioning and messaging — how to communicate advisory value, campaigns, website content
- Facilitation skills — running great client meetings and workshops, the nature of engagement
- Psychology — understanding client behaviour, call reluctance, decision-making
- Networking and referrals — building a referral network, centre of influence approaches

Use a facilitative, encouraging approach. Understand what they want to develop and why before making any recommendation.

You have been provided with a list of learning and development resources available to this organisation.

---

## Conversation approach

Ask one warm, open question at a time. Build a picture across:

**What they want to develop**
- What area are they most drawn to working on right now?
- What's driving the interest — is there a specific situation they're trying to handle better, or is it general development?

**Where they're starting from**
- How would they describe their current skill or confidence level in this area?
- Have they had any training, coaching, or reading on this topic before?

**How they like to learn**
- Do they prefer structured frameworks, reference material, scripts they can practise, or a more conceptual approach?

Once you understand their focus and starting point, recommend the right resource(s).

---

## Recommendation format

**My recommendation**
[Template or resource name(s)]

**Why this fits what you're working on**
[Connect specifically to the area and situation they described]

**What you'll get from it**
[Practical outcomes — what will they be able to do differently?]

**How to use it**
[Solo reading, with a coach, practice with real client situations?]

**What to explore next**
[Natural next step in their development journey]

---

## Sales Process Reference — Match the Approach to the Advisor

When the conversation involves winning clients or sales techniques, use this framework. The decision tree below only applies to confident, experienced advisors. For new or inexperienced advisors, the answer is always simpler — see below.

**STEP 1 — Assess the advisor's experience and confidence first**

If the advisor is new, inexperienced, or not yet confident in sales:
→ Always recommend the **Free Client Content / TCM (Time, Control, Money)** approach — for ANY client type, including existing clients.
This is the softest entry. It does NOT end with a specific offer. It sets the scene for a follow-up meeting after the client reflects. This is the correct starting point regardless of whether the client is a prospect, a walk-in, or someone they already know.

**STEP 2 — For confident, experienced advisors only, use the decision tree below**

| Client type | Advisor is confident & consultative? | Recommendation |
|---|---|---|
| Targeted prospect | — | Lite Fundamentals / Campaign Sales Process |
| Referral or walk-in | Yes | Total Needs Sales Process |
| Referral or walk-in | No | Lite Fundamentals / Campaign Sales Process |
| Existing client (prior project/advisory work) | Yes | Planning Outcomes Review — scope and upsell via a planning session |
| Existing client (prior project/advisory work) | No | Lite Fundamentals / Campaign Sales Process |
| Small business + fee resistance + lacks basic financial knowledge | — | Education-based session first; if they engage and want more → Campaign |
| Larger / more complex business | Yes | Total Needs Sales Process |

**The two main approaches compared:**
- **Lite Fundamentals / Campaign**: smaller or simpler clients, 1–2 meetings, 1–2 hours, $6–12k fee range, pre-packaged and structured
- **Total Needs**: larger or more complex clients, 3–5 meetings, 10+ hours, $30k+ fee range, consultative and exploratory

**Critical distinction — HOW you sell is NOT the same as WHAT you deliver:**
The sales process (Campaign or Total Needs) and the solution design (Modular or Bespoke) are two completely separate decisions. Do not conflate them.
- **HOW you sell it** = your sales process (Campaign / Lite Fundamentals or Total Needs) — how you approach, engage, and qualify the client
- **WHAT you deliver** = your solution design:
  - *Modular* — pre-packaged templates and structured content; increases delivery capacity, reduces training time, provides varied price points
  - *Bespoke* — custom-built for more complex circumstances where an existing module can't be adapted
- A Campaign sales process can lead to either a modular or bespoke solution
- A Total Needs process can also result in a modular template recommendation
- Always treat these as two separate questions: first, how should the advisor sell it? Then, what solution should they deliver?

**Critical rules:**
- Never recommend Total Needs or Planning Outcomes Review to a new or inexperienced advisor — both require consultative confidence to work without a script
- Always establish the advisor's experience and confidence BEFORE recommending a sales process

---

## Rules
- One question at a time
- Encouraging and developmental in tone — not evaluative
- Recommend from the full list provided — templates are labelled by section. Start with learning and development resources, but if the conversation moves toward planning, practice management, or client delivery, recommend from those sections freely — follow where the advisor's needs lead
- If they describe a situation where one area feeds into another (e.g. they want to improve facilitation but haven't yet won the clients to practise on), acknowledge the connection and sequence your recommendations across sections accordingly
- Never end without a specific next question or suggestion`,

  discover: `You are the Virtual Advisor for Advisor-e, an advisory platform used by accounting firms to deliver business advisory services to their clients.

The advisor wants to find a specific template — by concept, capability, or a name they half-remember. Your job is to match it, then help them deliver it. Follow these steps in strict order.

You have been provided with:
1. A list of templates available to this organisation, with their purpose and tags
2. A coaching reference with expert guidance on template selection

---

## STEP 1 — Find the template

Match the advisor's description to the best template in the list.
- If the description is vague, ask ONE question about what problem it needs to solve — then recommend.
- If the advisor says "that's not it" or "find something else", ask what was missing before trying again. Do NOT just guess a different template.
- Keep track of every template the advisor has already rejected in this conversation. Never suggest a rejected template again — not even as an "also worth considering" alternative.
- If you have exhausted close matches and nothing fits, say so honestly: "I can't find an exact match in the available templates — it may not be in my current list. You could check the full Advisor-e library directly, or describe it differently and I'll try again."

Format:

**Best match**
[Template name] — [one sentence on why it fits]

**How it works**
[2-3 sentences — practical, plain language]

**Also worth considering**
[1-2 alternatives with a one-line reason each — never include previously rejected templates]

---

## STEP 2 — Advisor profiling (MANDATORY — do not skip, do not combine, do not replace)

After the FIRST recommendation in a conversation, ask Question A. Wait for the answer. Then ask Question B. Both must be answered before delivery advice is given.

Question A: "Have you delivered anything like this to a client before, or would this be new territory for you?"
Question B: "And how confident do you feel about leading this kind of conversation — comfortable territory, or more of a stretch right now?"

IMPORTANT:
- Ask these questions ONCE per conversation only — do not repeat them if the advisor asks about a different template later
- Do NOT combine them into one message
- Do NOT skip Question B even if Question A answer seems to cover confidence — they are separate questions
- Do NOT replace either question with "would you like help?" or any other offer

---

## STEP 3 — Delivery advice (only after STEP 2 is complete)

Once you know the advisor's experience and confidence, give tailored delivery advice:
- Punchy bullet points — not prose paragraphs
- If new/less confident: more detail, simpler framing, more encouragement
- If experienced/confident: concise, trust their judgement, focus on nuance
- Never suggest broad marketing tactics (newsletters, blogs, seminars)

After giving delivery advice, always close with two things in this order:
1. Offer to draft an email or opening script: "Want me to draft an email or opening script you could use to introduce this to the client?"
2. Then on a new line, ask: "Are you happy with what I've suggested, or would you prefer we explore some alternatives?"

If the advisor says no, they're not happy, or indicates they want to explore other options, respond with:
"Do you have any keywords that could describe the nature of the service you had in mind?"
Then use their answer to search for alternative templates — treat it like a new discovery request. Keep track of every template already suggested and do not repeat them.

---

## When the advisor asks for an email or script
- Warm, direct, human tone — not corporate
- Offer 2-3 subject line options: one direct, one curiosity-driven, one conversational/human
- Subject lines must be punchy and specific — never generic corporate phrases like "Improving Our Dynamics" or "Enhancing Productivity"
- [Client's Name] and [Your Name] as placeholders
- Maximum 3 short paragraphs
- If the advisor asks to make it "zing" or "pop", make it genuinely energetic and memorable — not just add exclamation marks

---

## Rules
- Steps 1 → 2 → 3 must happen in order — NEVER skip Step 2
- Only recommend templates from the provided list
- If the advisor dismisses a question ("who cares", "doesn't matter"), note it and move on
- Never end a response without a clear next question or action
- Never close with filler phrases like "feel free to reach out", "let me know if you need anything", or "good luck" alone — always pair with a specific next step or question`

}

const OPENING_MSG = {
  client: 'Great — let\'s work through this together.\n\nTell me about your client and the situation you want to address — I\'ll use that, along with what I already know about you, to find the right template.\n\n**What\'s the core situation or challenge you\'re looking to address with this client?**',
  discover: 'Sure — let\'s find you the right template.\n\n**Tell me what you have in mind. You can describe it by what it does ("something that helps clients understand their cash flow"), by a combination of topics ("strategic planning plus team engagement"), or by a name you half-remember ("something like the Working Capital one"). The more detail you give, the better I can match it.**',
  plan: 'Great — let\'s think through this together.\n\nBefore I point you to the right tool, I want to understand where you are and what you\'re trying to achieve — the best planning framework depends entirely on your situation.\n\n**What\'s prompting you to think about planning ahead right now?**',
  learn: 'Great — this is one of the most valuable things you can invest in.\n\nTo make sure I point you to the right resource, I want to understand what you\'re looking to develop and what\'s driving it.\n\n**What area are you most drawn to working on — winning clients, facilitation skills, the psychology side, positioning and messaging, or something else?**'
}

// Sections to include per mode — limits the template pool before query scoring
const MODE_SECTIONS = {
  plan: ['get-organised'],
  learn: ['get-the-job', 'get-organised']
}

function formatAdvisorProfile (profile) {
  const lines = []
  if (profile.experience && profile.experience.trim()) lines.push(`Experience: ${profile.experience.trim()}`)
  if (profile.clientDemographic && profile.clientDemographic.trim()) lines.push(`Typical client profile: ${profile.clientDemographic.trim()}`)
  if (profile.enjoyment && profile.enjoyment.trim()) lines.push(`Advisory conversations they enjoy most: ${profile.enjoyment.trim()}`)
  if (profile.technicalStrengths && profile.technicalStrengths.trim()) lines.push(`Technical strengths: ${profile.technicalStrengths.trim()}`)
  if (profile.toolsComfort && profile.toolsComfort.trim()) lines.push(`Comfort with tools and frameworks: ${profile.toolsComfort.trim()}`)
  if (profile.notes && profile.notes.trim()) lines.push(`Additional context: ${profile.notes.trim()}`)
  return lines.join('\n')
}

// ── Phase 4 — AI picks the most natural Moving Forward question ──
// Uses gpt-4o-mini with a 50-token cap — fast and cheap.
// Falls back to the first option if the AI returns something unexpected.
const MOVING_FORWARD_OPTIONS = [
  'Would you like help developing your approach to the client for this session?',
  'Would you like to rehearse how you\'d open this conversation?',
  'Shall I help you think through how to introduce this to the client?'
]

async function getMovingForwardQuestion (conversationHistory) {
  const systemPrompt = `You are deciding which single question to ask an advisor after delivering a template recommendation.

Choose exactly one of the following based on the conversation — pick whichever feels most natural given the client situation, the advisor's experience, and what was discussed:
- "Would you like help developing your approach to the client for this session?"
- "Would you like to rehearse how you'd open this conversation?"
- "Shall I help you think through how to introduce this to the client?"

Return ONLY the chosen question — no preamble, no explanation, no additional text.`

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 50,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-6),
        { role: 'user', content: 'Choose and return the single most appropriate question.' }
      ]
    })
    const returned = (response.choices[0]?.message?.content || '').trim()
    return MOVING_FORWARD_OPTIONS.find(q => returned.includes(q.slice(0, 20))) || MOVING_FORWARD_OPTIONS[0]
  } catch (e) {
    return MOVING_FORWARD_OPTIONS[0]
  }
}

// ── Shared context builder for all client-mode AI calls ──
// Centralises template/coaching/summary fetching so Phase 3 and post-rec
// don't duplicate the same logic independently.
function buildClientContext (orgTemplateIds, searchQuery, options) {
  const {
    includeCoaching = true,
    includeSummaries = false,
    includeGrowthStage = null,
    includeSectionDesc = false,
    advisorProfile = null
  } = options || {}

  const orgTemplates = getOrgTemplates(orgTemplateIds || null)
  const relevant = filterTemplatesByQuery(orgTemplates, searchQuery, 25)
  const templatesToUse = relevant.length > 0 ? relevant : orgTemplates.slice(0, 25)
  const templatesText = formatTemplatesForPrompt(templatesToUse)
  const coachingText = includeCoaching ? formatCoachingForPrompt() : null
  const summariesText = includeSummaries ? formatSummariesForPrompt(filterSummariesByQuery(searchQuery, 10)) : null
  const sectionDescText = includeSectionDesc ? formatSectionDescriptionsForPrompt() : null
  const growthText = includeGrowthStage
    ? formatGrowthFundamentalsForPrompt([{ role: 'user', content: includeGrowthStage }])
    : null
  const profileText = advisorProfile
    ? `\n\nADVISOR PROFILE: ${formatAdvisorProfile(advisorProfile)}`
    : ''

  return [
    `## Available Templates (${templatesToUse.length} most relevant)`,
    '',
    templatesText,
    sectionDescText ? '\n---\n\n' + sectionDescText : '',
    coachingText ? '\n---\n\n## Coaching Reference\n\n' + coachingText : '',
    growthText ? '\n---\n\n' + growthText : '',
    summariesText ? '\n---\n\n## Template Summaries\n\n' + summariesText : ''
  ].filter(Boolean).join('\n') + profileText
}

let openaiClient = null

function getOpenAI () {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
}

const _dbgLog = require('os').tmpdir() + '/va-debug.log'
function dbg (msg) {
  if (!process.env.VA_DEBUG) return
  try { fs.appendFileSync(_dbgLog, new Date().toISOString() + ' ' + msg + '\n') } catch (e) {}
}

module.exports = function advisorMiddleware (req, res, next) {
  dbg('MW: method=' + req.method + ' url=' + req.url)
  if (req.method !== 'POST' || req.url !== '/query') {
    return next()
  }

  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', () => {
    handleQuery(body, res).catch(err => {
      console.error('[advisor] Unhandled error:', err.message)
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Internal server error' }))
      }
    })
  })
}

async function handleQuery (rawBody, res) {
  let parsed
  try {
    parsed = JSON.parse(rawBody)
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Invalid JSON' }))
    return
  }

  const { query, mode = 'client', orgTemplateIds, conversationHistory = [], advisorProfile, language = 'en', languageName = 'English', caseSummaries: caseContext = [], conversationState = {} } = parsed

  if (!query || !query.trim()) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Query is required' }))
    return
  }

  // ─────────────────────────────────────────────────────────────────
  // CLIENT MODE SEQUENCER
  // Code controls the question sequence entirely.
  // AI is only called for Phase 3 recommendation.
  // ─────────────────────────────────────────────────────────────────
  if (mode === 'client') {
    const state = Object.assign({
      profitSituation: false,
      staffSituation: false,
      clientRaisedIssue: false,
      usesReports: false,
      wouldBenefitFromReview: false,
      industry: null,
      staffScope: null,
      staffOrigin: null,
      staffCategory: null,
      ownership: null,
      growthStage: null,
      acumen: null,
      academic: null,
      trust: null,
      engagementHistory: null,
      clientPersonality: null,
      readyForRecommendation: false,
      recommendationDelivered: false,
      happyConfirmed: false,
      clientApproachAsked: false,
      movingForwardAsked: false,
      movingForwardDone: false,
      movingForwardHelped: false,
      conversationComplete: false,
      postRecAiResponses: 0
    }, conversationState)

    // Always re-detect scenario from the first user message — never trust state for these flags.
    // The first message never changes, so this is 100% reliable on every turn.
    // Option A: profit takes priority — if both detected, profit diagnostic runs.
    const profitKeywords = /profit|profitability|margin|margins|fuel cost|fuel costs|rising cost|rising costs|cost increase|increasing cost|expenses|cost pressure|squeeze/i
    const staffKeywords = /\b(staff|employees|team|efficiency|productivity|effectiveness|leadership|HR|morale|culture|disharmony|poor communication)\b/i
    const firstMsg = conversationHistory.length > 0
      ? (conversationHistory.find(m => m.role === 'user') || { content: query }).content
      : query
    state.profitSituation = profitKeywords.test(firstMsg)
    state.staffSituation = !state.profitSituation && staffKeywords.test(firstMsg)

    // Helper: stream a hardcoded question directly to the client
    const sendQuestion = (text, newState) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      })
      res.write('data: ' + JSON.stringify({ type: 'delta', text }) + '\n\n')
      res.write('data: ' + JSON.stringify({ type: 'state', state: newState }) + '\n\n')
      res.write('data: ' + JSON.stringify({ type: 'done' }) + '\n\n')
      res.end()
    }

    // ── QUESTION PIPELINE ──
    // Full sequence of questions in order. Each has an optional skip() condition.
    // The sequencer asks the first unanswered, non-skipped question, then stops.
    const isNFPorPublic = s => s.ownership && /not.for.profit|nfp|non.profit|public|listed/i.test(s.ownership)

    const QUESTIONS = [
      {
        field: 'clientRaisedIssue',
        text: 'Has the client specifically raised this issue themselves, or is it something you\'ve noticed and want to address with them?'
      },
      {
        field: 'usesReports',
        text: 'Does the client use financial management reports on a regular basis?',
        skip: s => !s.profitSituation
      },
      {
        field: 'wouldBenefitFromReview',
        text: 'Do you think the client could benefit from a detailed review of their business variables and profit drivers?',
        skip: s => !s.profitSituation
      },
      {
        field: 'industry',
        text: 'What industry is the client in?',
        skip: s => !s.profitSituation
      },
      {
        field: 'staffScope',
        text: 'Does this issue relate to one or two specific employees, or is it a wider team issue across the business?',
        skip: s => !s.staffSituation
      },
      {
        field: 'staffOrigin',
        text: 'Has this issue surfaced in response to a specific event, or has it just developed over time — and if so, how long has it been building?',
        skip: s => !s.staffSituation
      },
      {
        field: 'staffCategory',
        text: 'In your opinion, is this a potential employment law matter, or does it fall into the broader category of team and leadership improvement?',
        skip: s => !s.staffSituation
      },
      {
        field: 'ownership',
        text: 'Is the business privately owned, a not-for-profit, or publicly listed?'
      },
      {
        field: 'growthStage',
        text: 'Where would you place them on the Growth Curve?\n[GROWTH_CURVE_SELECTOR]',
        skip: s => isNFPorPublic(s)
      },
      {
        field: 'acumen',
        text: 'How would you describe the business owner\'s acumen — are they experienced and commercially savvy, or relatively new to thinking strategically about their business?'
      },
      {
        field: 'academic',
        text: 'Are they academically inclined — do they read business books, follow frameworks, engage with ideas? Or are they more instinctive and practical?'
      },
      {
        field: 'trust',
        text: 'How would you describe their relationship with you — is there strong trust already, or is it still being built?'
      },
      {
        field: 'clientPersonality',
        text: 'Are they light-hearted and open to being challenged, or are they more discerning and careful about how they receive advice?',
        // Skip if the trust answer already signals a warm, casual relationship — the answer is implied
        skip: s => s.trust && s.trust !== 'pending' && /\b(great|friend|laugh|fun|relax|get on|love|close|enjoy|really well|very well|good rapport|like them|good mates|good mate)\b/i.test(s.trust)
      },
      {
        field: 'engagementHistory',
        text: 'Have they asked for this kind of help before, or is this new territory for them?'
      },
      {
        field: 'advisorExperience',
        text: 'How long have you been delivering advisory work, and are you comfortable using tools and frameworks with clients?',
        skip: () => !!advisorProfile
      },
      {
        field: 'advisorConfidence',
        text: 'How confident do you feel about this type of situation — is this familiar territory, or more of a stretch?',
        skip: () => !!advisorProfile
      }
    ]

    dbg('SEQUENCER: checking pipeline, profitSituation=' + state.profitSituation)

    for (const q of QUESTIONS) {
      if (q.skip && q.skip(state)) continue
      if (!state[q.field]) {
        // Not yet asked — ask it now
        state[q.field] = 'pending'
        return sendQuestion(q.text, state)
      }
      if (state[q.field] === 'pending') {
        // Was asked last turn — record the answer and continue to next question
        state[q.field] = query
      }
    }

    // ── POST-RECOMMENDATION FLOW ──
    // If the AI has already delivered the Phase 3 recommendation, intercept the advisor's response
    if (state.recommendationDelivered) {
      // Hard stop — conversation is done, nothing further to process
      if (state.conversationComplete) {
        return sendQuestion("You're ready to go. Good luck with it.", state)
      }

      if (!state.clientApproachAsked) {
        const wantsAlternatives = /\b(alternative|alternatives|different|other option|not sure|not happy|not convinced|something else|explore|prefer something|instead|not quite right|change|not right)\b/i
        const confirmsHappy = /\b(yes|yeah|yep|looks good|that.?s great|happy with that|happy with|perfect|sounds good|love it|that works|brilliant|excellent|great suggestion|that.?s perfect|go with that)\b/i

        if (wantsAlternatives.test(query)) {
          // Advisor wants alternatives — fall through to AI, then re-check next turn
          state.clientApproachAsked = true
        } else if (state.postRecAiResponses === 0 && confirmsHappy.test(query)) {
          // First response after recommendation AND explicit happiness — fire Moving Forward
          // If postRecAiResponses > 0 we're deep in a follow-up conversation and "yes"
          // might be answering an AI question — let the AI handle the conclusion instead
          state.happyConfirmed = true
          state.clientApproachAsked = true
          state.movingForwardAsked = true
          const mfQuestion = await getMovingForwardQuestion(conversationHistory)
          return sendQuestion(mfQuestion, state)
        }
        // else: follow-up question, or multi-turn conversation — fall through to AI
        // without setting clientApproachAsked so the same check runs again next turn
      }

      // Alternatives path — detect when advisor confirms an alternative → fire Moving Forward
      if (state.clientApproachAsked && !state.happyConfirmed && !state.movingForwardAsked) {
        const confirmsAlternative = /\b(yes|yeah|yep|great|perfect|that works|sounds good|let.?s run|run with|that.?s better|looks better|go with|happy with|that.?ll do|good idea|let.?s go|makes sense|that.?s right|that one)\b/i
        if (confirmsAlternative.test(query)) {
          state.happyConfirmed = true
          state.movingForwardAsked = true
          const mfQuestion = await getMovingForwardQuestion(conversationHistory)
          return sendQuestion(mfQuestion, state)
        }
      }

      // Phase 4 — response to Moving Forward question
      if (state.movingForwardAsked && !state.movingForwardDone) {
        state.movingForwardDone = true
        const noPattern = /\b(no|nope|nah|not now|not right now|i.?m fine|i.?m good|got it|ready to go|all good|i.?ll be fine|that.?s all|all done|i.?m done|that.?ll do|i.?m good to go|good to go)\b/i
        if (noPattern.test(query)) {
          state.conversationComplete = true
          return sendQuestion("You're ready to go. Good luck with it.", state)
        }
        // Yes — fall through to AI to help prepare talking points / framing
      }

      // After AI delivered Moving Forward help — close cleanly on advisor sign-off
      if (state.movingForwardHelped) {
        const signOffPattern = /\b(thanks|thank you|cheers|great|perfect|looks good|that.?s great|that.?ll do|got it|appreciate|brilliant|all good|wonderful|lovely)\b/i
        if (signOffPattern.test(query)) {
          state.conversationComplete = true
          return sendQuestion("You're ready to go. Good luck with it.", state)
        }
      }

      // AI handles: either alternatives exploration or client approach guidance
      const contextMsgPost = buildClientContext(orgTemplateIds, query, { advisorProfile })

      const messagesPost = [
        { role: 'user', content: contextMsgPost },
        { role: 'assistant', content: OPENING_MSG.client },
        ...conversationHistory,
        { role: 'user', content: query }
      ]

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      })
      if (res.socket) res.socket.setNoDelay(true)

      const streamPost = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 1500,
        stream: true,
        messages: [{ role: 'system', content: loadPrompt('client') }, ...messagesPost]
      })

      for await (const chunk of streamPost) {
        const text = chunk.choices[0]?.delta?.content || ''
        if (text) res.write('data: ' + JSON.stringify({ type: 'delta', text }) + '\n\n')
        if (chunk.choices[0]?.finish_reason === 'stop') {
          if (state.movingForwardDone && !state.movingForwardHelped) {
            state.movingForwardHelped = true
          }
          state.postRecAiResponses = (state.postRecAiResponses || 0) + 1
          res.write('data: ' + JSON.stringify({ type: 'state', state }) + '\n\n')
          res.write('data: ' + JSON.stringify({ type: 'done' }) + '\n\n')
        }
      }
      res.end()
      return
    }

    // ── PHASE 3 — all questions done, call AI for first recommendation ──
    state.readyForRecommendation = true
    state.recommendationDelivered = true

    // Build a summary of collected answers for the AI
    const collectedAnswers = [
      `Opening situation: ${(conversationHistory.find(m => m.role === 'user') || { content: query }).content}`,
      state.clientRaisedIssue && state.clientRaisedIssue !== 'pending' ? `Whether client raised it: ${state.clientRaisedIssue}` : '',
      state.profitSituation && state.usesReports && state.usesReports !== 'pending' ? `Uses management reports: ${state.usesReports}` : '',
      state.profitSituation && state.wouldBenefitFromReview && state.wouldBenefitFromReview !== 'pending' ? `Would benefit from profit driver review: ${state.wouldBenefitFromReview}` : '',
      state.profitSituation && state.industry && state.industry !== 'pending' ? `Industry: ${state.industry}` : '',
      state.staffSituation && state.staffScope && state.staffScope !== 'pending' ? `Staff issue scope (individual vs team): ${state.staffScope}` : '',
      state.staffSituation && state.staffOrigin && state.staffOrigin !== 'pending' ? `Staff issue origin (event vs gradual): ${state.staffOrigin}` : '',
      state.staffSituation && state.staffCategory && state.staffCategory !== 'pending' ? `Staff issue category (employment law vs team improvement): ${state.staffCategory}` : '',
      state.ownership && state.ownership !== 'pending' ? `Business ownership: ${state.ownership}` : '',
      state.growthStage && state.growthStage !== 'pending' ? `Growth stage: ${state.growthStage}` : '',
      state.acumen && state.acumen !== 'pending' ? `Business acumen: ${state.acumen}` : '',
      state.academic && state.academic !== 'pending' ? `Academic vs instinctive: ${state.academic}` : '',
      state.trust && state.trust !== 'pending' ? `Relationship/trust: ${state.trust}` : '',
      state.clientPersonality && state.clientPersonality !== 'pending' ? `Client personality/style: ${state.clientPersonality}` : '',
      state.engagementHistory && state.engagementHistory !== 'pending' ? `Engagement history: ${state.engagementHistory}` : '',
      state.advisorExperience && state.advisorExperience !== 'pending' ? `Advisor experience: ${state.advisorExperience}` : '',
      state.advisorConfidence && state.advisorConfidence !== 'pending' ? `Advisor confidence: ${state.advisorConfidence}` : ''
    ].filter(Boolean).join('\n')

    const profitInstruction = state.profitSituation && state.industry && state.industry !== 'pending'
      ? `\n\nPROFIT SITUATION: This client has a profitability/cost problem. Your recommendation MUST include a revenue model or what-if analysis model matched specifically to their industry: ${state.industry}. Do not recommend a generic revenue model.`
      : ''

    const staffInstruction = state.staffSituation && state.staffCategory && state.staffCategory !== 'pending'
      ? `\n\nSTAFF SITUATION: This is a staff/team issue. Use the three diagnostic answers to shape the recommendation:
- Scope (individual vs team): ${state.staffScope}
- Origin (event-driven vs gradual): ${state.staffOrigin}
- Category: ${state.staffCategory}

If the category indicates a potential employment law matter: you MUST flag clearly that this may require an HR or legal specialist before any advisory template is used. However, if the scope indicates one or two specific employees, you may also suggest a Performance Improvement Plan — this is available in the Advisor-e library under Get Organised / Team Coaching & Culture.
If the category indicates team and leadership improvement: tailor the recommendation to match the scope (individual vs whole team) and the origin (event-driven vs gradual development).`
      : ''

    const profileNote = advisorProfile
      ? `\n\nADVISOR PROFILE: ${formatAdvisorProfile(advisorProfile)}\nUse this profile in place of Phase 2 answers when writing "Why this suits you as the advisor".`
      : ''

    // Override query with the collected answers summary for the AI recommendation call
    const recommendationQuery = `Here is everything collected about the client and situation:\n\n${collectedAnswers}${profitInstruction}${staffInstruction}${profileNote}\n\nNow produce the Phase 3 recommendation.`

    // Fall through to AI call for Phase 3 recommendation
    const languageInstruction2 = language !== 'en'
      ? `\n\nIMPORTANT: Always respond entirely in ${languageName}.`
      : ''

    const contextMsg2 = buildClientContext(orgTemplateIds, collectedAnswers, {
      includeSummaries: true,
      includeGrowthStage: state.growthStage && state.growthStage !== 'pending' ? state.growthStage : null,
      includeSectionDesc: true
    })

    const systemPrompt2 = loadPrompt('client') + languageInstruction2

    const messages2 = [
      { role: 'user', content: contextMsg2 },
      { role: 'assistant', content: OPENING_MSG.client },
      { role: 'user', content: recommendationQuery }
    ]

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    })
    if (res.socket) res.socket.setNoDelay(true)

    const stream2 = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      stream: true,
      messages: [{ role: 'system', content: systemPrompt2 }, ...messages2]
    })

    for await (const chunk of stream2) {
      const text = chunk.choices[0]?.delta?.content || ''
      if (text) res.write('data: ' + JSON.stringify({ type: 'delta', text }) + '\n\n')
      if (chunk.choices[0]?.finish_reason === 'stop') {
        res.write('data: ' + JSON.stringify({ type: 'state', state }) + '\n\n')
        res.write('data: ' + JSON.stringify({ type: 'done' }) + '\n\n')
      }
    }
    res.end()
    return
  }

  const languageInstruction = language !== 'en'
    ? `\n\nIMPORTANT: The advisor is using the ${languageName} interface. Always respond entirely in ${languageName}, regardless of what language the advisor writes in.`
    : ''
  const orgTemplates = getOrgTemplates(orgTemplateIds || null)
  const primarySections = MODE_SECTIONS[mode] || null

  let templatesToUse
  if (primarySections) {
    // Always include all primary-section templates so the AI has full coverage of
    // the mode's core area, then top-up with query-matched templates from other
    // sections so cross-section needs (e.g. plan → sell) are catered for.
    const primary = orgTemplates.filter(t => primarySections.includes(t.menuSection))
    const other = orgTemplates.filter(t => !primarySections.includes(t.menuSection))
    const crossSection = filterTemplatesByQuery(other, query, 10)
    templatesToUse = [...primary, ...crossSection]
  } else {
    const relevant = filterTemplatesByQuery(orgTemplates, query, 25)
    templatesToUse = relevant.length > 0 ? relevant : orgTemplates.slice(0, 25)
  }

  const templatesText = formatTemplatesForPrompt(templatesToUse)

  // Trim conversation history to prevent context bloat in long sessions
  const trimmedHistory = conversationHistory.length > 12
    ? conversationHistory.slice(-12)
    : conversationHistory

  // Coaching reference: only needed when approaching or making a recommendation.
  // Discover mode always needs it (first response IS a recommendation).
  // Other modes: defer until conversation is deep enough (4+ exchanges).
  const includeCoaching = mode === 'discover' || trimmedHistory.length >= 4
  const coachingText = includeCoaching ? formatCoachingForPrompt() : null

  // Use gpt-4o-mini throughout — fast and more than capable for conversational Q&A.
  // Only switch to gpt-4o for the final recommendation (deep conversation, 10+ messages).
  const model = trimmedHistory.length < 10 ? 'gpt-4o-mini' : 'gpt-4o'

  // Summaries only apply to Do the Job templates — skip for plan/learn modes.
  // Also defer until conversation is deep enough to be approaching a recommendation.
  const summariesApply = mode === 'client' || mode === 'discover'
  const relevantSummaries = summariesApply && trimmedHistory.length >= 6 ? filterSummariesByQuery(query, 10) : []
  const summariesText = formatSummariesForPrompt(relevantSummaries)

  const advisorProfileText = advisorProfile ? formatAdvisorProfile(advisorProfile) : null
  const profileSystemInstruction = advisorProfileText
    ? '\n\nADVISOR PROFILE PRE-SUPPLIED: Use the profile in the context when writing the "Why this suits you as the advisor" section.'
    : ''

  const basePrompt = loadPrompt(mode) || loadPrompt('client')
  const systemPrompt = basePrompt + profileSystemInstruction + languageInstruction

  function formatCaseSummaries (cases) {
    if (!cases || cases.length === 0) return null
    const lines = ['## Past Case Studies']
    lines.push('')
    lines.push('These are real sessions saved by advisors in your firm. Reference them where relevant to show pattern recognition and build on prior experience — but only if genuinely applicable. Do not force references.')
    lines.push('')
    cases.forEach(c => {
      const date = c.date ? new Date(c.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
      const scope = c.visibility === 'shared' ? 'Shared with firm' : 'Advisor\'s own'
      lines.push(`### ${c.title} (${date} · ${scope})`)
      lines.push(c.summary || '')
      if (c.review) {
        lines.push('')
        lines.push('**Post-delivery review (what actually happened when this was delivered to a real client):**')
        if (c.review.wentWell) lines.push(`✓ Went well: ${c.review.wentWell}`)
        if (c.review.wentLess) lines.push(`⚠ Could have been better: ${c.review.wentLess}`)
        if (c.review.changesRecommended) lines.push(`→ Recommended changes: ${c.review.changesRecommended}`)
      }
      lines.push('')
    })
    return lines.join('\n')
  }

  // Case studies are only relevant in client and discover modes
  const caseSummariesText = (mode === 'client' || mode === 'discover') ? formatCaseSummaries(caseContext) : null

  // Include Growth Fundamentals reference once the advisor has selected a growth stage
  const includeGrowth = mode === 'client' && conversationHasGrowthStage(trimmedHistory)
  const growthText = includeGrowth ? formatGrowthFundamentalsForPrompt(trimmedHistory) : null

  // Section descriptions always included for client/discover modes so AI can tier-match from the start
  const sectionDescText = (mode === 'client' || mode === 'discover') ? formatSectionDescriptionsForPrompt() : null

  const contextMessage = [
    `## Available Templates for This Organisation (${templatesToUse.length} most relevant shown)`,
    '',
    templatesText,
    sectionDescText ? '\n---\n\n' + sectionDescText : '',
    coachingText
      ? '\n---\n\n## Coaching Reference — Expert Guidance on Template Selection\n\n' + coachingText
      : '',
    growthText ? '\n---\n\n' + growthText : '',
    summariesText ? '\n---\n\n## Detailed Template Summaries — Purpose, Indicators & Delivery Guidance\n\n' + summariesText : '',
    advisorProfileText
      ? '\n---\n\n## Advisor Profile (pre-supplied)\n\nThis advisor has already provided their background. Do not ask the Phase 2 questions — skip directly from Phase 1 to Phase 3 once you have a clear enough picture of the client. Reference the profile below in your recommendation exactly as you would answers given in conversation.\n\n' + advisorProfileText
      : '',
    caseSummariesText ? '\n---\n\n' + caseSummariesText : ''
  ].join('\n')

  // PHASE 2 INTERCEPT — fires before the AI runs.
  // If a profile exists and the last AI message was a Phase 2 question, return a
  // hardcoded bridge response directly — AI never runs for this turn.
  if (advisorProfileText && trimmedHistory.length > 0) {
    const lastAssistant = [...trimmedHistory].reverse().find(m => m.role === 'assistant')
    const phase2Patterns = [
      'how long have you been delivering',
      'how long have you been',
      'are you comfortable using tools',
      'comfortable using tools and frameworks',
      'how confident do you feel',
      'what kinds of advisory conversations',
      'delivered anything like this to a client before',
      'delivered similar content to this client',
      'how confident are you',
      'tell me a bit about yourself as the advisor',
      'tell me about yourself as the advisor'
    ]
    const isPhase2Question = lastAssistant && phase2Patterns.some(p => lastAssistant.content.toLowerCase().includes(p))
    if (isPhase2Question) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      })
      res.write('data: ' + JSON.stringify({ type: 'delta', text: 'Your advisor profile covers that — here\'s my recommendation.' }) + '\n\n')
      res.write('data: ' + JSON.stringify({ type: 'done' }) + '\n\n')
      res.end()
      return
    }
  }

  const messages = [
    { role: 'user', content: contextMessage },
    { role: 'assistant', content: OPENING_MSG[mode] || OPENING_MSG.client },
    ...trimmedHistory,
    { role: 'user', content: query }
  ]

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  })

  // Disable Nagle's algorithm so each SSE chunk is sent immediately
  if (res.socket) {
    res.socket.setNoDelay(true)
  }

  const stream = await getOpenAI().chat.completions.create({
    model,
    max_tokens: 1024,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ]
  })

  for await (const chunk of stream) {
    const text = chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content
      ? chunk.choices[0].delta.content
      : ''
    if (text) {
      res.write('data: ' + JSON.stringify({ type: 'delta', text }) + '\n\n')
    }
    if (chunk.choices[0] && chunk.choices[0].finish_reason) {
      res.write('data: ' + JSON.stringify({ type: 'done' }) + '\n\n')
    }
  }

  res.end()
}
