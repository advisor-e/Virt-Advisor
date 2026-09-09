# Specification Quality Checklist: Depreciation Rates Per Country

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-09
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`
- **All 16 items pass as of 2026-09-09.** The three [NEEDS CLARIFICATION] markers the first
  draft carried were put to Mike one at a time and ruled on the same day; each is recorded
  in the spec's Clarifications section and written into the requirements it governs.
  - **FR-025** — one rate, set by the approved table, changing reported profit and tax
    alike. He raised the question himself, after a session had begun building on the
    unstated assumption. His answer confirms slice 1 as built; it also forced **FR-028**,
    since a rate that moves reported profit must be attributable in the finished report.
  - **FR-026** — the country is asked once per forecast, defaulting to the firm's. This
    closed a genuine gap in the application rather than in the drawings: the forecast had
    no country field at all. It forced **FR-029** (the country is saved with the forecast)
    and **FR-030** (changing it never silently moves a rate).
  - **FR-027** — the system proposes a published class per category and the manager
    confirms it. It forced **FR-032**: an uncertain match is left unmatched and named in
    the gaps list rather than guessed at.
- **Two consequences are NOT yet drawn and must be before they are built**: the country
  field on the forecast intake (FR-026), and the per-category class confirmation on the
  manager's screen (FR-027). Neither appears in the two approved mockups, which predate
  these rulings.
