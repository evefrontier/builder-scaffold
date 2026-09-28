import { Transaction, type TransactionObjectArgument } from "@mysten/sui/transactions";
import { worldTarget, worldType } from "../mvr/resolve";
import type { WorldTypeKey } from "../mvr/worldTypeKeys";
import { requireItemId } from "../utils/constants";
import { deriveObjectId } from "../utils/derive-object-id";
import type { InitializedContext } from "../utils/helper";

/**
 * A participant's workshop kit: one character that owns two linked gates and a
 * storage unit. Item IDs come from the kit `.env`; object IDs are derived.
 */
export type Kit = {
    characterId: string;
    sourceGateId: string;
    destinationGateId: string;
    storageUnitId: string;
};

export const KIT_ENV = {
    character: "CHARACTER_ITEM_ID",
    sourceGate: "GATE_ITEM_ID_1",
    destinationGate: "GATE_ITEM_ID_2",
    storageUnit: "STORAGE_UNIT_ITEM_ID",
} as const;

export function resolveKit(ctx: InitializedContext): Kit {
    const derive = (envName: string) => deriveObjectId(ctx.config, requireItemId(envName));
    return {
        characterId: derive(KIT_ENV.character),
        sourceGateId: derive(KIT_ENV.sourceGate),
        destinationGateId: derive(KIT_ENV.destinationGate),
        storageUnitId: derive(KIT_ENV.storageUnit),
    };
}

/**
 * Borrow an OwnerCap from the character, run `use` with it, and return it — the
 * borrow/return pair the world requires within a single transaction.
 */
export function withOwnerCap(
    tx: Transaction,
    characterId: string,
    ownerCapId: string,
    capType: WorldTypeKey,
    use: (ownerCap: TransactionObjectArgument) => void
) {
    const typeArguments = [worldType(capType)];
    const [ownerCap, returnReceipt] = tx.moveCall({
        target: worldTarget("character::borrow_owner_cap"),
        typeArguments,
        arguments: [tx.object(characterId), tx.object(ownerCapId)],
    });
    use(ownerCap);
    tx.moveCall({
        target: worldTarget("character::return_owner_cap"),
        typeArguments,
        arguments: [tx.object(characterId), ownerCap, returnReceipt],
    });
}
