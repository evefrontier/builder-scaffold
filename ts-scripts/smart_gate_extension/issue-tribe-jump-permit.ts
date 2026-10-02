import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { CLOCK_OBJECT_ID } from "../utils/constants";
import { handleError, initializeContext } from "../utils/helper";
import { submit } from "../utils/submit";
import { resolveSmartGateExtensionIdsFromEnv } from "./extension-ids";
import { resolveKit } from "./kit";
import { MODULE } from "./modules";

/**
 * Player side of the fallback rule (RULE=tribe): request a JumpPermit if the
 * character's tribe matches the one configured by `pnpm setup-gate`.
 */
async function main() {
    console.log("============= Issue Tribe Jump Permit ==============\n");
    try {
        const ctx = initializeContext();
        const kit = resolveKit(ctx);
        const { builderPackageId, extensionConfigId } = resolveSmartGateExtensionIdsFromEnv();

        const tx = new Transaction();
        tx.moveCall({
            target: `${builderPackageId}::${MODULE.TRIBE_PERMIT}::issue_jump_permit`,
            arguments: [
                tx.object(extensionConfigId),
                tx.object(kit.sourceGateId),
                tx.object(kit.destinationGateId),
                tx.object(kit.characterId),
                tx.object(CLOCK_OBJECT_ID),
            ],
        });

        await submit(tx, ctx, "issue-tribe-jump-permit");
        console.log("\nAfter it succeeds, run: pnpm check-permit");
    } catch (error) {
        handleError(error);
    }
}

main();
