# Builder flow: Docker

Run the full builder-scaffold flow inside the Sui dev container — no Sui tools needed on your host. The same steps work for any extension example (**smart_gate_extension**, **storage_unit_extension**, or your own); the shared flow uses **smart_gate_extension** for publish and scripts.

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

Run all commands **inside the container**, in order. Details for each step are in [builder-flow.md](builder-flow.md).

### 3a. Setup world

[Deploy world and create test resources](builder-flow.md#deploy-world-and-create-test-resources), deploy, configure, create test resources, copy artifacts. Ensure the container is running; the script generates world-contracts `.env` from `docker/.env.sui` automatically.

### 3b. Publish custom contract

[Publish custom contract](builder-flow.md#publish-custom-contract) — build and publish your extension (e.g. smart_gate_extension) to the network.

### 3c. Configure builder-scaffold .env

[Configure builder-scaffold .env](builder-flow.md#configure-builder-scaffold-env) — create `.env` and set keys, `SUI_NETWORK`, `WORLD_PACKAGE_ID`, `BUILDER_PACKAGE_ID`, `EXTENSION_CONFIG_ID`.

### 3d. Interact with custom contract

[Interact with Custom Contract](builder-flow.md#run-scripts) — run the TypeScript scripts against your published extension.

## 4. Tear down the container when done

1. **Exit the container** — in the terminal where the container is running, type `exit` (or press Ctrl+D).
2. **Stop and remove the containers** — from your host:

```bash
cd docker
docker compose down
```

Otherwise the container keeps running in the background. For a full clean slate (including volumes) or troubleshooting, see [docker/readme.md — Clean up / fresh start](../docker/readme.md#clean-up--fresh-start).
