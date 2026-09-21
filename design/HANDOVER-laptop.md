# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-22 · Laptop · branch `feat/advisor-progress`

**Clean, pushed, 7 ahead / 0 behind.** Suite **12,869 green** (588 suites), lint 0 errors,
coverage and audit gates passed at push. **NOTHING WAITS ON MIKE.**

**HIS FOUR FORMS WERE ON THE DECK PAGE ALL ALONG — 29 boxes now live.** Branding, Customer
Loyalty, Pricing and Packaging were listed by hand in `TEMPLATES_NOT_SUPPLIED`, so an advisor
was told mid-session that his table did not exist — while his form sat on the **facing page**
of the deck we already read (Sales & Marketing p34/36/38/40). His words: *"the content is
right there and the forms are on the same page"*. How: Brief §0 stage 5.

🔴 **A CONSTANT IN OUR CODE IS NOT EVIDENCE ABOUT HIS CONTENT.** I reported the four as
"not supplied" straight off that list without opening his deck. **Open his page first** —
`python scripts/read-deck-pages.py <deck> <page>` — exactly as the drawing method already
demands. This is the same failure family as item 7.9.

🔴 **READ AN EXTRACTION BACK; ROW COUNTS LIE.** Mine had the right number of rows and the
wrong content twice: his **page number** landed in a client's answer box (it sits inside the
grid's last rule), and PDF **ligatures** put *"deﬁne"* and *"diﬀerentiate"* on screen as his
typos. Both pinned, mutation-verified.

**Form 4 of the nine needed NO SCREEN** — the impact test, run before designing, found the
existing capture card already IS a prompt→answer sheet. The nine are nine **shapes of table**,
not nine screens. **Five remain.**

**The client's plan stopped carrying the advisor's shopping list** — `conceptSummary` is the
scope menu's picking blurb and printed under every teaching page. Gone where a drawing exists
(32), kept where none does (11), or the client loses the page.

**DESKTOP — shared files I touched**: `locales/en.json` (removed `templateNotSupplied`),
`strategyCaptureForms.js`, `StrategyConceptCapture.vue`, `StrategyPlanDocument.vue`,
`to-do-items.json` item 15.1, `CONTENT-ROUTING.md` (regenerated — `npm run routing` if a new
data file fails its test), **and `.claude/commands/startup.md` + `WORKING-AGREEMENT.md`**: an
absent OTHER BRANCHES box now says what it means. **Your item 17 files untouched.** Your branch
read **0 ahead / 12 behind `master`** from its own branch, your note current at 2026-09-21.

**`activeOn`: 7.5 and 15.1 laptop — both still in hand. 17 desktop.**
**NEXT on 15.1:** stage 5, **form 5 of 9, the named-field-stack** — Strategic Statements reads
2 boxes where his page has two side-by-side fields, and both are in the wrong column.
