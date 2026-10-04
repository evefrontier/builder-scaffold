import "dotenv/config";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { bcs } from "@mysten/sui/bcs";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { currentTenant, tenantConfig, worldPackage, worldTarget } from "./mvr/resolve";
import { getOwnerCapId } from "./helpers/owner-cap";
import { optionalNumber } from "./utils/constants";
import { devInspectMoveCallFirstReturnValueBytes } from "./utils/dev-inspect";
import { initializeContext, type InitializedContext } from "./utils/helper";
import { KIT_ENV, resolveKit, type Kit } from "./smart_gate_extension/kit";
import { MODULE } from "./smart_gate_extension/modules";

/**
 * Run before the lab, and again at the start of it. Checks the toolchain and
 * the participant's kit on chain; prints one pass/fail line per check, each
 * with its fix. Read-only — sends no transactions.
 */

type Check = { name: string; ok: boolean; detail?: string; fix?: string };
const results: Check[] = [];

function record(name: string, ok: boolean, detail?: string, fix?: string) {
    results.push({ name, ok, detail, fix });
    console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
    if (!ok && fix) console.log(`     fix: ${fix}`);
}

/** Not a failure — worth knowing, but setup can proceed. */
function warn(name: string, detail: string) {
    console.log(`⚠️  ${name} — ${detail}`);
}

