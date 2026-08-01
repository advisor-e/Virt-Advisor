'use strict'

// Stable row ids for domain-support materials.
//
// WHY THEY EXIST. The firm-editable cascade keys a firm's decisions about a row
// — switch it off, edit it, keep their version when the mentor changes theirs —
// to that row's id. Identity therefore has to survive a retitle. Until these ids
// were added a material was identified only by its `name`, so renaming one would
// have silently discarded whatever a firm had decided about it, and the row would
// have quietly reappeared. No error, no warning. Five page titles were retitled
// upstream in the week before this was written, so it is not a hypothetical.
//
// THE RULE THIS LOCKS. An id is assigned once and never changes. It was seeded
// from the title so a human reading the JSON can tell rows apart, but it is NOT
// required to keep matching the title: a retitled row keeps its original id, on
// purpose. Do not "tidy" an id to match a new name — that is exactly the
// breakage this guards against.
//
// Adding a material means adding its id to the list below, deliberately. The
// list is the control; a comment asking people to be careful is not.

const fs = require('fs')
const path = require('path')

const DATA_DIR = path.resolve(process.cwd(), 'data')

const LOCKED_IDS = [
  'conflict-psychology-detachment-and-the-cognitive-pathway',
  'conflict-force-field-analysis-the-6-step-conflict-meeting',
  'data-systems-deming-s-theory-of-volatility',
  'data-systems-common-size-trend-analysis-template',
  'data-systems-ratio-analysis-deck-the-advisory-staircase',
  'data-systems-dashboard-discussions',
  'due-diligence-three-pillar-due-diligence-framework',
  'due-diligence-5-step-process',
  'due-diligence-ford-model-cultural-due-diligence',
  'eoy-meeting-agenda',
  'eoy-basic-targets',
  'eoy-rural-meeting',
  'eoy-advisor-scripts-only',
  'fm-coach-culture-flipping-the-training-process',
  'fm-coach-culture-advisor-case-study-prep',
  'fm-coach-culture-team-training-o-s',
  'fm-coach-culture-building-learning-culture',
  'fm-coach-culture-coaching-progress-plan',
  'fm-coach-culture-fm-hiring-winners',
  'fm-coach-culture-fm-leadership-1',
  'fm-coach-culture-fm-leadership-2',
  'fm-coach-culture-fm-team-canoe-review',
  'fm-coach-culture-job-ad-associate-advisor',
  'fm-coach-culture-paper-tower-model',
  'fm-coach-culture-paper-tower-review-questions',
  'fm-coach-culture-paper-tower-task-sheet',
  'fm-coach-culture-spaghetti-tower-task-sheet',
  'fm-coach-culture-team-workshop-run-sheet',
  'fm-coach-culture-advisory-pip-template',
  'fm-coach-culture-group-coaching-programme',
  'fm-coach-culture-applicant-screening-and-competency-based-recruitment',
  'fm-coach-culture-fee-estimate-and-job-creep-management',
  'fm-coach-culture-centre-of-influence-coi-engagement-framework',
  'forecasting-the-3-pillars-of-financial-management',
  'forecasting-the-client-progression-to-financial-management-services',
  'forecasting-the-advisory-staircase-financial-management',
  'forecasting-working-capital-cycle-money-in-movement',
  'forecasting-cash-tactics-activity-ratios-and-working-capital-tactics',
  'get-marketing-1st-response-proposal-templates',
  'get-marketing-marketing-campaigns-quizzes-video-hyperlinks',
  'get-marketing-90-day-best-practice-training-outreach',
  'get-marketing-crisis-management-covid-19-email-phone-scripts',
  'get-marketing-portal-invitations-system-checklists-let-the-software-do-the-lifting',
  'get-marketing-third-party-collaboration-legal-templates-consent-banker-login-nda',
  'get-marketing-website-blurbs-messaging-plan',
  'get-positioning-the-three-engagement-types',
  'get-positioning-capacity-capability-opportunity-cco',
  'get-positioning-the-helicopter-story',
  'get-positioning-mastering-positioning',
  'get-pricing-proposals-advisory-pricing-model',
  'get-pricing-proposals-general-advisory-proposal',
  'get-pricing-proposals-lite-fundamentals-proposal',
  'get-pricing-proposals-variation-to-scope-of-works',
  'get-sales-decision-tree-sales-structure',
  'get-sales-introduction-prompts',
  'get-sales-lite-sales-prompts-spider',
  'get-sales-scoping-prompts',
  'get-sales-presentation-prompts',
  'get-sales-implementation-rationale',
  'get-sales-tracker-tracker-configuration-lists-calcs',
  'get-sales-tracker-sales-activity-log',
  'get-sales-tracker-coi-centres-of-influence-development',
  'get-sales-tracker-team-report',
  'get-sales-tracker-stats-to-date-dashboard',
  'get-seminar-30-to-40-presentation-template',
  'get-seminar-blank-platform-template',
  'get-seminar-forecast-presentation',
  'get-seminar-funny-stories',
  'get-seminar-growth-stage-seminar',
  'get-seminar-mfs-drafting-template',
  'get-seminar-magic-formula-stories',
  'get-seminar-paper-tower-model',
  'get-seminar-paper-tower-review-questions',
  'get-seminar-paper-tower-task-sheet',
  'get-seminar-powerful-seminars',
  'get-seminar-seminar-entertainment',
  'get-seminar-spaghetti-tower-task-sheet',
  'get-seminar-team-problem-solving',
  'get-seminar-team-workshop-run-sheet',
  'get-seminar-get-feedback-form',
  'get-team-problem-experiential-team-building-task-sheets',
  'get-team-problem-paper-tower-model',
  'get-team-problem-debrief-process-frameworks',
  'governance-leadership-fit-and-the-5-levels-of-team-functioning',
  'governance-decision-quality-psyche-errors-data-and-boardroom-manipulation',
  'governance-8-step-governance-implementation-framework',
  'org-board-pack-master-agenda-notes',
  'org-board-pack-risk-mgt-cover',
  'org-board-pack-annual-board-plan',
  'org-board-pack-board-white-paper',
  'org-board-pack-boardpack-agenda',
  'org-board-pack-meeting-minutes',
  'org-board-pack-boardpack-table',
  'org-board-pack-quality-decisions',
  'org-board-pack-resolutions',
  'org-board-pack-white-paper-program',
  'org-board-pack-deming-s-volatility-principles-in-governance',
  'org-capacity-planner-base-capacity-job-estimation-model',
  'org-capacity-planner-scenario-versioning-management-model',
  'org-capacity-planner-client-trimming-advisory-transition-model',
  'org-firm-strategy-capacity-planner-target-models',
  'org-firm-strategy-team-training-o-s-coaching-progress-plan',
  'org-firm-strategy-growth-curve-checklist',
  'org-firm-strategy-strategic-evaluation-frameworks',
  'org-firm-strategy-contrast-models-fm-expectations-and-fm-stages',
  'org-firm-strategy-tracking-accountability-global-actions-report-cpd-log',
  'org-leadership-directorship-pathway-guidelines',
  'org-leadership-enneagram-based-employment-questions',
  'org-leadership-partner-accountability-conduct-framework',
  'people-power-business-clock-vs-body-clock',
  'people-power-cafe-turnaround-behaviours',
  'people-power-client-survey',
  'people-power-coping-with-covid',
  'people-power-coping-with-the-types-at-their-worst',
  'people-power-ef-incentive-points-explained',
  'people-power-ef-profit-share-agreement',
  'people-power-ge-smart-fast-goals',
  'people-power-hiring-winners',
  'people-power-l-suppt-alignment',
  'people-power-leadership-review',
  'people-power-managing-poor-performance',
  'people-power-notice-of-pip-meeting',
  'people-power-pip-template',
  'people-power-paper-tower-model',
  'people-power-paper-tower-review-questions',
  'people-power-paper-tower-task-sheet',
  'people-power-productive-habits-slides',
  'people-power-productive-habits-doc',
  'people-power-profit-share-model',
  'people-power-remuneration-incentives',
  'people-power-spaghetti-tower-task-sheet',
  'people-power-supplier-survey',
  'people-power-team-canoe-review',
  'people-power-team-survey',
  'people-power-team-workshop-run-sheet',
  'profit-why-use-revenue-models',
  'profit-lite-feasibility-framework',
  'profit-cautious-reveal-method',
  'profit-trial-fit-method',
  'raising-capital-startup-pitch-deck',
  'raising-capital-venture-capital-investment-cycle',
  'raising-capital-six-procedural-hurdles-of-fundraising',
  'raising-capital-90-day-due-diligence-preparation-plan',
  'raising-capital-kotter-s-8-step-change-management-process',
  'raising-capital-six-patterns-of-entrepreneurship',
  'risk-and-uncertainty-core-theory',
  'risk-5-step-risk-management-framework',
  'sales-marketing-6-marketing-questions',
  'sales-marketing-product-fit',
  'sales-marketing-10-marketing-messages',
  'sales-marketing-customer-type-table',
  'sales-marketing-a-i-d-c-r-a-advertisement-framework',
  'sales-marketing-digital-funnel-storyboard',
  'sales-marketing-outbound-messaging-plan',
  'sales-marketing-inbound-landing-page-review',
  'sales-marketing-sparketing-friction-review',
  'sales-marketing-branding-review',
  'sales-marketing-customer-loyalty-programme',
  'sales-marketing-pricing',
  'sales-marketing-packaging-bundling',
  'sales-marketing-sales-channel-options',
  'sales-marketing-sales-process-review',
  'sales-marketing-drafting-tender-proposals',
  'sales-marketing-powerful-seminars',
  'sales-marketing-mapping-the-marketing-sales-process',
  'sales-marketing-speak-easy',
  'staff-5-drivers-of-human-output-performance-diagnosis',
  'staff-performance-framework-diagnosis-and-resolution',
  'staff-organisational-review',
  'staff-org-chart-only',
  'stock-purchasing-inventory-framework',
  'strategy-revealing-the-growth-curve',
  'strategy-the-heald-matrix',
  'strategy-capacity-capability-opportunity',
  'strategy-client-planning-framework',
  'strategy-planning-outcomes-review',
  'strategy-business-targets',
  'strategy-orientation-part-1',
  'strategy-orientation-part-2',
  'strategy-profit-levers-blue-ocean',
  'strategy-swot-pest',
  'strategy-business-dating',
  'strategy-pivot',
  'strategy-porters-pine',
  'succession-quiz-initial-discovery-questionnaire',
  'succession-metaphor-dream-home-visual-frameworks',
  'succession-wishes-meeting-template',
  'succession-comprehensive-guide-6-step-dream-home-methodology',
  'systems-thinking-and-circles-of-causality',
  'systems-three-systems-philosophies',
  'systems-six-business-systems',
  'systems-5-step-process-implementation-framework',
  'valuation-business-sale-assessment-framework-the-3-point-sensitivities',
  'valuation-business-valuation-6-step-methodology'
]

