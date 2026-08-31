# Language & Currency — the History

> **Read [`localisation-and-currency.md`](localisation-and-currency.md) first.** That page is the
> rules. If the two disagree, **the Brief wins**.

---

## 1. The failure that produced the chunking rule

A run of short strings piled into one oversized request. The translation service rejected it
outright — and the consequence was not a visible error but that **an entire language silently
reverted to English**.

That is the worst shape a fault can take: the screen still works, still renders, still passes
every test, and is simply in the wrong language for everyone using it. Nobody reports it as a bug
because it does not look like one.

Chunking is the fix, and it is recorded here so that nobody removes it as an unnecessary
complication.

---

## 2. Two implementations of the same route, and why both survived

When the two backends merged, each application had grown its own version of the translation
route, hardened in different directions.

- **This app's version** had chunking — the fix above.
- **The other** had input sanitisation and a length cap before untrusted text leaves for a third
  party, schema validation of the reply, and a source-language option, so a message can be
  translated *out* of its own language rather than everything being assumed to start in English.

**Neither was the better file.** They were folded together rather than one being picked.

**The transferable rule:** when you find two implementations of the same thing, read both before
choosing. The instinct is to keep the one you know; here that would have thrown away either a
real bug fix or three real security properties.

---

## 3. Decisions taken and closed — do not reopen

| Decision | Ruling |
|---|---|
| Where does the third-party call live? | **The backend.** The Nuxt middleware is a thin proxy. |
| Which HTTP client? | **The built-in HTTPS module.** The global fetch does not exist on the locked runtime. |
| One route or two? | **One**, serving both halves of the app, folded from both. |
| Who sets the firm's currency? | **Managers only** — it is account-wide. |
| Who may read it? | **Any signed-in firm user**, degrading to the default on failure. |
| Where does currency persist? | **The shared firm-config store** — version history and restore for free. |
| Which wording library version? | **Version 8.** Vue 2 project; version 9 APIs do not apply. |

---

## 4. Where the raw material is

**The authority is in the code:** the header block of `server/routes/translate.js` explains why
one route serves both halves of the app and what each side contributed. `server/routes/currency.js`
explains the asymmetric access rule and why a read must never break a report.

**Permanent companions:** [`../COLLABORATE-MERGE-PLAN.md`](../COLLABORATE-MERGE-PLAN.md) (the
merge that surfaced the forked route and the wording-section collision) ·
[`../i18n-*`](../) and [`../CLEANUP-PASS-PLAN.md`](../CLEANUP-PASS-PLAN.md) (the wording and
documentation clean-up pass) · `CLAUDE.md` → *Internationalisation* and *Stack Constitution*
requirement 8.
