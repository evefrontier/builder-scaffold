# Contributing to Builder Scaffold

Thanks for your interest in contributing. This project is open source and we welcome contributions from the community.

## Ways to contribute

- **Help others** — Answer questions and share solutions in [Discord](https://discord.com/invite/evefrontier).
- **Report bugs or suggest features** — Open an issue (see below).
- **Code and docs** — Submit a pull request (see below).

## Opening an issue

[Open an issue](https://github.com/evefrontier/builder-scaffold/issues) to report a bug or suggest a feature.

- **Search first** — Check open and closed issues; add a comment to an existing one if it fits.
- **Bug reports** — Include steps to reproduce, expected vs actual behaviour, and your environment (Docker vs host, network).
- **Feature requests** — Describe the use case and why it would help builders. Clear use cases help us prioritise.

## Submitting a pull request

1. **Fork** the repo and create a branch from `main`.
2. **Discuss first** — For anything beyond typos or trivial fixes, open an issue or feature request so we can align before you invest time.
3. **Keep PRs focused** — Prefer several small PRs over one large one. Aim for a single logical change (e.g. one new extension example, or one QoL improvement). Smaller PRs are easier to review and merge.
4. **Run checks** — Run the linter and any tests (see repo docs or `package.json` scripts) before submitting.
5. **Write a clear description** — When opening the PR, describe what you changed, why you changed it, and how you tested it (including any relevant environment details).

## Code and documentation guidelines

**General** — Match the style and patterns of the code you’re changing. Update the relevant readme and flow docs when you add or change behaviour. Run the project’s linter and any tests before submitting.

**By Folder:**

- **Move contracts** (`move-contracts/`) — Follow [Sui Move conventions](https://docs.sui.io/concepts/sui-move-concepts/conventions) and the [Move code quality checklist](https://move-book.com/guides/code-quality-checklist).
  - For design context, see [evefrontier/world-contracts](https://github.com/evefrontier/world-contracts) and its [architecture docs](https://github.com/evefrontier/world-contracts/blob/main/docs/architechture.md) where relevant.
- **TypeScript scripts** (`ts-scripts/`) — Keep scripts consistent with existing style; ensure they work with the Docker and host flows in `docs/builder-flow-docker.md` and `docs/builder-flow-host.md`.

- **Dapps** (`dapps/`) — The reference dApp uses React, TypeScript, Vite, and `@evefrontier/dapp-kit` / `@mysten/dapp-kit-react`. Keep changes consistent with that stack and the patterns in `dapps/readme.md`. Preserve compatibility with the existing scripts and world flow.

- **zkLogin** (`zklogin/`) — The zkLogin CLI is for OAuth-based signing. Keep the CLI flow and usage clear; document any new config (e.g. env vars, OAuth settings) in the zklogin readme and in `.env.example` if applicable.

- **Documentation** — Update the relevant flow guides and area readmes when you add or change features (e.g. new scripts, env vars, extension examples, or dApp/zkLogin behaviour).

- **`.env` and config** — Document new env vars in `.env.example` and in the docs.

## License and conduct

By contributing, you agree that your contributions will be licensed under the same terms as the project. We expect respectful, constructive behaviour; see the repository’s code of conduct if one is linked in the README or repo root.
