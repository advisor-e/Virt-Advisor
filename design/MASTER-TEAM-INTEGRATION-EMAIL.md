# Email to the master coding team — the five things we need to hook up

> **Draft for Mike to send.** Written 2026-08-15 on his instruction: *"If there's anything
> specific you need to know, in technical terms to enable you to make provision for this, draft
> me the email and I will provide you their response."*
>
> **Everything below is already provisioned on our side.** There is one file —
> [`config/integration.js`](../config/integration.js) — and every answer to these five questions
> is a value typed into it. **No code changes, no rebuild.** That is deliberate: the file's own
> header says it is *"the ONLY file the senior integration team needs to edit."*
>
> Send it as it stands, or cut anything you already know the answer to.

---

## The email

**Subject:** AI Coach module — five integration values we need before UAT

Hi,

The AI Coach module is tagged at `v0.8.0` and ready to load. Everything below is already built
and waiting — each answer is a single value we type into one config file, with no code change
on either side.

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

**And the database.** MySQL host, port, database name, user and password. Also: do you want to
run our schema yourself, or should we hand you the SQL? Our tables are additive and do not touch
anything of yours.

Thanks —
Mike

---

## Notes for us — not part of the email

**Why these five and nothing else.** They are exactly the `TODO` lines in
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
