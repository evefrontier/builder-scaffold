import { SuiGrpcClient } from "@mysten/sui/grpc";
import { isValidSuiAddress, normalizeSuiAddress } from "@mysten/sui/utils";
import { createClient, getWorldConfig, WorldConfig } from "./config";

export interface InitializedContext {
    client: SuiGrpcClient;
    config: WorldConfig;
    /** The participant's zkLogin address — the sender of every transaction. */
    address: string;
}

export function handleError(error: unknown): never {
    console.error("\n=== Error ===");
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
}

export function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return value;
}

export function requireZkLoginAddress(): string {
    const raw = requireEnv("ZKLOGIN_ADDRESS");
    const address = normalizeSuiAddress(raw.trim());
    if (!isValidSuiAddress(address)) {
        throw new Error(`ZKLOGIN_ADDRESS is not a valid Sui address: "${raw}"`);
    }
    return address;
}

/**
 * Scripts never hold a private key. They build transactions for the
 * participant's zkLogin address and hand the bytes to the zkLogin REPL to sign.
 */
export function initializeContext(): InitializedContext {
    return {
        client: createClient(),
        config: getWorldConfig(),
        address: requireZkLoginAddress(),
    };
}
