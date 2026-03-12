
# Publish Script + Data consolidation + ID File Rename

## Design Decisions

- `pnpm publish-extension --extension <name> --env <env>`: runs `sui client publish`, captures IDs from stdout (based on the extensions publish.config.json, see below), writes to `deployment-ids.json` — one atomic command, no indexer hydration needed.
- Extension key in `deployment-ids.json` and objects to capture are driven by a per-extension `publish.config.json`.
- `--env localnet` is the special case; all others (e.g. `testnet_utopia`) carry an implicit tenant.
- `populate-world-ids` (world section population from indexer) is a separate deferred script; blocked on EVE indexer URL + GraphQL schema.

## File Layout After Changes

```
deployments/
  localnet/
    deployment-ids.json          (renamed from extracted-object-ids.json)
    Pub.localnet.toml

move-contracts/
  smart_gate_extension/
    publish.config.json          (new)
  storage_unit_extension/
    publish.config.json          (new)

ts-scripts/
  publish-extension.ts           (new — general publish + capture)
  utils/
    config.ts                    (updated)
    helper.ts                    (updated)
  smart_gate_extension/
    extension-ids.ts             (updated)
```

## `deployment-ids.json` Shape

```json
{
  "network": "localnet",
  "world": { "packageId": "0x...", "governorCap": "0x...", ... },
  "smart_gate_extension": { "packageId": "0x...", "extensionConfigId": "0x..." }
}
```

## `publish.config.json` Shape

```json
{
  "extensionKey": "smart_gate_extension",
  "objectsToCapture": [
    { "key": "extensionConfigId", "objectType": "::config::ExtensionConfig" }
  ]
}
```

## Step-by-Step Changes

### 1. Rename file on disk (`rename-file`)

- `mv deployments/localnet/extracted-object-ids.json deployments/localnet/deployment-ids.json`

### 2. Update `[ts-scripts/utils/config.ts](ts-scripts/utils/config.ts)` (`update-config`)

- Rename `EXTRACTED_OBJECT_IDS_FILENAME` → `DEPLOYMENT_IDS_FILENAME = "deployment-ids.json"`
- Rename `getExtractedObjectIdsPath` → `getDeploymentIdsPath`
- Rename `ExtractedObjectIds` → `DeploymentIds`; replace stale `builder?` key with open index signature: `[extensionKey: string]: unknown`
- Add `upsertDeploymentIds(env: string, update: (data: DeploymentIds) => void): string` — reads existing file or bootstraps from `WORLD_PACKAGE_ID`, applies the update callback, writes back, returns the file path
- Add `Environment` type: `"localnet" | "testnet_internal" | "testnet_utopia" | "testnet_stillness"`
- Add `networkForEnv(env: Environment): Network` helper
- Add `DEFAULT_GRAPHQL_URLS: Record<Network, string>` — `{ localnet: "http://localhost:9125/graphql", testnet: "https://graphql.testnet.sui.io/graphql", ... }`
- Add `WORLD_PACKAGE_ID_BY_ENV: Partial<Record<Environment, string>>` — hardcoded testnet package IDs from world-contracts `Published.toml` (localnet is not included; read from `Pub.localnet.toml` at runtime)
- Make `governorCap` optional in `WorldObjectIds` (it is owned, not shared)

### 3. Update `[ts-scripts/utils/helper.ts](ts-scripts/utils/helper.ts)` (`update-helper`)

- Update import: `DeploymentIds`, `getDeploymentIdsPath` (replacing old names)
- Rename `loadExtractedObjectIds` → `loadDeploymentIds`; update `hydrateWorldConfig` and `getDefaultWorldPackageId` to call it
- Update error message in `hydrateWorldConfig` to reference `deployment-ids.json`

### 4. Create `move-contracts/smart_gate_extension/publish.config.json` (`publish-configs`)

```json
{
  "extensionKey": "smart_gate_extension",
  "objectsToCapture": [
    { "key": "extensionConfigId", "objectType": "::config::ExtensionConfig" }
  ]
}
```

### 5. Create `move-contracts/storage_unit_extension/publish.config.json` (`publish-configs`)

```json
{
  "extensionKey": "storage_unit_extension",
  "objectsToCapture": []
}
```

*(Only `packageId` needed for now; extend when storage_unit has shared objects.)*

### 6. Create `[ts-scripts/publish-extension.ts](ts-scripts/publish-extension.ts)` (`general-publish-script`)

Logic:

- Parse `--extension <name>` and `--env <env>` from `process.argv`
- Load `move-contracts/<name>/publish.config.json`
- Derive `pubfilePath`:
  - localnet → `<root>/deployments/localnet/Pub.localnet.toml`
  - testnet variants → `<root>/move-contracts/<name>/Published.toml`
- Parse `--extension` and `--env` from `process.argv`; collect all remaining args as `passthroughArgs` (forwarded verbatim to `sui client publish`)
- Run `spawnSync("sui", ["client", "publish", "--json", "--pubfile-path", pubfilePath, ...passthroughArgs], { cwd: extDir, encoding: "utf8" })` — `--json` and `--pubfile-path` are always injected; everything else (e.g. `--gas-budget`, `--skip-dependency-verification`) is passed through from the caller
- Validate `result.status === 0`, throw with stderr on failure
- Parse stdout JSON; extract `packageId` from `objectChanges` where `type === "published"`
- For each `objectsToCapture` entry, find object where `objectType` includes the configured suffix; validate non-empty
- Call `upsertDeploymentIds(env, d => { d[extensionKey] = { packageId, ...capturedIds } })`
- Log the path written to

