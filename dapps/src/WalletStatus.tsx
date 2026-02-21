import { Container, Flex, Heading, Text } from "@radix-ui/themes";
import { AssemblyInfo } from "./AssemblyInfo";
import { useCurrentAccount, useDAppKit } from "@mysten/dapp-kit-react";

export function WalletStatus() {
  /** STEP 3 — useCurrentAccount() (@mysten/dapp-kit-react) → account for wallet status block. */
  const account = useCurrentAccount();

  /** STEP 7 — useDAppKit() (@mysten/dapp-kit-react) → signAndExecuteTransaction, signTransaction, signPersonalMessage. */
  const _dAppKit = useDAppKit();

  return (
    <Container my="2">
      <Heading mb="2">Wallet Status</Heading>

      {/* STEP 3 — Reading state: connected vs not, address (full or abbreviated). */}
      {account ? (
        <Flex direction="column">
          <Text>Wallet connected</Text>
          <Text>Address: {account.address}</Text>
        </Flex>
      ) : (
        <Text>Wallet not connected</Text>
      )}

      <AssemblyInfo />
    </Container>
  );
}
