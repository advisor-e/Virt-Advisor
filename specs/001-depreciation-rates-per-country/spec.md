# Feature Specification: Depreciation Rates Per Country

**Feature Branch**: `feat/advisor-progress` (no branch created by Spec Kit — see the constitution)

**Created**: 2026-09-09

**Status**: Draft

**Input**: User description: "Depreciation Rates per country for the Three-Way Forecast. A firm manager loads their tax authority's depreciation documents (NZ IRD, Australian ATO) into a Depreciation Rates tab on the Firm Manager Hub. The AI reads each document and proposes a rate table; nothing uses it until the firm manager approves it, and every proposed rate shows the document and page it came from. The screen must also name what the AI could NOT find in the loaded documents, because a rule introduced after a document was published is invisible from inside that document. An approved table is tagged with its country and applies only to clients in that country. Where two documents give one asset class different rates, the newer publication wins and the older is shown beside it. A firm with no table of its own inherits the nearest approved table above it (group manager, then global group manager, then mentor) and falls back to the app's own six default asset-category rates when no tier has one. An advisor may LOAD a document for a client in a country their firm has no table for, but only the firm manager may APPROVE it. An advisor may also type a rate for their own client, tagged \"entered by you\", which never alters the firm's table. An advisor is never blocked by a missing table. A document that cannot be read reliably is refused rather than guessed at. Context the specification must resolve rather than assume: the forecast holds ONE depreciation rate per asset category, charges it into overheads as a P&L expense, and then computes income tax on the profit after it, so that single rate currently determines both the profit a lender reads and the tax payable; the documents being loaded publish TAX depreciation rates, which are the deduction a tax authority allows in a tax return and are not necessarily the rate a business uses in its own accounts."

**Live list**: item 4.78. Requested by Mike on 2026-09-08 in his own words, and filed on his instruction after he overturned the recommendation against it.

**Approved artefacts** — the drawings this specification describes, both committed before approval:

- [`design/mockups/depreciation-rates-upload.html`](../../design/mockups/depreciation-rates-upload.html) — the firm manager's screen (six rulings, 2026-09-08)
- [`design/mockups/depreciation-rates-advisor.html`](../../design/mockups/depreciation-rates-advisor.html) — the advisor's screen (three rulings, 2026-09-08)

**Already built** — slice 1, commit `d8621e9`: the store, its validation and the four-tier cascade. Backend only, no screen. It embodies the requirements marked *(built)* below. Nothing else exists.

---

## Clarifications

### Session 2026-09-09

- Q: Does an approved table set the forecast's single depreciation rate — changing both reported profit and tax — or only a tax deduction? → A: One rate. The approved table sets it, so approving changes both reported profit and tax.
- Q: Where does a client's country come from, given the forecast has no country field today? → A: Asked once per forecast, defaulting to the firm's country.
- Q: Who decides which published asset class matches each of the forecast's six categories? → A: The system proposes a class for each of the six, naming it, and the manager confirms or changes it.
- Q: Should a country's first-year rule (Investment Boost) be included at all? → A: Yes — "i have advisors applying this to clients already so i know it has a practical user case".
- Q: Does a first-year rule get its own Approve button, or share the one that approves the rates? → A: Its own.
- Q: The boost depends on when an asset was bought. Is a purchase month enough? → A: No — the asset data must record the date each asset was purchased.
- Q: How is the purchase date captured — a dated purchase list, or a date only on boosted purchases? → A: A dated list per category, with the monthly totals derived from it.
- Q: Where does the first-year deduction appear in the printed report, and what is it called? → A: Its own line directly beneath Depreciation, taking its name from the approved rule itself.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A firm manager gives their firm the right rates for their country (Priority: P1)

A firm manager opens Depreciation Rates on their hub and sees which rates their firm is currently working to, and where each one came from. They load their tax authority's depreciation guide. The system reads it and proposes a rate for each of the forecast's asset categories, showing beneath each figure the document and page it was taken from — and, separately, naming what it could **not** find in what was loaded. The manager corrects anything they disagree with and approves. From that moment every forecast their firm produces for a client in that country uses those rates; until that moment nothing changes at all.

**Why this priority**: This is the feature. Without it the six shipped rates are a guess — Vehicles is 20% where New Zealand's tax authority gives 50% — and every forecast a firm produces carries that guess into a document a lender reads. Every other story is a refinement of this one.

