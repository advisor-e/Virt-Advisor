# Templates the logic tables ask for

> **Mike's to action when the search content can be updated.** Nineteen branches across three
> logic tables name a document `data/templates.json` does not hold, so the gate withholds the
> sentence rather than send an adviser to a page that will not open.
>
> The page version of this, with the names highlighted:
> https://claude.ai/code/artifact/9a5bf350-befd-444f-b574-4d806200420f

**Matching ignores case and punctuation.** `Demings Volatility` — already published — matches
`Deming's Theory of Volatility`; `6 Hats` matches `De Bono's 6 Hats`. The words are what must
line up, so some of these may need nothing.

**A sentence dies if ANY name in it is missing.** Four branches name two documents and need both.

⚠ **`Psyche Errors` and `Team AI` may not be documents at all** — they read like concepts inside
other material. If they are, the fix is to reword those two sentences and no page is needed.

---

## The 23 names, spelled as the app looks them up

- `Agreed Response Time Guidelines`
- `Board Resolution`
- `Board White Paper`
- `BoardPack Agenda`
- `Boardpack Table Tracker`
- `Boardroom Manipulation Tactics`
- `Bonus Points System`
- `Client Service Standards`
- `De Bono's 6 Hats`
- `Decision Workpaper`
- `Deming's Theory of Volatility`
- `Directorship Pathway 1`
- `Directorship Pathway 2 Competency Rating Matrix`
- `Enneagram Employment Questions`
- `Ethics Conduct & Effect`
- `Global Actions Report`
- `Interpreting Data Correctly`
- `My Fee Growth Model`
- `Offshoring Review`
- `Psyche Errors`
- `Risk Mgt Cover`
- `Software Assessment Criteria`
- `Team AI`

---

## CA Firm Strategy — 5 branches

Logic table `org_ca_firm_strategy`

| Fires when | Needs | The sentence that is lost | What the adviser hears |
|---|---|---|---|
| Partner group is evaluating a divisive operational strategy such as offshoring or major structural change | `Offshoring Review`<br>`De Bono's 6 Hats` | Use Offshoring Review to structure evaluation of the specific change.<br>Use De Bono's 6 Hats to facilitate the partner discussion and prevent confirmation bias. | **nothing** |
| Firm wants to test a new AI platform or software suite | `Team AI`<br>`Software Assessment Criteria` | Use Team AI (Familiarity) Tasks to build staff familiarity with the platform.<br>Apply Software Assessment Criteria to evaluate the tool formally before committing to adoption. | **nothing** |
| Workflow is overwhelmed and deadlines are at risk of being missed | `Client Service Standards` | Use Client Service Standards to triage client contact priorities during the capacity crunch. | Absorb delays into the Service tier first. |
| A team member has been given the objective of expanding the firm's client base and building a book of business | `My Fee Growth Model` | Use My Fee Growth Model for the financial modelling of fee targets. | Use My Fee Growth Plan for the activity targets and conversion planning. |
| Management needs to verify that advisory advice is translating into completed client tasks | `Global Actions Report` | Use Global Actions Report to track task completion across all advisors and clients at the firm-wide level. | **nothing** |

## Firm Board Pack — 7 branches

Logic table `org_firm_board_pack`

