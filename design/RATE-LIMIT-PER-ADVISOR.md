# Each advisor gets their own usage limit — design for item 7.27

> For Mike's approval. Nothing here is built yet.

## The impact test

**1. What problem does this solve?** The app limits how fast AI requests can be sent: 30 a
minute in the advisor chat, 15 in courses, 6 or 10 on three manager screens. Each limit is
meant to be per person. It is actually counted per **network address** — and every request
reaches the backend from the Nuxt server, so the backend sees **one address for everybody**.
All advisors in all firms share one count. Past it, each of them sees *"Rate limit exceeded.
Please try again in a minute."* with nothing they did to cause it.

**2. How will we know?** Measured on 2026-10-02 with the limiter as it is today: five
advisors in three firms, each sending 8 chat messages in the same minute — well under 30
each — had **10 of their 40 messages refused**, two from every advisor. After the change the
same run must refuse **0**, and one advisor sending 31 must still be refused on the 31st.
Both become tests.

**3. What already does this job?** The `TRUST_PROXY` setting (2026-07-10) makes the limiter
read the browser's address from a header instead. It is not enough, for three reasons:

- It is the master team's setting, and whether UAT or production has it on is unknown.
- With it on, advisors in one office still share one count — an office has one internet
  address.
- It reads the **first** address in the header. Common load balancers add their own entry to
  the end and keep whatever the browser sent at the front, so a caller could write any
  address there and get a fresh count every time — the spoof the 2026-07-10 fix closed.

The backend already knows exactly who is calling: all five limited routes check sign-in
(`firmAuth`) before the limit, and it sets the firm and the advisor on the request. Nothing
new has to be fetched.

## The change

**One file of logic: `server/utils/rateLimit.js`.** The count is kept per signed-in person
instead of per address:

| What the request carries | Counted under |
|---|---|
| A firm and an advisor | that advisor, within that firm |
| A firm and an email, no advisor id (some manager and mentor sign-ins) | that email, within that firm |
| Neither (cannot happen on the five routes today, all signed in) | the network address, exactly as now |

- **The limits do not change** — 30, 15, 6, 6 and 10 a minute — they now apply to each
  person rather than to everyone at once.
- **The five callers do not change.** Each still calls its limiter the same way.
- **The firm is part of the key**, so two firms using the same advisor id can never share a
  count.
- **Identity comes only from the verified sign-in**, never from the request body or a header,
  so it cannot be forged to dodge the limit.
- **`TRUST_PROXY` stays** for the last-resort row, unchanged, so nothing about a deployment
  that relies on it breaks.
- The file's opening comment still says it runs in *"Nuxt server middleware"*. It has run on
  the Restify backend since the June 2026 move. That sentence is corrected in the same change.

## Tests (in `tests/unit/rateLimit.test.js`, beside the existing spoof guard)

- Two advisors behind one address each get their own full limit — the measurement above.
- One advisor is refused past the limit, even when their requests arrive from different
  addresses.
- The same advisor id in two firms counts separately.
- A sign-in with an email but no advisor id is counted by email.
- A request with no identity falls back to the address, and the existing spoof guard still
  passes.

## Not in this change

- **Lifting or lowering any limit.** Whether 30 a minute is the right figure is a separate
  question.
- **The app runs one backend process.** The counts live in that process's memory, as they do
  today; a deployment running several copies would need a shared store. That is unchanged
  by this work and not made worse by it.
