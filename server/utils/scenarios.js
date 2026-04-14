/**
 * Scenario definitions for the Virtual Advisor client situation flow.
 *
 * Each scenario covers a common advisory situation. When the advisor's opening
 * message contains matching trigger keywords, the relevant scenario's diagnostic
 * questions (1a–1c) are injected into the system prompt before the AI call.
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
      'profit', 'profitability', 'margin', 'margins', 'expenses',
      'rising costs', 'cost increase', 'cost pressure', 'fuel costs',
      'squeeze'
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
If 1c indicates team and leadership improvement: match the recommendation scope to 1a (individual vs whole team) and the origin to 1b (event-driven vs gradual). Solutions may be up to 4 templates if required. Refer to the People Power Template to guide suggestions.`
  },

  {
    id: 'data-systems',
    label: 'data integrity and financial systems',
    triggerKeywords: [
      'data integrity', 'data', 'inaccurate', 'not accurate', "can't rely", 'cannot rely',
      'not reliable', 'accurate data', 'financial data', 'data quality',
      'quality reports', 'financial reports', 'financial reporting', 'management reports',
      'their financials', 'the financials', 'the figures', 'their figures', 'the numbers',
      'the books', 'chart of accounts', 'financial literacy', 'generating reports',
      'monthly reporting', 'financial systems', 'accounting systems', 'bookkeeping',
      'unreliable', 'clean accounts', 'bad data', 'poor data', 'trust the numbers'
    ],
    questions: {
      q1a: 'Which of the following, if any, does the client currently utilise — (a) a chart of accounts aligned to business practices for reporting purposes, (b) knowledge of their break-even requirements, (c) comprehension of the Working Capital Cycle? Please speak to each of the three points.',
      q1b: 'Describe the staff numbers, experience, and capabilities of the business admin and accounting team.',
      q1c: 'In your opinion, is the issue related to the complexity of their business administration and technology/software shortfalls?'
    },
    phase3Rule: `If 1a indicates poor understanding or non-use of any of the three points raised: ensure templates related to those specific topics are included in the recommendation. The final solution may include 4 or 5 templates if necessary.
If 1b indicates lack of experience or education in accounting: recommendation may also include the Accounting Best Practices section.
If 1c indicates complexity or software issues AND the business is at Leverage, Reach, Leapfrog, or Maturity on the Growth Curve: recommendation may also include the Financial Systems Review.`
  },

  {
    id: 'sales-marketing',
    label: 'sales and marketing',
    triggerKeywords: [
      'sales', 'drop in revenue', 'drop in sales', 'drop in income',
      'low sales', 'marketing', 'messaging', 'media campaigns',
      'advertising', 'brand awareness'
    ],
    questions: {
      q1a: 'Has your client accurately determined if their key problem is lack of sales vs. the profitability from the sales they do make?',
      q1b: 'Does your client track the conversion ratio from prospect to customer or messaging campaign to prospects? If so — which of these and how do they record the data?',
      q1c: "In your opinion, is the issue related to 'Product Fit' — is your client's product or service still competitive?"
    },
    phase3Rule: `If 1a indicates the client does not know whether their issue is sales volume or sales profitability: suggest the Customer Journey template to create clarity first.
If the client has problems with sales volume or conversion: for smaller businesses or where the advisor is newer to this topic, suggest Lite Sales. If the business is more complex, the owner is more open to input, and the advisor is more experienced, suggest the Sales & Marketing Review. The final solution may include up to 4 or 5 templates if necessary.
If 1b indicates the client does not track any conversion data or does a poor job of it: suggest Lite Marketing together with the 8 Profit Levers.
If 1c indicates a product fit issue: refer to pages 7–9 (Product Fit section) of the Sales & Marketing Review template. Refer to the Sales & Marketing Slides table for the full framework index of that template.`
  },

  {
    id: 'forecasting',
    label: 'forecasting and management reporting',
    triggerKeywords: [
      'cash forecast', 'budgets', 'dashboard discussions', 'dashboard',
      'ratio analysis', 'financial management report'
    ],
    questions: {
      q1a: 'These themes reflect different levels of client awareness and readiness. Select the one that best describes where your client is starting from with financial management. [FIN_MGT_THEME_SELECTOR]'
    },
    phase3Rule: `The advisor has selected a theme from the Financial Management Table. Use the selected theme to drive the recommendation:
- The suggested template is determined by the theme selected — recommend it as the primary template.
- The "How to approach it" section should be framed using the solution description for that theme.
- The "Why this fits your client" section should reference the problem description of the selected theme.
- Do NOT recommend templates outside the theme's suggested template unless there is a strong secondary need identified from Phase 2 answers.`
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
 * For a tie: injects a disambiguation instruction plus all tied scenarios' questions and rules.
 */
function buildScenarioBlock (detection) {
  if (detection.type === 'none') return ''

  if (detection.type === 'match') {
    const s = detection.scenario
    const questionsText = Object.entries(s.questions)
      .map(([key, val]) => `**Question ${key.replace('q', '')}:** ${val}`)
      .join('\n')
    return `
---

## Scenario Diagnostic — ${s.label}

The advisor's opening message contains signals related to **${s.label}**. After asking Q1 ("Has the client specifically raised this issue themselves..."), work through the following diagnostic questions in strict order — one at a time — before moving to Q2:

${questionsText}

**Phase 3 rule for this scenario:**
${s.phase3Rule}

---
`
  }

  if (detection.type === 'tie') {
    const labels = detection.scenarios.map(s => s.label)
    const labelList = labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1]

    const blocks = detection.scenarios.map(s => {
      const questionsText = Object.entries(s.questions)
        .map(([key, val]) => `**Question ${key.replace('q', '')}:** ${val}`)
        .join('\n')
      return `
### If the advisor confirms: ${s.label}

${questionsText}

**Phase 3 rule:**
${s.phase3Rule}
`
    }).join('\n')

    return `
---

## Scenario Disambiguation Required

The advisor's opening message contains signals for multiple areas: **${labelList}**. After asking Q1 ("Has the client specifically raised this issue themselves..."), ask this clarifying question before proceeding:

"I'm picking up signals related to ${labelList} in what you've described — which of these would you say is the primary focus for this client?"

Once the advisor confirms their focus, proceed with the relevant diagnostic questions below — one at a time — before moving to Q2.
${blocks}
---
`
  }

  return ''
}

module.exports = { SCENARIOS, detectScenario, buildScenarioBlock }
