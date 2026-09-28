import "dotenv/config";
import { handleError } from "./utils/helper";
import { readLastTx } from "./utils/last-tx";

/** Did the transaction I just signed in the zkLogin terminal succeed? */
function main() {
    try {
        const result = readLastTx();
        console.log(`✅ Transaction ${result.digest} succeeded.`);
        console.log(`   https://suiscan.xyz/testnet/tx/${result.digest}`);
    } catch (error) {
        handleError(error);
    }
}

main();
