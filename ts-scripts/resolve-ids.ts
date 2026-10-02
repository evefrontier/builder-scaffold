import "dotenv/config";
import { createClient, getWorldConfig } from "./utils/config";
import { deriveObjectId } from "./utils/derive-object-id";
import { handleError } from "./utils/helper";
import { KIT_ENV } from "./smart_gate_extension/kit";

/**
 * Turn in-game item IDs into on-chain object IDs and confirm each exists.
 *
 *   pnpm resolve-ids 1000000012372 1000000012373   # any item IDs
 *   pnpm resolve-ids                               # every ID in your kit .env
 */
async function main() {
    try {
        const config = getWorldConfig();
        const client = createClient();

        const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
        const entries: [string, string][] = args.length
            ? args.map((id) => [id, id])
            : Object.values(KIT_ENV).map((name) => [name, process.env[name] ?? ""]);

        console.log(`Tenant: ${config.tenant}\n`);
        let missing = 0;
        for (const [label, itemId] of entries) {
            if (!/^\d+$/.test(itemId)) {
                console.log(`  ${label.padEnd(22)} ⚠️  not set / not a number`);
                missing++;
                continue;
            }
            const objectId = deriveObjectId(config, BigInt(itemId));
            let found: string;
            try {
                const { object } = await client.core.getObject({ objectId });
                found = `✅ ${object.type.split("::").slice(1).join("::")}`;
            } catch {
                found = "❌ not found on chain";
                missing++;
            }
            console.log(`  ${label.padEnd(22)} ${itemId.padEnd(16)} → ${objectId}  ${found}`);
        }

        if (missing) {
            console.log(
                "\nSomething didn't resolve. Check the item IDs against the game and that " +
                    `TENANT=${config.tenant} is right — a wrong tenant derives an ID for an object that doesn't exist.`
            );
            process.exitCode = 1;
        }
    } catch (error) {
        handleError(error);
    }
}

main();
