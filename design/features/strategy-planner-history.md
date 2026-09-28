# Strategy Planner — the History

> **Read [`strategy-planner.md`](strategy-planner.md) first.** That page is the rules. If the
> two disagree, **the Brief wins**.

---

## 0. Superseded by the redirection of 2026-09-17

**The Brief's §2 used to name five capture shapes and call the sixth the last one missing.**
Kept here because a build was made against it and the code still carries those names:

| Shape | What it is | Built for |
|---|---|---|
| `buckets` | ideas sorted under named headings | The 8 Profit Levers |
| `quadrants` | exactly four boxes | SWOT / PEST |
| `forces` | five or six boxes, one marked centre | Porter's 5 Forces |
| `statements` | a short list side by side | Strategic Objective and Strategy |
| `actions` | a rows × columns table | the Action Plan |

*"**`placement`** — a 2×2 an owner is placed on, for the Heald Matrix and Business Dating — is
the one shape still missing."*

**Why it was wrong, and it is a useful lesson rather than a blunder.** Those five were derived
from the app's own short material summaries, because no session could read Mike's source: this
machine had no PDF reader at all until 2026-09-17. Reading the templates gave **21 teaching
forms and 9 capture forms**, and showed two of the five to be wrong against his fill-in tables.
The `placement` line was doubly stale — the Heald Matrix is out of scope entirely, being a tool
for selling a plan rather than making one.

**The 45 was wrong too, and for the same reason.** The Brief's impact test counted 45
frameworks from ADV.0's index. ADV.0 is a *copy* of the decks' contents tables and has drifted
from them — four concepts missing, page references off by one. Counted from the decks
themselves the scope is **51**.

## 1. The measurement that reshaped the task, run before anything was drawn

The Brief (§1) carries the figures. **Recorded here is why they mattered**, because the
alternative design was the obvious one and it was wrong.

Item 15.1 was filed as *"the strategy domain has thirteen materials and no session to run them
in"*. The obvious reading is: build the sessions. Forty-five frameworks, forty-five screens.

Counting first said something different. The zeroes were not *"45 things are missing"* — they
were **one thing missing, forty-five times over**: there was nowhere to put an answer. That
turned the job from forty-five builds into one machine plus one store, and it is the reason
Decision 3 was even asked.

**The count took twenty minutes.** The rule that required it
(`CLAUDE.md` → THE IMPACT TEST) exists because item 7.2's US9 was built without one.

## 2. The claim that had to be corrected before a line was drawn

15.1's own note said `strategy-domain-support.json` *"names every deck he supplied"*. It does
not. **Sales & Marketing Review** is authored in `sales-marketing-domain-support.json` and
**Organisational Review** in `staff-domain-support.json` — two of the four Planning Domains
Mike ruled **are** the session.

A session that trusted that sentence would have built over one file and delivered half the
session while looking complete. It was corrected in the item, in the laptop's handover, and in
the `touches` field, before the drawing began — and the loader now reads all three files so it
cannot quietly become one again.

## 3. Decision 5 — the recommendation that was refused

The drawing recommended **linking out** to the three frameworks that already have calculators,
on the grounds that rebuilding the maths creates a second copy that drifts.

Mike refused it: *"no, it needs to feel inclusive, comprehensive and seamless. I dont want it to
feel like patchwork."*

**He was right and the recommendation had conflated two things.** Seamless describes the
*surface*; the duplication risk is about the *maths*. The card hosts the existing report
component on the **same backend route** as the standalone page — one engine, one golden test,
two surfaces. The two real costs of his ruling are named in the drawing's box: a compact
in-session layout for each of the three, and an entry in the headline consistency guard.

Kept because **a session reading only the recommendations would build the thing he refused.**

## 4. Four faults that running it found, and the suite could not

Every one of these passed a green suite.

1. **The backend would not have started.** Restify refuses a handler that is neither async with
   two arguments nor callback-based with three. `getFrameworks` was a plain two-argument
   function, and mounting it threw at boot — the whole API down, not one route. Caught by
   `serverMounts.test.js`, which exists for this.
2. **The page sent no token and loaded during SSR.** Every call would have returned 401, and
   `fetch()` runs on the server where the browser's `fetch` and `localStorage` do not exist.
