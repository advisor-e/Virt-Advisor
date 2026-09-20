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
