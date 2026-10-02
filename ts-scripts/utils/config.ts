import { SuiGrpcClient } from "@mysten/sui/grpc";
import { MVR_OVERRIDES, WORLD_MVR_NETWORK, currentTenant, tenantConfig } from "../mvr/resolve";
import type { TenantId } from "../mvr/tenants";
import { WORLD_OBJECTS } from "../mvr/worldObjects.generated";

export const TESTNET_RPC_URL = "https://fullnode.testnet.sui.io:443";

export type WorldConfig = {
    tenant: TenantId;
    objectRegistry: string;
    adminAcl: string;
};

/**
 * Public testnet fullnodes no longer serve JSON-RPC, so every script uses gRPC.
 */
export function createClient(): SuiGrpcClient {
    return new SuiGrpcClient({
        baseUrl: process.env.SUI_RPC_URL || TESTNET_RPC_URL,
        network: WORLD_MVR_NETWORK,
        mvr: { overrides: MVR_OVERRIDES },
    });
}

export function getWorldConfig(): WorldConfig {
    const tenant = currentTenant();
    const { mvrName } = tenantConfig(tenant);
    const objects = WORLD_OBJECTS[mvrName];
    if (!objects) {
        throw new Error(
            `No shared world objects recorded for "${mvrName}". Regenerate them with \`pnpm gen:mvr\`.`
        );
    }
    return { tenant, objectRegistry: objects.objectRegistry, adminAcl: objects.adminAcl };
}
