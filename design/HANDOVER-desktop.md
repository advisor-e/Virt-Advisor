# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-01 (later session) · Desktop · branch `feat/firm-quiz-builder-ui`

Suite **6,609 green** (356 suites), lint 0 errors, **`nuxt build` green**, everything
committed and pushed.

**What shipped: the Collaborate front door (Mike's request, in his own words).** The
adviser-facing Collaborate screens — in the repo since merge slice 1 but wired to no
URL — are now reachable. `/collaborate` is the ONE address the master app's banner
button opens; every other screen keeps the absolute URL it shipped with (`/discover`,
`/connecting`, `/marketplace`, `/profile`, `/messages`, `/connections`, `/audit`,
`/firm`, `/groups/new`, `/groups/:id`) because the screens link to each other by those
paths. Eleven thin wrapper pages + `layouts/collaborate.vue`. Two named one-liners: the
Collaborate navbar brand now links to `/collaborate` (in the merged app `/` is the VA
home), and the Open Sans **300** weight was added to the font link in `nuxt.config.js`.

**🔴 FOUND AND FIXED: Collaborate's theme never came across in slice 1.** Tests don't
check looks, so nobody noticed the standalone's `assets/css/theme.css` was missing.
Ported as `assets/css/collaborate-theme.css` with EVERY rule prefixed `.collab-scope`
(the layout's wrapper div) so Collaborate's global restyling of body/.button/.box
cannot touch any Virt Advisor screen. Known cosmetic limit: programmatic `$buefy`
dialogs append to `<body>`, outside the scope, and render app-default.

**NOT eyeballed.** Build + tests prove it compiles and behaves; no screen has been
looked at in a browser this session (Mike had to finish before the viewing run). First
job next session: `npm run serve`, open `http://localhost:3000/collaborate`, click
through. The URL table is in `features/collaborate-groups.md` §4 and on the Handbook.

**🔴 STILL RULED, STILL UNBUILT: 4.56** (CPD follows the library in force) — was queued
as this session's build; the front door took priority on Mike's request. It remains the
top open item for whichever machine takes it.

**LAPTOP:** ten new root-level page routes now exist (`/discover`, `/profile`,
`/messages`, …) — if you add any page, check the name isn't one of Collaborate's. The
standalone `Advisor Collaborate` repo/folder is confirmed fully superseded (its last
commit 2026-07-20 predates the merge snapshot); marking it archived is proposed to Mike
but not yet ruled.
