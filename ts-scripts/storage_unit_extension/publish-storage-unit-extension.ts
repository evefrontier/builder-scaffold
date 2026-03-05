import "dotenv/config";
import * as fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { handleError } from "../utils/helper";
import { upsertExtractedObjectIds } from "../utils/config";

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
        // storage_unit_extension depends on both World and currency_token, so we need a pubfile
        // that has both resolved. Pub.currency-token.localnet.toml (written by publish-currency-token)
        // has both. Fall back to Pub.localnet.toml (world-only) if currency_token hasn't been published yet.
        const currencyTokenPubFile = path.resolve(process.cwd(), "deployments", network, "Pub.currency-token.localnet.toml");
        const worldPubFile = path.resolve(process.cwd(), "deployments", network, "Pub.localnet.toml");
        const basePubFile = fs.existsSync(currencyTokenPubFile) ? currencyTokenPubFile : worldPubFile;
        const hasPubFile = fs.existsSync(basePubFile);

        let cmd: string;
        if (isLocal && hasPubFile) {
            // Use a package-specific pubfile so test-publish doesn't pollute the source file.
            const extPubFile = path.resolve(process.cwd(), "deployments", network, "Pub.storage-unit.localnet.toml");
            if (fs.existsSync(extPubFile)) fs.unlinkSync(extPubFile);
            fs.copyFileSync(basePubFile, extPubFile);
            cmd = `cd ${extPath} && sui client test-publish --build-env testnet --gas-budget 100000000 --pubfile-path ${extPubFile} --json`;
        } else {
            cmd = `cd ${extPath} && sui client publish --build-env testnet --gas-budget 100000000 --json`;
        }

        let rawOutput: string;
        try {
            rawOutput = execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
        } catch (e: any) {
            const detail = [e.stdout, e.stderr].filter(Boolean).join("\n---\n") || String(e);
            throw new Error(`Publish failed:\n${detail}`);
        }
        const parsed = JSON.parse(rawOutput);

        const packageId =
            parsed.objectChanges?.find((c: { type: string }) => c.type === "published")
                ?.packageId ?? parsed.effects?.created?.[0]?.reference?.objectId;

        const extractedPath = upsertExtractedObjectIds(network, (d) => { d["storage_unit_extension"] = { packageId }; });
        console.log(`Storage unit extension IDs written to ${extractedPath}`);

        console.log("\nPublish digest:", parsed.digest);
        console.log("\nAdd to .env (or rely on extracted-object-ids.json):");
        console.log(`STORAGE_UNIT_EXTENSION_PACKAGE_ID=${packageId}`);
        console.log(
            "\nAfter create-marketplace or create-supply-unit, add MARKETPLACE_ID or SUPPLY_UNIT_ID from the tx output."
        );
    } catch (error) {
        handleError(error);
    }
}

main();
