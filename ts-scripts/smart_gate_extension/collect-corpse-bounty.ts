import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { worldType } from "../mvr/resolve";
import { requireOwnerCapId } from "../helpers/owner-cap";
import { CLOCK_OBJECT_ID, optionalNumber, requireItemId } from "../utils/constants";
import { handleError, initializeContext } from "../utils/helper";
import { submit } from "../utils/submit";
import { resolveSmartGateExtensionIdsFromEnv } from "./extension-ids";
import { resolveKit, withOwnerCap } from "./kit";
import { MODULE } from "./modules";

/**
 * "Submit a corpse" — the player side. Withdraws the corpse from the
 * character's inventory at the storage unit, runs your rule, deposits it, and
 * issues a JumpPermit to the character. Self-paid: the Move function takes no
 * AdminACL, so no sponsor is needed.
 */
async function main() {
    console.log("============= Collect Corpse Bounty ==============\n");
    try {
        const ctx = initializeContext();
        const kit = resolveKit(ctx);
        const { builderPackageId, extensionConfigId } = resolveSmartGateExtensionIdsFromEnv();
        const corpseTypeId = requireItemId("CORPSE_TYPE_ID");
        const quantity = optionalNumber("CORPSE_QUANTITY", 1);

        const characterCapId = await requireOwnerCapId("character", kit.characterId, ctx);

        const tx = new Transaction();
        withOwnerCap(tx, kit.characterId, characterCapId, "character::Character", (ownerCap) => {
            tx.moveCall({
                target: `${builderPackageId}::${MODULE.CORPSE_GATE_BOUNTY}::collect_corpse_bounty`,
                typeArguments: [worldType("character::Character")],
                arguments: [
                    tx.object(extensionConfigId),
                    tx.object(kit.storageUnitId),
                    tx.object(kit.sourceGateId),
                    tx.object(kit.destinationGateId),
                    tx.object(kit.characterId),
                    ownerCap,
                    tx.pure.u64(corpseTypeId),
                    tx.pure.u32(quantity),
                    tx.object(CLOCK_OBJECT_ID),
                ],
            });
        });

        console.log(`Submitting ${quantity} × item type ${corpseTypeId}`);
        await submit(tx, ctx, "collect-corpse-bounty");
        console.log("\nAfter it succeeds, run: pnpm check-permit");
    } catch (error) {
        handleError(error);
    }
}

main();
