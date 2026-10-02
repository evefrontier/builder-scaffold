import "dotenv/config";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { worldType } from "../mvr/resolve";
import { handleError, initializeContext } from "../utils/helper";
import { resolveKit } from "./kit";

type JumpPermitJson = { character_id: string; expires_at_timestamp_ms: string };

/**
 * Show the JumpPermits held by the participant's address — the "did my rule
 * let me through?" check before jumping in the game client.
 */
async function main() {
    console.log("============= Check Jump Permit ==============\n");
    try {
        const ctx = initializeContext();
        const { characterId } = resolveKit(ctx);
        const { objects } = await ctx.client.core.listOwnedObjects({
            owner: ctx.address,
            type: worldType("gate::JumpPermit"),
            include: { json: true },
        });

        const now = Date.now();
        const permits = objects.map((o) => {
            const json = o.json as JumpPermitJson;
            return {
                id: o.objectId,
                forMyCharacter:
                    normalizeSuiAddress(json.character_id) === normalizeSuiAddress(characterId),
                expiresAt: Number(json.expires_at_timestamp_ms),
            };
        });
        const usable = permits.filter((p) => p.forMyCharacter && p.expiresAt > now);

        for (const p of permits) {
            const state = !p.forMyCharacter
                ? "for a different character"
                : p.expiresAt <= now
                  ? "expired"
                  : `valid for ${Math.round((p.expiresAt - now) / 60000)} min`;
            console.log(`  ${p.id}  ${state}`);
        }

        if (usable.length > 0) {
            console.log("\n✅ You hold a JumpPermit. Jump through your gate in the game.");
        } else {
            console.log(
                "\n❌ No usable JumpPermit. Your rule hasn't let you through yet — " +
                    "run pnpm collect-corpse-bounty and sign it."
            );
            process.exitCode = 1;
        }
    } catch (error) {
        handleError(error);
    }
}

main();
