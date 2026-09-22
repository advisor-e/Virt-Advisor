# Email to the master coding team — the eight things we need to hook up

> **Draft for Mike to send.** Written 2026-08-15 on his instruction: *"If there's anything
> specific you need to know, in technical terms to enable you to make provision for this, draft
> me the email and I will provide you their response."*
>
> **Everything below is already provisioned on our side.** There is one file —
> [`config/integration.js`](../config/integration.js) — and the answer to six of these eight questions
> is a value typed into it. **No code changes, no rebuild.** That is deliberate: the file's own
> header says it is *"the ONLY file the senior integration team needs to edit."*
>
> **Question 8 was added 2026-09-22**, on Mike's ruling that a client's document carries the
> advisor firm's logo and colour and never Advisor-e's — *"Advisor-e already picks up the colour
> and brands the border to suit."* Its stub is built and shipped inert: unanswered, every document
> falls back to a plain initials disc and no SQL for those columns is ever built.
>
> Send it as it stands, or cut anything you already know the answer to.

---

## The email

**Subject:** AI Coach module — eight integration answers we need before UAT

Hi,

The AI Coach module is tagged at `v0.8.0` and ready to load. Everything below is already built
and waiting — six of the eight answers are values we type into one config file, with no code
change on either side (1–4, 6 and 8); the other two are one call and one lookup from your side.

**1 · The JWT claim names.** We read the signed-in user straight from your token and never look
anyone up. Please confirm the field names in the payload:

| We currently expect | Carries |
| --- | --- |
| `firmId` | the firm / branch id |
| `advisorId` | the adviser's id |
| `role` | the role string |
| `email` | the user's email |
| `name` | display name (optional — without it we show the adviser id) |

**2 · How the token is signed.** HS256 with a shared secret, or RS256? If RS256, we need the
public key. This changes one line in one file either way.

**3 · The two management role values.** We support four tiers — mentor, global group manager,
group manager, firm manager. (A global group is a brand; a group is normally a country. Those
describe what each level covers — the roles are named as above.) The first and last work today.
The two middle ones
are **deliberately switched off and fail closed** until you give us the real role strings, so no
token can accidentally resolve to a tier that does not exist yet. Please send the two values.

**4 · Two extra claims for those managers.** A global group manager's token needs to name the
brand they manage, and a group manager's needs the brand and the country. We understand you already hold
both on the user record — the branch and the country address — so this is a pass-through, not new
data. We currently expect them as `globalGroup` (e.g. `BDO`) and `country` (e.g. `DE`). Please
confirm the names.

**5 · How we learn which group a firm belongs to.** This is the one we cannot derive from a token.
When a global group manager opens a report, we roll up the firms beneath them — so we need to know, for
any given firm, which brand and country it sits under. **Any of these works, whichever is least
work for you:** a column on the firms table, a small read-only endpoint, or a lookup we query
once and cache. Until it exists, our reports fall back to a flat structure — they do not guess.

**6 · Pushing the search-content export to us when I publish.** Today I download the
`search_content_*.json` export from Advisor-e and upload it into the module by hand. The module
now has an endpoint that accepts that same file directly, so the step can go. When I publish,
please `POST` the export file's JSON array, as the request body with
`Content-Type: application/json`, to:

`POST {module base URL}/api/integration/templates`

with a header `x-advisor-e-push-secret` carrying a shared secret. Send me the secret you would
like to use, or I will send you one; we set it as an environment variable on the module's
backend. A `201` means it is stored and live within a minute. Until the secret is set on our
side the endpoint answers `404`, so nothing can arrive before we both hold it. The file is
capped at 10 MB and validated exactly as the manual upload is.

**7 · Where an adviser's identity lives.** The Adviser Network shows each adviser's name, title,
firm, email, phone and location, and those belong to Advisor-e — we never store a copy. Our
tables hold only what an adviser advertises about their practice (availability, about,
strengths, industries, topics), keyed by adviser id. For a given adviser id, and for a list of
ids, where do we read those six identity fields? **Any of these works:** the table and column
names in your MySQL, a read-only endpoint on Advisor-e, or a view you expose to us. Until we
know, the network runs on a placeholder list and cannot show a real adviser.

