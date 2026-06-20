# Session 2026-06-19 (part 2) — Win-Work redirect, EOY content upgrade, IP-audit

> Read-cold record of the second big thread of 2026-06-19. (Part 1 of the day — the shared
> case-study DB — is on a **different** branch; see "Branch state" below.) Nothing here should
> be lost. **Tomorrow's priority is in §6 — start there.**

---

## 0. Branch state (TWO unmerged branches in play, both pushed to GitHub)

- **`feat/win-work-redirect`** (THIS thread, off `master`) — all of part-2's work. **Pushed.** NOT merged.
  Commits: `c26eed8` win-work offer → `3114668` opening-line → `de1313b` handoff+proxy →
  `db34c61` AI tree-picker → `7ea648f` EOY tree upgrade → `050949c` EOY companion files →
  `f6b4047` learn.txt guardrail.
- **`feat/case-study-db`** (part 1, off `master`) — the shared case-study DB foundation. **Pushed.**
  NOT merged. Gated on a live browser click-through + MySQL table provisioning. See
  `SESSION-2026-06-19-NOTES.md` (exists on that branch) + `design/HANDOFF.md`.
- **`master`** — untouched by both. Tests on `feat/win-work-redirect`: **421 pass**, lint clean.

---

## 1. What shipped on `feat/win-work-redirect` (the win-work → EOY chain)

