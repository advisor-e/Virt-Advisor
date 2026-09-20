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

## 3. Where "clean" came from

The folder name refers to a deliberate conversion toward this app's stack, visible in its history:
TypeScript → JavaScript, Nuxt 3 → Nuxt 2, templates → Pug, UI → Bulma and Buefy. Whoever did that
work got the screens most of the way here. **The back end was never touched**, which is why the three
blockers in the Brief all sit behind the API rather than in front of it.