function readDomains () {
  return fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('-domain-support.json'))
    .sort()
    .map(f => ({
      domainId: f.replace('-domain-support.json', ''),
      data: JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'))
    }))
}

describe('domain-support material row ids', () => {
  test('every material row carries a non-empty string id', () => {
    const missing = []
    for (const { domainId, data } of readDomains()) {
      const materials = Array.isArray(data.materials) ? data.materials : []
      materials.forEach((m, i) => {
        if (typeof m.id !== 'string' || m.id.trim() === '') {
          missing.push(domainId + '[' + i + '] ' + (m.name || '(unnamed)'))
        }
      })
    }
    expect(missing).toEqual([])
  })

  test('ids are unique across every domain', () => {
    const seen = new Map()
    const clashes = []
    for (const { domainId, data } of readDomains()) {
      for (const m of (data.materials || [])) {
        if (seen.has(m.id)) { clashes.push(m.id + ': ' + seen.get(m.id) + ' and ' + domainId) }
        seen.set(m.id, domainId)
      }
    }
    expect(clashes).toEqual([])
  })

  test('an id is filed under its own domain', () => {
    const strays = []
    for (const { domainId, data } of readDomains()) {
      for (const m of (data.materials || [])) {
        if (!String(m.id).startsWith(domainId)) { strays.push(domainId + ' -> ' + m.id) }
      }
    }
    expect(strays).toEqual([])
  })

  test('the id set is exactly the locked set — a changed id breaks a firm\'s saved choices', () => {
    const actual = []
    for (const { data } of readDomains()) {
      for (const m of (data.materials || [])) { actual.push(m.id) }
    }
    expect(actual.slice().sort()).toEqual(LOCKED_IDS.slice().sort())
  })
})