function run(cmd: string, args: string[]): string | null {
    try {
        return execFileSync(cmd, args, {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
    } catch {
        return null;
    }
}

const ItemEntry = bcs.struct("ItemEntry", {
    tenant: bcs.string(),
    type_id: bcs.u64(),
    item_id: bcs.u64(),
    volume: bcs.u64(),
    quantity: bcs.u32(),
});
const Inventory = bcs.struct("Inventory", {
    max_capacity: bcs.u64(),
    used_capacity: bcs.u64(),
    items: bcs.struct("VecMap", {
        contents: bcs.vector(bcs.struct("Entry", { key: bcs.u64(), value: ItemEntry })),
    }),
});

// ── World ────────────────────────────────────────────────────────────────────

/** Shows which world TENANT points at, so a wrong one is caught before signing. */
function checkWorld(): boolean {
    try {
        const tenant = currentTenant();
        const { mvrName, buildEnv } = tenantConfig(tenant);
        console.log(
            `\nWorld: ${tenant} — ${mvrName} (${worldPackage(tenant)}), build env ${buildEnv}`
        );
        return true;
    } catch (error) {
        record(
            "TENANT is valid",
            false,
            error instanceof Error ? error.message : String(error),
            "fix TENANT in .env, or remove it for the workshop default"
        );
        return false;
    }
}

// ── Toolchain ────────────────────────────────────────────────────────────────

function checkToolchain() {
    console.log("\nToolchain");
    const major = Number(process.versions.node.split(".")[0]);
    record(
        "Node.js ≥ 22",
        major >= 22,
        `v${process.versions.node}`,
        "install Node 24 from nodejs.org"
    );

    const suiVersion = run("sui", ["--version"]);
    record(
        "Sui CLI installed",
        !!suiVersion,
        suiVersion ?? undefined,
        "install with suiup: suiup install sui@testnet"
    );
    if (suiVersion) {
        const env = run("sui", ["client", "active-env"]);
        record(
            "Sui CLI on testnet",
            env === "testnet",
            env ?? "no active env",
            "sui client switch --env testnet"
        );
    }

    const root = process.cwd();
    record(
        "Dependencies installed",
        fs.existsSync(path.join(root, "node_modules")),
        undefined,
        "pnpm install (in the repo root)"
    );
    record(
        "zkLogin tool installed",
        fs.existsSync(path.join(root, "zklogin", "node_modules")),
        undefined,
        "cd zklogin && pnpm install"
    );
    record(
        "zkLogin tool configured",
        fs.existsSync(path.join(root, "zklogin", ".env")),
        undefined,
        "cp zklogin/.env.example zklogin/.env and fill it in from your kit"
    );

    const required = ["ZKLOGIN_ADDRESS", ...Object.values(KIT_ENV), "CORPSE_TYPE_ID"];
    const missing = required.filter((name) => !process.env[name]);
    record(
        "Kit .env complete",
        missing.length === 0,
        missing.length ? `missing ${missing.join(", ")}` : undefined,
        "copy your kit's values into .env (see .env.example)"
    );
    return missing.length === 0;
}

// ── On-chain kit ─────────────────────────────────────────────────────────────

async function getJson(ctx: InitializedContext, objectId: string) {
    try {
        const { object } = await ctx.client.core.getObject({ objectId, include: { json: true } });
        return object.json as Record<string, any>;
    } catch {
        return null;
    }
}

const isOnline = (json: Record<string, any>) => json.status?.status?.["@variant"] === "ONLINE";

/**
 * An extension left over from a previous run is fine: `setup-gate` overwrites
 * it (authorize_extension is swap-or-fill). Only a *frozen* extension is fatal.
 */
function extensionState(json: Record<string, any>): { ours: boolean; detail: string } {
    const ext = json.extension;
    if (ext == null) return { ours: false, detail: "no extension yet" };
    const name = String(typeof ext === "object" && "name" in ext ? ext.name : ext);
    const pkg = process.env.BUILDER_PACKAGE_ID;
    const ours =
        !!pkg &&
        name.replace(/^0x/, "").toLowerCase() ===
            `${normalizeSuiAddress(pkg).slice(2)}::${MODULE.CONFIG}::XAuth`.toLowerCase();
    return ours
        ? { ours: true, detail: "your extension" }
        : { ours: false, detail: `set by a previous run (${name}); setup-gate will replace it` };
}

async function isFrozen(ctx: InitializedContext, module: "gate" | "storage_unit", id: string) {
    const bytes = await devInspectMoveCallFirstReturnValueBytes(ctx.client, {
        target: worldTarget(`${module}::is_extension_frozen`),
        senderAddress: ctx.address,
        arguments: (tx) => [tx.object(id)],
    });
    return bytes ? bcs.bool().parse(bytes) : null;
}

async function checkAssembly(
    ctx: InitializedContext,
    label: string,
    module: "gate" | "storage_unit",
    objectId: string
) {
    const json = await getJson(ctx, objectId);
    if (!json) {
        record(
            `${label} exists`,
            false,
            objectId,
            "check the item ID with pnpm resolve-ids, and TENANT"
        );
        return null;
    }
    record(
        `${label} online`,
        isOnline(json),
        undefined,
        "ask a facilitator — the assembly or its network node is offline"
    );
    const ext = extensionState(json);
    if (json.extension == null || ext.ours) console.log(`✅ ${label} extension — ${ext.detail}`);
    else warn(`${label} extension`, ext.detail);
    const frozen = await isFrozen(ctx, module, objectId);
    record(
        `${label} not frozen`,
        frozen === false,
        frozen === null ? "could not read" : undefined,
        "a frozen extension can never be changed — ask a facilitator for a spare kit"
    );
    return json;
}

async function checkChain(ctx: InitializedContext) {
    console.log("\nYour kit on chain");
    const kit: Kit = resolveKit(ctx);

    const { balance } = await ctx.client.core.getBalance({ owner: ctx.address });
    const sui = Number(balance.balance) / 1e9;
    record(
        "Address funded",
        sui >= 0.5,
        `${sui.toFixed(3)} SUI`,
        "ask a facilitator to top up your kit address"
    );

    const character = await getJson(ctx, kit.characterId);
    if (!character) {
        record(
            "Character exists",
            false,
            kit.characterId,
            `check ${KIT_ENV.character} with pnpm resolve-ids`
        );
        return;
    }
    record(
        "Character is yours",
        normalizeSuiAddress(character.character_address) === ctx.address,
        undefined,
        "ZKLOGIN_ADDRESS doesn't own this character — check both against your kit"
    );

    const source = await checkAssembly(ctx, "Gate 1", "gate", kit.sourceGateId);
    const destination = await checkAssembly(ctx, "Gate 2", "gate", kit.destinationGateId);
    if (source && destination) {
        const linked =
            source.linked_gate_id &&
            normalizeSuiAddress(source.linked_gate_id) ===
                normalizeSuiAddress(kit.destinationGateId);
        record(
            "Gates linked to each other",
            !!linked,
            undefined,
            "ask a facilitator — your gates aren't linked"
        );
    }
    await checkAssembly(ctx, "Storage unit", "storage_unit", kit.storageUnitId);

    // The bounty withdraws from the storage unit's main inventory, keyed by the storage
    // unit's OwnerCap, where the owner's in-game deposits land.
    const storageUnitCapId = await getOwnerCapId("storage_unit", kit.storageUnitId, ctx);
    const corpseTypeId = process.env.CORPSE_TYPE_ID!;
    const needed = optionalNumber("CORPSE_QUANTITY", 1);
    let quantity = 0;
    if (storageUnitCapId) {
        try {
            const { dynamicField } = await ctx.client.core.getDynamicField({
                parentId: kit.storageUnitId,
                name: {
                    type: "0x2::object::ID",
                    bcs: bcs.Address.serialize(storageUnitCapId).toBytes(),
                },
            });
            const inventory = Inventory.parse(dynamicField.value.bcs);
            quantity =
                inventory.items.contents.find((e) => e.key === corpseTypeId)?.value.quantity ?? 0;
        } catch {
            quantity = 0;
        }
    }
    // Only the hand-in needs corpses, so the team can publish and set up the gate first.
    const label = "Corpses in the storage unit";
    const detail = `${quantity} of type ${corpseTypeId}`;
    if (quantity >= needed) console.log(`✅ ${label} — ${detail}`);
    else
        warn(
            label,
            `${detail}; needed before you hand one in — in the game, press F at your ` +
                "storage unit and deposit corpses into it"
        );
}

async function main() {
    console.log("============= Workshop Preflight ==============");
    const worldOk = checkWorld();
    const envComplete = checkToolchain();
    if (worldOk && envComplete) {
        try {
            await checkChain(initializeContext());
        } catch (error) {
            record("Reach testnet", false, error instanceof Error ? error.message : String(error));
        }
    }

    const failed = results.filter((r) => !r.ok);
    console.log(
        failed.length === 0
            ? "\n✅ PREFLIGHT PASSED — you're ready for the lab."
            : `\n❌ ${failed.length} check(s) failed. Fix the items above and run pnpm preflight again.`
    );
    process.exitCode = failed.length ? 1 : 0;
}

main();
