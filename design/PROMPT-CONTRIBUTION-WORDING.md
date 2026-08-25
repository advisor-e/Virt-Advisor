# Share a prompt — every sentence an accountant reads

**Status: APPROVED by Mike, 2026-08-25. Steps 1, 2 and 3 are BUILT** — the panel, the paste
explanation, all six messages, and the review. Step 4 is not being built. Written the same day on his instruction — *"just give me what you believe to be
appropriate, i will say yes or no"* — so every judgement below is ours and named as ours.

The design is [`PROMPT-CONTRIBUTION-SAFETY.md`](PROMPT-CONTRIBUTION-SAFETY.md); the screen
is [`mockups/prompt-contribution.html`](mockups/prompt-contribution.html). **This file is
the source of the words.** They live in `locales/en.json` in the build, and any later
change edits this file, the locale files and the code together, or the three stop agreeing.

Scope: steps 1–3 of the design's §7, approved by Mike 2026-08-25. **Step 4 — a firm's
prompt actually shaping its advice — is not being built and no wording here implies it.**

---

## The rule these sentences follow

§5 of the design, unchanged. Every refusal has three parts, in this order, in the
accountant's language:

1. **What we found** — quoted, with its line, so they can see it rather than hunt for it.
2. **Why that matters** — in terms of their clients, not our architecture.
3. **What to do now** — a step that is theirs to take, and a way to reach a person.

Never an error code, a field name, or the word *sanitised*. Never a refusal without a route
back to a human. And every message says, somewhere, that **this is a rule we apply to
ourselves too** — because it is, and because an accountant who thinks they nearly caused a
breach stops using the feature.

---

## 1. The panel

> ### Share a prompt
>
> Got a prompt you think works well? Put it in below and we will check it against the
> protocols this app already follows, and tell you what it does well, what it is missing,
> and anything that would put your clients at risk.
>
> **Nothing you paste here is saved, and nothing here changes how your firm's AI works.**

Placeholder in the box: *Paste your prompt here…*

Button: **Check this against our protocols** — beside it, in grey: *Takes about twenty
seconds.*

> 🔴 **Our decision, and a deliberate deviation from the mockup.** The drawing shows **two
> doors** — *"just check it for me"* and *"I want our advice to work this way"*. The second
> is step 4 and is not being built, so we show **one door and no mention of a second**. A
> greyed-out card teaches an accountant to want the risky path before it exists safely, and
> the design's own argument is that the safe door should be the obvious one — with one door
> it unarguably is.
>
> The bolded line above is the compensation. In the mockup, *"nothing is saved, nothing
> changes"* was written on the first card; with the cards gone it would have been lost, so
> it moves into the opening paragraph where it is read first rather than last.

---

## 2. Why we ask you to paste — beside the box, never behind a help link

Unchanged from §1a of the design. It is on the screen because Mike's instruction was to
explain it *"for their own clients protection"*.

> **Why we ask you to paste rather than send a file**
>
> Copy the words out of your document and paste them in. We do not accept documents, on
> purpose.
>
> A document can contain text you cannot see when you open it — white text on a white
> background, text hidden behind a picture, text sitting off the edge of the page. If
> somebody sent you a prompt with instructions hidden in it, you would pass it on in good
> faith and neither of us would ever know.
>
> Pasting means what you see is what we get, because it goes past your own eyes on the way.
> It costs you one copy and paste and it is the strongest protection we can give your
> clients.

---

## 3. The five refusals

All five share the heading **We have not included this — here is why**, and the three
labels **What we found** · **Why that matters** · **What to do now**.

### 3.1 A web address or an email address

*Expected to fire often. This is the worked example already in §5 and the mockup; kept
almost word for word, with the noun swapping for the email case.*

> **What we found.** A web address, on line 14 of your prompt:
> `https://prompt-library.example.com/v2`
>
> **Why that matters.** We do not allow web addresses inside AI instructions. If an
> instruction is allowed to name a website, then an instruction hidden inside a client's
> document can name one too — and that is how client information ends up somewhere it
> should not be. Blocking every address is the only version of this rule that actually
> works, so we block yours as well. It is the same rule we apply to our own prompts.
>
> **What to do now.** Take the address out and send it again. If the page behind it matters
> to how the prompt works, tell us what it is for and we will look at it with you.

Buttons: **Send it again without the address** · **Ask someone about this**

For an email address, the first line reads *An email address, on line 14 of your prompt*
and the rest is identical. One message, two nouns — the risk is the same risk.

### 3.2 Characters that do not show up

*The hard one: we cannot quote what we found, because it cannot be seen.*

