import * as fs from "node:fs";
import * as path from "node:path";
import { toBase64 } from "@mysten/sui/utils";
import { Transaction } from "@mysten/sui/transactions";
import type { InitializedContext } from "./helper";

/** The zkLogin REPL lives in ./zklogin and reads/writes these files. */
export const ZKLOGIN_DIR = path.resolve(process.cwd(), "zklogin");
export const PENDING_DIR = path.join(ZKLOGIN_DIR, "pending");
export const LAST_TX_PATH = path.join(ZKLOGIN_DIR, "last-tx.json");

/**
 * Build `tx` for the participant's zkLogin address and write the unsigned bytes
 * to `zklogin/pending/<step>.tx`, ready to sign in the zkLogin REPL.
 *
 * Also clears `zklogin/last-tx.json`, so the next result read back is
 * guaranteed to be for this transaction.
 */
export async function submit(tx: Transaction, ctx: InitializedContext, step: string) {
    tx.setSender(ctx.address);
    const bytes = await tx.build({ client: ctx.client });

    fs.mkdirSync(PENDING_DIR, { recursive: true });
    const filePath = path.join(PENDING_DIR, `${step}.tx`);
    fs.writeFileSync(filePath, toBase64(bytes));
    fs.rmSync(LAST_TX_PATH, { force: true });

    console.log(`\nTransaction ready: ${step}`);
    console.log(`  Sender: ${ctx.address}`);
    console.log("\nSign it in your zkLogin terminal:");
    console.log(`  choose [f]ile and enter: ${filePath}`);
    if (process.argv.includes("--paste")) {
        console.log("  or choose [p]aste and paste these bytes:\n");
        console.log(toBase64(bytes));
    } else {
        console.log("  (run with --paste to print the bytes for pasting instead)");
    }
}
