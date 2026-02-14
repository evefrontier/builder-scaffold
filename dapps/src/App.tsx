import { Box, Container, Flex, Heading } from "@radix-ui/themes";
import { WalletStatus } from "./WalletStatus";
import { useConnection } from "@evefrontier/dapp-kit";

function App() {
  const { handleConnect, handleDisconnect, walletAddress, hasEveVault } =
    useConnection();

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

        <Box>
          <button onClick={handleConnect}>Connect Wallet</button>s{" "}
          {/* <ConnectWallet handleConnect={handleConnect} /> */}
        </Box>
      </Flex>
      <Container>
        <Container
          mt="5"
          pt="2"
          px="4"
          style={{ background: "var(--gray-a2)", minHeight: 500 }}
        >
          {/* <WalletStatus /> */}
        </Container>
      </Container>
    </>
  );
}

export default App;
