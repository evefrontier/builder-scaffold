// Sui System Objects
export const CLOCK_OBJECT_ID = "0x6";

// Default permit lifetime issued by the extension.
export const DEFAULT_EXPIRY_MS = 3_600_000;

/**
 * Read a numeric in-game ID from the kit `.env` (e.g. GATE_ITEM_ID_1).
 * Participants read these from the game; they're never hardcoded.
 */
export function requireItemId(name: string): bigint {
    const raw = process.env[name];
    if (!raw) {
        throw new Error(`${name} is required. Add it to .env from your workshop kit.`);
    }
    if (!/^\d+$/.test(raw.trim())) {
        throw new Error(`${name} must be a whole number, got "${raw}".`);
    }
    return BigInt(raw.trim());
}

export function optionalNumber(name: string, fallback: number): number {
    const raw = process.env[name];
    if (!raw) return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${name} must be a positive whole number, got "${raw}".`);
    }
    return value;
}
