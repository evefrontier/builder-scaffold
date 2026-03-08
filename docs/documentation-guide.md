# Documentation guide

Principles for builder-scaffold docs. Use this when adding or moving content (and for AI-assisted edits).

## Goals

- **Minimal first**: happy path only upfront; details on demand.
- **Cater to all users**: quickstart for first-time users, depth for power users and AI.

## Where to put what

| Content | Place | Notes |
|--------|--------|--------|
| **Happy path** | [README.md](../README.md) Quickstart + flow choice | Clone → pick Docker/Host/Existing world → done. |
| **Step-by-step flow** | [builder-flow-docker.md](./builder-flow-docker.md), [builder-flow-host.md](./builder-flow-host.md) | Only steps needed to complete the flow. |
| **Long or optional explanations** | `<details>` in the same doc, or a separate doc in `docs/` linked from the flow / README | If it’s not used in the happy path, move here and link. |
| **Solved issues (e.g. Discord)** | [Troubleshooting guide](../troubleshooting-guide.md) | One place; use the existing `<details>` template. |
| **Area-specific detail** | Area readmes: `docker/readme.md`, `move-contracts/readme.md`, etc. | Context and flow |

## Rules of thumb

- If the content **isn’t used in the happy path** → move to a detailed section or separate doc and **link**.
- If an **explanation is long** → move to a detailed section or doc and **link**.
- **Avoid duplication** → link to the canonical section instead of duplicating instructions.
- **Troubleshooting** → add to [troubleshooting-guide.md](../troubleshooting-guide.md) so others don’t repeat the same fixes.

## Flow doc pattern

- Keep the numbered steps minimal (what to run, in order).
- Put “why”, “alternatives”, and “optional” in `<details>` or in linked docs (e.g. `setup-world/readme.md`, `docker/readme.md`).