**Independent Test**: Load a real depreciation guide, approve the proposed table, and confirm a forecast for a client in that country uses the approved rates while a forecast for a client elsewhere does not. Delivers the whole value on its own.

**Acceptance Scenarios**:

1. **Given** a firm that has approved nothing, **When** the manager opens Depreciation Rates, **Then** they see the app's own six rates, each marked as an app default rather than as a sourced figure.
2. **Given** a loaded depreciation document, **When** the system has read it, **Then** each proposed rate displays the document name, page and publication date it came from.
3. **Given** a proposed table awaiting approval, **When** an advisor in that firm produces a forecast, **Then** the forecast uses the previous rates and nothing indicates the proposal exists.
4. **Given** a proposed table, **When** the manager changes a rate and approves, **Then** the approved value is the manager's, not the one proposed.
5. **Given** a set of loaded documents, **When** the manager reviews the proposal, **Then** the screen names every asset category no loaded document covered, and states the publication date of the newest document loaded so a later rule change is visibly out of range.
6. **Given** two loaded documents giving one asset category different rates, **When** the proposal is shown, **Then** the rate from the more recently published document is proposed and the older figure is displayed beside it rather than discarded. *(built)*
7. **Given** an approved table for one country, **When** a forecast is produced for a client in a different country, **Then** none of those rates are used. *(built)*

---

### User Story 2 - An advisor can see where every rate in their forecast came from (Priority: P2)

An advisor building a forecast reaches the assets step and sees, beside each depreciation rate, where that rate came from: their firm's approved table and the document behind it, a table inherited from a tier above, or the app's own default. Where their client's country has no approved table, a band above the rates says so plainly and the figures are marked as defaults.

**Why this priority**: The rates already appear on this screen; without the origin the advisor cannot tell a sourced figure from a guess, and neither can the person reading the finished report. It depends on Story 1 having produced something to attribute, but delivers value the moment any table exists — including attributing the app's defaults honestly.

**Independent Test**: Open the assets step for a client whose firm has an approved table and for one whose firm has none, and confirm each rate states its origin correctly in both cases.

**Acceptance Scenarios**:

1. **Given** a firm with its own approved table, **When** the advisor views the assets step, **Then** each rate drawn from it names the firm and the source document.
2. **Given** a firm inheriting a table from the tier above it, **When** the advisor views the assets step, **Then** those rates name the tier they came from.
3. **Given** a category no table covers, **When** the advisor views the assets step, **Then** that rate is marked as an app default. *(built)*
4. **Given** a client in a country with no approved table anywhere in the chain, **When** the advisor opens the assets step, **Then** they are told so and are still able to complete the forecast. *(built)*
5. **Given** an advisor who types their own rate, **When** the forecast is produced, **Then** that rate is marked as entered by the advisor both on screen and in the printed report, and the firm's table is unchanged.

---

### User Story 3 - An advisor with an overseas client is not stuck behind their manager (Priority: P3)

An advisor whose client is in a country their firm has no rates for loads that country's depreciation document from the assets step itself and sends it to their firm manager. They are told it has been sent and that nothing in their forecast has changed. When the manager approves it, the advisor is told, and chooses whether to apply it to the forecast they are working on.

**Why this priority**: It removes a dead end rather than adding capability — without it an advisor with an overseas client waits on someone else or silently accepts the wrong rates. It is third because the advisor can already proceed on defaults and type their own rate.

**Independent Test**: As an advisor, load a document for an uncovered country and confirm it reaches the manager's screen for approval, that the forecast is unchanged throughout, and that approval never alters an open forecast without the advisor choosing to apply it.

**Acceptance Scenarios**:

1. **Given** an advisor viewing a client in an uncovered country, **When** they load a document, **Then** it appears on their firm manager's screen marked as an advisor's proposal, and no rate anywhere changes.
2. **Given** an advisor who has sent a document, **When** they continue their forecast, **Then** the rates still show their true origin and never show the proposed figures.
3. **Given** a manager who approves while a forecast is open, **When** the advisor is told, **Then** the forecast is unchanged until the advisor applies it.
4. **Given** an advisor applying a newly approved table, **When** it is applied, **Then** only rates still on app defaults are filled in and any rate the advisor typed is left alone.
5. **Given** an advisor at any point, **When** they attempt to approve a table, **Then** the attempt is refused by the system and not merely hidden from the screen.