**8 · Where a firm's logo and brand colour live.** You already hold both on the **firm profile
page**, and Advisor-e already picks the colour up to brand its own borders. The module produces a
client-facing strategy plan that is white-labelled — the client sees their own advisor's firm,
never Advisor-e — so it needs those same two values, **read-only**. We keep no copy of them and
we have no screen that edits them; if a firm changes its logo with you, our documents change with
it.

We would read them off the `firms` record we already query, so **any of these works, whichever is
least work for you:** add the two columns to that table, point us at your own firms table (our
`config/db-schema.sql` already invites exactly that), or expose a view carrying them. Please send
the two column names:

| We need a column carrying | Format we expect |
| --- | --- |
| the firm's logo | an absolute `http(s)` URL to the image |
| the firm's brand colour | `#rrggbb` (or `#rgb`) |

Either one alone is useful — you need not send both. Until they arrive every document falls back
to a plain disc with the firm's initials, which is the state it ships in today.

**And the database.** MySQL host, port, database name, user and password. Also: do you want to
run our schema yourself, or should we hand you the SQL? Our tables are additive and do not touch
anything of yours.

Thanks —
Mike

---

## Notes for us — not part of the email

**Why these eight and nothing else.** Questions 1–5 and 8 are exactly the `TODO` lines in
[`config/integration.js`](../config/integration.js). Everything else in that file already has a
working value.

**What each answer unblocks, so the reply can be actioned the same day:**

| Answer | Unblocks | What we do with it |
| --- | --- | --- |
| Claim names (1) | every authenticated screen | type them into `AUTH` |
| Signing method (2) | the whole backend | one value, or one line in `firmAuth.js` if RS256 |
| Role values (3) | to-do §3.2 — the two middle hubs | `globalManagerRole`, `groupManagerRole` |
| The two claims (4) | a manager resolving their own scope | `globalGroupClaim`, `countryClaim` |
| Firm → group (5) | to-do §3.3 — roll-ups above a firm | `parentScopeOf()` stops returning the platform scope |
| The push secret (6) | Cascade Phase 4 — the download step disappears | set `ADVISOR_E_PUSH_SECRET` on the backend; nothing else changes |
| Identity source (7) | the Adviser Network showing real advisers | the two SQL-seam functions in `server/collaborate/data/repository.js` read from it; nothing above them changes |
| Firm logo + colour (8) | to-do item 16 — the white-label mark on a client's document | type the two column names into `FIRM_BRAND`; `firmBrand()` in `server/utils/firmsDirectory.js` selects them and every drawing brands itself |
| DB credentials | to-do §3.1 — every write in the app | the `DB` block |

**The fail-closed design is worth defending if they ask why the roles are blank.** An empty role
string matches nothing, so no token can resolve to a tier that does not exist. That is not
caution for its own sake: in 2026 an existing role stood in for one that had not been created,
the guard let it through, and a mentor's saves ran into a firm's storage for weeks while every
screen reported success.

**Item 4.8 is parked on the strength of this.** Mike's ruling, 2026-08-15: *"So long as you have
created the stubs or connection point — only the master coding team can complete this."* Verified
2026-08-15: the connection points exist. `server/utils/db.js` is a singleton pool reading
`config/integration.js`; `server/middleware/firmAuth.js` has exactly one `jwt.verify()` call site;
the two middle-tier roles and their claims are already named. There is nothing further to build
here before their reply.

**Question 8's stub meets that same bar, and was built before the question was written** (2026-09-22).
`firmBrand()` lives in `server/utils/firmsDirectory.js` — the one and only reader of the `firms`
table, so no second query was introduced. ⚠ **A column name cannot be a bound parameter**, so
whatever they send is interpolated into SQL: `assertColumnName` refuses anything that is not a bare
identifier and **throws rather than skipping**, because a typo that quietly disabled branding would
be indistinguishable from "they have not answered yet." The values themselves are validated too —
the colour reaches an SVG `fill` and the logo an `<image>` href, so a non-hex colour or a
non-`http(s)` URL resolves to null and the drawing falls back. 57 tests in
`tests/unit/firmsDirectory.test.js`.
