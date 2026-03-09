# Builder flow: Docker

Run the full builder-scaffold flow inside the Sui dev container — no Sui tools needed on your host. The same steps work for any extension example (**smart_gate**, **storage_unit**, or your own); the shared flow uses **smart_gate** for publish and scripts.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed
- [README Quickstart](../README.md#quickstart) — clone builder-scaffold.


## 1. Start the container

See [docker/readme.md — Quick start](../docker/readme.md#quick-start):

```bash
cd docker
docker compose run --rm --service-ports sui-dev
```

You get a fresh local node, three funded accounts, and the workspace at `/workspace/` (see [Workspace layout](../docker/readme.md#workspace-layout)).

## 2. Choose your network

Use localnet, or switch to testnet (see [Using testnet](../docker/readme.md#using-testnet)).

## 3. Run the end-to-end flow

Run all commands **inside the container**, in order. Each link opens the shared section in [builder-flow.md](builder-flow.md):

| Step | Section |
|------|---------|
| 1 | [Deploy world and create test resources](builder-flow.md#deploy-world-and-create-test-resources) |
| 2 | [Copy world artifacts into builder-scaffold](builder-flow.md#copy-world-artifacts-into-builder-scaffold) |
| 3 | [Configure builder-scaffold .env](builder-flow.md#configure-builder-scaffold-env) |
| 4 | [Publish custom contract](builder-flow.md#publish-custom-contract) |
| 5 | [Interact with Custom Contract](builder-flow.md#run-scripts) |

**Docker context:** Paths are `/workspace/world-contracts` and `/workspace/builder-scaffold`. For the first section (deploy world), create `.env` by running `/workspace/scripts/generate-world-env.sh` ([docker/readme.md](../docker/readme.md)).

## 4. Tear down the container when done

1. **Exit the container** — in the terminal where the container is running, type `exit` (or press Ctrl+D).
2. **Stop and remove the containers** — from your host:

```bash
cd docker
docker compose down
```

Otherwise the container keeps running in the background. For a full clean slate (including volumes) or troubleshooting, see [docker/readme.md — Clean up / fresh start](../docker/readme.md#clean-up--fresh-start).
