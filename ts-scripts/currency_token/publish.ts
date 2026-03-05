import "dotenv/config";
import * as fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { handleError } from "../utils/helper";
import { upsertExtractedObjectIds } from "../utils/config";

/**
 * Publish the currency_token package.
 * Writes packageId and treasuryCapId into deployments/<network>/extracted-object-ids.json
 * under the "currency_token" key.
 *
 * Run from repo root: pnpm publish-currency-token
 * Set SUI_NETWORK (default: localnet).
 */
async function main() {
    console.log("============= Publish currency_token Package ==============\n");

    try {
        const network = (process.env.SUI_NETWORK as string) || "localnet";
        const pkgPath = path.resolve(process.cwd(), "move-contracts/currency_token");

        const isLocal = network === "localnet";
        const worldPubFile = path.resolve(
            process.cwd(),
            "deployments",
            network,
            "Pub.localnet.toml"
        );
        const hasWorldPubFile = fs.existsSync(worldPubFile);

        let cmd: string;
        if (isLocal && hasWorldPubFile) {
            // currency_token has no world dependency but we use test-publish for localnet consistency.
            // The pubfile is not strictly needed, but we pass it for uniformity.
            const pubFile = path.resolve(
                process.cwd(),
                "deployments",
                network,
                "Pub.currency-token.localnet.toml"
            );
            if (fs.existsSync(pubFile)) fs.unlinkSync(pubFile);
            fs.copyFileSync(worldPubFile, pubFile);
            cmd = `cd ${pkgPath} && sui client test-publish --build-env testnet --gas-budget 100000000 --pubfile-path ${pubFile} --json`;
        } else {
            cmd = `cd ${pkgPath} && sui client publish --build-env testnet --gas-budget 100000000 --json`;
        }

        let rawOutput: string;
        try {
            rawOutput = execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
        } catch (e: any) {
            const detail = [e.stdout, e.stderr].filter(Boolean).join("\n---\n") || String(e);
            throw new Error(`Publish failed:\n${detail}`);
        }
        const parsed = JSON.parse(rawOutput);

        type ObjectChange = {
            type: string;
            objectType?: string;
            objectId?: string;
            packageId?: string;
        };
        const changes: ObjectChange[] = parsed.objectChanges ?? [];

        const packageId = changes.find((c) => c.type === "published")?.packageId ?? "";
        const treasuryCapId =
            changes.find(
                (c) =>
                    c.type === "created" &&
                    c.objectType?.includes(`coin::TreasuryCap<${packageId}::currency_token`)
            )?.objectId ?? "";

        const ids = { packageId, treasuryCapId };

        const extractedPath = upsertExtractedObjectIds(network, (d) => {
            d.currency_token = ids;
        });
        console.log(`currency_token IDs written to ${extractedPath}`);

        console.log("\nPublish digest:", parsed.digest);
        console.log("\nAdd to .env (or rely on extracted-object-ids.json):");
        console.log(`CURRENCY_TOKEN_PACKAGE_ID=${packageId}`);
        console.log(`CURRENCY_TREASURY_CAP_ID=${treasuryCapId}`);
    } catch (error) {
        handleError(error);
    }
}

main();