The driving scenario (Mike's repeated live test): advisor enters "I have a client situation",
says *there's no problem — I want to run an End-of-Year meeting and upsell the client into
advisory services*. The original engine fabricated a sales problem ("low sales volume") and
missed EOY entirely. Fixed end-to-end:

1. **Win-work offer (`c26eed8`)** — `detectWinWorkIntent` (advisorEngine.js) spots "no specific
   problem / win-or-sell work" intent during client intake and makes a **permission-based offer**
   to switch to Learn mode (mirrors the prep-mode offer pattern). Approved wording (Mike): *"It
   sounds like there isn't a specific client problem to solve here — what you really want is to
   win more advisory work… Would you like me to switch to that instead?"* Triggered by intent,
   not the meeting type, so EOY client-delivery stays reachable. `[SELL_SWITCH_OFFER]` marker →
   Yes/No buttons in `VirtualAdvisor.vue`. On free-text "yes" the backend emits
   `[SWITCH_TO_LEARN]`. 19 detector tests.
2. **Opening-line catch (`3114668`)** — the offer also fires when the intent is in the very first
   message (before any question is pending). Live test proved it was needed.
3. **Handoff carries the real goal (`de1313b`)** — `acceptSellSwitch`/`switchToLearn` now send the
   advisor's ACTUAL opening as the Learn-mode query (visible bubble stays "Yes, help me sell"),
   so Learn responds to "run an EOY meeting AND upsell", not a generic "sell". Same commit:
   **SSE proxy leak fix** — `server-middleware/advisor.js` now `res.on('close') → backendReq.destroy()`
   so abandoned sessions don't leak backend connections.
4. **AI picks the Learn coaching tree (`db34c61`)** — THE key fix. The old `detectLogicTree`
   keyword matcher is brittle (exact-substring, single-winner, ties broken by file order, defeated
   by dictation garbles "end of year"→"ND year"), so an EOY session matched the **sales_process**
   tree and the rich **eoy_meeting** tree never loaded. New `pickLearnTreeAI(advisorText)` reads
   the goal semantically, returns one validated `mode:learn` tree id (never trusts raw output;
   falls back to the keyword matcher on any failure). Live-verified: EOY goal now selects
   `eoy_meeting`. 6 tests. **Wired in advisorEngine.js learn block (~line 2095).**
5. **EOY content upgrade (`7ea648f`, `050949c`)** — Mike upgraded `Logic Tables/EOY Logic.pdf` +
   `Domain Support/EOY Support.pdf`. Converted the new IP into ALL THREE files the engine reads:
   `logic_trees.json` (eoy_meeting tree), `eoy-reference.json` (combined with the tree in Learn
   via `buildLearnReferenceText`), `eoy-domain-support.json` (Client mode). Added: the exact
   personal→business bridge script, Growth Curve = Global Reference via "Bob the Chocolate maker",
   Volatility = Local Reference + the 4 cause types (Common/Special/Seasonal/Tampering), the
   8-tier Farmer's Growth Position + 5-year Strategic Spending split (Rural), the Basic Targets
   dashboard method. **NOTE the 3-file flow:** Learn mode = tree (`formatLogicTreeForPrompt`) +
   reference (`LEARN_REFERENCE_FORMATTERS[eoy_meeting]` → `eoy-reference.json`); Client mode =
   `eoy-domain-support.json`. Update all three for consistency.
6. **Script-fabrication guardrail (`f6b4047`)** — live test: when asked "what do the scripts
   cover", the AI **invented** generic scripts instead of using the firm's. `learn.txt` had no
   rule against it. Added a general CRITICAL guard: only present scripts/wording verbatim from the
   provided reference; for anything beyond, point to the named source doc (e.g. "EOY Scripts Only"
   in Advisor-e) — never improvise. Protects every coaching topic.

**Decisions captured:** offer is permission-based two-way; Learn-mode coaching = the trees; the
EOY method IS richly encoded (it just wasn't being picked).

---

## 2. Two-fold root-cause pattern worth remembering
Today's bugs were all the same shape: **(a) a detection/selection step too brittle for real-world
input (dictation garbles, keyword ties), and (b) no guard against the AI inventing the firm's IP**
(fabricated sales problems, fabricated scripts). The fixes: make selection semantic (AI), and add
explicit anti-fabrication guards. Watch for this pattern elsewhere.

---

## 3. ⚠ Dev-server instability (recurring — not app code)
The **Nuxt 2 dev server hung/crashed ~5 times today** (exit 134 OOM *and* a process pile-up where
killing by port left zombies that contended for :3000). The backend (:4000, Node 14.15) was rock
solid throughout. Mitigations applied: the proxy leak fix (§1.3); a clean-sweep restart
(`kill ALL :3000 PIDs, keep :4000, then one fresh npm run dev`). **The durable fix for testing
sessions: run a PRODUCTION build (`nuxt build` + `nuxt start`) — no HMR, no memory creep.** Offered;
not yet set up. If dev hangs: "bounce it" = clean sweep + fresh `npm run dev`.

---

## 4. How to run (for testing tomorrow)
- **Backend** (Node 14.15, :4000): `set -a && . ./.env && set +a && "C:/Users/Mike Barnes/AppData/Local/nvm/v14.15.0/node.exe" server/restify-server.js` (does NOT auto-load .env).
- **Frontend** (Node 20, :3000): `npm run dev`. Use **`http://localhost:3000`** (nuxt.config pins
  `host: 'localhost'` → IPv6; `127.0.0.1` will NOT connect). Hard-refresh = Ctrl+Shift+R.
- Both were up and green at session end.

---

## 5. IP-audit findings so far (input for §6)
Audited all **90 source PDFs** (47 `Logic Tables/`, 43 `Domain Support/`) vs the extracted JSON:
- **Coverage is broad** — nearly every PDF maps to a tree / framework JSON / domain-support /
  reference file. NOT a case of large missing IP.
- **Genuinely un-converted (no JSON home):** `Why Use Rev Models.pdf` (no tree, no JSON);
  `People Power` (has support JSON, **no logic tree**); **verify** `Coaching Content.pdf` and
  `Sales & Marketing Slides table.pdf` (matched loosely, may not actually be in
  `coaching-reference.json` / `get-sales-domain-support.json`).
- **The 3 frameworks** (3 Engagement Types, 5 Advisor-e Steps, Growth Fundamentals) have NO tree
  by design — they're in `engagement-types.json` / `advisory-staircase.json` /
  `growth-fundamentals.json`. Fine.
- **The real risk is DEPTH, not coverage** — PROVEN today by EOY: the JSON *existed* but was the
  old/thin version, missing the upgraded methodology. A file-level audit can't catch that.
- **28 of 42 logic trees are DORMANT** (built, not in a live decision path) — converted ≠ serving.

---

## 6. ★★ PRIORITY TASK FOR TOMORROW — the IP DEPTH AUDIT ★★
**Goal:** find how much quality IP is under-served by **thin / stale / incomplete** JSON
conversions (the EOY pattern), and fill the genuine gaps from §5.

**Why it matters:** coverage is broad but EOY proved a JSON can exist yet shortchange the PDF's
real IP — so the engine quietly coaches a watered-down version of the firm's method.

**Method (domain by domain, like we did for EOY):**
1. For each high-value domain: read the source PDF(s) in `Logic Tables/` + `Domain Support/`, then
   read the matching JSON (`*-domain-support.json`, `*-reference.json`, and the `logic_trees.json`
   tree). Compare for completeness — what's in the PDF that's NOT in the JSON?
2. Fold the missing IP into the JSON (preserve structure; targeted enrichment, not rewrite — the
   EOY commits `7ea648f`/`050949c` are the template). Remember the 3-file flow for tree topics
   (tree + `*-reference.json` for Learn; `*-domain-support.json` for Client).
3. Fill the genuine zero-JSON gaps in §5 (start with `Why Use Rev Models.pdf`, decide on People
   Power's missing logic tree, verify Coaching Content + Sales & Marketing Slides).
4. Separately DECIDE on the **28 dormant trees** (wire in / retire / leave) — Mike's call.

**Suggested order:** start with the domains the advisor hits most (profit, sales-marketing,
governance, staff), plus the Learn-mode coaching trees (they're the live, advisor-facing IP).

**Useful:** a quick re-audit script lived at `scripts/_ip_audit.js` (deleted — it was temp; the
matching was lenient, tighten it / use tree `source_pdf`/`source_support` provenance as the
authoritative signal).

---

## 7. Other open items (lower priority)
- `eoy-domain-support.json` / `eoy-reference.json` enrichment was a careful manual fold-in — if any
  nuance reads thin when tested, sharpen that exact spot.
- The full "EOY Scripts Only" document text is NOT in the engine (only the support PDF's quotes) —
  the guardrail stops fabrication, but to RECITE the full scripts that doc would need extracting.
- Production-build-for-testing setup (§3).
- `feat/win-work-redirect` → merge to `master` when verified (after a clean click-through).

## 8. Related
- `ACTIONS.md` (priority logged there too). Memory: `design-case-study-visibility-model`,
  `north_star_vision`, `feedback-no-silent-parking`, `content_pipeline_architecture`.
