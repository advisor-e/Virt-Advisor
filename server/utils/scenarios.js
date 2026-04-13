/**
 * Scenario definitions for the Virtual Advisor client situation flow.
 *
 * Each scenario covers a common advisory situation. When the advisor's opening
 * message contains matching trigger keywords, the relevant scenario's diagnostic
 * questions (1a, 1b, 1c) are injected into the system prompt before the AI call.
 *
 * Detection logic (in restify-route.js):
 *   - Count keyword matches per scenario
 *   - Most matches wins
 *   - Tie → disambiguation question fires after Q1
 *   - No match → skip 1a–1c, proceed to Q2 as normal
 *
 * To add a new scenario: append an object following the same structure below.
 */

const SCENARIOS = [
  {
    id: 'profit',
    label: 'profitability and cost management',
    triggerKeywords: [
      'profit', 'margin', 'margins', 'expenses', 'rising costs',
      'cost increase', 'cost pressure', 'fuel costs', 'squeeze', 'profitability'
    ],
    questions: {
      q1a: 'Does the client use financial management reports on a regular basis?',
      q1b: 'Do you think the client could benefit from a detailed review of their business variables and profit drivers?',
      q1c: 'What industry is the client in?'
    },
    phase3Rule: `If questions 1a–1c were asked, the recommendation MUST include a revenue model or what-if analysis template from the provided template list. Select the closest real match available — do NOT invent, adapt, or combine template names. The client's industry (from 1c) should be used in the "How to approach it" section to explain how the advisor should apply that template in the context of the client's specific industry — not to create a fictitious industry-specific template name.`
  },

  {
    id: 'staff',
    label: 'staff, productivity and leadership',
    triggerKeywords: [
      'staff', 'employees', 'team', 'efficiency', 'productivity',
      'effectiveness', 'leadership', 'hr', 'morale', 'culture',
      'disharmony', 'poor communication'
    ],
    questions: {
      q1a: 'Does this issue relate to one or two specific employees, or the wider staff in the business?',
      q1b: 'Has the issue surfaced in response to any specific event, or has it just developed over time — and if so, how long has it been building?',
      q1c: 'In your opinion, is this a potential employment law matter, or does it fall into the broader category of team and leadership improvement?'
    },
    phase3Rule: `If 1c indicates employment law: flag clearly that this may require an HR or legal specialist before any advisory template is used. However, a performance improvement plan can still be suggested if the issue relates to just one or two staff — this is available in Advisor-e under Get Organised / Team Coaching & Culture.
If 1c indicates team and leadership improvement: match the recommendation scope to 1a (individual vs whole team) and the origin to 1b (event-driven vs gradual).`
  },

  {
    id: 'data-financials',
    label: 'data integrity and financial management',
    triggerKeywords: [
      'data integrity', 'financials', 'kpis', "kpi's", 'financial management',
      'ratio analysis', 'financial dashboard', 'reporting',
      'financial literacy', 'understanding their financials'
    ],
    questions: {
      q1a: 'Which of the following, if any, does the client currently utilise — (a) a chart of accounts aligned to business practices for reporting purposes, (b) knowledge of their break-even requirements, (c) comprehension of the Working Capital Cycle? Please speak to each of the three points.',
      q1b: 'Describe the staff numbers, experience, and capabilities of the business admin and accounting team.',
      q1c: 'In your opinion, is the issue related to the complexity of their business administration, or technology and software shortfalls?'
    },
    phase3Rule: `If 1a indicates poor understanding or non-use of any of the three points raised: ensure templates related to those specific topics are included in the recommendation. The final solution may include 4 or 5 templates if necessary.
If 1b indicates lack of experience or education in accounting: recommendation may also include the Accounting Best Practices section.
If 1c indicates complexity or software issues AND the business is at Leverage, Reach, Leapfrog, or Maturity on the Growth Curve: recommendation may also include the Financial Systems Review.`
  }
]

/**
 * Detects which scenario (if any) matches the advisor's opening message.
 *
 * Returns one of:
 *   { type: 'none' }
 *   { type: 'match', scenario }
 *   { type: 'tie', scenarios: [scenarioA, scenarioB, ...] }
 */
function detectScenario (message) {
  const lower = message.toLowerCase()

  const results = SCENARIOS.map(scenario => ({
    scenario,
    count: scenario.triggerKeywords.filter(kw => lower.includes(kw.toLowerCase())).length
  })).filter(r => r.count > 0)

  if (results.length === 0) return { type: 'none' }

  const maxCount = Math.max(...results.map(r => r.count))
  const topMatches = results.filter(r => r.count === maxCount)

  if (topMatches.length === 1) return { type: 'match', scenario: topMatches[0].scenario }
  return { type: 'tie', scenarios: topMatches.map(r => r.scenario) }
}

/**
 * Builds the scenario block to inject into the system prompt.
 *
 * For a single match: injects the scenario's questions and Phase 3 rule.
 * For a tie: injects a disambiguation instruction plus both scenarios' questions and rules.
 */
function buildScenarioBlock (detection) {
  if (detection.type === 'none') return ''

  if (detection.type === 'match') {
    const s = detection.scenario
    return `
---

## Scenario Diagnostic — ${s.label}

The advisor's opening message contains signals related to **${s.label}**. After asking Q1 ("Has the client specifically raised this issue themselves..."), work through the following three questions in strict order — one at a time — before moving to Q2:

**Question 1a:** ${s.questions.q1a}
**Question 1b:** ${s.questions.q1b}
**Question 1c:** ${s.questions.q1c}

**Phase 3 rule for this scenario:**
${s.phase3Rule}

---
`
  }

  if (detection.type === 'tie') {
    const [a, b] = detection.scenarios
    const blocks = detection.scenarios.map(s => `
### If the advisor confirms: ${s.label}

**Question 1a:** ${s.questions.q1a}
**Question 1b:** ${s.questions.q1b}
**Question 1c:** ${s.questions.q1c}

**Phase 3 rule:**
${s.phase3Rule}
`).join('\n')

    return `
---

## Scenario Disambiguation Required

The advisor's opening message contains signals for both **${a.label}** and **${b.label}**. After asking Q1 ("Has the client specifically raised this issue themselves..."), ask this clarifying question before proceeding:

"At present I'm reading your core issue as ${a.label} — is that right, or would you prefer we focus more on ${b.label} in this scenario?"

Once the advisor confirms their focus, proceed with the relevant diagnostic questions below — one at a time — before moving to Q2.
${blocks}
---
`
  }

  return ''
}

module.exports = { SCENARIOS, detectScenario, buildScenarioBlock }
