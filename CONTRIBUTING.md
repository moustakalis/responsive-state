# Contributing

Thanks for taking the time to contribute.

## Setup

```bash
pnpm install
pnpm test
```

## Workflow

1. Fork and branch from `main`.
2. Add or update tests — the suite must stay above the coverage thresholds.
3. Run `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
4. Add a changeset describing the user-facing effect:
   ```bash
   pnpm changeset
   ```
   Use `patch` for fixes, `minor` for new API, `major` for breaking changes.
5. Open a pull request. CI runs on Node 18/20/22.

## Design constraints

These are deliberate and PRs that break them will be asked to change:

- **Zero runtime dependencies.**
- **Under 2 kB gzipped** for the ESM entry (enforced by `size-limit`).
- **No framework imports** in `src/` — the core must run in any environment.
- **SSR-safe**: nothing may touch `window` at module scope.
