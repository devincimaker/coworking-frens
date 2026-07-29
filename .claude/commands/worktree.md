Create a fully isolated worktree for the requested branch by running:

```bash
npm run wt:new -- <branch-name> [base-ref]
```

Use the branch name supplied by the user. If none was supplied, infer a concise
`feature/<slug>` or `fix/<slug>` name from the requested task; ask only if the task
itself is unclear. Do not move or modify uncommitted changes in the current checkout.
After setup, continue all task work inside the new path and report its app URL and
database name.
