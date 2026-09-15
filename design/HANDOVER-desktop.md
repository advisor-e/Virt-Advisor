# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-16 · Desktop · branch `feat/firm-quiz-builder-ui`

**One commit, pushed** (`bc587288`). Suite **11,197 green** (529 suites), lint 0, coverage and
audit gates passed. Ten live items. **4.97 / 7.2 is 53 of 67 — US1 to US8 ALL COMPLETE.**
`activeOn` KEPT on this machine: US9 is next and the work is in hand.

**T052 CLOSED US8.** The advisor's decision trace carries an *Answered by* row naming the service
that answered, both ruled states, per Screen B of `outcome-learning-trace-lift.html`.

🔴 **THE TRACE WAS SHIPPING A HARDCODED `'openai'`** under a comment saying the seam "does not
exist yet" — true when written, false since T050/T051 landed the day before. On a session the
backup rescued it would have named the primary. Neither the suite nor UAT could see it: both
states read as the same fluent sentence.

⚠ **ONE DEVIATION FROM THE TASK TEXT, in `ARTEFACTS.md`.** T052 said to read the provider "from
the recommendation call". **It cannot be** — that call is a stream, `aiProvider._tag` skips an
async iterable by construction, and the trace is sent inside that same stream's finish handler.
It now comes from the two **distinction-classify** calls, earlier in the same request through the
same seam. Nothing Mike ruled changed.

**PROVED BY DRIVING THE APP, NOT THE SUITE** — a real conversation, local MySQL, 15 live OpenAI
calls: the row renders and the browser received `{"provider":"openai","fallbackUsed":false}`. The
backup state was driven at the seam with a 402 primary and produced *"mistral — the usual service
did not answer, so the backup did"*.

**FOR MIKE, ON THE LIST:** the row reads `openai` lowercase because no service is ever named in
code. The drawing shows "OpenAI". That is `AI_PRIMARY_NAME`, a config value, not a code change.

**NEXT JOB: US9 / T054** — the mentor's template-profile screen, the last build phase of 7.2.

**LAPTOP:** you are 73 ahead / 0 behind master with a commit today, but your note is dated
**2026-09-13** — stale for the fourth session running. Shared files I touched:
`server/advisorEngine.js`, `components/VirtualAdvisor.vue`, `locales/en.json`.
