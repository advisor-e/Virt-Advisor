# Sales Tracker — the History

> **Read [`sales-tracker.md`](sales-tracker.md) first.** That page is the rules. If the two
> disagree, **the Brief wins**.

---

## 1. Why there is a Brief for something that is not built

Item 17 is a survey, not a build. The Brief exists because **the repository it describes lies about
itself**: `sales-tracker-nuxt`'s own `CLAUDE.md` still says *"built with Nuxt 3, Prisma and MySQL…
Nitro… TypeScript types"*, months after all of that was converted away. A session arriving fresh and
reading that file would conclude the app is unusably far from our stack, and would be wrong in both
directions at once — wrong about the screens, which are already Pug and Buefy, and wrong about the
back end, whose real blockers are elsewhere.

**The Brief records what the source actually says**, so the decision is never re-derived from the
repository's own description.

---

## 2. The name "clean", and why the first search failed

Mike asked for work *"called sales tracker nuxt clean"*. **No such repository exists on GitHub**, and
the account can see only five. The first search returned `advisor-e/sales-tracker-nuxt` and the plan
was written against it without the mismatch being stated plainly enough — Mike had to ask *"I'm
assuming you checked sales-tracker-nuxt-clean?"* before it surfaced.

**It is a local folder**, `E:/Visual Code Projects/sales-tracker-nuxt-clean`, whose `origin` is that
same repository and which was **0 ahead and 0 behind it** when checked. The analysis was unaffected —
the code is identical — but the check should have come first, and been reported either way.

**The lesson is narrow and worth keeping: a name that returns nothing from a search is a finding to
report, not a detail to work around.**

---

## 3. The morning spent on a bug that was not a bug

**Mike said "it's broken" three times. Three times the answer was that it worked, and the problem
was handed back to him.** It was not his browser, and he was right every time.

The symptom — *click a tab, get thrown to login* — had **two different causes at once**, which is
why each single explanation held up for a while and then failed:

- a **real code bug** in `middleware/firm-manager.js` (§7 of the Brief), which broke `/team` and
  `/lists` for everyone, including a fresh browser; and
- **no front door**: `/` is the Blog page and needs no login, so a visitor who never signs in is
  bounced from every tab — correctly.

**Every check that said "it works" had logged in first.** Mike had no reason to, because nothing
told him to. The tests proved the ideal path and never touched the real one.

🔴 **THE TOOL CHOSE THE WRONG ANSWER.** `curl` ignores cookie rules that a browser enforces, so it
kept reporting a healthy server while the screens were never exercised at all. Three theories were
built on its output — the `Secure` flag, an overwritten `Set-Cookie`, a stale session — and the
table in §7 records why each was wrong. **The fault was found in a single run of a real browser,
doing exactly what Mike did: open the address, click a tab, without signing in.**

**The lesson is [[feedback_walk_the_conversation]] in a new place.** That rule was written about the
advisory engine — that changes get driven on the running app because 11,000 tests and UAT both miss
what a person sees immediately. **It applies to anything with a screen.** When someone says a thing
is broken and the evidence says otherwise, the evidence is being gathered wrongly.

---

## 4. Where "clean" came from

The folder name refers to a deliberate conversion toward this app's stack, visible in its history:
TypeScript → JavaScript, Nuxt 3 → Nuxt 2, templates → Pug, UI → Bulma and Buefy. Whoever did that
work got the screens most of the way here. **The back end was never touched**, which is why the three
blockers in the Brief all sit behind the API rather than in front of it.

⚠ **"Most of the way here" was read as "portable", and that was the first draft's central error.**
The conversion made the screens' *structure* ours. It never touched their *appearance* — see §5.

---

## 5. 🔴 The wrong instruction that reached a costed plan, and how it got there

**On 2026-09-21 this Brief's own build plan told a session to put the Sales Tracker screens on the
Firm Manager Hub. Mike never asked for that. No ruling says it.** It was caught the next morning,
before any code, only because he asked to see the instruction: *"how the hell did the plan say to put
the screens on the firm manager hub? show me that instruction."*

**The sentence was:** *"Add the screens to the Firm Manager Hub per the hub-page rule — mentor tier
first, stating in one line which other tiers need it."* It appeared three times — as stage 7, as a
rule in §12, and priced in §11.

**It is wrong twice over**, and each error is worth keeping separately because they fail differently:

1. **The hub has no advisor scope.** `HUB_SCOPES = ['mentor', 'global', 'group', 'firm']`, behind
   `requireManagerRole`. The Brief's own §1 says the tool is *for the firm's own advisors*. **The
   instruction would have built a tool where its own users cannot open it** — and every test would
   have passed, because nothing tests "can the intended user reach this".
2. **The hub-page rule was never about this feature.** It governs *"any change to what the AI is
   shown… newly emitted into a prompt"*. The Sales Tracker feeds no prompt. **The rule was reached
   for because it is written in strong language**, and strong language reads as broad scope.

**And the mechanism that made it plausible** — this is the part worth keeping. The draft had a
genuine point to make about the front-door bug: a signed-out visitor must never land on a
working-looking screen, and the fix is *an authenticated page*. It wrote *"an authenticated hub
page"*, then **slid from that phrase to "the Firm Manager Hub"** — a specific manager-only screen —
inside the same paragraph. A true sentence about authentication became a false instruction about
placement, with no step that looked wrong on its own.

**The lesson, and it is not "read more carefully".** `CLAUDE.md` already warns about *"a single
AI-written sentence… that a later session read as an instruction"* — the failure family behind three
reverted builds. This is that family again, with one difference worth noting: **the sentence was
written and read inside 24 hours, by two sessions on the same machine, in a document neither of them
doubted.** Freshness is not authority.

**What would have caught it earlier:** asking *who asked for this?* of the placement, not just of
the feature. Mike's ruling authorised **all eight screens**. It said nothing about where they live,
and the draft supplied an answer without marking it as its own.
