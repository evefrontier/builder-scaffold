import "dotenv/config";
import * as fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { handleError } from "../utils/helper";
import { upsertExtractedObjectIds } from "../utils/config";

/**
 * Publish the smart_gate_extension package. Captures package ID and ExtensionConfig object ID,
 * and writes them into deployments/<network>/extracted-object-ids.json under the "builder" key.
 * Subsequent scripts (configure-rules, authorise-gate, etc.) read from there automatically.
 *
 * Run from repo root: pnpm publish-smart-gate-extension
 * Set SUI_NETWORK (default: localnet). For localnet, uses test-publish with Pub.localnet.toml.
 */
async function main() {
    console.log("============= Publish Smart Gate Extension ==============\n");

    try {
        const network = (process.env.SUI_NETWORK as string) || "localnet";
        const extPath = path.resolve(process.cwd(), "move-contracts/smart_gate_extension");

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
            // Use a package-specific pubfile (fresh copy of world's) so test-publish can read
            // World's address but doesn't pollute Pub.localnet.toml with the extension entry.
            const extPubFile = path.resolve(
                process.cwd(),
                "deployments",
                network,
                "Pub.smart-gate.localnet.toml"
            );
            if (fs.existsSync(extPubFile)) fs.unlinkSync(extPubFile);
            fs.copyFileSync(worldPubFile, extPubFile);
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

        type ObjectChange = {
            type: string;
            objectType?: string;
            objectId?: string;
            packageId?: string;
        };
        const changes: ObjectChange[] = parsed.objectChanges ?? [];

        const packageId = changes.find((c) => c.type === "published")?.packageId ?? "";

        const extensionConfigId =
            changes.find(
                (c) => c.type === "created" && c.objectType?.includes("::config::ExtensionConfig")
            )?.objectId ?? "";

        const builderIds = { packageId, extensionConfigId };

        const extractedPath = upsertExtractedObjectIds(network, (d) => {
            d["smart_gate_extension"] = builderIds;
        });
        console.log(`Smart gate extension IDs written to ${extractedPath}`);

        console.log("\nPublish digest:", parsed.digest);
        console.log("\nAdd to .env (or rely on extracted-object-ids.json):");
        console.log(`GATE_EXTENSION_PACKAGE_ID=${packageId}`);
        console.log(`GATE_EXTENSION_CONFIG_ID=${extensionConfigId}`);
        console.log(
            "\nNote: AdminCap is looked up at runtime by owner address — no env var needed."
        );
    } catch (error) {
        handleError(error);
    }
}

main();
