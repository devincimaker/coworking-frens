Clean up the requested linked worktree by running:

```bash
npm run wt:remove -- <branch-name-or-worktree-path>
```

The command intentionally refuses dirty worktrees and running dev servers. Never
force removal or discard changes. Report whether the local branch was deleted or
kept.
