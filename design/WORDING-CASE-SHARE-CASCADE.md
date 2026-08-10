# Wording — sharing a case study upward

**Status: AWAITING MIKE'S RULING.** Nothing in this file has been built. It exists so that
what is approved is a checkable artefact rather than a sentence in a chat log
(`CLAUDE.md` → Save the Artefact).

Raised 2026-08-11, during the [`tier-hub-pages`](ACTIONS.md#tier-hub-pages) build.

---

## 1 · Why the wording has to change

Two rulings from Mike, 2026-08-11:

> **"every level at once — follows the cascade up"**

> **"it needs to stay in their channel — only firms data that are member of that group
> (country) goes to that group manager. only group managers aligned with the global group
> manager above report"**

So a case study shared upward is shared **once**, and every managing level above that firm
receives it — but strictly along its own branch. A firm's material rises to its country
group, to its global group (brand), and to the mentor. It never crosses to another brand or
another country.

**The screens do not say this.** They name one destination, nine times, and one of those
nine is the sentence a firm manager reads immediately before clicking approve:

> *"This is what the mentor will see."*

That sentence is now untrue. The material is anonymised either way, so no client is exposed
— but the manager is told a smaller audience than the real one, on a consent screen. It is
the one place wording is not cosmetic.

⚠ **Seven of the nine are on a screen already running in UAT** (the Firm Manager Hub). This
is a change to live wording, not to a new page.

---

## 2 · Every string that names the mentor

Read out of the components 2026-08-11. Line numbers are as at commit `2d38c60`.

### `components/FirmManagerHub.vue` — the firm manager's share flow

| # | Line | Current wording |
|---|------|-----------------|
| 1 | 575 | Mentor review |
| 2 | 576 | Shared with the mentor (anonymised) |
| 3 | 577 | Share an anonymised copy with the mentor to help improve the app. Client details are removed and you approve the copy first. |
| 4 | 585 | Withdraw from mentor |
| 5 | 592 | Share with mentor |
| 6 | 598 | Share with mentor — review the anonymised copy |
| 7 | 601 | **This is what the mentor will see.** Client names, the business and identifying details have been removed; the wording and tone are kept. Approve only if you're happy it's anonymous. |

### `components/MentorReview.vue` — the receiving screen

Both of these matter because this same component is what a group or global manager would
open. As written, a group manager's Case Reviews tab would greet them with the word
"Mentor".

| # | Line | Current wording |
|---|------|-----------------|
| 8 | 4 | Mentor — Case Reviews |
| 9 | 6 | Anonymised case studies that firm managers have shared with you. Client names and identifying details are removed; the wording and tone are kept so you can see how the app performed and where it can improve. |

---

## 3 · Candidate wording — pick one set, or edit either

Both sets keep the tone Mike has ruled for throughout: **offer help, never score.**

### Set A — "the managers above your firm"

Describes the audience by position. Says nothing that goes stale when the master team
supplies the group mapping.

| # | Proposed |
|---|----------|
| 1 | Share for review |
| 2 | Shared for review (anonymised) |
| 3 | Share an anonymised copy with the managers above your firm, to help improve the app. Client details are removed and you approve the copy first. |
| 4 | Withdraw from review |
| 5 | Share for review |
| 6 | Share for review — check the anonymised copy |
| 7 | **This is what the managers above your firm will see** — your group, and Advisor-e. Client names, the business and identifying details have been removed; the wording and tone are kept. Approve only if you're happy it's anonymous. |
| 8 | Case Reviews |
| 9 | Anonymised case studies shared by the firms below you. Client names and identifying details are removed; the wording and tone are kept so you can see how the app performed and where it can improve. |

### Set B — name the levels

Spells the chain out. Clearer about who exactly, but it uses words a firm manager may not
have met, and it reads longer on the button.

| # | Proposed |
|---|----------|
| 1 | Share upward |
| 2 | Shared upward (anonymised) |
| 3 | Share an anonymised copy with your group manager, your global group manager and Advisor-e, to help improve the app. Client details are removed and you approve the copy first. |
| 4 | Stop sharing |
| 5 | Share upward |
| 6 | Share upward — check the anonymised copy |
| 7 | **This is what your group manager, your global group manager and Advisor-e will see.** Client names, the business and identifying details have been removed; the wording and tone are kept. Approve only if you're happy it's anonymous. |
| 8 | Case Reviews |
| 9 | Anonymised case studies shared by the firms in your group. Client names and identifying details are removed; the wording and tone are kept so you can see how the app performed and where it can improve. |

### Recommendation — **Set A**

Three reasons, in order of weight.

1. **It stays true on day one.** No group manager exists yet, and no firm is mapped to a
   group. Set B promises a firm manager that their case reaches a group manager who cannot
   log in. Set A describes the shape without naming levels that are not connected.
2. **"Managers above your firm" is what a firm manager needs to know.** The precise number
   of levels between them and Advisor-e is our concern, not theirs, and it will differ
   between customers — a firm in a one-country brand has fewer levels above it than a firm
   in BDO.
3. **The buttons stay short.** #5 sits inside a small Buefy button next to "Withdraw";
   "Share for review" fits where "Share with your group manager…" would not.

⚠ **#4 differs between the sets on purpose.** Set A's "Withdraw from review" keeps the
existing shape; Set B's "Stop sharing" is plainer but loses the sense that something is
being taken back from people who already have it.

---

## 4 · One question this file does NOT settle

**Does a global group manager see the individual cases from firms two levels below, or only
what its group managers pass up?**

The standing rule is *"each level sees the level immediately below it, summarised"*. That
works for a report made of numbers. A case study is not a number — it is a document, and
"a summary of a group manager" has no natural meaning.

Reading Mike's 2026-08-11 words — *"only group managers aligned with the global group
manager above report"* — the build will treat Case Reviews as **whole-branch**: every level
sees the anonymised cases from every firm beneath it, along its own branch only. A brand
with three countries sees all three countries' donated cases; it never sees another brand's.

**This is an assumption, stated rather than hidden.** It changes no wording above. If it is
wrong, say so and the scoping changes — the wording does not.

---

## 5 · What happens after the ruling

- The nine strings are replaced, and the same wording goes into `locales/en.json` rather
  than being hardcoded a second time (Stack Constitution — no hardcoded English).
- The database column `mentor_shared` and the route `/api/mentor/cases` keep their names.
  **Renaming them is a separate change and not proposed here** — the column records that a
  firm manager approved an upward share, which is still exactly what it means.
- `listSharedWithMentor()` gains a scope argument so it returns only the caller's own
  branch. Today, with no membership data, that returns nothing for a middle tier and
  everything for the mentor — which is precisely today's behaviour, unchanged.

Related:

- [`ACTIONS.md` → tier-hub-pages](ACTIONS.md#tier-hub-pages)
- [`mockups/tier-hub-pages.html`](mockups/tier-hub-pages.html)
- [`ADVISOR-E-DESIGN-LOGIC.md`](ADVISOR-E-DESIGN-LOGIC.md)
