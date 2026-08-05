---
name: start
description: Start work on a Linear issue — mark it In Progress, create its worktree and enter it, boot the dev server when the issue is user-visible, then plan the change together before any code is written. Use when the user runs /start FREN-NN, or asks to start working on an issue or open a PR for one.
argument-hint: FREN-NN
---

# /start — Linear issue to a worktree you're already inside, then a plan

The boring parts happen before the conversation does. By the time you and the user are
discussing what to build, the issue is In Progress, the worktree exists on its own port
with its own database, and this session is inside it.

**This skill ends at an agreed plan.** You then implement in normal conversation, with the
user reviewing as you go.

## Ground rules

- **Setup runs first, and you do not ask permission for it.** Reading the issue, moving it
  to In Progress and creating the worktree are the reason the skill was invoked, not
  decisions to confirm. Never open with "shall I create the worktree?".
- **No feature code before the plan is agreed.** Reading code while planning is the job;
  editing it is not.
- **Plan mode active at invocation?** Setup writes to Linear and to disk, so it is blocked.
  Say so in one line and ask the user to leave plan mode. Do not skip setup and plan
  against a worktree that does not exist.
- **Never touch uncommitted work in the launching checkout.** `wt:new` branches from `HEAD`
  and leaves the working tree alone. Do not stash, move or commit anything to "clean up
  first" — AGENTS.md forbids it.
- **Narrate each step in one line**, so the routing decisions are visible and easy to
  challenge:
  `[FREN-14 · setup] fix/fren-14-juntada-end-time · no dev server (nothing on screen) · schema: none`
- The slow step is `wt:new` (dependency clone, Docker, migrations). Fire it, then read code
  while it runs.

## Phase 1 — The issue

1. `mcp__linear__get_issue` on the identifier. Never route from the issue number alone.
2. Move it to **In Progress** with `save_issue`. In Progress is
   `1c3dce7a-e262-48b1-ab7a-759f77dfee8f` on team `Frens`; if that call fails, re-resolve
   with `list_issue_statuses` rather than trusting the id. Do this **before** the slow
   steps, so the board is honest the moment work starts.
3. Print a 3 to 5 line brief: title, labels (size `S`/`M`/`L` plus type
   `Bug`/`Feature`/`Improvement`), what the issue says is broken, what it suggests. This is
   the last cheap moment to catch "wrong issue".

## Phase 2 — Route: one call, not two

**There is no database decision here.** Every frens worktree gets its own Postgres database
automatically — `worktree-setup.sh` mints `frens_<slug>_<hash>` in the shared container and
runs `prisma migrate deploy` into it, every time, in seconds. Nothing to choose, nothing to
opt into. (If you know planazo's `shared` vs `--db` fork: that exists because its branch
databases are hosted and cost money. Ours are a local `createdb`.)

The one call is the **dev server**:

| | |
| --- | --- |
| **Start it** | the issue changes something on screen: UI, copy, navigation, styling, state, loading and error states |
| **Skip it** | pure lib logic, date/timezone maths, tests, config, schema-only work |
| **Ambiguous** | start it — it costs one backgrounded command either way |

Separately, note whether the issue implies **schema work** (a new model, field, index, or a
data migration). This does not change setup. It changes the *plan*: it means
`prisma migrate dev` inside the worktree, a fresh migration committed with the change, and
a reseed afterwards. Say so in the narration line so it is on the table early.

## Phase 3 — The worktree

1. **`npm run wt:list` first.** If a worktree for this issue already exists, enter it and
   skip creation. Running `/start FREN-14` twice must resume, not fail. A worktree you did
   not create may belong to another session: ask before touching it.
2. From the primary checkout:
   `npm run wt:new -- fix/fren-NN-<short-slug>` (or `feature/…` for a Feature). Use a
   **Bash timeout of 600000** — the first run may fall back to `npm ci`, and it also waits
   on Docker and runs `prisma migrate deploy`. A default timeout will kill it midway.
3. If setup dies after the worktree exists, the script prints the exact retry
   (`scripts/worktree-setup.sh '<target>'`). Run that. Do not delete the worktree and start
   over — setup is idempotent and will finish the half-built one.
