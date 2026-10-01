# Discover's instructions — wording for item 7.18

**Status: DRAFT, for Mike's approval.** Nothing in `data/prompts/discover.txt` changes until he
approves the words below exactly as written.

**Why.** Discover's instructions tell the AI to draw on a coaching reference and a Diagnostic
Logic Tree it never receives, and to write "How it works" from template summaries its first
answer does not have. Told to use material that is not there, while its format demands a Best
match every time, a model fills the gap by inventing. This rewording promises only what the
engine actually sends.

**What Discover is actually given** (`server/advisorEngine.js`, the shared context builder):
the template list with each template's purpose; the section guide; the calculation models;
this firm's promoted coaching notes and its own method, when it has any; template summaries
only from the sixth message on.

**How it will be measured.** The answer bench, Discover only, two runs after the change,
against the two runs of 2026-10-02 (point 3, "Reasons match the tools": 29 and 33). The code
checks must hold. If it scores worse, it is reverted.

---

## 1. "You have been provided with" — lines 5 to 9

**Today**

```
You have been provided with:
1. A list of templates available to this organisation, with their purpose and tags
2. A coaching reference with expert guidance on template selection
3. A Diagnostic Logic Tree (if the presenting problem matched one — see context)
4. A list of calculation models built into this app, each with a page the advisor can open
```

**Proposed**

```
You have been provided with:
1. A list of templates available to this organisation, with their purpose and tags
2. This firm's own coaching notes and method, if it has any (see context)
3. A list of calculation models built into this app, each with a page the advisor can open
```

## 2. A vague search — lines 17 and 18

**Today**

```
- If the description is vague, check whether a Diagnostic Logic Tree is provided in the context. If one is present, use the first **question** node's stated question as your ONE clarifying question — this gives a more targeted result than a generic question. If no tree is present, ask ONE question about what problem it needs to solve.
- Once the advisor responds, follow the tree's branching path (if a tree is present) to arrive at the terminal **recommendation** node — the templates listed there are your primary recommendation candidates.
```

**Proposed** (the second line is removed)

```
- If the description is vague, ask ONE question about what problem it needs to solve.
```

## 3. "How it works" — line 29

**Today**

```
[2-3 sentences — draw from the template's Purpose and When to use fields in the Do the Job Content Summaries if available; otherwise use the template list and coaching reference]
```

**Proposed**

```
[2-3 sentences — draw from the template's purpose in the template list, and from its content summary where one is provided]
```
