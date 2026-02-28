import { requireEnv } from "../utils/helper";
import { MODULE } from "./modules";

export type StorageUnitExtensionIds = {
    packageId: string;
    marketplaceId?: string;
    supplyUnitId?: string;
};

export function requireStorageUnitExtensionPackageId(): string {
    return requireEnv("STORAGE_UNIT_EXTENSION_PACKAGE_ID");
}

export function resolveMarketplaceId(): string {
    return requireEnv("MARKETPLACE_ID");
}

export function resolveSupplyUnitId(): string {
    return requireEnv("SUPPLY_UNIT_ID");
}

export function getMarketplaceType(packageId: string): string {
    return `${packageId}::${MODULE.MARKETPLACE}::Marketplace`;
}

export function getSupplyUnitType(packageId: string): string {
    return `${packageId}::${MODULE.SUPPLY_UNIT}::SupplyUnit`;
}
