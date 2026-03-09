# Builder flow: Docker

Run the full builder-scaffold flow inside the Sui dev container — no Sui tools needed on your host. The same steps work for any extension example (**smart_gate**, **storage_unit**, or your own); the shared flow uses **smart_gate** for publish and scripts.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed
- [Clone builder-scaffold](builder-flow.md#clone-builder-scaffold).


## 1. Start the container

See [docker/readme.md — Quick start](../docker/readme.md#quick-start):

```bash
cd docker
docker compose run --rm --service-ports sui-dev
```

You get a fresh local node, three funded accounts, and the workspace at `/workspace/` (see [Workspace layout](../docker/readme.md#workspace-layout)).

## 2. Choose your network

Use localnet or switch to testnet [Using testnet instructions](../docker/readme.md#using-testnet).

## 3. Run the end-to-end flow

Run all commands **inside the container**, in order:

| Step | Link |
|------|------|
| 1 | [Deploy world and create test resources](builder-flow.md#deploy-world-and-create-test-resources) |
| 2 | [Copy world artifacts into builder-scaffold](builder-flow.md#copy-world-artifacts-into-builder-scaffold) |
| 3 | [Configure builder-scaffold .env](builder-flow.md#configure-builder-scaffold-env) |
| 4 | [Publish custom contract](builder-flow.md#publish-custom-contract) |
| 5 | [Interact with Custom Contract](builder-flow.md#run-scripts) |

**Docker context:** Paths are `/workspace/world-contracts` and `/workspace/builder-scaffold`. 

For step 1 `.env`, run `/workspace/scripts/generate-world-env.sh` ([docker/readme.md](../docker/readme.md)).

More: [docker/readme.md](../docker/readme.md) — useful commands, cleanup, troubleshooting.