3. **"1 frameworks".** Visible in five seconds on screen; invisible to 12,000 assertions.
4. **The same paragraph twice on step 3**, because both closing frameworks point at the same
   source material. The Action Plan is filled in, not taught, so its concept panel went.

## 5. The one that was NOT a fault, and the twenty minutes it cost

Step 3 rendered with its two new cards missing and the wheel's descriptions blank. Everything
pointed at the new frontend code. **The code was correct throughout.**

`npm run dev:all` hot-reloads Nuxt but **not Restify** — it was still serving the version it
booted with. Restarting it fixed it with no change at all.

This is recorded because it **inverts the usual diagnosis**: the evidence points at what you
just wrote, and the answer is a stale process. It is now written into the `run-the-app` skill
so the next session does not spend the same twenty minutes.

## 6. A test that was wrong about a component that was right

A component test asserted `field-opened` fired on focus, and it failed. The first conclusion —
that the capture card's focus handler was broken — was **wrong**.

`wrapper.trigger('focus')` in vue-test-utils dispatches a plain `Event`, which jsdom does not
deliver to a focus listener. A real `FocusEvent` is delivered, and so is a genuine `.focus()` in
a browser. Buefy's own source was read before anything was changed: its textarea binds
`focus: onFocus` and re-emits correctly.

Kept because the failure **looks exactly like a broken component**, and the fix is in the test.

## 7. Two ordering defects the tests did find

- **Sessions opened in the same second had no defined order.** `started_at` is `DATETIME` —
  second precision — so **MySQL would have been as ambiguous as the dev fallback**. Both now
  tie-break on `id`. In UAT this would have surfaced as sessions listed wrongly, intermittently.
- **The two closing frameworks would have appeared on the Session Scope table** as things to
  tick, because they carry `planningDomains` so the plan can group by domain. Excluded in the
  route *and* in the component — two guards, because a closer shown there reads as an ordinary
  choice and ticking it would do nothing.

## 7. §9b's opening, as it read at the end of 2026-09-28 — replaced the same day

Written one paragraph per build slice on the day item 8.4 was built, so by evening it read as a
diary and contradicted itself — its heading said "not built", and its last line said it had never
run on a real microphone, straight after describing Mike's own recording. Replaced by a
present-tense description on his yes. Kept here word for word:

