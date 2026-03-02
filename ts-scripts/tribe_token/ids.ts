import * as fs from "node:fs";
import { getExtractedObjectIdsPath, ExtractedObjectIds, Network } from "../utils/config";

export type TribeTokenIds = {
    packageId: string;
    treasuryCapId?: string;
    tokenPolicyCapId?: string;
    tokenPolicyId?: string;
};

export function resolveTribeTokenIds(network: Network): TribeTokenIds {
    const packageId =
        process.env.TRIBE_TOKEN_PACKAGE_ID ||
        loadFromExtracted(network)?.packageId ||
        (() => {
            throw new Error("TRIBE_TOKEN_PACKAGE_ID is required. Publish tribe_token first.");
        })();

    const fromExtracted = loadFromExtracted(network);
    return {
        packageId,
        treasuryCapId: process.env.TRIBE_TREASURY_CAP_ID ?? fromExtracted?.treasuryCapId,
        tokenPolicyCapId:
            process.env.TRIBE_TOKEN_POLICY_CAP_ID ?? fromExtracted?.tokenPolicyCapId,
        tokenPolicyId: process.env.TRIBE_TOKEN_POLICY_ID ?? fromExtracted?.tokenPolicyId,
    };
}

function loadFromExtracted(network: string): TribeTokenIds | null {
    const filePath = getExtractedObjectIdsPath(network);
    if (!fs.existsSync(filePath)) return null;
    try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8")) as ExtractedObjectIds;
        return data.tribe_token ?? null;
    } catch {
        return null;
    }
}
