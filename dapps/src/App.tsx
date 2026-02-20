import { Box, Container, Flex, Heading } from "@radix-ui/themes";
import { WalletStatus } from "./WalletStatus";
import { abbreviateAddress, useConnection } from "@evefrontier/dapp-kit";
import { useCurrentAccount } from "@mysten/dapp-kit-react";

function App() {
  /**
   * STEP 2 — Wallet connection
   *
   * useConnection() (@evefrontier/dapp-kit) → handleConnect, handleDisconnect;
   * isConnected, walletAddress, hasEveVault. useCurrentAccount()
   * (@mysten/dapp-kit-react) → account (e.g. account.address) for UI. abbreviateAddress()
   * (@evefrontier/dapp-kit) for display.
   */
  const { handleConnect, handleDisconnect } = useConnection();
  const account = useCurrentAccount();

  return (
    <>
      <Flex
        position="sticky"
        px="4"
        py="2"
        justify="between"
        style={{
          borderBottom: "1px solid var(--gray-a2)",
        }}
      >
        <Box>
          <Heading>EVE Frontier dApp Starter Template</Heading>
        </Box>

        {/* STEP 2 — Connect/disconnect; show abbreviated address in header. */}
        <Box>
          <button
            onClick={() =>
              account?.address ? handleDisconnect() : handleConnect()
            }
          >
            {account ? abbreviateAddress(account?.address) : "Connect Wallet"}
          </button>
        </Box>
      </Flex>
      <Container>
        {/* STEP 3 — Same hooks (useConnection, useCurrentAccount) drive WalletStatus; state stays in sync. */}
        <Container
          mt="5"
          pt="2"
          px="4"
          style={{ background: "var(--gray-a2)", minHeight: 500 }}
        >
          <WalletStatus />
        </Container>
      </Container>
    </>
  );
}

export default App;
