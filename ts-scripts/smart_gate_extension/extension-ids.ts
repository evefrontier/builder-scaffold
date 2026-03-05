import * as fs from "node:fs";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { requireEnv } from "../utils/helper";
import { getExtractedObjectIdsPath, ExtractedObjectIds, Network } from "../utils/config";
import { MODULE } from "./modules";

export type SmartGateExtensionIds = {
    builderPackageId: string;
    adminCapId: string;
    extensionConfigId: string;
};

export function requireGateExtensionPackageId(): string {
    return (
        process.env.GATE_EXTENSION_PACKAGE_ID ||
        loadBuilderFromExtracted()?.packageId ||
        requireEnv("GATE_EXTENSION_PACKAGE_ID")
    );
}

function loadBuilderFromExtracted(): { packageId: string; extensionConfigId: string } | null {
    const network = process.env.SUI_NETWORK ?? "localnet";
    const filePath = getExtractedObjectIdsPath(network);
    if (!fs.existsSync(filePath)) return null;
    try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8")) as ExtractedObjectIds;
        const ext = data["smart_gate_extension"];
        if (ext?.packageId && ext?.extensionConfigId) {
            return { packageId: ext.packageId, extensionConfigId: ext.extensionConfigId };
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Resolve builder package and extension config IDs (env first, then extracted-object-ids.json).
 * Use for entry points that don't need admin, e.g. issue_jump_permit.
 */
export function resolveSmartGateExtensionIdsFromEnv(): {
    builderPackageId: string;
    extensionConfigId: string;
} {
    const fromFile = loadBuilderFromExtracted();
    return {
        builderPackageId:
            process.env.GATE_EXTENSION_PACKAGE_ID ||
            fromFile?.packageId ||
            requireEnv("GATE_EXTENSION_PACKAGE_ID"),
        extensionConfigId:
            process.env.GATE_EXTENSION_CONFIG_ID ||
            fromFile?.extensionConfigId ||
            requireEnv("GATE_EXTENSION_CONFIG_ID"),
    };
}

/**
 * Resolve smart_gate extension IDs (env + extracted-object-ids.json, then fetch AdminCap for owner).
 * GATE_EXTENSION_PACKAGE_ID and GATE_EXTENSION_CONFIG_ID come from .env or extracted-object-ids.json.
 */
export async function resolveSmartGateExtensionIds(
    client: SuiJsonRpcClient,
    ownerAddress: string,
    network?: Network
): Promise<SmartGateExtensionIds> {
    const { builderPackageId, extensionConfigId } = resolveSmartGateExtensionIdsFromEnv();
    const adminCapType = `${builderPackageId}::${MODULE.CONFIG}::AdminCap`;
    const result = await client.getOwnedObjects({
        owner: ownerAddress,
        filter: { StructType: adminCapType },
        limit: 1,
    });

    const adminCapId = result.data[0]?.data?.objectId;
    if (!adminCapId) {
        throw new Error(
            `AdminCap not found for ${ownerAddress}. ` +
                `Make sure this address published the smart_gate_extension package.`
        );
    }

    return { builderPackageId, adminCapId, extensionConfigId };
}
