# Publishing checklist

Maintainer notes. Everything below is already wired up in this repo — this is
the run order.

## One-time: create the repo

```bash
git init -b main
pnpm install
pnpm typecheck && pnpm lint && pnpm test && pnpm build
git add . && git commit -m "feat: initial implementation"
gh repo create responsive-state --public --source=. --push
```

Then in **Settings → Actions → General**:

- Workflow permissions → **Read and write permissions**
- Tick **Allow GitHub Actions to create and approve pull requests**

## One-time: first publish (manual)

npm requires a package to exist before trusted publishing can be configured,
so v0.1.0 goes out by hand.

```bash
npm login
pnpm changeset version   # consumes .changeset/*.md, writes CHANGELOG.md
pnpm build
npm publish --access public
git add . && git commit -m "chore: release v0.1.0" && git push
```

## One-time: enable trusted publishing

At `https://www.npmjs.com/package/responsive-state/access`:

| Field | Value |
|---|---|
| Publisher | GitHub Actions |
| Organization or user | `moustakalis` |
| Repository | `responsive-state` |
| Workflow filename | `release.yml` |
| Environment | *(blank)* |

Then set **Publishing access → Require two-factor authentication and disallow
tokens**, so OIDC becomes the only path in.

## Every release after that

```bash
pnpm changeset          # choose patch/minor/major, describe the change
git commit -am "feat: ..."
git push
```

The Release workflow opens a `chore: release` PR. Merging it publishes to npm
with a provenance attestation. No tokens involved.

## Verify

```bash
npm view responsive-state
```

The npm page should show a green **Provenance** badge pointing at the commit.