---

### Edge Cases

- **A document cannot be read reliably.** The system refuses it, proposes nothing, changes nothing, and says why in terms the person can act on. It never proposes rates from partially recovered text. This is drawn from a real failure: reading the New Zealand guide on 2026-09-08 silently dropped about a dozen letters and the damaged text still read as English, so a search for a missing term returned nothing and the nothing looked like an answer.
- **A rule exists that no loaded document mentions.** New Zealand's Investment Boost postdates both guides supplied, so a reader of those two documents alone would conclude no such scheme exists. The system must state the newest publication date it holds and name what it did not find, so an absence is visible as an absence.
- **The same document is loaded twice.** No rate is recorded as disagreeing with itself.
- **A tier above approves a table after a firm has approved its own.** The firm's own figures continue to win.
- **A storage failure while resolving rates.** The advisor still gets a usable forecast on the nearest rates available, falling back to the app's defaults. A tax-table read never blocks a forecast. *(built)*
- **A rate typed in the wrong units** — 50 where 0.5 was meant. Refused rather than accepted or silently corrected, because a rate 100 times too large produces a forecast that still balances. *(built)*
- **A tax authority's asset class does not correspond to any of the forecast's categories.** See FR-011 and the third clarification below.

## Requirements *(mandatory)*

### Functional Requirements

**Loading and reading documents**

- **FR-001**: A firm manager MUST be able to load more than one depreciation document, and a newly loaded document MUST be read alongside the existing ones rather than replacing them.
- **FR-002**: Each loaded document MUST record the country it applies to, who loaded it, and when.
- **FR-003**: The system MUST refuse a document it cannot read reliably, propose nothing from it, and explain the refusal to the person who loaded it.
- **FR-004**: The system MUST send only the loaded document for reading. No information about any client is sent with it.

**Proposing and approving**

- **FR-005**: Every proposed rate MUST display the document, page and publication date it was taken from.
- **FR-006**: The system MUST list, alongside any proposal, the asset categories no loaded document covered and the publication date of the newest document held.
- **FR-007**: A firm manager MUST be able to change any proposed rate before approving, and the approved value MUST be the manager's.
- **FR-008**: No rate MUST reach any forecast until a firm manager has approved it. *(built — an unapproved table cannot be stored, so there is no state in which one is resolvable)*
- **FR-009**: Only a firm manager or a tier above MUST be able to approve. An approval attempt by an advisor MUST be refused by the system itself, not merely hidden. *(partly built — the store records who approved; the refusal is not built)*
- **FR-010**: Where two documents give one asset category different rates, the system MUST propose the rate from the more recently published document and display the older figure beside it. Where the two publication dates are equal, the incumbent figure MUST be kept and the other still shown. *(built)*
- **FR-011**: The system MUST record, for each approved rate, the tax authority's own wording for the asset class it came from, so a manager can see which published class a forecast category was matched to. *(built)*

**Scope of an approved table**

- **FR-012**: An approved table MUST be tagged with its country and MUST NOT affect a client in any other country. *(built)*
- **FR-013**: A scope with no table of its own MUST inherit from the nearest tier above that has one, in the order firm → group manager → global group manager → mentor. *(built)*
- **FR-014**: Where no tier has a table for a country, the app's own six rates MUST apply and MUST be identified as app defaults. *(built)*
- **FR-015**: The system MUST record, for every rate a forecast uses, which tier supplied it and the source document behind it. *(built)*
- **FR-016**: A missing table MUST NEVER prevent an advisor from completing a forecast. *(built)*

**The advisor**

- **FR-017**: An advisor MUST be able to load a document for their client's country and send it to their firm manager for approval.
- **FR-018**: While a document is awaiting approval, the rates shown to the advisor MUST continue to show their true current origin and MUST NOT show the proposed figures.
- **FR-019**: An approval MUST NOT alter a forecast that is already open. The advisor MUST be told and MUST choose to apply it.
- **FR-020**: Applying a newly approved table MUST fill only the rates still on app defaults and MUST leave any rate the advisor typed unchanged.
- **FR-021**: An advisor MUST be able to type a rate for their own client. Such a rate MUST be identified as entered by the advisor on screen and in the printed report, MUST apply to that client alone, and MUST NOT alter the firm's table.

