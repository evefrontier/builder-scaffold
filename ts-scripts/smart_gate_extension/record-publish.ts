import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { handleError } from "../utils/helper";
import { readLastTx } from "../utils/last-tx";
import { MODULE } from "./modules";

const ENV_PATH = path.resolve(process.cwd(), ".env");

/** Insert or replace `KEY=value` lines in .env, leaving everything else untouched. */
function writeEnv(values: Record<string, string>) {
    let text = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
    for (const [key, value] of Object.entries(values)) {
        const line = `${key}=${value}`;
        const pattern = new RegExp(`^${key}=.*$`, "m");
        text = pattern.test(text)
            ? text.replace(pattern, line)
            : `${text}${text.endsWith("\n") || text === "" ? "" : "\n"}${line}\n`;
    }
    fs.writeFileSync(ENV_PATH, text);
}

/**
 * Read the publish result the zkLogin REPL wrote to zklogin/last-tx.json and
 * record the new package and ExtensionConfig IDs in .env.
 */
function main() {
    console.log("============= Record Publish ==============\n");
    try {
        const result = readLastTx();

        const packageId = result.created.find((o) => o.type === "package")?.objectId;
        const extensionConfigId = result.created.find((o) =>
            o.type?.endsWith(`::${MODULE.CONFIG}::ExtensionConfig`)
        )?.objectId;

        if (!packageId || !extensionConfigId) {
            throw new Error(
                `Transaction ${result.digest} doesn't look like a smart_gate_extension publish ` +
                    `(no package or ExtensionConfig created). Did you sign the publish transaction?`
            );
        }

        writeEnv({ BUILDER_PACKAGE_ID: packageId, EXTENSION_CONFIG_ID: extensionConfigId });
        console.log("Saved to .env:");
        console.log("  BUILDER_PACKAGE_ID =", packageId);
        console.log("  EXTENSION_CONFIG_ID =", extensionConfigId);
        console.log("\nNext: pnpm setup-gate");
    } catch (error) {
        handleError(error);
    }
}

main();
