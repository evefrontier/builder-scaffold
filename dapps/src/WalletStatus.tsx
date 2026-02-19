import { Button, Container, Flex, Heading, Text } from "@radix-ui/themes";
import { AssemblyInfo } from "./AssemblyInfo";
import { useCurrentAccount, useCurrentClient, useDAppKit } from "@mysten/dapp-kit-react";
import { Transaction } from "@mysten/sui/transactions";

export function WalletStatus() {
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const client = useCurrentClient();

  const sendTestTransaction = async () => {
    const transaction = new Transaction();
    if (account?.address) {
      transaction.setSender(account.address);
    }

    try {
      // Two-step workaround for v2: wallet's signAndExecuteTransaction (new API) can throw with
      // addListener; signTransaction may use legacy signTransactionBlock path, then we execute.
      const signed = await dAppKit.signTransaction({ transaction });
      const rawBytes = signed.bytes as unknown;
      const txBytes =
        rawBytes instanceof Uint8Array
          ? rawBytes
          : new Uint8Array(rawBytes as ArrayBuffer | ArrayLike<number>);
      const sig =
        typeof signed.signature === "string"
          ? signed.signature
          : btoa(
              String.fromCharCode(
                ...new Uint8Array(signed.signature as unknown as ArrayBuffer | ArrayLike<number>)
              )
            );
      const result = await client.core.executeTransaction({
        transaction: txBytes,
        signatures: [sig],
        include: { effects: true },
      });
      console.log(result);
    } catch (err) {
      throw err;
    }
  };

  return (
    <Container my="2">
      <Heading mb="2">Wallet Status</Heading>

      {account ? (
        <Flex direction="column">
          <Text>Wallet connected</Text>
          <Text>Address: {account.address}</Text>
        </Flex>
      ) : (
        <Text>Wallet not connected</Text>
      )}

      <Button onClick={sendTestTransaction}>Send Test Transaction</Button>

      <AssemblyInfo />
    </Container>
  );
}
