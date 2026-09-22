# The wording files — read this before concluding anything

**`en.json` is the only file anyone authors. Every other language comes from it.**

## What you are looking at

| | |
|---|---|
| **Authored** | `en.json` — English, and only English |
| **Static files here** | 8 (`de es fr it nl pl pt` + `en`) — a partial **head start**, not the supported list |
| **Offered to a reader** | **28** (`data/languages.json`) |
| **Translated on demand** | the other **20** |

A reader picks a language we do not ship; the whole English locale is POSTed to
`/api/translate/locale`, translated once, and cached in their browser under
`va_locale_<code>`. See [`mixins/localeMixin.js`](../mixins/localeMixin.js).

## 🔴 The two wrong conclusions, both reached before

**"The other seven files are nearly empty — translation is half-finished."** They hold 8
top-level keys against English's 54. **That is expected.** They are a partial head start;
everything missing from them is translated on demand like the other twenty. There is **no
backlog of translation work**, and nothing here is unfinished.

**"So the app needs a translation tool."** It has one, live and guarded. This is why stage 6
of the Sales Tracker was skipped (Mike's ruling, 2026-09-22) — its language admin would have
stood a second translation system beside a working one.

*Both readings have happened; the second was 2026-09-22.*
[`tests/unit/languagePolicy.test.js`](../tests/unit/languagePolicy.test.js) pins the facts
above so they cannot drift quietly.

## What this means when you add a screen

✅ **Write the English, put it in `en.json`, and all 28 languages follow.**
❌ **Never hand-translate, never add a locale file, never build a second translation path.**

🔴 **A string in `en.json` can become any of 28 languages. A string hardcoded in a template
stays English for ever** — which is why hardcoded UI text is a defect here, not untidiness.

Adding a 29th language is a row in `data/languages.json`, not a translation project.

---

**The full policy is [`design/features/localisation-and-currency.md`](../design/features/localisation-and-currency.md) §1a.**
Language is the reader's and currency is the firm's; they never move together.
