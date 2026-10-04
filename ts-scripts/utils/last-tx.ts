import * as fs from "node:fs";
import { LAST_TX_PATH } from "./submit";

/**
 * Result of the last transaction the zkLogin REPL executed, written to
 * `zklogin/last-tx.json`. The writer is `writeLastTx` in
 * zklogin/zkLoginTransaction.ts — keep the two in sync.
 */
export type LastTx = {
    digest: string;
    success: boolean;
    /** Execution error message, when `success` is false. */
    error?: string;
    /**
     * Set when the failure was a Move abort. `name` is the error constant
     * (e.g. ECorpseTypeMismatch) — the raw `code` is an encoded clever-error value.
     */
    abort?: {
        code: string;
        name?: string;
        message?: string;
        module?: string;
        functionName?: string;
    };
    /** Objects the transaction created. `type` is "package" for a published package. */
    created: { objectId: string; type: string | null }[];
    executedAt: string;
};

export function readLastTx(): LastTx {
    if (!fs.existsSync(LAST_TX_PATH)) {
        throw new Error(
            "No result yet. Sign the pending transaction in your zkLogin terminal, then try again."
        );
    }
    const result = JSON.parse(fs.readFileSync(LAST_TX_PATH, "utf8")) as LastTx;
    if (!result.success) {
        const a = result.abort;
        const where = a
            ? ` (${a.name ?? `abort code ${a.code}`} in ${a.module}::${a.functionName})`
            : "";
        throw new Error(`Transaction ${result.digest} failed${where}: ${result.error}`);
    }
    return result;
}
