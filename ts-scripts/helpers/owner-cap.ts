import { bcs } from "@mysten/sui/bcs";
import { worldTarget } from "../mvr/resolve";
import { devInspectMoveCallFirstReturnValueBytes } from "../utils/dev-inspect";
import type { InitializedContext } from "../utils/helper";

/** World modules whose objects expose `owner_cap_id`. */
export type OwnedAssemblyModule = "character" | "gate" | "storage_unit";

/**
 * Object ID of the `OwnerCap` for a character, gate or storage unit, read via
 * devInspect of `<module>::owner_cap_id`. Returns null if the call fails,
 * which usually means the object doesn't exist.
 */
export async function getOwnerCapId(
    module: OwnedAssemblyModule,
    objectId: string,
    ctx: InitializedContext
): Promise<string | null> {
    try {
        const bytes = await devInspectMoveCallFirstReturnValueBytes(ctx.client, {
            target: worldTarget(`${module}::owner_cap_id`),
            senderAddress: ctx.address,
            arguments: (tx) => [tx.object(objectId)],
        });
        return bytes ? bcs.Address.parse(bytes) : null;
    } catch (error) {
        console.warn(
            `Failed to read ${module} OwnerCap for ${objectId}:`,
            error instanceof Error ? error.message : error
        );
        return null;
    }
}

/** Like {@link getOwnerCapId}, but throws with a participant-readable message. */
export async function requireOwnerCapId(
    module: OwnedAssemblyModule,
    objectId: string,
    ctx: InitializedContext
): Promise<string> {
    const id = await getOwnerCapId(module, objectId, ctx);
    if (!id) {
        throw new Error(
            `No OwnerCap found for ${module} ${objectId}. Check the item ID in .env ` +
                `(run \`pnpm resolve-ids <itemId>\`) and that TENANT is correct.`
        );
    }
    return id;
}
