<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Shared Claude Code and Codex instructions

`AGENTS.md` is the single source of truth for repository instructions. `CLAUDE.md`
imports it with `@AGENTS.md`; keep shared guidance here instead of duplicating it.

## Linear Integration

- **Workspace**: fioris
- **Team**: Frens
- **Project URL**: https://linear.app/fioris/team/FREN/all
- **Issue Identifier**: FREN

`/start FREN-NN` reads an issue, moves it to In Progress, creates and enters its
worktree, then plans the change with you.

## Git and worktrees

- Working directly in the primary checkout, including on `main`, is allowed. Do not
  force a worktree for small or sequential changes.
- Stay in the user's current checkout unless they ask for a worktree or parallel
  feature work. Never move dirty changes between checkouts without explicit approval.
- Treat “Let's work in a worktree on …” (or equivalent wording) as a complete
  request to create and use one. Infer a concise `feature/<slug>` or `fix/<slug>`
  branch from the task unless the user provides a branch name. Ask only when neither
  the task nor a usable branch name is clear.
- When the work comes from a Linear issue, fold the identifier into that same
  convention: `fix/fren-14-<slug>` or `feature/fren-5-<slug>`. Do not use Linear's
  suggested `gitBranchName` (`devincimaker/fren-14-…`); it does not match this repo.
- Before editing, inspect `git status --short`, the current branch, and
  `git worktree list` so existing work is preserved.
- Create an isolated feature checkout with
  `npm run wt:new -- <branch-name> [base-ref]`. By default it branches from the
  current `HEAD` and lives beside this repo under `frens-worktrees/`.
- After creation, perform every command and edit for that task inside the path
  printed by `wt:new`; do not continue the feature in the checkout that launched it.
- In a linked worktree, use `npm run dev`; the wrapper reads `.env.worktree` and
  starts Next.js on that checkout's allocated port. Never assume port 3000.
- Each linked worktree has its own Postgres database. `DATABASE_URL`,
  `DATABASE_URL_UNPOOLED`, and `DIRECT_URL` in its ignored env files point to that
  database. Do not replace them with the primary checkout's database URLs.
- All linked worktrees share one Docker Postgres service for speed, but migrations
  and data remain isolated by database. It is safe to run Prisma migrations inside
  the current worktree.
- Inspect assignments with `npm run wt:list`. Remove finished worktrees with
  `npm run wt:remove -- <branch-or-path>` only after changes are committed and the
  dev server is stopped. The cleanup drops only that worktree's database and keeps
  unmerged branches.
- Run `npm install` normally if a branch changes dependencies. Initial setup makes
  an APFS copy-on-write clone of `node_modules`, so generated Prisma clients stay
  isolated without a slow fresh install.
- If the project gains another long-running local server, extend the allocator and
  `.env.worktree` metadata so every linked checkout gets a distinct port for it.
- When asked to publish work, commit only the current task's changes, push the
  worktree branch, and open a PR. Merge only when the user asks, then run cleanup
  from the primary checkout.

## Theming

- The app ships light and dark. Dark is one `:root[data-theme="dark"]` block in
  `src/app/globals.css` that redefines only *base* tokens; every component reads
  through `var()`, so components carry no dark-specific code. Add a token there
  rather than a `dark:` variant.
- Style with tokens, never literal colours. A hardcoded `rgba()`/`oklch()`/hex,
  or `bg-white`/`text-white`, cannot be themed and will be wrong in one mode.
- **Clay, coral, olive and grape brighten at night, so text on them inverts.**
  Use `text-on-action`; it flips to dark paper in the dark block. It has to:
  white on dark-mode clay measures 3.06:1, olive 2.70 and grape 2.53, all below
  the 4.5:1 floor, where dark paper reads 6.04 / 6.84 / 7.31.
- Three things sit on those fills and still must *not* flip, each with its own
  fixed token, all deliberately absent from the dark block:
  - `bg-action-surface` + `text-action-surface-ink` — a pale surface laid on a
    brand fill, like the CTA pill on the landing's coral band. The band stays
    coral, so the pill stays pale.
  - `text-on-scrim` — anything over a photo. Photos are dark in both modes, so
    the scrim only deepens. Pair with `bg-scrim/70`, never `bg-ink/70`:
    `--color-ink` inverts to near-white at night.
  - `text-avatar-ink` — an initial on one of the eight identity colours, which
    are themselves the same in both modes.
- Tailwind inlines a `--shadow-*` token's value into the utility, so a shadow
  colour has to sit behind its own var. Compose shadows from `--shadow-tint-*`.
  The same applies to geometry when a shadow has to be re-cut rather than just
  re-tinted — see `--shadow-surface-geometry`, which the card uses to trade the
  day's short drop for a longer one that anchors on espresso.
- Inline styles beat every stylesheet, so values that reach the DOM that way
  need themable parts: `src/lib/accent.ts` builds its `oklch()` from `--accent-*`
  and only fixes the hue, which is a person's identity.

## Verification

- Run the narrowest relevant tests during development, then `npm test` and
  `npm run lint` before handing off a substantial change.
- For browser checks, get the current checkout's URL from `npm run wt:list` rather
  than assuming the primary checkout URL.
- Check both themes. Toggling is in the sidebar, the mobile top bar, the landing
  nav and the auth shell; `localStorage.frens-theme` persists an explicit choice.
