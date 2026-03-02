import * as fs from "node:fs";
import { getExtractedObjectIdsPath, ExtractedObjectIds, Network } from "../utils/config";

export type CurrencyTokenIds = {
    packageId: string;
    treasuryCapId?: string;
};

export function resolveCurrencyTokenIds(network: Network): CurrencyTokenIds {
    const packageId =
        process.env.CURRENCY_TOKEN_PACKAGE_ID ||
        loadFromExtracted(network)?.packageId ||
        (() => {
            throw new Error("CURRENCY_TOKEN_PACKAGE_ID is required. Publish currency_token first.");
        })();

    const treasuryCapId =
        process.env.CURRENCY_TREASURY_CAP_ID || loadFromExtracted(network)?.treasuryCapId;

    return { packageId, treasuryCapId };
}

function loadFromExtracted(network: string): CurrencyTokenIds | null {
    const filePath = getExtractedObjectIdsPath(network);
    if (!fs.existsSync(filePath)) return null;
    try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8")) as ExtractedObjectIds;
        return data.currency_token ?? null;
    } catch {
        return null;
    }
}