> **What we found.** Your prompt contains characters that do not show up on screen — three
> of them, the first on line 6. You will not be able to see them in your own document
> either. That is what they are for.
>
> **Why that matters.** A character a person cannot see can still be read by a computer, and
> that is how an instruction gets into a document without anybody noticing — including you,
> if this prompt was given to you by someone else. Nothing typed by hand contains these, so
> finding them means the text has passed through something on its way to you. We refuse
> them everywhere, in our own writing as well as yours.
>
> **What to do now.** We can take them out for you. Nothing you can see will change, because
> there is nothing visible to change. If this prompt was given to you by somebody else, it
> is worth telling them what we found.

Buttons: **Take them out and check it again** · **Ask someone about this**

> ⚠ **Our decision.** The design says refusals are *shown, never silently applied* — so we
> show what we found and offer the removal as a **button the accountant presses**. That
> keeps the rule exactly and still gives them a way forward, which retyping a line they
> cannot see does not. The alternative wording — *"paste it into Notepad and copy it back"*
> — was dropped because it is **not true**: a plain text editor preserves these characters
> perfectly, and advice that does not work is worse than no advice.

### 3.3 Something shaped like a password or a key

> **What we found.** Something on line 9 looks like a password or an access key:
> `sk-live-4f9b…` — we have shortened it on purpose. We do not repeat these in full, even
> back to you.
>
> **Why that matters.** If that is real, it has now been in a document you pasted into a
> website, and the right response is to replace it rather than move it. Keys never belong in
> advisory writing in any circumstance, so we stop on one even when it turns out to be an
> example. It is the same rule that keeps our own keys away from the AI.
>
> **What to do now.** Take the line out and send the prompt again. If that key is real and
> belongs to your firm, treat it as one that needs replacing — having pasted it anywhere,
> here included, is reason enough. Someone here will talk it through with you.

Buttons: **Send it again without that line** · **Ask someone about this**

### 3.4 Text that tries to break out of the quotation

> **What we found.** Line 31 contains a marker we use ourselves, to show the AI where a
> quotation begins and ends: `<<<ADVISOR_DATA`
>
> **Why that matters.** Everything you send is wrapped in a quotation before the AI reads
> it, so that it treats your words as something to read rather than something to obey. That
> marker is how the quotation is opened and closed. Text carrying it is trying — or has been
> made to try — to close the quotation early and speak to the AI directly. There is no
> innocent reason for it to be in a prompt, which is why we stop rather than work around it.
>
> **What to do now.** Take that line out and send the prompt again. If you did not write
> this prompt yourself, please tell whoever gave it to you what we found. This is the one
> message on this list that usually means somebody did something deliberate.

Buttons: **Send it again without that line** · **Ask someone about this**

### 3.5 Real client details

*The design calls for the gentlest wording on the screen, and says this will fire more than
anything else on people who have done nothing wrong. So the reassurance comes **first**,
before the rule.*

> **What we found.** Line 12 looks like it names a real person and their address:
> *"Margaret Whitfield, 14 Rosewood Terrace"*
>
> **Why that matters.** This is the one we expect to stop most often, and it is almost never
> anybody doing anything wrong — a prompt that has been used on real work naturally has real
> clients in it. We take it out at the door anyway. Inside this app we strip names,
> addresses and tax numbers out of everything before it reaches the AI, and we are not going
> to make an exception for the one piece of text somebody typed in by hand.
>
> **What to do now.** Replace the real details with made-up ones and send it again. The
> prompt will work exactly as well, because what teaches the AI is the shape of the example,
> not the person in it. If you are not sure which parts we mean, we will go through it with
> you.

Buttons: **Send it again with the details changed** · **Ask someone about this**

---

## 4. Too long — a limit, not a refusal

> ⚠ **Our decision: this one gets its own heading.** *"We have not included this — here is
> why"* is the wording of a safety refusal, and giving it to somebody whose only mistake was
> writing a lot would tell them they had done something dangerous. The three-part shape
> stays; the heading changes.

> ### That is more than we can check at once
>
> **What we found.** Your prompt is about 21,000 characters — roughly seven pages. We check
> up to 6,000, which is about two.
>
> **Why that matters.** This is a practical limit rather than a safety one, and it is worth
> saying so plainly. A prompt this long is usually several prompts that have grown together,
> and the report we give back is far more use when it is about one of them at a time.
>
> **What to do now.** Send the part you most want an opinion on, then the next one. If it
> genuinely is a single prompt and genuinely is this long, tell us — that is worth our
> knowing.

Buttons: **Go back to my prompt** · **Ask someone about this**

> **The cap is 6,000 characters — about two pages. Ruled by Mike, 2026-08-25.** The design
> said only *"a prompt is a page, a book is something else"* and named no number; we
> proposed 8,000 and he set 6,000.

---

## 4a. The route back to a person — **Ask someone about this**

Every refusal carries this button, because §5 of the design forbids a refusal that leaves
somebody with nowhere to go. It opens the reader's mail client:

