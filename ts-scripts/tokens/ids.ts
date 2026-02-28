import * as fs from "node:fs";
import * as path from "node:path";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import {
    createClient,
    keypairFromPrivateKey,
    getExtractedObjectIdsPath,
    Network,
    ExtractedObjectIds,
} from "../utils/config";

export type TokenIds = {
    packageId: string;
    currencyTreasuryCapId?: string;
    tribeTreasuryCapId?: string;
    tribeTokenPolicyCapId?: string;
    tribeTokenPolicyId?: string;
};

export async function resolveTokenIds(
    client: SuiJsonRpcClient,
    _address: string,
    network: Network
): Promise<TokenIds> {
    const fromEnv: TokenIds = {
        packageId: requireEnv("TOKENS_PACKAGE_ID"),
        currencyTreasuryCapId: process.env.CURRENCY_TREASURY_CAP_ID,
        tribeTreasuryCapId: process.env.TRIBE_TREASURY_CAP_ID,
        tribeTokenPolicyCapId: process.env.TRIBE_TOKEN_POLICY_CAP_ID,
        tribeTokenPolicyId: process.env.TRIBE_TOKEN_POLICY_ID,
    };

    if (
        fromEnv.currencyTreasuryCapId &&
        fromEnv.tribeTreasuryCapId &&
        fromEnv.tribeTokenPolicyCapId &&
        fromEnv.tribeTokenPolicyId
    ) {
        return fromEnv;
    }

    const extracted = loadTokensFromExtracted(network);
    if (extracted) {
        return {
            packageId: fromEnv.packageId,
            currencyTreasuryCapId: fromEnv.currencyTreasuryCapId ?? extracted.currencyTreasuryCapId,
            tribeTreasuryCapId: fromEnv.tribeTreasuryCapId ?? extracted.tribeTreasuryCapId,
            tribeTokenPolicyCapId:
                fromEnv.tribeTokenPolicyCapId ?? extracted.tribeTokenPolicyCapId,
            tribeTokenPolicyId: fromEnv.tribeTokenPolicyId ?? extracted.tribeTokenPolicyId,
        };
    }

    return fromEnv;
}

function requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`${name} is required`);
    return v;
}

function loadTokensFromExtracted(network: string): TokenIds | null {
    const filePath = getExtractedObjectIdsPath(network);
    if (!fs.existsSync(filePath)) return null;
    try {
        const raw = fs.readFileSync(filePath, "utf8");
        const data = JSON.parse(raw) as ExtractedObjectIds & { tokens?: TokenIds };
        return data.tokens ?? null;
    } catch {
        return null;
    }
}
