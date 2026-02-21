import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { requireEnv } from "../utils/helper";
import { MODULE } from "./modules";

export type SmartGateExtensionIds = {
    builderPackageId: string;
    adminCapId: string;
    extensionConfigId: string;
};

export function requireBuilderPackageId(): string {
    return requireEnv("BUILDER_PACKAGE_ID");
}

/**
 * Resolve smart_gate extension IDs.
 * - BUILDER_PACKAGE_ID and EXTENSION_CONFIG_ID come from .env (set after publishing)
 */
export async function resolveSmartGateExtensionIds(
    client: SuiJsonRpcClient,
    ownerAddress: string
): Promise<SmartGateExtensionIds> {
    const builderPackageId = requireBuilderPackageId();
    const extensionConfigId = requireEnv("EXTENSION_CONFIG_ID");

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
                `Make sure this address published the smart_gate package.`
        );
    }

    return { builderPackageId, adminCapId, extensionConfigId };
}