**Safety**

- **FR-022**: The firm a document belongs to MUST be taken from the verified sign-in, never from anything the browser supplies, so no firm can read or write another's documents or tables.
- **FR-023**: An approved table MUST NOT be overwritten in place. The previous approved version MUST be retained so a firm can return to it and can never be left with no rates at all.
- **FR-024**: Every approved rate MUST be a number within a plausible range for a depreciation rate. A value outside that range MUST be refused rather than corrected. *(built)*

**What an approved rate sets** *(ruled by Mike, 2026-09-09)*

- **FR-025**: An approved table MUST set the forecast's single depreciation rate for each asset category. Approving one therefore changes both the profit the forecast reports and the tax computed on it. The forecast MUST NOT hold a separate accounting rate and tax rate.
- **FR-028**: Because an approved rate moves the reported profit and not only the tax, the origin of every rate MUST be visible in the finished report and not only on the screen where it was set — see FR-015 and FR-021. A reader of a funding document is entitled to know that a depreciation charge follows a tax authority's schedule.

**The client's country** *(ruled by Mike, 2026-09-09)*

- **FR-026**: The forecast MUST ask which country the client is in, once per forecast, defaulting to the firm's own country. Every requirement above that refers to "a client in that country" resolves against this answer.
- **FR-029**: The country MUST be saved with the forecast, so reopening a saved forecast resolves the same rates it was built on rather than whatever is approved at the time it is reopened.
- **FR-030**: Changing the country on an open forecast MUST NOT silently change any rate. The advisor MUST be told which rates would change and choose to apply them, on the same terms as FR-019 and FR-020.

**A country's first-year rule — Investment Boost** *(ruled by Mike, 2026-09-09)*

- **FR-033**: An approved country table MUST be able to carry a **first-year rule**: the percentage of a qualifying asset's cost deducted in the year of purchase, the date the rule starts, what qualifies and what does not, and the document it came from. New Zealand's is Investment Boost — 20% from 22 May 2025.
- **FR-034**: A first-year rule MUST have its **own approval**, separate from the approval of the rates. Approving a rate table MUST NOT adopt a tax scheme as a side effect.
- **FR-035**: Where a rule applies, the qualifying percentage of a purchase MUST be charged as an expense in the period of purchase and the **remainder** capitalised and depreciated at the ordinary rate. The forecast MUST NOT hold a second depreciation rate and MUST NOT compute deferred tax — FR-025 is unchanged.
- **FR-036**: A first-year rule MUST apply only to assets **purchased during the forecast**, never to opening asset values.
- **FR-037**: The advisor MUST state how much of a purchase qualifies. The system MUST NOT decide what qualifies; it MUST show the rule's own words for what does and does not.
- **FR-038**: Where a country has no approved first-year rule, the qualifying field MUST be **absent**, not disabled.
- **FR-039**: 🔴 **The asset data MUST record the DATE each asset was purchased**, not merely the month it falls in. A first-year rule turns on when an asset was bought — Investment Boost starts on 22 May 2025, mid-month — so a month cannot answer the eligibility question at the boundary, and a claim with no purchase date behind it cannot be evidenced afterwards. *(Mike, 2026-09-09: "the boost requires specific time periods of purchase etc so the asset data needs to include the date it was purchased".)*
- **FR-040**: A purchase dated before a rule's start date MUST NOT attract that rule.
- **FR-041**: Asset purchases MUST be entered as a **dated list** per category — each carrying its date, what it is, its cost, and how much of it qualifies for a first-year rule. The twelve monthly totals the forecast works to MUST be **derived** from that list.
- **FR-042**: Deriving the monthly totals MUST leave the forecast engine's input shape unchanged, so the arithmetic pinned by the golden set is untouched. A forecast with an empty purchase list MUST produce exactly what it produces today.
- **FR-043**: There MUST be only one way to enter an asset purchase. The twelve monthly boxes MUST NOT survive alongside the list.
- **FR-044**: A first-year deduction MUST appear in the printed report as **its own line directly beneath Depreciation**, and MUST NOT be added into the depreciation figure — a one-off read as a recurring charge makes the following years look like a collapse in costs.
- **FR-045**: That line MUST take its name from the approved rule itself — *Investment Boost* for New Zealand — so a country whose scheme is named differently carries its own name rather than New Zealand's.

