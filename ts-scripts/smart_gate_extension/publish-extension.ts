import "dotenv/config";
import { execFileSync, spawnSync } from "node:child_process";
import * as path from "node:path";
import { Transaction } from "@mysten/sui/transactions";
import { tenantConfig } from "../mvr/resolve";
import { handleError, initializeContext } from "../utils/helper";
import { submit } from "../utils/submit";

const PACKAGE_PATH = path.resolve(process.cwd(), "move-contracts/smart_gate_extension");

type BytecodeDump = { modules: string[]; dependencies: string[]; digest: number[] };

/**
 * `--dump-bytecode-as-base64` fetches dependency packages from the CLI's
 * active network, so it must be testnet.
 */
function assertCliOnTestnet() {
    const env = execFileSync("sui", ["client", "active-env"], { encoding: "utf8" }).trim();
    if (env !== "testnet") {
        throw new Error(
            `Sui CLI is on "${env}", not testnet. Run: sui client switch --env testnet`
        );
    }
}

function buildArgs(buildEnv: string, extra: string[]) {
    return ["move", "build", "--path", PACKAGE_PATH, "-e", buildEnv, ...extra];
}

/**
 * Publish is built in TypeScript rather than with `sui client publish`, which
 * would sign with the CLI's own address and gas. Here the package is published
 * by — and its UpgradeCap sent to — the participant's zkLogin address.
 */
async function main() {
    console.log("============= Publish Smart Gate Extension ==============\n");
    try {
        const ctx = initializeContext();
        const { buildEnv } = tenantConfig();
        assertCliOnTestnet();

        console.log("Building with the Move linter...");
        const lint = spawnSync("sui", buildArgs(buildEnv, ["--lint"]), { stdio: "inherit" });
        if (lint.status !== 0) {
            throw new Error("Move build failed — fix the errors above before publishing.");
        }

        const dump = JSON.parse(
            execFileSync("sui", buildArgs(buildEnv, ["--dump-bytecode-as-base64"]), {
                encoding: "utf8",
                stdio: ["ignore", "pipe", "ignore"],
            })
        ) as BytecodeDump;

        const tx = new Transaction();
        const [upgradeCap] = tx.publish({
            modules: dump.modules,
            dependencies: dump.dependencies,
        });
        tx.transferObjects([upgradeCap], ctx.address);

        await submit(tx, ctx, "publish");
        console.log("\nAfter it succeeds, run: pnpm record-publish");
    } catch (error) {
        handleError(error);
    }
}

main();
