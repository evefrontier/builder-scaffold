import { requireEnv } from "../utils/helper";
import { getExtractedObjectIdsPath, ExtractedObjectIds, readRuntimeObjectIds } from "../utils/config";
import * as fs from "node:fs";
import { MODULE } from "./modules";

export type StorageUnitExtensionIds = {
    packageId: string;
    marketplaceId?: string;
    supplyUnitId?: string;
};

export function requireStorageUnitExtensionPackageId(): string {
    if (process.env.STORAGE_UNIT_EXTENSION_PACKAGE_ID) {
        return process.env.STORAGE_UNIT_EXTENSION_PACKAGE_ID;
    }
    const network = process.env.SUI_NETWORK ?? "localnet";
    const filePath = getExtractedObjectIdsPath(network);
    if (fs.existsSync(filePath)) {
        try {
            const data = JSON.parse(fs.readFileSync(filePath, "utf8")) as ExtractedObjectIds;
            const pkg = data["storage_unit_extension"]?.packageId;
            if (pkg) return pkg;
        } catch {
            // fall through to requireEnv error
        }
    }
    return requireEnv("STORAGE_UNIT_EXTENSION_PACKAGE_ID");
}

export function resolveMarketplaceId(): string {
    if (process.env.MARKETPLACE_ID) return process.env.MARKETPLACE_ID;
    const network = process.env.SUI_NETWORK ?? "localnet";
    const id = readRuntimeObjectIds(network).storage_unit_extension?.marketplaceId;
    if (id) return id;
    return requireEnv("MARKETPLACE_ID");
}

export function resolveSupplyUnitId(): string {
    if (process.env.SUPPLY_UNIT_ID) return process.env.SUPPLY_UNIT_ID;
    const network = process.env.SUI_NETWORK ?? "localnet";
    const id = readRuntimeObjectIds(network).storage_unit_extension?.supplyUnitId;
    if (id) return id;
    return requireEnv("SUPPLY_UNIT_ID");
}

export function getMarketplaceType(packageId: string): string {
    return `${packageId}::${MODULE.MARKETPLACE}::Marketplace`;
}

export function getSupplyUnitType(packageId: string): string {
    return `${packageId}::${MODULE.SUPPLY_UNIT}::SupplyUnit`;
}
