import "dotenv/config";
import * as fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { handleError } from "../utils/helper";
import { upsertExtractedObjectIds } from "../utils/config";

/**
 * Publish the tribe_token package.
 * Writes packageId, treasuryCapId, tokenPolicyCapId, tokenPolicyId into
 * deployments/<network>/extracted-object-ids.json under the "tribe_token" key.
 *
 * Run from repo root: pnpm publish-tribe-token
 * Set SUI_NETWORK (default: localnet). Requires world to be deployed first (needs Pub.localnet.toml).
 */
async function main() {
    console.log("============= Publish tribe_token Package ==============\n");

    try {
        const network = (process.env.SUI_NETWORK as string) || "localnet";
        const pkgPath = path.resolve(process.cwd(), "move-contracts/tribe_token");

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
            const pubFile = path.resolve(
                process.cwd(),
                "deployments",
                network,
                "Pub.tribe-token.localnet.toml"
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
        const findId = (typeSubstr: string): string =>
            changes.find((c) => c.type === "created" && c.objectType?.includes(typeSubstr))
                ?.objectId ?? "";

        const treasuryCapId = findId(`coin::TreasuryCap<${packageId}::tribe_token`);
        const tokenPolicyCapId = findId(`token::TokenPolicyCap`);
        const tokenPolicyId = findId(`token::TokenPolicy`);

        const ids = { packageId, treasuryCapId, tokenPolicyCapId, tokenPolicyId };

        const extractedPath = upsertExtractedObjectIds(network, (d) => {
            d.tribe_token = ids;
        });
        console.log(`tribe_token IDs written to ${extractedPath}`);

        console.log("\nPublish digest:", parsed.digest);
        console.log("\nAdd to .env (or rely on extracted-object-ids.json):");
        console.log(`TRIBE_TOKEN_PACKAGE_ID=${packageId}`);
        console.log(`TRIBE_TREASURY_CAP_ID=${treasuryCapId}`);
        console.log(`TRIBE_TOKEN_POLICY_CAP_ID=${tokenPolicyCapId}`);
        console.log(`TRIBE_TOKEN_POLICY_ID=${tokenPolicyId}`);
    } catch (error) {
        handleError(error);
    }
}

main();