> Write to **mike@advisor-e.com** and say what the prompt is for and which part we
> flagged — you do not need to send the prompt itself.

**Set by Mike, 2026-08-25:** *"for now, they can send it to mike@advisor-e.com"*. Until
that day the application had **no support address anywhere in it** — one `mailto:` in the
whole codebase, belonging to an advisor's own profile.

> 🔴 **THE ADDRESS IS CHANGED IN ONE PLACE AND NOWHERE ELSE.** Mike asked for that
> the same day — *"make it really easy for me to change that address in future as
> required please"*. It lives in **[`../data/support-contact.json`](../data/support-contact.json)**:
> edit one line, save, done. It takes effect on the very next check — no restart, no
> rebuild, no deploy step, and nothing else to change to match. A blanked, malformed or
> deleted file falls back to the address above rather than showing an accountant a dead
> button.

⚠ **The prompt is never put in the mail.** It may hold the very client details we just
refused, and pre-filling somebody's outbox with them would move the problem rather than
solve it. The subject line reads *"Advisor-e — a prompt that was not accepted"* and the
body is left empty.

---

## 5. The report

Heading: **What we found in your prompt**

Each finding carries one of three labels, from the mockup, unchanged:

| Label | Means |
|---|---|
| **good as it is** | They already do something well. Nothing to accept or decline |
| **worth adding** | Something is missing. We offer the sentence; they take it or leave it |
| **conflicts with your protocols** | Their wording disagrees with a protocol of their own firm. Theirs to judge, not ours |

Buttons on a *worth adding*: **Add this** · **No thanks**

Buttons on a *conflicts*: **Change it to match our protocol** · **Keep my wording**

At the foot: **Download my improved prompt** · **Start again with another one**

> **What "Add this" does, said plainly because it is easy to assume otherwise.** It writes
> the sentence into **their copy** of the prompt, in the box on the screen. It changes
> nothing about this app, this firm, or the AI. That is the whole of Lane A, and it is why
> Lane A is safe.

---

## 5a. The three things the report says about itself

Added while building step 3. None of these was in the approved list, because none of them
is about a finding — they are about the report as a whole.

> **Added to your prompt above.** · **Left exactly as you wrote it.**

Shown in place of the two buttons once a suggestion has been taken or left, so a manager
working down a long report can see what they have already decided.

> **This report is about your prompt as it was a moment ago. Check it again when you have
> finished editing.**

The report survives an edit rather than vanishing — advice about a prompt is still advice
— but it stops being about the words on screen, and says so.

> **We checked your prompt and found nothing we would refuse — but we could not produce
> the report itself just now. That is our end, not yours. Try again in a moment.**

🔴 **This sentence is the whole reason the report and the safety check are reported
separately.** An empty report and a failed one are the same picture on a screen, and the
silent version tells an accountant their prompt is fine on the strength of a call that
never came back.

> **We read it and found nothing worth changing. That is not a common answer.**

The genuinely-clean case. The second sentence is there so it reads as a result rather than
as something having gone wrong.

---

## 5b. What driving the real model changed

The prompt the reviewer is given is a document on the Mentor Hub
([`../data/ai-prompts.json`](../data/ai-prompts.json) → `prompt-review`), not a string in
the code, so a change to it is visible to anyone who opens that tab.

**Its first live run, 2026-08-25, produced a suggestion that could not be used.** Asked
about a prompt with no materiality rule, the model answered *"Define what counts as a
material item."* — an instruction to the accountant. Pressing **Add this** would have
pasted a note-to-self into the document their model reads.

The prompt now carries a worked contrast of a wrong suggestion against a right one. Driven
again, the same input produced *"Flag an item as key if it moves the funding requirement by
more than 5%, or if it is a significant assumption"* — the instruction itself.

⚠ **A green suite said nothing about this**, and could not have. It is recorded here
because the same class of defect will recur the next time the prompt changes, and the only
thing that catches it is six live calls costing a fraction of a penny.

---

## 6. What we chose, in one place

| Decision | Whose |
|---|---|
| One door on the screen, no mention of a second | **Ours** — step 4 is not built, and a door that does not open is worse than no door |
| *"Nothing you paste here is saved"* moved into the opening paragraph | **Ours** — it was on the card we removed |
| Hidden characters get a **button that removes them**, not retyping advice | **Ours** — the alternative advice was untrue |
| A key is echoed back **shortened** | **Ours** — we do not repeat a secret in full, even to its owner |
| Too-long gets a different heading | **Ours** — it is a limit, not a safety refusal |
| Web and email share one message | **Ours** — same risk, same sentence |
| **6,000 characters** | **Mike's, 2026-08-25** — we proposed 8,000 |
| **mike@advisor-e.com**, changed in one file | **Mike's, 2026-08-25** — the app had no support address at all before that day |
| Everything in §2, §3.1 and §5's labels | **The design's**, kept |
