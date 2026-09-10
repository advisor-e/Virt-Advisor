# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-10 (seventeenth session) · Laptop · branch `feat/advisor-progress`

Suite **9,749 green** (475 suites), lint 0, coverage and audit clean, `npm run build` exit 0,
**and the backend started and seen listening.** Everything merged to `master` by pull requests
78, 79 and 80. **0 ahead, 0 behind.** Nothing active on this machine.

🔴 **v0.11.0 IS WITHDRAWN AND `v0.11.1` REPLACES IT. THE BACKEND IN v0.11.0 DOES NOT START.**
One route handler in item 4.83's compliance gate — `requireDeclaration` — was an `async`
function that also took Restify's `next`. Restify refuses to **mount** such a handler and
asserts at mount time, so the process exited during startup with **no routes registered at
all**. Nuxt starts normally in front of nothing, which is why it looks alive. Found by running
the app, hours after the tag was cut. Fixed, tagged as `v0.11.1` on `e7e6271`, ledger row
written. If anyone is holding v0.11.0, they replace the tag rather than patch it.

🔴 **EVERY GATE IN THIS REPOSITORY PASSED IT, AND THAT IS THE PART TO REMEMBER.** 9,748 tests,
lint 0, audit PASS, `nuxt build` exit 0 — none of them start the server. Route tests call
handlers directly, so a signature Restify rejects is one they never see; and
`serverWiring.test.js`, the only test that loads the bootstrap, **mocks Restify away**, so a
stub with no rules registered the route happily. `tests/unit/serverMounts.test.js` now mounts
every route against real Restify and is mutation-verified against exactly this fault — **but it
is a guard, not a substitute. Run the app before cutting a tag.** That is now step 2½ of
Integration in practice, and the v0.11.1 ledger row records it as a check that was run.

**Built today: item 4.84, the hub notification dots.** Every menu entry can carry one — red for
the tab's own news, blue for never opened, orange for not opened in 21 days — with the meaning
in words beside the colour, and a key and count under the menu. Drawn first at
[`mockups/hub-menu-dots.html`](mockups/hub-menu-dots.html), four questions ruled one at a time,
all as drawn, then approved to build from. Brief:
[`features/firm-manager-hub.md`](features/firm-manager-hub.md).

**Two judgements on it, both stated rather than assumed.** Red stays a signal each tab raises
for itself and only Compliance raises one — *"published since you last declared"* is a
Compliance sentence. And the legend hides when nothing wants attention, which is a named
deviation from the drawing.

**SEEN RUNNING, not just tested:** all three states at the Mentor Hub, a dot clearing on open
with the count dropping 18 → 17, both routes answering live. Looking at it also found the menu's
labels shifting sideways as dots appeared — the drawing had solved that with a transparent
placeholder and the build had dropped it. Fixed.

**4.84 is CLOSED** — closure on [`to-do-done-and-parked.md`](features/to-do-done-and-parked.md)
§2, eight live items left.

**Next, and unblocked: 4.82** (nothing caps how many paid AI readings a user can trigger) still
waits on Mike for the cap. **4.83's Compliance screens are still UNSEEN** — they need MySQL,
Drive and a model key, so they are UAT work, along with the client register and the two rate
tables.

**DESKTOP:** your quiz-builder files were not touched. What changed under you:
`server/routes/compliance.js` (the gate's shape only — same check), `components/FirmManagerHub.vue`
(the dot on every menu entry, the legend), `server/restify-server.js` (two new routes),
`tests/unit/mentorHubScope.component.test.js` (one helper reads the label rather than the whole
anchor) and `tests/unit/compliance.routes.test.js` (five gate tests flush instead of awaiting).
**4.87 was left alone all session** — it is yours and its `activeOn` says so.
