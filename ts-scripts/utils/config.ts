import * as fs from "node:fs";
import path from "node:path";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";

// --- Deployment file paths ---
export const EXTRACTED_OBJECT_IDS_FILENAME = "extracted-object-ids.json";
export const RUNTIME_OBJECT_IDS_FILENAME = "runtime-object-ids.json";
export const PUBLISH_OUTPUT_FILENAME = "publish.json";

export type WorldObjectIds = {
    governorCap: string;
    serverAddressRegistry: string;
    objectRegistry: string;
    adminAcl: string;
    energyConfig: string;
    fuelConfig: string;
    gateConfig: string;
};

export type ExtractedObjectIds = {
    network: string;
    world: WorldObjectIds & { packageId: string };
    currency_token?: {
        packageId: string;
        treasuryCapId?: string;
    };
    tribe_token?: {
        packageId: string;
        treasuryCapId?: string;
        tokenPolicyCapId?: string;
        tokenPolicyId?: string;
    };
    smart_gate_extension?: {
        packageId: string;
        extensionConfigId: string;
        adminCapId?: string;
    };
    storage_unit_extension?: {
        packageId: string;
    };
};

export type WorldConfig = {
    url: string;
    packageId: string;
} & WorldObjectIds;

export type HydratedWorldConfig = WorldConfig;

export type Network = "localnet" | "testnet" | "devnet" | "mainnet";

export const DEFAULT_RPC_URLS: Record<Network, string> = {
    localnet: "http://127.0.0.1:9000",
    testnet: "https://fullnode.testnet.sui.io:443",
    devnet: "https://fullnode.devnet.sui.io:443",
    mainnet: "https://fullnode.mainnet.sui.io:443",
};

export type RuntimeObjectIds = {
    network: string;
    storage_unit_extension?: {
        marketplaceId?: string;
        supplyUnitId?: string;
    };
};

export function getExtractedObjectIdsPath(network: string): string {
    return path.resolve(process.cwd(), "deployments", network, EXTRACTED_OBJECT_IDS_FILENAME);
}

export function getRuntimeObjectIdsPath(network: string): string {
    return path.resolve(process.cwd(), "deployments", network, RUNTIME_OBJECT_IDS_FILENAME);
}

export function readRuntimeObjectIds(network: string): RuntimeObjectIds {
    const filePath = getRuntimeObjectIdsPath(network);
    if (!fs.existsSync(filePath)) return { network };
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8")) as RuntimeObjectIds;
    } catch {
        return { network };
    }
}

export function writeRuntimeObjectIds(network: string, data: RuntimeObjectIds): void {
    const filePath = getRuntimeObjectIdsPath(network);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Read-modify-write extracted-object-ids.json, creating it from scratch if it doesn't exist.
 * Bootstraps the world.packageId from WORLD_PACKAGE_ID env var when creating a new file.
 * World object IDs (governorCap etc.) are left empty — they're loaded at runtime via hydrateWorldConfig.
 */
export function upsertExtractedObjectIds(
    network: string,
    update: (data: ExtractedObjectIds) => void
): string {
    const filePath = getExtractedObjectIdsPath(network);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let data: ExtractedObjectIds;
    if (fs.existsSync(filePath)) {
        data = JSON.parse(fs.readFileSync(filePath, "utf8")) as ExtractedObjectIds;
    } else {
        data = {
            network,
            world: {
                packageId: process.env.WORLD_PACKAGE_ID || "",
                governorCap: "",
                serverAddressRegistry: "",
                objectRegistry: "",
                adminAcl: "",
                energyConfig: "",
                fuelConfig: "",
                gateConfig: "",
            },
        };
    }

    update(data);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return filePath;
}

export function getPublishOutputPath(network: string): string {
    return path.resolve(process.cwd(), "deployments", network, PUBLISH_OUTPUT_FILENAME);
}

export function createClient(network: Network = "localnet"): SuiJsonRpcClient {
    const config = getConfig(network);
    return new SuiJsonRpcClient({ url: config.url, network });
}

export function keypairFromPrivateKey(privateKey: string): Ed25519Keypair {
    const { scheme, secretKey } = decodeSuiPrivateKey(privateKey);
    if (scheme !== "ED25519") {
        throw new Error("Only ED25519 keys are supported");
    }
    return Ed25519Keypair.fromSecretKey(secretKey);
}

export function getConfig(network: Network = "localnet"): WorldConfig {
    const url = process.env.SUI_RPC_URL || DEFAULT_RPC_URLS[network];
    const packageId = process.env.WORLD_PACKAGE_ID || "";

    return {
        url,
        packageId,
        governorCap: "",
        serverAddressRegistry: "",
        objectRegistry: "",
        adminAcl: "",
        energyConfig: "",
        fuelConfig: "",
        gateConfig: "",
    };
}

// World package module names
export const MODULES = {
    WORLD: "world",
    ACCESS: "access",
    SIG_VERIFY: "sig_verify",
    LOCATION: "location",
    CHARACTER: "character",
    NETWORK_NODE: "network_node",
    ASSEMBLY: "assembly",
    STORAGE_UNIT: "storage_unit",
    GATE: "gate",
    FUEL: "fuel",
    ENERGY: "energy",
} as const;
