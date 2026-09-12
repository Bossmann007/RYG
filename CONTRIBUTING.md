# Contributing

## Two-branch workflow

This repository keeps exactly two branches on GitHub:

- `main`: stable versions and releases; the default branch. Promote reviewed work from `develop` through a pull request with at least one approval.
- `develop`: shared integration branch. Collaborators with write access push their updates here.

Do not push feature branches to this repository. Coordinate changes with teammates before editing the same files. Never force-push either shared branch.

## Daily work

Start with a clean working tree, then update your checkout:

```sh
git fetch origin --prune
git switch develop
git pull --ff-only origin develop
```

Make a small, focused change, run its relevant checks, and commit only the intended files:

```sh
git add <files>
git commit -m "fix: describe the change"
git pull --rebase origin develop
git push origin develop
```

If another contributor pushed first, fetch and rebase again. Resolve conflicts and repeat the relevant checks before retrying the push. Do not use `--force`.

Gateway validation (after `npm ci --prefix privacy-gateway`):

```sh
npm run evidence
```

## Publishing a version

1. Open a pull request with base `main` and compare `develop`.
2. Describe the changes, validation, and known limitations. Obtain at least one approval from another collaborator.
3. Merge using **Create a merge commit** so the shared history remains intact. Keep `develop` after the merge.
4. Publish a GitHub Release from the resulting `main` commit with a version tag such as `v1.0.1`. Choose the version based on the actual release; do not create branches per version.
5. Synchronize the release history back into `develop` with a clean working tree:

```sh
git fetch origin
git switch develop
git pull --ff-only origin develop
git merge origin/main
git push origin develop
```

## Preserved historical work

The former `convergencia-privacy-gateway` branch is preserved at tag
`archive/convergencia-privacy-gateway-2026-09-12` (commit `0393f9169946e01c232287ca987c2f9d8bcdb728`).
Its changes are not integrated into `develop`: they diverge from the current gateway and require a separate review and conflict resolution. The tag preserves the complete history without adding a third branch.

## Repository protections

- `main` requires a pull request with one approval; new commits dismiss stale approvals and conversations must be resolved.
- `main` and `develop` reject force pushes and deletion. `develop` allows normal pushes by existing collaborators with write access.
- A repository ruleset blocks creation of branches other than `main` and `develop`.
- Automatic deletion of merged branches stays disabled to retain `develop`.

Repository access is granted separately by an administrator. This workflow does not grant public write access.
