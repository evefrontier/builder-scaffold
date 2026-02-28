import "dotenv/config";
import { execSync } from "node:child_process";
import path from "node:path";
import { handleError } from "../utils/helper";
import { getPublishOutputPath } from "../utils/config";

/**
 * Publish the tokens package. Captures package ID and created object IDs.
 * Run from repo root: pnpm publish-tokens
 *
 * Set SUI_NETWORK (default: localnet). For localnet, ensure a local validator is running.
 */
async function main() {
    console.log("============= Publish Tokens Package ==============\n");

    try {
        const network = (process.env.SUI_NETWORK as string) || "localnet";
        const tokensPath = path.resolve(process.cwd(), "move-contracts/tokens");

        const cmd = `cd ${tokensPath} && sui client publish --gas-budget 100000000 --json`;
        const result = execSync(cmd, { encoding: "utf8" });
        const parsed = JSON.parse(result);

        const packageId = parsed.effects?.created?.find(
            (r: { reference: { objectId: string } }) =>
                r.reference?.objectId && r.reference.objectId !== "0x0"
        )?.reference?.objectId;

        const created = parsed.effects?.created ?? [];
        const mutated = parsed.effects?.mutated ?? [];
        const all = [...created, ...mutated];

        const currencyTreasuryCap = all.find(
            (r: { reference?: { objectId: string } }) =>
                r.reference?.objectId && r.reference.objectId.startsWith("0x")
        );

        console.log("Publish digest:", parsed.digest);
        console.log("\nAdd to .env:");
        console.log(`TOKENS_PACKAGE_ID=${parsed.objectChanges?.[0]?.packageId ?? packageId}`);
        console.log("\nCreated object IDs - update .env with the correct IDs from the output above.");
    } catch (error) {
        handleError(error);
    }
}

main();
