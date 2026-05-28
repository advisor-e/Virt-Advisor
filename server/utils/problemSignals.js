'use strict'

// Pattern groups for extracting structured problem signals from free-text situationDiagnostic.
// Each entry is an array of regexes; each matching pattern increments the signal's raw score by 1.
// Raw count is used directly — no normalisation. 0 = no evidence; higher = more confident.
const SIGNAL_PATTERN_GROUPS = {
  sales_volume: [
    /foot.?traffic/i,
    /not enough (customers?|clients?|people|visitors?)/i,
    /sales (are|is|were|was) (down|slow|low|poor|flat|weak)/i,
    /slow (sales|business|trade)/i,
    /(low|poor|bad|poor) conversion/i,
    /not (getting|converting|attracting) (enough )?(leads?|inquiries|customers?|business)/i,
    /lack of demand/i,
    /losing customers?/i,
    /customer numbers?/i,
    /need (more )?customers?/i,
    /grow(ing)? (the )?(customer|client) base/i,
    /attract (more )?(customers?|clients?|people)/i,
    /build (a )?(client|customer) base/i,
    /more (customers?|clients?|sales|business)/i
  ],

  pricing_issue: [
    /put(ting)?.{0,15}price[s]? up/i,
    /price[s]? (rise|increase|hike|going up)/i,
    /pricing (issue|problem|concern|challenge)/i,
    /charge (more|higher)/i,
    /undercharg(e|ing|ed)/i,
    /too cheap/i,
    /pass(ing)? (on )?(the )?(cost|increase)/i,
    /afraid to (raise|increase|put up).{0,20}price[s]?/i,
    /can'?t (raise|increase|put up).{0,20}price[s]?/i,
    /margin (compression|squeeze|squeezed)/i,
    /communicat.{0,30}price/i
  ],

  cash_flow_gap: [
    /cash.?flow/i,
    /running out of cash/i,
    /overdraft/i,
    /late (payment|payer|invoices?)/i,
    /debtor[s]?/i,
    /working capital/i,
    /can'?t pay.{0,20}(bills?|wages?|staff)/i,
    /cash.?(tight|squeeze|crunch|crisis)/i,
    /owed money/i,
    /collecting (payments?|invoices?|debts?)/i
  ],

  profit_plateau: [
    /profit (plateau|flat|stagnant|declining|fallen?|dropping)/i,
    /margin[s]? (squeezed|shrinking|declining|down|under pressure)/i,
    /plateau(ed|ing)?/i,
    /not (profitable|making (a )?profit)/i,
    /profitability (issue|problem|challenge|concern)/i,
    /profit (down|dropping|declining|falling)/i,
    /can'?t (seem to )?grow (the )?profit/i
  ],

  // Penalty-only signal: advisor explicitly indicated revenue modelling is not the solution.
  // No positive keywords — used only for resolver penalties.
  modeling_rejected: [
    /don'?t need (a |the )?model/i,
    /already have (a |the )?model/i,
    /not about (the )?model(ling|ing)?/i,
    /not (really )?(a |about )?financial (issue|problem|challenge)/i,
    /operational (problem|issue|challenge)/i,
    /wouldn'?t (want|need|benefit from) (a )?model/i
  ],

  staff_problem: [
    /staff (issue|problem|challenge|leaving|turnover|performance|morale)/i,
    /team (issue|problem|challenge|morale|performance|culture)/i,
    /employee (problem|issue|leaving|performance|dissatisfied)/i,
    /culture (problem|issue|toxic)/i,
    /poor (staff |team )?performance/i,
    /hiring (problem|challenge|issue|difficulty)/i,
    /retain(ing)? (staff|team|employees?|people)/i,
    /people problem/i,
    /leadership (issue|problem|gap)/i
  ],

  strategy_needed: [
    /strategic (direction|plan(ning)?|review|pivot)/i,
    /no (clear |strategic )?direction/i,
    /where (to go|the business is going)/i,
    /pivot(ing)?/i,
    /new (direction|market|product|service|strategy)/i,
    /lost direction/i,
    /long.?term (plan|strategy|direction)/i,
    /growth (plan|strategy|direction)/i
  ],

  data_quality: [
    /data (is|are|was|were) (wrong|bad|messy|dirty|inaccurate|unreliable)/i,
    /rubbish in/i,
    /chart of accounts/i,
    /messy (books?|data|accounts?|records?)/i,
    /incorrect (data|reports?|figures?|numbers?)/i,
    /can'?t trust (the )?(data|numbers?|figures?|reports?)/i,
    /accounts? (in a mess|messy|wrong|incorrect)/i
  ],

  governance_gap: [
    /governance (gap|issue|problem|lacking|needed)/i,
    /no (governance|board structure|accountability)/i,
    /(needs?|wants?) (a |more )?governance/i,
    /accountability (issue|problem|gap)/i,
    /board (structure|function|needed|required)/i,
    /decision.?making (problem|issue|poor|slow)/i
  ],

  succession_issue: [
    /succession/i,
    /exit(ing)? (the business|plan|strategy)?/i,
    /handover/i,
    /pass(ing)? (it|the business) on/i,
    /retir(e|ing|ement)/i,
    /next generation/i,
    /sell(ing)? (the )?business/i
  ],

  systems_gap: [
    /process(es)? (issue|problem|broken|inefficient)/i,
    /system[s]? (issue|problem|needed|outdated|not working)/i,
    /technolog(y|ical) (issue|problem|gap|needed)/i,
    /manual (process|work|admin)/i,
    /inefficient (process|workflow|admin)/i,
    /automat(e|ion|ing) (tasks?|processes?|workflows?)/i,
    /workflow (issue|problem|broken)/i
  ],

  marketing_gap: [
    /marketing (issue|problem|needed|gap|not working)/i,
    /no marketing/i,
    /brand (awareness|recognition|issue|problem)/i,
    /digital (marketing|presence|strategy)/i,
    /online (presence|marketing|visibility)/i,
    /not (visible|known|getting found)/i,
    /awareness (issue|problem|gap|low)/i
  ]
}

/**
 * Extract structured problem signals from a free-text situationDiagnostic string.
 * Returns { signalName: matchCount } for any signal with at least one match.
 * Returns empty object if input is absent or not a real answer.
 */
function extractProblemSignals (text) {
  const result = {}
  if (!text || typeof text !== 'string' || text === 'pending') {
    return result
  }
  for (const [signalName, patterns] of Object.entries(SIGNAL_PATTERN_GROUPS)) {
    let count = 0
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        count++
      }
    }
    if (count > 0) {
      result[signalName] = count
    }
  }
  return result
}

module.exports = { extractProblemSignals }
