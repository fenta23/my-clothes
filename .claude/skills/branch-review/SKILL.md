---
name: branch-review
description: Static review of the current repo's branch changes (vs main or a release branch) plus uncommitted work; writes <TICKET>-review.md into the repo's .scratch/reviews/.
disable-model-invocation: true
---

# Branch review

A **static** review: every conclusion comes from reading code — the branch is assumed to compile with all tests green. Never build or run tests; the author does that before asking. A compiler-level finding is not worth reporting: if it built, the compiler was satisfied.

**Scope: the current repo only.** The repo under review is the one containing the cwd — `git rev-parse --show-toplevel`. If that fails, stop and say the skill must run inside a git repo. Do not read or reference files outside this repo.

The repo is **read-only with one exception**: never edit, stage, commit, or otherwise write inside it, except under `.scratch/`, which is where the review goes. Temp files go to the scratchpad, not the repo.

**Output directory.** Walk up from the cwd to the repo root and take the first existing `.scratch/`; if there is none, create `<repo-root>/.scratch/`. Reviews and draft files go in `<that>/.scratch/reviews/` — create it if missing. `.scratch/` is gitignored machine-wide, so the repo stays clean.

Arguments (all optional): base ref (default `main`; a dedicated release branch when the branch was cut from one), ticket ID, and/or explicit commit hashes.

## Process

1. **Scope.** Collect: `git status --short`; `git log --oneline <base>..HEAD`; the diff — the named commits if given, otherwise committed work vs the merge-base (`git diff --merge-base <base> HEAD`); uncommitted work via `git diff HEAD` (staged + unstaged) plus `git ls-files --others --exclude-standard` for untracked files, which you read directly. Confirm the base: record merge-base commit and date for the Scope table; if the committed range contains unrelated commits by other authors, stop and ask which base ref is intended. Read the `--stat` first, dump the diff to the scratchpad, then read it — per file when large. Derive the ticket from branch name or commit messages if not given. ✓ Every changed file — committed, staged, unstaged, untracked — accounted for; base confirmed; diff read.

2. **Round.** Check `<scratch>/reviews/<TICKET>-review*.md`. If any exist this is a follow-up round: read the latest, including inline author replies (blockquotes like `> **<name>'s comment:**`), and re-verify every prior finding and every pushback against the *current* code — concede a correct pushback with reasoning, or hold with new evidence. ✓ Every prior finding assigned a current outcome: ✅ resolved · ◐ partial · ❌ open · ⚖️ pushback accepted.

3. **Scout.** Spawn `code-scout` agents (parallel, one per theme) for what the diff alone can't answer: who publishes/consumes a changed message; DI registration of new types; *all* call sites of a changed method (a guard added at 2 of 3 call sites is a classic finding); repo conventions for a pattern the diff introduces; whether any test actually *executes* a new branch or guard — tests that thread a new parameter without entering the new code are **false comfort**. Give each scout precise numbered questions requiring file:line citations. ✓ Every scout question answered with a citation, or recorded as unanswerable.

4. **Pin.** Scouts locate; you confirm: a finding is **pinned** only when its file:line comes from your own read of the current tree. Sort everything examined into three buckets: pinned finding (marking *pre-existing* defects the diff merely exposes), cleared suspicion (feeds "Not findings"), or carried-forward (systemic, beyond this PR's scope). Check the project's memories for standing team decisions first (for `~/dev/ewk`: `ewk-team-conventions`) — a standing team decision is not a finding. ✓ Everything examined lands in exactly one bucket.

5. **Write.** Compose the review in `<scratch>/reviews/` per [TEMPLATE.md](TEMPLATE.md) — naming, structure, conventions, the owner split, and the KISS writing rules live there. Keep it plain and short: the finding, its `file:line`, the fix. Note each commit's author in step 1 so ownership is known here. When the diff spans areas with different owners (backend vs. frontend/e2e, a second service), split the body into self-contained parts per TEMPLATE.md so one part can be handed over without editing. Suggested code beyond a short snippet goes into a sibling draft file (`<TICKET>-<name>.draft.<ext>`) next to the review, never into the repo's source tree. ✓ File written; every table row resolves; verdict names what blocks, or that nothing does; no finding block exceeds its prose budget; every part stands alone.

6. **Report.** Digest in chat, same KISS rules as the file. ✓ Digest names the verdict, every 🔴/🟠 finding *with its owner*, what changed since the previous round, and the file path — in that order, without re-explaining the findings.
