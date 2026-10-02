# The AI sees its own full reply on a follow-up — design for item 7.21

> Approved by Mike 2026-10-02 and built the same day; tests in
> `tests/unit/followUpFullReplies.test.js`. Three deliberate differences from the design below:
> (1) the kept replies are restored once at the start of each client-chat turn, so the Moving
> Forward question sees them too, not only the follow-up; (2) the matching lives in
> `server/utils/followUpReplies.js`, so it is tested on its own; (3) a reply is restored only
> when the browser's copy was actually cut (exactly 2,000 characters), and leading whitespace is
> ignored on both sides, because the screen trims a reply when it removes a selector marker.

## The impact test

**1. What problem does this solve?** In the client chat, after the AI has given its
recommendation, an advisor asks a follow-up — *"why that one first?"*, *"what about the second
option?"*. To answer, the AI is sent the conversation so far. That conversation comes from the
browser, and every message in it is cut to 2,000 characters on the way in
(`server/utils/sanitiseInput.js` line 62). A recommendation is far longer, so the AI answers the
follow-up having lost most of what it advised. It can contradict or forget its own advice, and
nobody watching the screen would know why.

**2. How will we know?** Measured on 2026-10-02 from the saved answer-bench baseline
(`design/answer-bench-runs/2026-10-01-fd417a13-baseline.json`), with no new AI calls:

| | Client chat recommendations |
|---|---|
| Longer than 2,000 characters | **51 of 51** |
| Length | 3,477 to 5,832 characters; middle 4,056 |
| Share the AI loses on a follow-up | **about half** at the middle; 66% at the longest |

After the change, those same 51 replies, replayed as the history of a follow-up, must reach the
AI **whole: 51 of 51**. That is a test, run with no AI calls. What it does not measure is
whether the follow-up *answers* are better — no bench scores follow-ups today, and that
judgement is UAT's.

**3. What already does this job?** Nothing. The server already keeps each conversation's
progress in memory for two hours (`sessionStore`, `server/advisorEngine.js` about 374-413), but
not the AI's words. Raising the 2,000 limit is not the fix: the limit exists because the history
comes from the browser, so anything in it could have been written by the caller rather than by
the AI. A bigger limit lets a caller put more of their own words into the AI's mouth.

## The change

**The server keeps its own copy of each reply it sends, and uses that copy instead of the
browser's.**

1. **On sending a reply** — the recommendation, and every follow-up answer after it — the server
   stores the text exactly as the advisor received it, in that conversation's existing
   two-hour session. The last 10 replies are kept, each up to 12,000 characters (the longest
   reply the AI is allowed to write is about 10,000).
2. **On a follow-up**, before the history goes to the AI, each AI message from the browser is
   checked against the stored replies. Where a stored reply **begins with exactly what the
   browser sent**, the stored full text is used. Where nothing matches, the browser's copy is
   used, cut as today.
3. **Nothing else about the history changes.** The advisor's own messages are still cut at
   2,000 characters, and still only the last 20 messages are sent.

**Why a match is required, not just a lookup:** the server only ever substitutes text it wrote
itself, and only where the browser's copy agrees with it. A caller cannot use this to get any
text into the AI that the AI did not write.

**The session is tied to who started it.** Today a conversation's session is found by its
random id alone. Once it holds the AI's advice — which is about a client — it should open only
for the same firm and advisor who started it; any other caller is treated as having no session.
This touches the same few lines and is part of this change.

**What happens when the copy is gone** — after two hours idle, or when the backend restarts —
the follow-up behaves exactly as it does today. Nothing fails; it is only no longer improved.

## Privacy

- The stored replies are the same text already on the advisor's screen and already sent to the
  AI once. Nothing new is sent to OpenAI; less is cut from what is sent.
- They live only in the backend's memory, never on disk, never in a log, and are deleted with
  the session after two hours idle.

## Where it applies

- **The client chat**, where it was measured and where sessions exist.
- **Discover** is not affected: none of its 51 answers reached 2,000 characters.
- **Learn and Plan** were not measured — the bench does not run them. They keep no session
  today, so they are not covered by this change. If they turn out to need it, that is a separate
  item for Mike's word.

## Tests

- The 51 baseline recommendations, replayed as a follow-up's history, reach the AI whole.
- A browser message that does not match a stored reply is cut as today.
- A browser message claiming to be the AI, with text the AI never wrote, is never extended.
- A session opened by a different firm or advisor gives no stored replies and no stored progress.
- An expired session gives today's behaviour, without error.

## Files

`server/advisorEngine.js` — store each reply where it is sent (the recommendation, about line
4044; follow-ups, about line 3180), use them where the follow-up history is built (about line
3120), and tie the session to its owner (`sessionGet`/`sessionSave`). `server/utils/sanitiseInput.js`
is unchanged. Tests in a new `tests/unit/followUpFullReplies.test.js`.
