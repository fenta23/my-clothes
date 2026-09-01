# Review output template

Every file lands in the reviewed repo's `.scratch/reviews/` (resolved in SKILL.md). Naming: round 1 → `<TICKET>-review.md`; follow-ups → `<TICKET>-review-N.md` where N = highest existing suffix + 1 (the bare file counts as round 1). Prose in English; German domain terms stay untranslated.

## Header

```markdown
# Code Review (Round N) — <TICKET>: <one-line feature summary>

**Repo:** `<path>`
**Service:** <primary service> (+ others touched)
**Date:** <YYYY-MM-DD>
**Reviewer note:** Static review only — no build, no test run, no changes made to the source tree. Earlier rounds: <files>.  ← earlier-rounds list only when N ≥ 2

**Scope reviewed** — table: commit hash / `uncommitted` → one-line description; note the confirmed base ref and merge-base.
```

## Split by owner

When the diff spans more than one area with a different owner — typically backend vs. frontend/e2e, but also a second service or a shared contract — split the body into `# Part A — <area> (<owner>)`, `# Part B — …`. One file still; the parts exist so a part can be handed over by itself.

- Keep the shared header, scope table (add an **Author** column), and the merge verdict above Part A, with a one-line pointer to the parts.
- Each part repeats what a reader needs to act without scrolling up: its own repo/commit/file line, its own reviewer note, its own Summary → Status → Findings → Not findings → Order of work → verdict, numbered `A.1`, `B.1`, ….
- Sort each round's prior findings into the part that owns them (e.g. e2e findings go to the frontend part), and say so in that part's status table.
- A finding caused in one part but landing in another's files stays with the cause, and the other part gets one line under its "Not findings" saying no action is needed there.
- Finding IDs stay globally unique and stable across rounds — do not renumber to make a part start at 1.
- One area only → no parts; use the plain section list below.

## Sections

Number the sections that are present sequentially; omit empty ones rather than skipping numbers. Under a part split, prefix them with the part letter.

1. **Summary** — findings table `# | Severity | Finding | Location`, most severe first, then one line stating whether anything blocks the merge.
2. **Status of round-(N-1) findings** *(follow-up rounds)* — table `# | finding | Outcome` (outcome glyphs from skill step 2); prose after the table for each pushback conceded or held.
3. **New findings** — one block per finding:
   - `### <severity emoji> <ID> — <claim as a sentence>`
   - pinned file:line citation(s) and a minimal code quote
   - the mechanism: which input/state leads to which wrong outcome
   - a concrete fix where one is clear — quoted as a snippet here, or as a `<TICKET>-<name>.draft.<ext>` sibling file for anything longer
4. **Not findings — verified and fine** — cleared suspicions, each with what was checked; protects correct code from being "fixed" later.
5. **Carried forward to <follow-up ticket>** — the carried-forward bucket; omit when empty.
6. **Suggested order of work** — numbered, priority-ordered; the closing section. End with a one-line **Verdict** here if the Summary didn't carry it.

## Conventions

- Severity: 🔴 blocks merge · 🟠 fix before merge · 🟡 worth fixing or discussing · 🟢 nit.
- Finding IDs: a fresh letter per round (M → N → P → R → S …), numbered within the round. A bug found while re-verifying an old fix gets a new ID and prominent placement.
- Every claim cites a pinned `File.ext:line`; a traced call chain cites every hop; *pre-existing* defects are marked as such.

## Writing style — KISS

The reader is a developer with limited time. The review must be skimmable and boring to read. Every sentence that does not change what they do is a sentence that makes them miss one that does.

- **Say it once, plainly.** What is wrong, where, what to do. No build-up, no restating the finding in the fix paragraph.
- **Budget: ~6 lines of prose per finding**, plus one code quote and one fix snippet. Longer means it is two findings, or the explanation belongs in a draft file.
- **Short sentences.** One idea each. Prefer a table or a list over a paragraph whenever the content is a set of items.
- **No dramatic framing.** Drop "load-bearing", "decisive", "silently", "waiting to happen", "worth writing down", "the shape of", "in disguise", "circling", "false comfort", "critically". State the fact instead; the severity glyph already carries the weight.
- **No meta-commentary on the review.** Do not narrate what was checked, how thoroughly, or that a claim was verified rather than assumed — citations already prove it. Never grade your own past rounds.
- **Praise is one clause, not a paragraph.** "Correct as written" or "no action" is enough.
- **Mechanism over story.** A numbered 2–4 step trace beats prose for "input X leads to wrong outcome Y".
- **Cut hedging.** No "I would argue", "it is worth noting", "arguably", "as it turns out".
- German domain terms stay untranslated; do not gloss them.