| Fires when | Needs | The sentence that is lost | What the adviser hears |
|---|---|---|---|
| Client struggles with disorganized or ineffective leadership meetings | `BoardPack Agenda` | Use BoardPack Agenda to structure each individual meeting session. | Use Annual Board Plan to map 12 months of meeting themes upfront. |
| Client indicates exposure to market volatility or operational threats | `Risk Mgt Cover` | Use Risk Mgt Cover matrix to identify, classify, and assign strategic actions to all identified risks. | **nothing** |
| Client wants to make a major capital purchase, launch a new product, or enter a new market | `Board White Paper` | Use Board White Paper framework to structure and document the strategic proposal before any board vote or capital commitment. | **nothing** |
| Client has a history of repeating mistakes, ignoring negative data, or making gut-feel choices | `Psyche Errors`<br>`Decision Workpaper` | Use Quality Decisions frameworks to introduce Psyche Errors concepts.<br>Use Decision Workpaper to structure future high-stakes decisions. | **nothing** |
| Client is making assumptions or taking action based on sudden spikes or drops in business metrics | `Interpreting Data Correctly`<br>`Deming's Theory of Volatility` | Use Interpreting Data Correctly framework.<br>Apply Deming's Theory of Volatility to classify the cause type before recommending any action. | **nothing** |
| The board has reached an agreement on raising capital, paying dividends, or buying major assets | `Board Resolution` | Use Board Resolution template to formally document and sign off any major board agreement before action is taken. | **nothing** |
| Directors are arriving at meetings unprepared or having not read required documents | `Boardpack Table Tracker` | Use Boardpack Table Tracker to enforce a read-and-sign-off requirement for all directors before each meeting. | **nothing** |

## Leadership & Partner Development — 7 branches

Logic table `org_leadership`

| Fires when | Needs | The sentence that is lost | What the adviser hears |
|---|---|---|---|
| Firm states they want to promote a senior staff member to partner | `Directorship Pathway 1` | Use Directorship Pathway 1 to verify baseline requirements before proceeding to any competency assessment. | **nothing** |
| Candidate meets baseline pathway requirements and is ready for formal competency evaluation | `Directorship Pathway 2 Competency Rating Matrix` | Use Directorship Pathway 2 Competency Rating Matrix for both self-assessment and peer assessment of the candidate. | **nothing** |
| Interviewing a candidate and assessing their personality type and emotional intelligence | `Enneagram Employment Questions` | Use Enneagram Employment Questions to structure behavioural interview questions matched to the candidate's personality type. | **nothing** |
| A partner is continuously shutting down creative discussions with cold logic or manipulative behaviour | `Boardroom Manipulation Tactics` | Use Boardroom Manipulation Tactics to identify and name the specific disruptive behaviour pattern before raising it formally with the partner group. | **nothing** |
| A partner consistently displays tardiness or grumpiness without improvement despite informal feedback | `Agreed Response Time Guidelines` | Issue a formal Yellow Card using the Agreed Response Time Guidelines. | Document the specific behaviour and the correction deadline clearly. |
| A partner has exceeded their targets by generating over $100k in new combined client fees | `Bonus Points System` | Apply Bonus Points System to calculate and award the performance bonus. | Process before profit share calculations. |
| A partner commits gross negligence resulting in catastrophic market fallout or a serious ethical breach | `Ethics Conduct & Effect` | Use Ethics Conduct & Effect matrix to calculate and formally record Demerit Points. | Apply the resignation threshold if the 20-point limit is reached within 12 months. |

---

## Already closed

**FM Coaching & Firm Culture** asked for `COI Development pt1` and `pt2`. Both were published
under exactly those names all along — the name scanner cut the title at the lowercase `pt`.
Fixed 2026-08-25 in `48265ac`; both branches now reach advisers whole and no template was needed.

## When the search content is updated

Re-run the gate over all 55 recommendations and report what now gets through:

```
node -e "const lt=require('./server/utils/logicTrees');const t=require('./data/logic_trees.json');
let f=0,p=0,w=0;t.trees.forEach(x=>(x.nodes||[]).forEach(n=>{if(!n.recommendation)return;
const a=lt.withholdUnavailableNames(n.recommendation);if(!a)w++;else if(a===n.recommendation.trim())f++;else p++;}));
console.log('whole',f,'partial',p,'withheld',w)"
```

Today it reports **36 whole / 6 partial / 13 withheld**. The counter is also pinned in
`tests/unit/recommendationGate.test.js`, which fails deliberately when the numbers move — adjust
it to the new figures and record what changed.
