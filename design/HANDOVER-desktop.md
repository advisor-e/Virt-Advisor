# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-15 · Desktop · branch `feat/firm-quiz-builder-ui`

**Four commits, all pushed** (`c8b012aa` → `dc0162ee`). Suite **11,190 green** (528 suites),
lint 0, coverage and audit gates passed. `npm run build` succeeds. Ten live items.
**4.97 / 7.2 is 52 of 67 — US8 all but T052.** `activeOn` KEPT on this machine: work in hand.

**ALL EIGHT FILES ARE THROUGH THE AI SEAM** (T050/T051). `advisorEngine.js` (10 sites,
`personal: true`) and `courseEngine.js` (4, `personal: false`); every hardcoded model name gone
into the role map. **Proved by driving the app, not by the suite** — 27 live OpenAI calls over
8 sites, all ok, all naming the provider. Six sites had never logged a success at all; they do
now. ⚠ **Phase 3's streamed recommendation was proved at the endpoint, not clicked through** —
worth a click when someone is next in the app.

🔴 **MIKE'S RULING, AND IT IS GENERAL: warn, never block, let the user continue.** The server no
longer dies without `OUTCOME_POOL_SECRET` — it warns, that ONE feature shuts down, everything
else runs. Safe because a pooled key cannot be derived without the secret, so nothing can be
written either way. Advisors are now warned when no backup AI is connected (new
`GET /api/advisor/ai-readiness`, once per conversation, blocks nothing).

🔴 **I TOLD MIKE A NON-SHARING FIRM STILL RECEIVES POOLED LEARNING. IT DOES NOT.** I read
"2 adjustments apply" beside "sharing is off" as one fact; it was two — the firm's switch was
ON, the SERVER had no secret. **Give-to-get was already built and guarded** (`loadPooledForSession`
→ `adjustments: []`, pinned by `outcomeLearningTrace.test.js`). Item **9.3** now says so and says
it must not be reopened. Mike's ruling stands: content cascades to all, learning is earned.

⚠ **The new route nearly stopped the server booting** — written `async`, lint removed it, Restify
then refused a callback handler with no `next`. `serverMounts.test.js` caught it. That guard,
written after v0.11.0 shipped a server that would not start, paid for itself today.

**NEXT JOB: T052** — `trace.ai.provider` and the *Answered by* line on the advisor's screen, per
the approved trace drawing.

**LAPTOP:** you are 67 ahead / 0 behind master, last commit today, but your note is dated
**2026-09-13** — stale for the third session running. Shared files I touched:
`server/restify-server.js`, `nuxt.config.js`, `locales/en.json`,
`components/VirtualAdvisor.vue`, `components/firm/FirmOutcomeConsent.vue`.
