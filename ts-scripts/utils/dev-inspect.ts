import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";

/**
 * Simulate a single Move call and return the BCS bytes of its first return
 * value, or null if the call fails. Replaces JSON-RPC devInspect.
 */
export async function devInspectMoveCallFirstReturnValueBytes(
    client: SuiGrpcClient,
    params: {
        target: string;
        typeArguments?: string[];
        senderAddress?: string;
        arguments: (tx: Transaction) => any[];
    }
): Promise<Uint8Array | null> {
    const tx = new Transaction();
    tx.setSender(params.senderAddress ?? "0x0");
    tx.moveCall({
        target: params.target,
        typeArguments: params.typeArguments,
        arguments: params.arguments(tx),
    });

    const result = await client.core.simulateTransaction({
        transaction: tx,
        include: { commandResults: true },
    });

    if (result.$kind !== "Transaction") return null;
    return result.commandResults?.[0]?.returnValues?.[0]?.bcs ?? null;
}
