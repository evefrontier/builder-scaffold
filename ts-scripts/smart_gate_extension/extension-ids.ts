import { requireEnv, type InitializedContext } from "../utils/helper";
import { MODULE } from "./modules";

export type SmartGateExtensionIds = {
    builderPackageId: string;
    adminCapId: string;
    extensionConfigId: string;
};

export function requireBuilderPackageId(): string {
    return requireEnv("BUILDER_PACKAGE_ID");
}

/** The participant's own witness type — what gets authorized on their gates and storage unit. */
export function xAuthType(builderPackageId: string = requireBuilderPackageId()): string {
    return `${builderPackageId}::${MODULE.CONFIG}::XAuth`;
}

/**
 * Resolve builder package and extension config IDs from env only (no AdminCap).
 * Use for entry points that don't need admin, e.g. collect_corpse_bounty.
 */
export function resolveSmartGateExtensionIdsFromEnv(): {
    builderPackageId: string;
    extensionConfigId: string;
} {
    return {
        builderPackageId: requireBuilderPackageId(),
        extensionConfigId: requireEnv("EXTENSION_CONFIG_ID"),
    };
}

/**
 * Resolve smart_gate_extension IDs, including the AdminCap the package's `init`
 * transferred to the publisher. BUILDER_PACKAGE_ID and EXTENSION_CONFIG_ID come
 * from .env (written by `pnpm record-publish`).
 */
export async function resolveSmartGateExtensionIds(
    ctx: InitializedContext
): Promise<SmartGateExtensionIds> {
    const { builderPackageId, extensionConfigId } = resolveSmartGateExtensionIdsFromEnv();
    const { objects } = await ctx.client.core.listOwnedObjects({
        owner: ctx.address,
        type: `${builderPackageId}::${MODULE.CONFIG}::AdminCap`,
        limit: 1,
    });

    const adminCapId = objects[0]?.objectId;
    if (!adminCapId) {
        throw new Error(
            `AdminCap not found for ${ctx.address}. ` +
                `Make sure this address published the smart_gate_extension package.`
        );
    }

    return { builderPackageId, adminCapId, extensionConfigId };
}