### 7. Update `[ts-scripts/smart_gate_extension/extension-ids.ts](ts-scripts/smart_gate_extension/extension-ids.ts)` (`update-extension-ids`)

- Thread `network: Network` parameter through `requireBuilderPackageId`, `resolveSmartGateExtensionIdsFromEnv`, `resolveSmartGateExtensionIds`
- Read `packageId` from `loadDeploymentIds(network)?.smart_gate_extension?.packageId`, fall back to `BUILDER_PACKAGE_ID` env var
- Read `extensionConfigId` from `loadDeploymentIds(network)?.smart_gate_extension?.extensionConfigId`, fall back to `EXTENSION_CONFIG_ID` env var

### 8. Update `[package.json](package.json)` (`package-json`)

Add scripts:

```json
"publish-extension": "tsx ts-scripts/publish-extension.ts",
"publish-smart-gate-extension": "pnpm publish-extension --extension smart_gate_extension",
"publish-storage-unit-extension": "pnpm publish-extension --extension storage_unit_extension"
```

Also add:

```json
"populate-world-ids": "tsx ts-scripts/populate-world-ids.ts"
```

And add `smol-toml` as a runtime dependency.

### 9. Update docs (`update-docs`)

- In any doc referencing `extracted-object-ids.json`, replace with `deployment-ids.json`
- Document `pnpm publish-extension --extension <name> --env <env>` in `ts-scripts/readme.md` and `docs/builder-flow-docker.md` / `docs/builder-flow-host.md`

### 10. Create `ts-scripts/populate-world-ids.ts` (`populate-world-ids-script`)

Usage: `pnpm populate-world-ids --env <env>`

This is the **single consistent mechanism** for populating the world section of `deployment-ids.json` across all environments — including localnet (replacing any direct transaction-output parsing in the Docker / host setup flow). After this script exists, `entrypoint.sh` / `setup-world.sh` call it instead of writing world IDs themselves.

**Data sources:**

- `packageId` for testnet envs: hardcoded in `config.ts` as `WORLD_PACKAGE_ID_BY_ENV` (from world-contracts `Published.toml`, same values as dapp-kit `TENANT_CONFIG`):
  - `testnet_internal` → `0x353988e063b4683580e3603dbe9e91fefd8f6a06263a646d43fd3a2f3ef6b8c1`
  - `testnet_utopia` → `0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75`
  - `testnet_stillness` → `0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c`
- `packageId` for localnet: parsed from `deployments/localnet/Pub.localnet.toml` using `smol-toml`
- GraphQL endpoints: `https://graphql.testnet.sui.io/graphql` (all testnet variants), `http://localhost:9125/graphql` (localnet)
- Use raw `fetch` (Node 18+) — dapp-kit's `executeGraphQLQuery` requires `import.meta.env` (Vite) and cannot be used in Node.js

**World shared object types** (all use `GET_SINGLETON_OBJECT_BY_TYPE` against Sui GraphQL):


| field                   | Move type                                |
| ----------------------- | ---------------------------------------- |
| `serverAddressRegistry` | `{pkg}::access::ServerAddressRegistry`   |
| `objectRegistry`        | `{pkg}::object_registry::ObjectRegistry` |
| `adminAcl`              | `{pkg}::access::AdminACL`                |
| `energyConfig`          | `{pkg}::energy::EnergyConfig`            |
| `fuelConfig`            | `{pkg}::fuel::FuelConfig`                |
| `gateConfig`            | `{pkg}::gate::GateConfig`                |


Note: `GovernorCap` is an **owned** object (not shared) — skip it in `populate-world-ids`. Make `governorCap` optional in `WorldObjectIds` type.

**Populated fields per env:**

- testnet variants: `serverAddressRegistry`, `objectRegistry`, `energyConfig`, `fuelConfig`, `gateConfig` (builders don't need `adminAcl` or `governorCap`)
- localnet: all of the above + `adminAcl` (builder is the world admin in localnet; `governorCap` still omitted as it's owned not shared)

**Logic:**

1. Parse `--env` from `process.argv`
2. Derive `packageId` (from `WORLD_PACKAGE_ID_BY_ENV` or parsed `Pub.localnet.toml`)
3. Derive GraphQL URL (`networkForEnv(env)` → `DEFAULT_GRAPHQL_URLS[network]`)
4. For each relevant object type: POST `GET_SINGLETON_OBJECT_BY_TYPE` query, extract `data.objects.nodes[0].address`
5. For localnet: include a short retry loop (e.g. up to 30s with 2s intervals) since the local indexer may not have indexed the deployment transaction yet; for testnet variants no retry needed
6. Validate all addresses non-empty, throw with clear error if any missing
7. Call `upsertDeploymentIds(env, d => { d.world = { packageId, ...ids } })`
8. Log path and populated fields

**Dependencies to add:** `smol-toml` (for `Pub.localnet.toml` parsing)