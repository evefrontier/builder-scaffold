import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { worldTarget } from "../mvr/resolve";
import { requireOwnerCapId } from "../helpers/owner-cap";
import { DEFAULT_EXPIRY_MS, optionalNumber, requireItemId } from "../utils/constants";
import { handleError, initializeContext } from "../utils/helper";
import { submit } from "../utils/submit";
import { resolveSmartGateExtensionIds, xAuthType } from "./extension-ids";
import { resolveKit, withOwnerCap } from "./kit";
import { MODULE } from "./modules";

/**
 * "Set up my gate" — one transaction that configures the rule and points all
 * three assemblies at the participant's own extension:
 *
 *   1. set the rule config on ExtensionConfig
 *   2. authorize XAuth on gate 1  (issue_jump_permit checks the source gate)
 *   3. authorize XAuth on gate 2  (…and the destination gate)
 *   4. authorize XAuth on the storage unit  (deposit_item checks it; bounty rule only)
 *
 * RULE=bounty (default) uses the corpse bounty; RULE=tribe is the fallback rule
 * with no inventory, which skips the storage unit.
 */
async function main() {
    console.log("============= Set Up My Gate ==============\n");
    try {
        const ctx = initializeContext();
        const kit = resolveKit(ctx);
        const rule = process.env.RULE || "bounty";
        if (rule !== "bounty" && rule !== "tribe") {
            throw new Error(`RULE must be "bounty" or "tribe", got "${rule}".`);
        }
        const expiryMs = optionalNumber("PERMIT_EXPIRY_MS", DEFAULT_EXPIRY_MS);

        const { builderPackageId, adminCapId, extensionConfigId } =
            await resolveSmartGateExtensionIds(ctx);
        const authType = xAuthType(builderPackageId);

        const [sourceGateCapId, destinationGateCapId] = await Promise.all([
            requireOwnerCapId("gate", kit.sourceGateId, ctx),
            requireOwnerCapId("gate", kit.destinationGateId, ctx),
        ]);

        const tx = new Transaction();

        if (rule === "bounty") {
            tx.moveCall({
                target: `${builderPackageId}::${MODULE.CORPSE_GATE_BOUNTY}::set_bounty_config`,
                arguments: [
                    tx.object(extensionConfigId),
                    tx.object(adminCapId),
                    tx.pure.u64(requireItemId("CORPSE_TYPE_ID")),
                    tx.pure.u64(expiryMs),
                ],
            });
        } else {
            tx.moveCall({
                target: `${builderPackageId}::${MODULE.TRIBE_PERMIT}::set_tribe_config`,
                arguments: [
                    tx.object(extensionConfigId),
                    tx.object(adminCapId),
                    tx.pure.u32(Number(requireItemId("TRIBE_ID"))),
                    tx.pure.u64(expiryMs),
                ],
            });
        }

        for (const [gateId, capId] of [
            [kit.sourceGateId, sourceGateCapId],
            [kit.destinationGateId, destinationGateCapId],
        ]) {
            withOwnerCap(tx, kit.characterId, capId, "gate::Gate", (ownerCap) => {
                tx.moveCall({
                    target: worldTarget("gate::authorize_extension"),
                    typeArguments: [authType],
                    arguments: [tx.object(gateId), ownerCap],
                });
            });
        }

        if (rule === "bounty") {
            const storageUnitCapId = await requireOwnerCapId(
                "storage_unit",
                kit.storageUnitId,
                ctx
            );
            withOwnerCap(
                tx,
                kit.characterId,
                storageUnitCapId,
                "storage_unit::StorageUnit",
                (ownerCap) => {
                    tx.moveCall({
                        target: worldTarget("storage_unit::authorize_extension"),
                        typeArguments: [authType],
                        arguments: [tx.object(kit.storageUnitId), ownerCap],
                    });
                }
            );
        }

        console.log(`Rule: ${rule}`);
        console.log(`Extension: ${authType}`);
        console.log(`Authorizing on: gate 1, gate 2${rule === "bounty" ? ", storage unit" : ""}`);
        await submit(tx, ctx, "setup-gate");
        console.log(
            `\nAfter it succeeds, run: ${rule === "bounty" ? "pnpm collect-corpse-bounty" : "pnpm issue-tribe-jump-permit"}`
        );
    } catch (error) {
        handleError(error);
    }
}

main();
