# Email to the master coding team — v0.9.0 is ready to pull

> **Draft for Mike to send**, written 2026-08-17 on his instruction: *"draft me the email
> to send to coding team to advise of latest release."*
>
> **Saved before sending** (CLAUDE.md → Save the Artefact), so what was sent can be checked
> afterwards rather than paraphrased.
>
> ⚠ **Addressed to Carl Allado**, who pulled `v0.7.0` on 2026-08-04 and is the only named
> contact in [`DEPLOYED-VERSIONS.md`](DEPLOYED-VERSIONS.md). Change the name if it should go
> to someone else or to a group.
>
> ⚠ **The last paragraph also answers the `npm install` question Carl has been waiting on**
> (to-do item **3.5**). It is flagged here rather than folded in silently — **cut it if you
> have already answered him**, and if you send it, that item can come off the list.

---

## The email

**Subject:** AI Coach module — v0.9.0 tagged and ready to pull

Hi Carl,

A new release of the AI Coach module is tagged and ready whenever you want it: **`v0.9.0`**.

**Please pull the tag rather than the branch:**

```
git fetch --tags
git checkout v0.9.0
```

The branch keeps moving; the tag does not, so we can both always say exactly what you are
running.

**No `npm install` is needed.** Not one dependency has been added, removed or moved since
`v0.8.0` — the lock file is untouched. (More on that at the end.)

**This supersedes `v0.8.0`, which was tagged on 13 August and never pulled.** Taking
`v0.9.0` gets you both, so nothing has been missed.

### What is in it

`v0.8.0` built the management structure — the mentor, group and firm levels, and content
flowing down from one to the next. **`v0.9.0` fills that structure with advisory content
that was already written and was not reaching anybody.**

We audited every block of guidance the AI reads and asked one question of each: *does the
text we wrote actually reach the AI?* It found **102 pieces of advisory content that
reached it in no form at all** — and, less expectedly, **no screen in the application
displayed any of them either.** They were invisible in both directions: nobody could see
what the AI had been taught, and nobody could correct it.

That is what this release fixes. Nothing new was invented — it is content we had already
authored, connected to the AI and put on a screen for the first time. The largest single
piece is thirteen deep method guides, roughly 155,000 characters of coaching material.

There is also a **new Coaching Reference tab** on each management screen.

### One known issue, so it does not surprise you in testing

While verifying this release we found that the engine can occasionally route a question to
the **wrong coaching method** — and when it does, **the AI writes plausible-sounding
guidance of its own rather than saying it does not have any.** The content it invents looks
authored: right headings, right tone.

It is a separate fault from the ones this release fixes, it is on our list, and it is **not
yet resolved.** If you see advisory content that reads convincingly but does not match our
source material, that is very likely the cause — please send us the exact question that
produced it, as those examples are the most useful thing we can get.

Full notes, including how to reproduce this one, are in `design/RELEASE-NOTES-v0.9.0.md`
in the repository.

### One thing we would ask

**When you pull it, please tell me the date and which environment it went into.** We keep a
ledger of exactly which version is running where, and we maintain it on our side — so a
one-line reply is all it takes and it stops us guessing.

### And to close off your earlier question

You asked whether `npm install` was needed. To be clear for the record:

- **`v0.7.0` did need one** — it added a font package, and without the install the tab icons
  on the management screens render blank, which looks like a broken build rather than a
  missing package. Apologies if that cost you time.
- **`v0.8.0` and `v0.9.0` do not.** Neither changed a single dependency.

We will call this out explicitly in every release from now on, either way.

Thanks,
Mike

---

## Facts in the email, and where each is verified

| Claim | Where it is checked |
|---|---|
| Tag `v0.9.0` exists on `origin` | `git push origin v0.9.0` → `[new tag]`, commit `d4284e6` |
| No dependency change since v0.8.0 | `git diff v0.8.0..HEAD -- package.json package-lock.json` — lock untouched; `package.json` differs only in `version` and three developer-only `scripts` |
| v0.8.0 never pulled | [`DEPLOYED-VERSIONS.md`](DEPLOYED-VERSIONS.md) — its row still reads *Awaiting pull* |
| 102 unreachable pieces | [`features/to-do.md`](features/to-do.md) §6 item 4.16 — each proved by rendering the real prompt and searching it |
| 155,000 characters, thirteen guides | [`METHOD-GUIDES-SCREEN.md`](METHOD-GUIDES-SCREEN.md) §1 and §5 |
| The invented-content issue | [`features/to-do.md`](features/to-do.md) item **4.18**, and [`RELEASE-NOTES-v0.9.0.md`](RELEASE-NOTES-v0.9.0.md) §4a |
| v0.7.0 needed an install, v0.8.0/v0.9.0 do not | [`RELEASE-NOTES-v0.8.0.md`](RELEASE-NOTES-v0.8.0.md) and [`RELEASE-NOTES-v0.9.0.md`](RELEASE-NOTES-v0.9.0.md), both opening boxes |
