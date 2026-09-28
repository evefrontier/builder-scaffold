import { SuiGrpcClient } from "@mysten/sui/grpc";
import { MVR_OVERRIDES, WORLD_MVR_NETWORK, currentTenant, tenantConfig } from "../mvr/resolve";
import type { TenantId } from "../mvr/tenants";

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
    const { objectRegistry, adminAcl } = tenantConfig(tenant);
    return { tenant, objectRegistry, adminAcl };
}