> **This absorbs item 4.77's asset-model change.** That item's own note asks for *"assets carrying a rate or deduction that changes at a date"*, which is FR-039 and FR-041. It is recorded here rather than left as a second, overlapping job — but neither item has been closed or merged on the live list, which is Mike's to decide.

**Matching published asset classes to the forecast's six categories** *(ruled by Mike, 2026-09-09)*

- **FR-027**: For each of the forecast's six asset categories, the system MUST propose one published asset class from the loaded documents, name that class in the tax authority's own wording, and let the firm manager confirm or change it before approval.
- **FR-031**: A confirmed match MUST be stored with the rate, so a later reader can see which published class a forecast category was taken from without reopening the document. *(built — the store holds the published wording alongside each rate)*
- **FR-032**: Where no published class in the loaded documents is a plausible match for a category, the system MUST propose none, leave that category on the app default, and name it in the list of what was not found. It MUST NOT match a category to a class it is unsure of.

### Key Entities

- **Tax document**: a depreciation guide published by a tax authority, loaded by a firm manager or an advisor. Carries the country it applies to, its publication date, who loaded it and when, and whether it has been read successfully.
- **Proposed rate table**: what was read from one or more documents and not yet approved. Reaches no forecast. Carries, per asset category, the proposed rate, the published asset class it was matched to, and the document, page and date behind it.
- **Approved rate table**: a proposed table a firm manager has accepted, possibly with corrections. Belongs to one scope and one country. Carries who approved it and when, and for each rate its source and any older figure it supersedes. It is the only thing a forecast reads.
- **Rate origin**: for each rate a forecast uses, the tier that supplied it and the document behind it — or the fact that it is an app default or a figure the advisor typed.
- **Asset category**: one of the six fixed-asset groupings the forecast depreciates.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a client in a country their firm has approved a table for, 100% of the depreciation rates in the forecast come from that table, and every one of them can be traced on screen to a named document and page.
- **SC-002**: No rate that has not been approved by a firm manager ever appears in a forecast, a printed report, or any figure derived from one — zero occurrences, including while a proposal is pending.
- **SC-003**: A rate approved for one country appears in no forecast for a client in another country — zero occurrences.
- **SC-004**: A firm manager can go from opening the screen to an approved table for their country in a single sitting without help from anyone outside the firm.
- **SC-005**: An advisor whose client's country has no approved table can still complete a forecast, and the report states plainly which figures are app defaults.
- **SC-006**: Where a document cannot be read reliably, the number of rates proposed from it is zero, and the person who loaded it is told why within the same sitting.
- **SC-007**: A reader of the finished report can tell, for every depreciation rate, whether it came from a tax authority's document, from a tier above the firm, from the app's defaults, or from the advisor's own judgement.
- **SC-008**: Approving a table while an advisor has a forecast open changes no figure in that forecast until the advisor chooses to apply it — zero unrequested changes.

## Assumptions

- **The Three-Way Forecast is the only report in scope.** The Multiple Property Assessment has its own separate tax settings, already built and ruled on differently (a group sets them, a firm may correct them, an advisor types over them per client). Nothing here changes those.
- **Countries are identified by their two-letter international code**, which is what the rest of the application already uses for a person's country. A country name typed as free text is refused rather than interpreted, so one country cannot end up with several tables under different spellings.
- **Tax documents are public.** No personal data question arises from sending one to be read, and no exception to the project's data-stripping rule is needed or claimed.
- **The four managing tiers already exist and are built.** This feature adds a table to an existing cascade; it does not create one.
- **Version history and returning to an earlier version come from the mechanism the hub's other editable blocks already use.** They are not designed here.
- **The app's own six rates remain the floor.** They are a guess and are labelled as one wherever they appear; they are never presented as any country's rules.
- **A depreciation rate is stored as a decimal fraction, matching how the forecast engine already holds one**, so a rate cannot be stored in one unit and applied in another.
- **Slice 1 is built and committed** (`d8621e9`) and covers the requirements marked *(built)*. It is a store only: no screen, no upload, no reading of documents, and nothing yet calls it.