> ## 9b. Recording a session in concept segments, then Wordsmith — ruled 2026-09-28, not built
>
> Items **8.4** (recording) and **15.14** (Wordsmith). Drawing:
> [`../mockups/strategy-session-recording.html`](../mockups/strategy-session-recording.html), not
> **APPROVED FOR BUILD by Mike on 2026-09-28** — *"i approve the drawing to build"* — as committed in
> `976533c2`; before shipping, open it beside the build and name every difference. **Every decision for the first build is ruled** (A, B, C, E; timing G, H, I;
> summaries J), and **every first-build label in its wording table was approved by Mike, one at a
> time, on 2026-09-28**. Screen 4 and its wording are marked "second build" on the page. **The
> Meeting Review meeting type is named "Strategy Session"** (Mike, 2026-09-28) — a twelfth type at
> mentor level, cascading as the other eleven do; its name is what the Meeting Summary is told the
> meeting was. **Slice 1 of four is built (2026-09-28): the backend that records in concept
> segments** — `server/routes/meetingSegments.js` (open a segment, its chunks, a break, the voice
> clip, finish), `server/utils/meetingSegments.js` (settling and the join), segment files and their
> deletion in `meetingAudioStore.js`, the clip in `transcriptionClient.js`, and the "Strategy
> Session" type in `data/meeting-observations.json`. Each segment is transcribed as it closes and its
> audio destroyed at once; the clip is destroyed when the recording ends; the joined transcript is
> what Meeting Review's reports read. **A later segment transcribed without the clip is recorded as
> not confident**, since only segment 1 has the consent line to anchor on. **Slice 2 is built too
> (2026-09-28): the concept summaries' backend** — `server/utils/conceptSummary.js` and four routes on
> `/api/meeting/recordings/:id/segments/:n/summary` (read, edit, write again, approve). Each summary is
> written as soon as its segment is text, under the concept's own capture headings (one section under
> the concept's name when it has none — 13 of the 48 today), with "nothing said" left empty rather
> than filled. Approval needs `clientAgreed: true`, the screen's tick; an edit clears it; an approved
> summary is never written over. **Decision J is enforced in `runReports`**: a strategy session's
> Meeting Summary is composed from approved concept summaries only, with no model call and no
> extracted actions. **Slice 3 is built too (2026-09-28): the run sheet in Build session** —
> `utils/sessionTiming.js` works every time out; `StrategyStepBuilder.vue` shows it only when the
> page passes `timing` (the manager's standard-session screen does not); `scope.timing` saves it,
> kept through every other scope save. **Two differences from screen 7, both deliberate:** "+ Add a
> break here" sits after EVERY row rather than once per step, because a break may go between any two
> concepts; and a "+ Start the next day here" link, not drawn, adds a day row — its wording Mike's,
> 2026-09-28. **Slice 4 is built too (2026-09-28): the Run session screen** —
> `StrategySessionRecorder.vue` (consent through Meeting Review's own panel, one MediaRecorder per
> segment, the 8-second clip cut in the browser, the strip, the chips, "part 2" at 25 minutes or on
> the server's word, "End recording", "Stop and delete everything"), `StrategyRunAgenda.vue` (the
> timed agenda and the corner countdown, Decision G) and `StrategyConceptSummary.vue` (screen 10).
> **Differences from the drawing, every one named:** the live card shows a red top edge and the word
> "recording" rather than its own clock (the strip carries the clock); the agenda sits above the
> cards on a narrow screen and beside them on a wide one; the countdown is fixed to the corner of the
> window, as Mike asked; the finished banner is shown only when every section was turned into text,
> because its approved words say so — a failed section has already said so in its own banner. Three
> controls were not drawn and were ruled while building, all Mike's words on 2026-09-28: **"Take a
> break"** on the strip; a failed summary's **"This summary couldn't be written." / "Write it
> again"**; and **Meeting Review's own interruption alarm**, reused word for word, whose **"Resume
> recording"** carries the concept on as its next part. **The first build is complete.** Walked on
> the laptop 2026-09-28 in a built app, with Chrome's test-tone microphone and real OpenAI calls:
> recording, the clip, a break, resume and the end all worked, and every piece of audio was destroyed
> with logged proof. A real voice has not yet been recorded through it.
>
> **That walk found a silent section mishandled** — the tone has no words, every section came back
> empty, the session was marked failed while the screen said "all turned into text", and three
> summaries were paid for with nothing to summarise. Mike, asked how to fix it: *"if AI detects the
> converstaion stops for more than 3mins - can it pause until it starts again?"*, then *"do the
> design - its a better overall fix"*. **Screen 11, built 2026-09-28** on his rulings, one question at
> a time: **K** silence is under a quarter of the advisor's own level, measured on the consent line, for
> 3 minutes; **L** each pause's place and length are sent to the server (`POST …/segments/:n/pauses`)
> and added back to later words' times (`meetingSegments.restorePausedTime`); **M** the countdown keeps
> counting; **N** a silent section is transcribed and empty — the session finishes, and its summary is
> every heading empty with no AI call (`conceptSummary.emptySummary`). The browser measures loudness
> itself; nothing is sent to do it. **Walked live the same day** with a test sound file (tone, 190 s of
> silence, tone): paused at 3:11, resumed on the tone, the 10.25 s pause reported, the silent section
> finished as transcribed with no AI call, all audio destroyed. **Risk carried:** a first word after a
> pause can be clipped — unmeasured until a real voice is recorded. **Two more fixes from the walk, on
> Mike's yes:** each "Record this section" bar is now joined to the top of its own card — in the gap
> between cards it read as the foot of the card above, inviting a press that would file a recording
> under the wrong concept; and the finished banner counts "1 section", "1 minute" in the singular.
> **Mike's own first recording, the same day, found the cards squeezed**: the agenda's column beside
> them stayed even with no start time to show. On his yes the agenda now sits ABOVE the cards, only
> when a start time is set, and every card has the page's full width; the countdown needs only the
> concept's minutes and shows without a start time. That recording also proved the voice path — a
> word-perfect transcript, and the advisor named by the clip throughout. **Never run against real OpenAI or a real microphone** — that proof needs the
> desktop or UAT. Every ruling below
> is Mike's, 2026-09-28.
