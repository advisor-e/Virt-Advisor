# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-24 (afternoon) · Desktop · branch `feat/firm-quiz-builder-ui`

**Clean and pushed at `5bdbda07`. 624 suites / 13,751 tests, audit PASS. PR #130 MERGED to
`master` at `a23572a4` on Mike's word.** One commit beyond it: the Meeting Review Brief correction.

### 🔴 FOR THE LAPTOP — once you merge `master`
- **Dictation now stays on the computer (12.2, done, proven by Mike with Wi-Fi off).** Every
  recogniser is made by `utils/onDeviceSpeech.js` with `processLocally = true`. A new microphone
  must use `createOnDeviceRecognition`, **never `new SpeechRecognition()`**, or it sends speech to Google.
- **Two of your 15.1 screens changed by one line each:** `StrategyConceptCapture.vue` and
  `StrategyOrgChartBuilder.vue` each gained a `speech-status-line` and its import. Nothing else.
- **Every `/v1/responses` call now sends `store: false`** (`openaiClient.js`), and Meeting Review
  sends `chunking_strategy=auto`, without which OpenAI refused every transcription.
- **OpenAI's own docs are saved** in `design/openai/`. Read `design/OPENAI-DEVELOPER-DOCS.md` before
  any OpenAI change.

### What today settled
Filed on Mike's yes: **8.3** (Meeting Review's model retires 26 Feb 2027, no speaker-labelling
successor), **8.4** (meetings over about 27 minutes exceed OpenAI's 25 MB), **13.5** (his FX review of
imported stock). 5.3 renumbered **5.4**. Nothing is `activeOn` here.
