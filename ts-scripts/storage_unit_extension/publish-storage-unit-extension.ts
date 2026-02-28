import "dotenv/config";
import * as fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { handleError } from "../utils/helper";

/**
 * Publish the storage_unit_extension package.
 * Run from repo root: pnpm publish-storage-unit-extension
 *
 * Set SUI_NETWORK (default: localnet).
 * For localnet with world: use test-publish with --pubfile-path ../../deployments/localnet/Pub.localnet.toml
 */
async function main() {
    console.log("============= Publish Storage Unit Extension ==============\n");

    try {
        const network = (process.env.SUI_NETWORK as string) || "localnet";
        const extPath = path.resolve(process.cwd(), "move-contracts/storage_unit_extension");

        const isLocal = network === "localnet";
        const pubFile = path.resolve(process.cwd(), "deployments", network, "Pub.localnet.toml");
        const hasPubFile = fs.existsSync(pubFile);

        let cmd: string;
        if (isLocal && hasPubFile) {
            cmd = `cd ${extPath} && sui client test-publish --gas-budget 100000000 --pubfile-path ${pubFile} --json`;
        } else {
            cmd = `cd ${extPath} && sui client publish --gas-budget 100000000 --json`;
        }

        const result = execSync(cmd, { encoding: "utf8" });
        const parsed = JSON.parse(result);

        const packageId =
            parsed.objectChanges?.find((c: { type: string }) => c.type === "published")
                ?.packageId ?? parsed.effects?.created?.[0]?.reference?.objectId;

        console.log("Publish digest:", parsed.digest);
        console.log("\nAdd to .env:");
        console.log(`STORAGE_UNIT_EXTENSION_PACKAGE_ID=${packageId}`);
        console.log(
            "\nAfter create-marketplace or create-supply-unit, add MARKETPLACE_ID or SUPPLY_UNIT_ID from the tx output."
        );
    } catch (error) {
        handleError(error);
    }
}

main();