4. **Enter it**: `EnterWorktree` with the path `wt:new` printed — legal because the path is
   in `git worktree list`. If it refuses, stay in the primary checkout and run every
   subsequent command with the worktree's absolute path as cwd.
5. Read `.env.worktree` and report the slot in one line: `FRENS_APP_PORT`, `FRENS_DB_NAME`,
   and the URL. Never assume port 3000 or the primary checkout's database.

## Phase 4 — Dev server, only if Phase 2 said so

1. Check whether something is already listening on that port before starting anything.
2. `npm run dev` **in the background** — it never exits, so a foreground call would hang the
   turn. `scripts/dev.sh` reads the port from `.env.worktree` itself; do not pass one.
3. Wait for the port to answer, then `npm run db:seed`. The order is forced: the seed route
   is served *by* the dev server, so seeding before it is up just fails.
4. Report the URL. The seed builds a realistic friend group to click around with.

## Phase 5 — Plan it together

This is what the skill is actually for. The setup was just clearing the runway.

1. **Read the code the issue names before proposing anything**, and report which of the
   issue's claims the code confirms and which it does not.
2. **Present, in this order:** what you found → the levers available → a recommended
   approach → the open questions. Two rules govern the levers:
   - **Copy and content are levers, not fixed constraints.** Pick the cheapest lever that
     solves the *class* of problem, and say why you rejected the cheaper ones. Propose exact
     wording, never a vague "shorten it", and flag any user-facing copy change as needing
     sign-off.
   - **Match the size of the fix to the size of the issue.** A new shared component, a new
     prop on a shared primitive, or a refactor of adjacent code is rarely warranted by an
     `S` bug. If you believe it is, justify it and expect to be challenged.
3. **`AskUserQuestion` for choices that change the work.** Decide the rest yourself and say
   which way you went.
4. **How formal to be is a judgment call — state it out loud.** Default to a conversation.
   Call `EnterPlanMode` when the change is big enough that a written plan is worth
   reviewing, or whenever the user asks.
5. **Close by naming what comes next**, briefly, so the handoff is clear: the gates
   (`npm test`, `npm run lint`), **both themes checked** if anything visual moved, that only
   this task's changes get committed, and that `npm run wt:remove -- <branch>` runs from the
   primary checkout once the PR is merged.

## Running several of these at once

Worktrees are isolated on four axes — own directory and `node_modules`, own port in
3100-3199, own database in the shared container, own env values — so parallel `/start`
agents are the intended shape, not an abuse of it.

`worktree-setup.sh` serializes only the parts that touch shared state: choosing a port and
database name, and bringing the Postgres container up. Installing dependencies and
applying migrations run unlocked, because they touch nothing another worktree can see.
Three concurrent setups is verified to work. If you do hit a lock timeout, the message
names the lock and the process holding it.

## When something goes wrong

| Symptom | What it means | Do this |
| --- | --- | --- |
| `Timed out after 120s waiting for the '<name>' lock` | genuinely stuck — the lock only covers allocation and the container start, both quick | the message names the holding PID and the lock path. If that process is gone the next run reclaims it automatically; otherwise wait for it, then re-run `scripts/worktree-setup.sh '<target>'` |
| `Branch is already checked out: <branch>` | someone is already on it | `npm run wt:list`, enter that worktree instead of creating one |
| `Target already exists: <path>` | a previous run got that far | enter it; re-run `scripts/worktree-setup.sh '<path>'` if it looks half-built |
| "The Git worktree was created, but setup did not finish" | setup died mid-run | run the retry line it printed; the worktree is fine |
| `No free app port found in 3100-3199` | finished worktrees are hoarding ports | `npm run wt:list`, then `npm run wt:remove -- <branch>` on the done ones |
| Postgres step hangs or fails | Docker Desktop is not running | start Docker, then `scripts/worktree-setup.sh '<path>'` |
| `EnterWorktree` refuses the path | not a first entry, or not in `git worktree list` | stay in the primary checkout; pass the worktree's absolute path as cwd on every command |
| `npm run db:seed` fails | the dev server is not up yet, or not on the port you think | confirm the port from `.env.worktree` and that dev is answering, then retry |
| Issue is already In Progress | another session may own it | check `npm run wt:list` for its worktree and ask the user before starting a second one |
